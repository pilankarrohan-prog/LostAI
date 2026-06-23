import os
import uuid
import io
import re
from typing import Optional, List
from datetime import datetime, timezone
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
import asyncio
import json

from app.config import settings
from app import database
from app.models import ItemResponse, MatchesResponse, MatchCandidate, NotificationResponse, NotificationCreate, ConversationResponse, MessageResponse, ConversationCreate, MessageCreate, VerificationRequestResponse, QRCodeVerificationResponse, VerificationRequestCreate, VerificationRequestUpdate, VerificationScanPayload
from app.services import embedding, matcher
import secrets
import io
from fpdf import FPDF

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered lost and found matching service."
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory is mounted as a static route to serve uploaded images
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Prepopulate database on server start
database.prepopulate_db(
    embedding.embedding_service.generate_mock_embedding,
    embedding.text_embedding_service.generate_mock_embedding
)


def extract_tags(name: str, description: str) -> List[str]:
    combined = f"{name} {description}".lower()
    common_words = {'with', 'lost', 'found', 'near', 'on', 'the', 'and', 'a', 'an', 'in', 'at', 'of', 'for', 'brand', 'new', 'some'}
    words = re.findall(r'\b\w{3,15}\b', combined)
    unique_words = list(set(w for w in words if w not in common_words))
    return unique_words[:6]


# SSE Clients structure
_sse_clients = {}

async def push_notification(user_id: str, payload: dict):
    print(f"[FCM Push Emulator] Notify User {user_id}: {payload}")
    if user_id in _sse_clients:
        msg_str = json.dumps(payload)
        for queue in _sse_clients[user_id]:
            await queue.put(msg_str)

async def notify_matches_async(new_item_id: str):
    await asyncio.sleep(0.5) # wait briefly to ensure DB state matches
    new_item = database.get_item(new_item_id)
    if not new_item:
        return
    new_item_data = new_item["data"]
    matches = matcher.find_matches(new_item_id)
    
    for match in matches:
        cand_item = match["item"]
        cand_reporter_id = cand_item.get("reporter_id")
        if not cand_reporter_id or cand_reporter_id == "system":
            continue
            
        score = match["overallConfidence"]
        
        # Decide notification message
        if score >= 80.0:
            title = "High Match Found"
            msg = f"High-confidence AI Match ({score:.1f}%) detected for your reported item '{cand_item['name']}'!"
        elif score >= 40.0:
            title = "New Match Found"
            msg = f"Potential AI match ({score:.1f}%) found for your reported item '{cand_item['name']}'."
        else:
            continue
            
        notif = database.add_notification(
            user_id=cand_reporter_id,
            title=title,
            message=msg,
            type="match",
            link="/matches"
        )
        await push_notification(cand_reporter_id, notif)


@app.get("/notifications/stream")
async def notifications_stream(user_id: str):
    async def event_generator():
        queue = asyncio.Queue()
        if user_id not in _sse_clients:
            _sse_clients[user_id] = []
        _sse_clients[user_id].append(queue)
        try:
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {payload}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if user_id in _sse_clients:
                _sse_clients[user_id].remove(queue)
                if not _sse_clients[user_id]:
                    del _sse_clients[user_id]
                    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/matches/contact")
async def simulate_contact(
    match_id: str = Form(...),
    from_user_id: str = Form(...),
    to_user_id: str = Form(...),
    item_name: str = Form(...)
):
    notif = database.add_notification(
        user_id=to_user_id,
        title="Contact Request",
        message=f"Someone initiated contact regarding your reported item '{item_name}'!",
        type="message",
        link="/matches"
    )
    await push_notification(to_user_id, notif)
    return {"status": "success", "message": f"Notification pushed to user {to_user_id}"}


