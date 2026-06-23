from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ItemResponse(BaseModel):
    id: str
    type: str  # "lost" or "found"
    name: str
    category: str
    brand: Optional[str] = None
    color: Optional[str] = None
    description: str
    date: str
    location: str
    image_url: Optional[str] = None
    tags: List[str] = []
    status: str = "active"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reporter_id: Optional[str] = None
    created_at: str

class MatchCandidate(BaseModel):
    item: ItemResponse
    similarity_score: float  # percentage score: 0 to 100
    matched_fields: List[str]
    
    # New Multimodal AI Match fields
    overallConfidence: float
    confidenceLevel: str
    imageSimilarity: float
    textSimilarity: float
    locationSimilarity: float
    brandSimilarity: float
    colorSimilarity: float
    explanation: str

class MatchesResponse(BaseModel):
    target_item: ItemResponse
    matches: List[MatchCandidate]

class NotificationResponse(BaseModel):
    id: str
    userId: str
    title: str
    message: str
    type: str  # "match", "message", "system", "admin"
    isRead: bool
    createdAt: str
    link: Optional[str] = None

class NotificationCreate(BaseModel):
    userId: str
    title: str
    message: str
    type: str  # "match", "message", "system", "admin"
    link: Optional[str] = None

class ConversationResponse(BaseModel):
    id: str
    lostItemId: str
    foundItemId: str
    ownerUserId: str
    finderUserId: str
    matchId: str
    createdAt: str
    status: str  # "active", "closed"

class MessageResponse(BaseModel):
    id: str
    conversationId: str
    senderId: str
    receiverId: str
    message: str
    messageType: str  # "text", "image", "system"
    isRead: bool
    timestamp: str

class ConversationCreate(BaseModel):
    lostItemId: str
    foundItemId: str
    ownerUserId: str
    finderUserId: str
    matchId: str

class MessageCreate(BaseModel):
    conversationId: str
    senderId: str
    receiverId: str
    message: str
    messageType: str = "text"

class VerificationRequestResponse(BaseModel):
    id: str
    matchId: str
    ownerId: str
    finderId: str
    status: str  # "Pending", "Approved", "Rejected", "QR Generated", "Verified", "Completed"
    createdAt: str
    documentUrl: Optional[str] = None
    certificateUrl: Optional[str] = None

class QRCodeVerificationResponse(BaseModel):
    id: str
    verificationId: str
    qrToken: str
    expiresAt: str
    isUsed: bool
    verifiedAt: Optional[str] = None

class VerificationRequestCreate(BaseModel):
    matchId: str
    ownerId: str
    finderId: str
    documentUrl: Optional[str] = None

class VerificationRequestUpdate(BaseModel):
    requestId: str

class VerificationScanPayload(BaseModel):
    qrToken: str
    ownerId: str
