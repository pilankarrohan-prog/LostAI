import numpy as np
from PIL import Image
import cv2
import torch
from app.services.embedding import embedding_service

# Lists of supported targets
CATEGORIES = ["Phones", "Wallets", "Bags", "Keys", "Watches", "Laptops", "Earbuds", "ID Cards", "Water Bottles", "Other"]

BRANDS = ["Apple", "Samsung", "Sony", "Fossil", "Nike", "Adidas", "Dell", "HP", "Lenovo", "Nintendo", "Anker", "Stanley", "Google", "Microsoft", "Unknown"]

COLORS = ["Black", "White", "Grey", "Red", "Blue", "Green", "Yellow", "Brown", "Pink", "Silver", "Gold", "Orange", "Purple"]


def get_dominant_color(image: Image.Image) -> str:
    """
    Extracts the dominant color from an image using OpenCV K-Means clustering.
    """
    try:
        # Convert PIL image to OpenCV BGR format
        if image.mode != "RGB":
            image = image.convert("RGB")
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Resize to speed up calculation
        small_img = cv2.resize(cv_img, (50, 50), interpolation=cv2.INTER_AREA)
        pixels = small_img.reshape(-1, 3).astype(np.float32)
        
        # Perform K-Means clustering (K=3)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        flags = cv2.KMEANS_RANDOM_CENTERS
        _, labels, centers = cv2.kmeans(pixels, 3, None, criteria, 10, flags)
        
        # Count occurrences of each cluster label
        counts = np.bincount(labels.flatten())
        dominant_index = np.argmax(counts)
        dominant_bgr = centers[dominant_index]
        
        # Color definitions in RGB
        color_definitions = {
            "Black": (15, 15, 15),
            "White": (240, 240, 240),
            "Grey": (128, 128, 128),
            "Red": (220, 38, 38),
            "Blue": (37, 99, 235),
            "Green": (22, 163, 74),
            "Yellow": (234, 179, 8),
            "Brown": (120, 53, 4),
            "Pink": (244, 114, 182),
            "Silver": (192, 192, 192),
            "Gold": (212, 175, 55),
            "Orange": (249, 115, 22),
            "Purple": (147, 51, 234)
        }
        
        dom_rgb = (dominant_bgr[2], dominant_bgr[1], dominant_bgr[0]) # BGR to RGB
        
        # Find closest match
        min_dist = float('inf')
        closest_color = "Black"
        for name, rgb in color_definitions.items():
            dist = np.linalg.norm(np.array(dom_rgb) - np.array(rgb))
            if dist < min_dist:
                min_dist = dist
                closest_color = name
                
        return closest_color
    except Exception as e:
        print(f"[AI Recognition] Error detecting dominant color with OpenCV: {e}")
        return "Grey"


def run_clip_classification(image: Image.Image, choices: list, prompt_template: str) -> tuple:
    """
    Runs CLIP zero-shot classification on the image for the given choices and template.
    Returns (best_choice, confidence_percentage)
    """
    embedding_service._load_model()
    
    if not embedding_service.is_loaded or embedding_service.model is None or embedding_service.processor is None:
        raise RuntimeError("CLIP Model is running in mock mode.")
        
    try:
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        prompts = [prompt_template.format(c.lower()) for c in choices]
        
        # Generate inputs
        inputs = embedding_service.processor(text=prompts, images=image, return_tensors="pt", padding=True)
        
        with torch.no_grad():
            outputs = embedding_service.model(**inputs)
            logits_per_image = outputs.logits_per_image  # image-text similarity
            probs = logits_per_image.softmax(dim=-1).squeeze(0).cpu().numpy().tolist()
            
        max_idx = np.argmax(probs)
        best_choice = choices[max_idx]
        confidence = float(probs[max_idx])
        
        return best_choice, round(confidence * 100)
    except Exception as e:
        print(f"[AI Recognition] CLIP classification error: {e}")
        raise e


def mock_recognize(image: Image.Image) -> dict:
    """
    Heuristic mock classifier if CLIP model is not loaded.
    """
    color = get_dominant_color(image)
    
    # Hardcoded category mapping by aspect ratio/pixels
    width, height = image.size
    ratio = width / height
    
    if 0.4 < ratio < 0.7:
        category = "Phones"
        brand = "Apple" if color == "Black" else "Samsung"
    elif 1.3 < ratio < 1.7:
        category = "Laptops"
        brand = "Dell" if color == "Grey" else "Lenovo"
    elif ratio > 2.0:
        category = "Keys"
        brand = "Unknown"
    else:
        category = "Wallets" if color == "Brown" or color == "Black" else "Bags"
        brand = "Fossil" if category == "Wallets" else "Nike"
        
    confidence = 72
    tags = [category.lower(), color.lower()]
    if brand != "Unknown":
        tags.append(brand.lower())
    tags.extend(["item", "recovered"])
    
    description = f"A {color.lower()} {brand if brand != 'Unknown' else ''} {category.lower()[:-1] if category.endswith('s') else category.lower()} detected on scan."
    
    return {
        "category": category,
        "confidence": confidence,
        "color": color,
        "predictedBrand": brand,
        "tags": list(set(tags))[:5],
        "description": description
    }


def classify_item(image: Image.Image) -> dict:
    """
    Public entry point to classify an item image.
    Uses CLIP zero-shot classification if loaded, falls back to mock heuristic classifier.
    """
    try:
        # Attempt zero-shot classification
        category, cat_conf = run_clip_classification(image, CATEGORIES, "a photo of a {}")
        
        # Skip zero-shot brand classification for "Other" or "Keys"
        if category in ["Other", "Keys"]:
            brand, brand_conf = "Unknown", 100
        else:
            brand, brand_conf = run_clip_classification(image, BRANDS, "an item made by {}")
            
        color = get_dominant_color(image)
        
        # Calculate combined confidence score (category confidence weighted heavily)
        confidence = round(0.7 * cat_conf + 0.3 * brand_conf)
        
        # Generate tags
        tags = [category.lower(), color.lower()]
        if brand != "Unknown":
            tags.append(brand.lower())
        tags.extend(["item", "secured"])
        tags = list(set(tags))[:5]
        
        desc_article = "An" if color[0].upper() in "AEIOU" else "A"
        brand_str = f" {brand}" if brand != "Unknown" else ""
        category_singular = category[:-1] if category.endswith("s") and category != "Keys" else category
        description = f"{desc_article} {color.lower()}{brand_str} {category_singular.lower()} detected by AI recognition."
        
        return {
            "category": category,
            "confidence": confidence,
            "color": color,
            "predictedBrand": brand,
            "tags": tags,
            "description": description
        }
        
    except Exception as e:
        print(f"[AI Recognition] PyTorch/CLIP not loaded. Running OpenCV + Heuristic Fallback: {e}")
        return mock_recognize(image)
