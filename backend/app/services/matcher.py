from typing import List, Dict, Any
import numpy as np
import re
import math
from datetime import datetime
from app import database
from app.services.embedding import embedding_service, text_embedding_service
from app.services import match_engine

def compute_similarity(vector1: np.ndarray, vector2: np.ndarray) -> float:
    if vector1 is None or vector2 is None:
        return 0.0
    return float(np.dot(vector1, vector2))

def parse_date(date_str: str) -> datetime:
    try:
        if "T" in date_str:
            date_str = date_str.split("T")[0]
        return datetime.strptime(date_str, "%Y-%m-%d")
    except Exception:
        return datetime.now()

def get_coordinates(loc_str: str) -> tuple:
    # Try to find "lat,lng" coordinates in the text
    match = re.search(r"(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)", loc_str)
    if match:
        return float(match.group(1)), float(match.group(2))
    
    # Check known mock spots
    l_str = loc_str.lower()
    if "central park" in l_str:
        return 40.7829, -73.9654
    elif "metro" in l_str or "subway" in l_str:
        return 40.7580, -73.9855
    elif "airport" in l_str or "jfk" in l_str:
        return 40.6413, -73.7781
    elif "plaza" in l_str or "times square" in l_str:
        return 40.7589, -73.9851
    
    # Generate deterministic coordinates based on hash of location text
    h_val = hash(loc_str)
    lat = 40.7 + (abs(h_val) % 100) / 1000.0
    lng = -74.0 + (abs(h_val) % 100) / 1000.0
    return lat, lng

def calculate_distance(coord1: tuple, coord2: tuple) -> float:
    # Haversine distance formula in kilometers
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    
    R = 6371.0 # Earth radius in km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = (math.sin(dlat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_description_similarity(desc1: str, desc2: str) -> float:
    stop_words = {'with', 'lost', 'found', 'near', 'on', 'the', 'and', 'a', 'an', 'in', 'at', 'of', 'for', 'brand', 'new', 'some', 'is', 'it', 'this'}
    
    words1 = set(re.findall(r'\b\w{3,15}\b', desc1.lower()))
    words2 = set(re.findall(r'\b\w{3,15}\b', desc2.lower()))
    
    w1 = words1 - stop_words
    w2 = words2 - stop_words
    
    if not w1 or not w2:
        return 0.0
    
    intersection = len(w1.intersection(w2))
    union = len(w1.union(w2))
    
    return float(intersection) / float(union)

def get_keyword_matches(item1: dict, item2: dict) -> List[str]:
    stop_words = {'with', 'lost', 'found', 'near', 'on', 'the', 'and', 'a', 'an', 'in', 'at', 'of', 'for', 'brand', 'new', 'some', 'is', 'it', 'this'}
    
    text1 = f"{item1['name']} {item1['description']} {item1.get('brand', '')} {item1.get('color', '')}"
    text2 = f"{item2['name']} {item2['description']} {item2.get('brand', '')} {item2.get('color', '')}"
    
    words1 = set(re.findall(r'\b\w{3,15}\b', text1.lower()))
    words2 = set(re.findall(r'\b\w{3,15}\b', text2.lower()))
    
    w1 = words1 - stop_words
    w2 = words2 - stop_words
    
    return sorted(list(w1.intersection(w2)))

def find_matches(target_item_id: str) -> List[Dict[str, Any]]:
    target = database.get_item(target_item_id)
    if not target:
        return []

    target_data = target["data"]
    if target_data.get("status") == "spam":
        return []

    target_emb = target.get("image_embedding")
    if target_emb is None:
        target_emb = target.get("embedding")
    target_text_emb = target.get("text_embedding")
    target_type = target_data["type"]

    all_stored = database.get_all_items()
    candidates = []

    for candidate in all_stored:
        cand_data = candidate["data"]
        cand_emb = candidate.get("image_embedding")
        if cand_emb is None:
            cand_emb = candidate.get("embedding")
        cand_text_emb = candidate.get("text_embedding")

        # 1. Filter out incompatible items (same reporter, same type, resolved, spam)
        if cand_data["type"] == target_type or cand_data["status"] in ("resolved", "spam") or cand_data["id"] == target_item_id:
            continue

        # 2. Category matching (Pre-requisite filter: mismatch rejects candidate)
        if target_data["category"].lower() != cand_data["category"].lower():
            continue

        # Calculate similarity details using explainable match engine
        match_res = match_engine.calculate_match(
            target_data=target_data,
            cand_data=cand_data,
            target_emb=target_emb,
            cand_emb=cand_emb,
            target_text_emb=target_text_emb,
            cand_text_emb=cand_text_emb
        )
        
        # Threshold limit matching
        if match_res["overallConfidence"] >= 40.0:
            # Matched fields for backwards compatibility
            matched_fields = []
            if match_res["imageSimilarity"] >= 60.0:
                matched_fields.append("Image Signature")
            if match_res["textSimilarity"] >= 50.0:
                matched_fields.append("Description Keywords")
            if match_res["locationSimilarity"] >= 70.0:
                matched_fields.append("Location Proximity")
            if match_res["brandSimilarity"] >= 70.0:
                matched_fields.append(f"Brand Match ({target_data.get('brand')})")
            if match_res["colorSimilarity"] >= 70.0:
                matched_fields.append(f"Color Match ({target_data.get('color')})")

            candidates.append({
                "item": cand_data,
                "similarity_score": match_res["overallConfidence"],
                "matched_fields": matched_fields,
                
                # Explainable metrics
                "overallConfidence": match_res["overallConfidence"],
                "confidenceLevel": match_res["confidenceLevel"],
                "imageSimilarity": match_res["imageSimilarity"],
                "textSimilarity": match_res["textSimilarity"],
                "locationSimilarity": match_res["locationSimilarity"],
                "brandSimilarity": match_res["brandSimilarity"],
                "colorSimilarity": match_res["colorSimilarity"],
                "explanation": match_res["explanation"]
            })

    candidates.sort(key=lambda x: x["overallConfidence"], reverse=True)
    return candidates