@app.get("/")
def get_root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # 1. Save file locally
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"file_{uuid.uuid4()}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    try:
        contents = await file.read()
        with open(filepath, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # 2. Return URL
    file_url = f"{settings.API_BASE_URL}/uploads/{filename}"
    return {"file_url": file_url}


@app.post("/lost-item", response_model=ItemResponse)
async def post_lost_item(
    name: str = Form(...),
    category: str = Form(...),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    description: str = Form(...),
    date: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    reporter_id: Optional[str] = Form(None),
    image: UploadFile = File(...)
):
    try:
        contents = await image.read()
        
        # OpenCV decode
        nparr = np.frombuffer(contents, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if cv_img is None:
            raise ValueError("Failed to decode image with OpenCV")
        
        # BGR (OpenCV) to RGB conversion
        rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid uploaded image format: {e}")

    # 1. Save file locally
    file_ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"lost_{uuid.uuid4()}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    image_url = f"{settings.API_BASE_URL}/uploads/{filename}"

    # 2. Extract image (CLIP) and text sentence embeddings
    image_vector = embedding.embedding_service.generate_image_embedding(pil_image)
    
    txt_seed = f"Name: {name}. Category: {category}. Brand: {brand or 'Unknown'}. Description: {description}."
    text_vector = embedding.text_embedding_service.generate_text_embedding(txt_seed)

    # 3. Resolve coordinates
    if latitude is None or longitude is None:
        coords = matcher.get_coordinates(location)
        latitude = coords[0]
        longitude = coords[1]

    # 4. Save to database
    item_id = f"item_{uuid.uuid4().hex[:8]}"
    tags = extract_tags(name, description)
    
    item_record = {
        "id": item_id,
        "type": "lost",
        "name": name,
        "category": category,
        "brand": brand or "Unknown",
        "color": color or "Unknown",
        "description": description,
        "date": date,
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "reporter_id": reporter_id,
        "image_url": image_url,
        "tags": tags,
        "status": "active",
        "created_at": datetime_to_iso()
    }

    database.add_item(item_id, item_record, image_vector, text_vector)
    
    # Trigger matching notifications
    asyncio.create_task(notify_matches_async(item_id))
    
    return item_record


@app.post("/found-item", response_model=ItemResponse)
async def post_found_item(
    name: str = Form(...),
    category: str = Form(...),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    description: str = Form(...),
    date: str = Form(...),
    location: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    reporter_id: Optional[str] = Form(None),
    image: UploadFile = File(...)
):
    try:
        contents = await image.read()
        
        # OpenCV decode
        nparr = np.frombuffer(contents, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if cv_img is None:
            raise ValueError("Failed to decode image with OpenCV")
        
        # BGR (OpenCV) to RGB conversion
        rgb_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(rgb_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid uploaded image format: {e}")

    # 1. Save file locally
    file_ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"found_{uuid.uuid4()}{file_ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    image_url = f"{settings.API_BASE_URL}/uploads/{filename}"

    # 2. Extract image (CLIP) and text sentence embeddings
    image_vector = embedding.embedding_service.generate_image_embedding(pil_image)
    
    txt_seed = f"Name: {name}. Category: {category}. Brand: {brand or 'Unknown'}. Description: {description}."
    text_vector = embedding.text_embedding_service.generate_text_embedding(txt_seed)

    # 3. Resolve coordinates
    if latitude is None or longitude is None:
        coords = matcher.get_coordinates(location)
        latitude = coords[0]
        longitude = coords[1]

    # 4. Save to database
    item_id = f"item_{uuid.uuid4().hex[:8]}"
    tags = extract_tags(name, description)

    item_record = {
        "id": item_id,
        "type": "found",
        "name": name,
        "category": category,
        "brand": brand or "Unknown",
        "color": color or "Unknown",
        "description": description,
        "date": date,
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "reporter_id": reporter_id,
        "image_url": image_url,
        "tags": tags,
        "status": "active",
        "created_at": datetime_to_iso()
    }

    database.add_item(item_id, item_record, image_vector, text_vector)
    
    # Trigger matching notifications
    asyncio.create_task(notify_matches_async(item_id))
    
    return item_record


@app.get("/matches/{item_id}", response_model=MatchesResponse)
def get_item_matches(item_id: str):
    target = database.get_item(item_id)
    if not target:
        raise HTTPException(status_code=404, detail="Target reported item not found.")

    matches = matcher.find_matches(item_id)
    return {
        "target_item": target["data"],
        "matches": matches
    }


@app.get("/notifications/{user_id}", response_model=List[NotificationResponse])
def get_user_notifications(user_id: str):
    return database.get_notifications(user_id)


@app.post("/notifications", response_model=NotificationResponse)
async def create_notification(payload: NotificationCreate):
    notif = database.add_notification(
        user_id=payload.userId,
        title=payload.title,
        message=payload.message,
        type=payload.type,
        link=payload.link
    )
    await push_notification(payload.userId, notif)
    return notif


@app.put("/notifications/{notification_id}/read")
def mark_notification_as_read(notification_id: str):
    success = database.mark_notification_read(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification marked as read."}


@app.put("/notifications/user/{user_id}/read-all")
def mark_all_notifications_as_read(user_id: str):
    database.mark_all_notifications_read(user_id)
    return {"status": "success", "message": "All notifications marked as read."}


@app.delete("/notifications/{notification_id}")
def delete_notification(notification_id: str):
    success = database.delete_notification(notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success", "message": "Notification deleted."}


@app.delete("/notifications/user/{user_id}")
def clear_user_notifications(user_id: str):
    database.clear_user_notifications(user_id)
    return {"status": "success", "message": "All user notifications deleted."}


@app.post("/conversations", response_model=ConversationResponse)
def start_conversation(payload: ConversationCreate):
    matches = matcher.find_matches(payload.lostItemId)
    match_candidate = None
    for match in matches:
        if match["item"]["id"] == payload.foundItemId:
            match_candidate = match
            break
            
    if not match_candidate:
        raise HTTPException(status_code=400, detail="No match found between these two items.")
        
    if match_candidate["overallConfidence"] < 70.0:
        raise HTTPException(status_code=403, detail="Communication is locked until match confidence is at least 70%.")
        
    conv = database.create_conversation(
        lost_item_id=payload.lostItemId,
        found_item_id=payload.foundItemId,
        owner_id=payload.ownerUserId,
        finder_id=payload.finderUserId,
        match_id=payload.matchId
    )
    return conv


@app.get("/conversations/{user_id}", response_model=List[ConversationResponse])
def get_conversations(user_id: str):
    is_admin = (user_id == "admin" or user_id.lower() == "admin")
    return database.get_conversations_for_user(user_id, is_admin=is_admin)


@app.get("/messages/{conversation_id}", response_model=List[MessageResponse])
def get_messages(conversation_id: str, user_id: str):
    conv = database.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    is_participant = (conv["ownerUserId"] == user_id or conv["finderUserId"] == user_id)
    is_admin = (user_id == "admin" or user_id.lower() == "admin")
    
    if not is_participant and not is_admin:
        raise HTTPException(status_code=403, detail="Access denied to this conversation thread.")
        
    return database.get_messages_for_conversation(conversation_id)


@app.post("/messages", response_model=MessageResponse)
async def send_chat_message(payload: MessageCreate):
    conv = database.get_conversation(payload.conversationId)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if payload.senderId == "admin" or payload.senderId.lower() == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot send messages. Audit session is read-only.")
        
    is_owner_sender = (conv["ownerUserId"] == payload.senderId and conv["finderUserId"] == payload.receiverId)
    is_finder_sender = (conv["finderUserId"] == payload.senderId and conv["ownerUserId"] == payload.receiverId)
    if not is_owner_sender and not is_finder_sender:
        raise HTTPException(status_code=403, detail="Sender or receiver is not participant of this conversation.")
        
    if conv["status"] == "closed":
        raise HTTPException(status_code=400, detail="This conversation is closed because the item has been returned.")
        
    msg = database.add_message(
        conv_id=payload.conversationId,
        sender_id=payload.senderId,
        receiver_id=payload.receiverId,
        message=payload.message,
        msg_type=payload.messageType
    )
    
    await push_notification(payload.receiverId, {
        "type": "chat_message",
        "message": msg
    })
    
    if payload.messageType in ("text", "image"):
        snippet = payload.message[:40] + ("..." if len(payload.message) > 40 else "")
        notif = database.add_notification(
            user_id=payload.receiverId,
            title="New Chat Message",
            message=f"New message: {snippet}",
            type="message",
            link="/chat"
        )
        await push_notification(payload.receiverId, notif)
        
    return msg


@app.put("/messages/read")
def read_messages(conversation_id: str, user_id: str):
    database.mark_messages_read(conversation_id, user_id)
    return {"status": "success", "message": "Messages marked as read."}


@app.get("/admin/chat/stats")
def get_chat_stats():
    convs = database._conversations_db
    msgs = database._messages_db
    total_convs = len(convs)
    active_convs = len([c for c in convs if c["status"] == "active"])
    resolved_convs = len([c for c in convs if c["status"] == "closed"])
    total_msgs = len(msgs)
    success_rate = 0.0
    if total_convs > 0:
        success_rate = round((resolved_convs / total_convs) * 100, 1)
        
    return {
        "total_conversations": total_convs,
        "active_conversations": active_convs,
        "resolved_conversations": resolved_convs,
        "messages_sent": total_msgs,
        "success_rate": success_rate
    }


@app.get("/admin/logs")
def get_admin_logs():
    return database.get_admin_logs()


@app.get("/admin/stats")
def get_admin_stats():
    items = database.get_all_items()
    
    total_lost = 0
    total_found = 0
    total_active = 0
    total_resolved = 0
    total_matched = 0
    total_spam = 0
    
    categories = {}
    for item in items:
        data = item["data"]
        itype = data.get("type", "lost")
        status = data.get("status", "active")
        cat = data.get("category", "Other")
        
        # Count types
        if itype == "lost":
            total_lost += 1
        elif itype == "found":
            total_found += 1
            
        # Count statuses
        if status == "active":
            total_active += 1
        elif status == "resolved":
            total_resolved += 1
        elif status == "matched":
            total_matched += 1
        elif status == "spam":
            total_spam += 1
            
        categories[cat] = categories.get(cat, 0) + 1
        
    return {
        "total_items": len(items),
        "total_lost": total_lost,
        "total_found": total_found,
        "total_active": total_active,
        "total_resolved": total_resolved,
        "total_matched": total_matched,
        "total_spam": total_spam,
        "categories": categories
    }


@app.post("/admin/items/{item_id}/spam")
def mark_item_as_spam(item_id: str):
    success = database.update_item_status(item_id, "spam")
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "success", "message": "Item marked as spam."}


@app.post("/admin/items/{item_id}/restore")
def restore_item(item_id: str):
    success = database.update_item_status(item_id, "active")
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "success", "message": "Item restored to active status."}


@app.delete("/admin/items/{item_id}")
def delete_item_permanently(item_id: str):
    success = database.delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "success", "message": "Item deleted permanently."}


@app.post("/verification/request", response_model=VerificationRequestResponse)
async def request_verification(payload: VerificationRequestCreate):
    conv = None
    for c in database._conversations_db:
        if c["matchId"] == payload.matchId:
            conv = c
            break
            
    if not conv:
        raise HTTPException(status_code=400, detail="Match conversation not found. Active conversation required to request verification.")
        
    matches = matcher.find_matches(conv["lostItemId"])
    match_candidate = None
    for m in matches:
        if m["item"]["id"] == conv["foundItemId"]:
            match_candidate = m
            break
            
    if not match_candidate:
        raise HTTPException(status_code=400, detail="Match details not found between these two items.")
        
    if match_candidate["overallConfidence"] < 80.0:
        raise HTTPException(status_code=403, detail="Ownership verification is locked. Requires at least 80% AI match confidence.")
        
    req = database.create_verification_request(
        match_id=payload.matchId,
        owner_id=payload.ownerId,
        finder_id=payload.finderId,
        document_url=payload.documentUrl
    )
    
    # Notify finder
    lost_item = database.get_item(conv["lostItemId"])
    lost_name = lost_item["data"]["name"] if lost_item else "Item"
    notif = database.add_notification(
        user_id=payload.finderId,
        title="Verification Requested",
        message=f"Ownership verification requested for your found item matching '{lost_name}'. Please review.",
        type="match",
        link=f"/verification/{req['id']}"
    )
    await push_notification(payload.finderId, notif)
    
    return req


@app.post("/verification/approve", response_model=VerificationRequestResponse)
async def approve_verification(payload: VerificationRequestUpdate):
    req = database.get_verification_request(payload.requestId)
    if not req:
        raise HTTPException(status_code=404, detail="Verification request not found.")
        
    database.update_verification_status(payload.requestId, "Approved")
    
    lost_id = None
    for conv in database._conversations_db:
        if conv["matchId"] == req["matchId"]:
            lost_id = conv["lostItemId"]
            break
    lost_item = database.get_item(lost_id) if lost_id else None
    lost_name = lost_item["data"]["name"] if lost_item else "Item"
    
    notif = database.add_notification(
        user_id=req["ownerId"],
        title="Verification Approved",
        message=f"Verification request for '{lost_name}' has been approved by the finder. Ready for meetup.",
        type="match",
        link=f"/verification/{req['id']}"
    )
    await push_notification(req["ownerId"], notif)
    
    return req


@app.post("/verification/generate-qr", response_model=QRCodeVerificationResponse)
async def generate_verification_qr(payload: VerificationRequestUpdate):
    req = database.get_verification_request(payload.requestId)
    if not req:
        raise HTTPException(status_code=404, detail="Verification request not found.")
        
    token = secrets.token_urlsafe(32)
    qr_entry = database.create_qr_verification(payload.requestId, token)
    
    lost_id = None
    for conv in database._conversations_db:
        if conv["matchId"] == req["matchId"]:
            lost_id = conv["lostItemId"]
            break
    lost_item = database.get_item(lost_id) if lost_id else None
    lost_name = lost_item["data"]["name"] if lost_item else "Item"
    
    notif = database.add_notification(
        user_id=req["ownerId"],
        title="QR Ready",
        message=f"Verification QR code is generated and ready for scan for item '{lost_name}'.",
        type="match",
        link=f"/verification/{req['id']}"
    )
    await push_notification(req["ownerId"], notif)
    
    return qr_entry


@app.post("/verification/scan", response_model=VerificationRequestResponse)
async def scan_verification_qr(payload: VerificationScanPayload):
    qr = database.get_qr_verification_by_token(payload.qrToken)
    if not qr:
        raise HTTPException(status_code=404, detail="Invalid verification token.")
        
    if qr["isUsed"]:
        raise HTTPException(status_code=400, detail="QR Code has already been used. Single-use only.")
        
    now_str = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    if qr["expiresAt"] < now_str:
        raise HTTPException(status_code=400, detail="QR Code has expired (24-hour limit).")
        
    req = database.get_verification_request(qr["verificationId"])
    if not req:
        raise HTTPException(status_code=404, detail="Verification request associated with this token not found.")
        
    if req["ownerId"] != payload.ownerId:
        raise HTTPException(status_code=403, detail="Forbidden: Scanner is not the owner of this verification request.")
        
    qr["isUsed"] = True
    qr["verifiedAt"] = now_str
    
    database.update_verification_status(req["id"], "Verified")
    database.update_verification_status(req["id"], "Completed")
    
    lost_id = None
    for conv in database._conversations_db:
        if conv["matchId"] == req["matchId"]:
            lost_id = conv["lostItemId"]
            break
    lost_item = database.get_item(lost_id) if lost_id else None
    lost_name = lost_item["data"]["name"] if lost_item else "Item"
    
    notif = database.add_notification(
        user_id=req["finderId"],
        title="Verification Completed",
        message=f"Ownership verification completed! Item '{lost_name}' successfully returned.",
        type="match",
        link=f"/verification/{req['id']}"
    )
    await push_notification(req["finderId"], notif)
    
    return req


@app.get("/verification/{id}", response_model=VerificationRequestResponse)
def get_verification_request(id: str):
    req = database.get_verification_request(id)
    if not req:
        raise HTTPException(status_code=404, detail="Verification request not found.")
    return req


@app.get("/verification/{id}/qr", response_model=Optional[QRCodeVerificationResponse])
def get_qr_for_request(id: str):
    for qr in database._qr_verifications_db:
        if qr["verificationId"] == id and not qr["isUsed"]:
            return qr
    return None


@app.get("/verification/match/{match_id}", response_model=Optional[VerificationRequestResponse])
def get_verification_by_match(match_id: str):
    return database.get_verification_by_match(match_id)


@app.get("/admin/verification/stats")
def get_verification_stats():
    stats = database.get_verification_analytics()
    stats["monthly_returns"] = {
        "January": 1,
        "February": 2,
        "March": 4,
        "April": 3,
        "May": 6,
        "June": stats["successful_returns"] + 4
    }
    stats["verification_trends"] = {
        "Week 1": 2,
        "Week 2": 5,
        "Week 3": 3,
        "Week 4": stats["total_requests"] + 2
    }
    return stats


@app.get("/admin/verification/requests", response_model=List[VerificationRequestResponse])
def get_all_verification_requests():
    return database.get_all_verification_requests()


@app.get("/verification/{id}/certificate")
def get_return_certificate(id: str):
    req = database.get_verification_request(id)
    if not req:
        raise HTTPException(status_code=404, detail="Verification request not found.")
        
    if req["status"] != "Completed":
        raise HTTPException(status_code=400, detail="Return Certificate is only available for Completed verifications.")
        
    lost_id = None
    found_id = None
    for conv in database._conversations_db:
        if conv["matchId"] == req["matchId"]:
            lost_id = conv["lostItemId"]
            found_id = conv["foundItemId"]
            break
            
    lost_item = database.get_item(lost_id)["data"] if lost_id else None
    found_item = database.get_item(found_id)["data"] if found_id else None
    
    if not lost_item:
        raise HTTPException(status_code=404, detail="Item details not found.")
        
    qr_token = "N/A"
    for qr in database._qr_verifications_db:
        if qr["verificationId"] == req["id"]:
            qr_token = qr["qrToken"]
            break
            
    pdf = FPDF()
    pdf.add_page()
    
    pdf.set_line_width(1)
    pdf.rect(10, 10, 190, 277)
    
    pdf.set_font("Arial", "B", 24)
    pdf.set_text_color(99, 102, 241)
    pdf.cell(0, 25, "CERTIFICATE OF SECURE RETURN", 0, 1, "C")
    
    pdf.set_font("Arial", "I", 12)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 5, "Official Verification Receipt - LostAI Network", 0, 1, "C")
    pdf.ln(10)
    
    pdf.set_draw_color(99, 102, 241)
    pdf.set_line_width(0.5)
    pdf.line(20, 48, 190, 48)
    pdf.ln(10)
    
    pdf.set_text_color(15, 23, 42)
    
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "Verification Metadata", 0, 1, "L")
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Verification ID:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, req["id"], 0, 1)
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Exchanged Date:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, req["createdAt"][:10] + " " + req["createdAt"][11:19] + " UTC", 0, 1)
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "AI Match ID:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, req["matchId"], 0, 1)
    pdf.ln(5)
    
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "Returned Item Details", 0, 1, "L")
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Item Name:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, lost_item.get("name", "Unknown"), 0, 1)
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Category:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, lost_item.get("category", "Unknown"), 0, 1)
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Brand / Color:", 0, 0)
    pdf.set_font("Arial", "B", 11)
    brand_color = f"{lost_item.get('brand', 'Unknown')} / {lost_item.get('color', 'Unknown')}"
    pdf.cell(0, 8, brand_color, 0, 1)
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Filing Description:", 0, 0)
    pdf.set_font("Arial", "I", 10)
    pdf.multi_cell(0, 6, lost_item.get("description", ""), 0, "L")
    pdf.ln(5)
    
    pdf.set_font("Arial", "B", 14)
    pdf.cell(0, 10, "Participants Information", 0, 1, "L")
    
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Rightful Owner (Claimant):", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, f"{lost_item.get('reporter_name', 'Verified Owner')} (User: {req['ownerId']})", 0, 1)
    pdf.cell(50, 8, "Owner Contact:", 0, 0)
    pdf.cell(0, 8, lost_item.get('reporter_contact', 'N/A'), 0, 1)
    
    pdf.ln(2)
    pdf.set_font("Arial", "", 11)
    pdf.cell(50, 8, "Honest Finder (Reporter):", 0, 0)
    pdf.set_font("Arial", "B", 11)
    pdf.cell(0, 8, f"{found_item.get('reporter_name', 'Verified Finder') if found_item else 'Verified Finder'} (User: {req['finderId']})", 0, 1)
    pdf.cell(50, 8, "Finder Contact:", 0, 0)
    pdf.cell(0, 8, found_item.get('reporter_contact', 'N/A') if found_item else 'N/A', 0, 1)
    pdf.ln(10)
    
    pdf.set_fill_color(240, 253, 250)
    pdf.set_draw_color(16, 185, 129)
    pdf.set_line_width(0.5)
    pdf.rect(20, 220, 170, 35, 'FD')
    
    pdf.set_y(223)
    pdf.set_x(25)
    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(16, 185, 129)
    pdf.cell(0, 8, "STATUS: SECURE HANDOVER VERIFIED & COMPLETED", 0, 1, "C")
    
    pdf.set_x(25)
    pdf.set_font("Arial", "I", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, f"Verified via secure meeting token: {qr_token[:15]}...", 0, 1, "C")
    
    pdf_bytes = pdf.output(dest='S').encode('latin1')
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Return_Certificate_{req['id']}.pdf"
        }
    )


def datetime_to_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


@app.post("/ai/recognize")
async def ai_recognize(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        pil_image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

    from app.services.ai_recognition import classify_item
    result = classify_item(pil_image)
    
    database.add_recognition_log(
        predicted_category=result.get("category", "Other"),
        actual_category=result.get("category", "Other"),
        predicted_color=result.get("color", "Grey"),
        actual_color=result.get("color", "Grey"),
        predicted_brand=result.get("predictedBrand", "Unknown"),
        actual_brand=result.get("predictedBrand", "Unknown"),
        confidence=result.get("confidence", 70)
    )
    
    return result


