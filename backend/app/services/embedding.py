import numpy as np
from PIL import Image
import hashlib
import cv2

# Lazy loading flags for PyTorch, Transformers, and SentenceTransformers
_torch_available = False
_transformers_available = False
_sentence_transformers_available = False

try:
    import torch
    _torch_available = True
except ImportError:
    pass

try:
    from transformers import CLIPProcessor, CLIPModel
    _transformers_available = True
except ImportError:
    pass

try:
    from sentence_transformers import SentenceTransformer
    _sentence_transformers_available = True
except ImportError:
    pass


class ImageEmbeddingService:
    def __init__(self):
        self.model = None
        self.processor = None
        self.is_loaded = False

    def _load_model(self):
        if self.is_loaded:
            return
        
        # Check if torch and transformers are available globally
        # Proactively attempt re-import in case they were installed during runtime
        global _torch_available, _transformers_available
        if not _torch_available:
            try:
                import torch
                _torch_available = True
            except ImportError:
                pass
        if not _transformers_available:
            try:
                from transformers import CLIPProcessor, CLIPModel
                _transformers_available = True
            except ImportError:
                pass

        if not (_torch_available and _transformers_available):
            print("PyTorch or Transformers not found. AI CLIP Image Matcher running in Fallback Mock Mode.")
            return

        try:
            model_id = "openai/clip-vit-base-patch32"
            self.model = CLIPModel.from_pretrained(model_id)
            self.processor = CLIPProcessor.from_pretrained(model_id)
            self.model.eval()
            self.is_loaded = True
            print("AI CLIP Feature Extractor (openai/clip-vit-base-patch32) initialized successfully.")
        except Exception as e:
            print(f"Warning: Failed to load OpenAI CLIP model. Falling back to Mock Embeddings: {e}")
            self.model = None
            self.processor = None
            self.is_loaded = False

    def generate_image_embedding(self, image: Image.Image) -> np.ndarray:
        self._load_model()

        if not self.is_loaded or self.model is None or self.processor is None:
            # Fallback mock embedding: hash-based 512-dim vector
            width, height = image.size
            pixels = np.array(image.resize((16, 16)))
            mean_color = float(np.mean(pixels))
            seed_text = f"mock_img_{width}_{height}_{mean_color}"
            return self.generate_mock_embedding(seed_text)

        try:
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            inputs = self.processor(images=image, return_tensors="pt")
            
            with torch.no_grad():
                image_features = self.model.get_image_features(**inputs)
            
            # Normalize vector to unit length (L2 norm)
            norm = image_features.norm(dim=-1, keepdim=True)
            if norm.item() > 0:
                image_features = image_features / norm
            
            vector = image_features.squeeze(0).cpu().numpy().astype(np.float32)
            return vector
        except Exception as e:
            print(f"Error during CLIP feature extraction: {e}. Falling back to mock vector.")
            return self.generate_mock_embedding("fallback_err")

    def generate_mock_embedding(self, text_seed: str) -> np.ndarray:
        # Generate a deterministic 512-dimensional vector by hashing a seed string
        h = hashlib.sha256(text_seed.encode('utf-8')).digest()
        seed_val = int.from_bytes(h[:4], byteorder='big')
        
        np.random.seed(seed_val)
        vector = np.random.randn(512).astype(np.float32)
        
        # Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector


class TextEmbeddingService:
    def __init__(self):
        self.model = None
        self.is_loaded = False

    def _load_model(self):
        if self.is_loaded:
            return
        
        global _sentence_transformers_available
        if not _sentence_transformers_available:
            try:
                from sentence_transformers import SentenceTransformer
                _sentence_transformers_available = True
            except ImportError:
                pass

        if not _sentence_transformers_available:
            print("SentenceTransformers not found. NLP Text Matcher running in Fallback Mock Mode.")
            return

        try:
            # Load a lightweight, high-performance sentence transformer model
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            self.is_loaded = True
            print("NLP Text Embedding Model (all-MiniLM-L6-v2) initialized successfully.")
        except Exception as e:
            print(f"Warning: Failed to load SentenceTransformers model. Falling back to Mock: {e}")
            self.model = None
            self.is_loaded = False

    def generate_text_embedding(self, text: str) -> np.ndarray:
        self._load_model()

        if not self.is_loaded or self.model is None:
            # Fallback mock text embedding (hash-based 384-dimensional vector)
            return self.generate_mock_embedding(text)

        try:
            # Generate sentence embedding and normalize
            vector = self.model.encode(text, normalize_embeddings=True)
            return vector.astype(np.float32)
        except Exception as e:
            print(f"Error during sentence embedding generation: {e}. Falling back to mock.")
            return self.generate_mock_embedding(text)

    def generate_mock_embedding(self, text_seed: str) -> np.ndarray:
        # Generate a deterministic 384-dimensional vector by hashing a seed string
        h = hashlib.sha256(text_seed.encode('utf-8')).digest()
        seed_val = int.from_bytes(h[:4], byteorder='big')
        
        np.random.seed(seed_val)
        vector = np.random.randn(384).astype(np.float32)
        
        # Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        return vector


embedding_service = ImageEmbeddingService()
text_embedding_service = TextEmbeddingService()
