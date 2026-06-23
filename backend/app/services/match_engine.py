import numpy as np
import re
import math
from typing import Dict, Any, List, Optional
from datetime import datetime

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
    
    R = 6371.0  # Earth radius in km
    
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

def calculate_match(
    target_data: Dict[str, Any],
    cand_data: Dict[str, Any],
    target_emb: Optional[np.ndarray],
    cand_emb: Optional[np.ndarray],
    target_text_emb: Optional[np.ndarray],
    cand_text_emb: Optional[np.ndarray]
) -> Dict[str, Any]:
    
    # 1. Image Similarity (50% weight)
    image_sim = 0.0
    if target_emb is not None and cand_emb is not None:
        image_sim = compute_similarity(target_emb, cand_emb)
        image_sim = max(0.0, min(1.0, image_sim))
    else:
        if target_data.get("image_url") == cand_data.get("image_url"):
            image_sim = 1.0
        else:
            image_sim = 0.5
    image_similarity_score = image_sim * 100.0

    # 2. Text Description Similarity (20% weight)
    text_sim = 0.0
    if target_text_emb is not None and cand_text_emb is not None:
        text_sim = compute_similarity(target_text_emb, cand_text_emb)
        text_sim = max(0.0, min(1.0, text_sim))
    else:
        text_sim = get_description_similarity(target_data["description"], cand_data["description"])
    text_similarity_score = text_sim * 100.0

    # 3. Location Similarity (10% weight)
    coord1 = get_coordinates(target_data["location"])
    coord2 = get_coordinates(cand_data["location"])
    distance = calculate_distance(coord1, coord2)
    
    location_sim = 0.0
    if distance <= 1.0:
        location_sim = 1.0
    elif distance >= 10.0:
        location_sim = 0.0
    else:
        location_sim = 1.0 - (distance - 1.0) / 9.0
    location_similarity_score = location_sim * 100.0

    # 4. Brand Similarity (10% weight)
    brand_sim = 0.0
    t_brand = target_data.get("brand", "unknown").lower()
    c_brand = cand_data.get("brand", "unknown").lower()
    if t_brand != "unknown" and c_brand != "unknown" and t_brand == c_brand:
        brand_sim = 1.0
    elif t_brand != "unknown" and t_brand in cand_data["description"].lower():
        brand_sim = 0.7
    elif c_brand != "unknown" and c_brand in target_data["description"].lower():
        brand_sim = 0.7
    brand_similarity_score = brand_sim * 100.0

    # 5. Color Similarity (10% weight)
    color_sim = 0.0
    t_color = target_data.get("color", "unknown").lower()
    c_color = cand_data.get("color", "unknown").lower()
    if t_color != "unknown" and c_color != "unknown" and t_color == c_color:
        color_sim = 1.0
    elif t_color != "unknown" and t_color in cand_data["description"].lower():
        color_sim = 0.7
    elif c_color != "unknown" and c_color in target_data["description"].lower():
        color_sim = 0.7
    color_similarity_score = color_sim * 100.0

    # Weighted Overall Score
    overall_confidence = (
        0.50 * image_similarity_score +
        0.20 * text_similarity_score +
        0.10 * location_similarity_score +
        0.10 * brand_similarity_score +
        0.10 * color_similarity_score
    )
    overall_confidence = min(100.0, max(0.0, overall_confidence))

    # Determine confidence level
    if overall_confidence >= 90.0:
        confidence_level = "High Match"
    elif overall_confidence >= 70.0:
        confidence_level = "Medium Match"
    else:
        confidence_level = "Low Match"

    # Explanation Generation
    explanation_parts = []
    
    # Image similarity phrasing
    if image_similarity_score >= 85.0:
        explanation_parts.append(f"The images are highly similar ({round(image_similarity_score)}%).")
    elif image_similarity_score >= 60.0:
        explanation_parts.append(f"The images are moderately similar ({round(image_similarity_score)}%).")
    else:
        explanation_parts.append(f"The images have low visual similarity ({round(image_similarity_score)}%).")

    # Brand phrasing
    if t_brand != "unknown" and c_brand != "unknown" and t_brand == c_brand:
        explanation_parts.append(f"Both items are {target_data.get('brand')} devices.")
    elif brand_similarity_score > 0.0:
        explanation_parts.append(f"Matches brand mention '{target_data.get('brand') or cand_data.get('brand')}' in description.")
    else:
        explanation_parts.append("Brands do not explicitly match.")

    # Description matching
    keywords = get_keyword_matches(target_data, cand_data)
    if text_similarity_score >= 50.0:
        explanation_parts.append("Descriptions share common keywords.")
    elif len(keywords) > 0:
        explanation_parts.append(f"Descriptions share details: {', '.join(keywords[:3])}.")
    else:
        explanation_parts.append("Descriptions have few similar terms.")

    # Location proximity phrasing
    if distance <= 1.0:
        explanation_parts.append("Locations are within 1 km.")
    else:
        explanation_parts.append(f"Locations are within {round(distance)} km.")

    explanation_parts.append(f"Overall confidence is {round(overall_confidence)}%.")
    explanation = " ".join(explanation_parts)

    return {
        "overallConfidence": round(overall_confidence, 1),
        "confidenceLevel": confidence_level,
        "imageSimilarity": round(image_similarity_score, 1),
        "textSimilarity": round(text_similarity_score, 1),
        "locationSimilarity": round(location_similarity_score, 1),
        "brandSimilarity": round(brand_similarity_score, 1),
        "colorSimilarity": round(color_similarity_score, 1),
        "explanation": explanation
    }
