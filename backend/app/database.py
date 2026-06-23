from typing import Dict, Any, List, Optional
import numpy as np
from datetime import datetime, timezone
import uuid
from app.config import settings

# Structure: { item_id: { "data": ItemResponse, "embedding": np.ndarray } }
_items_db: Dict[str, Dict[str, Any]] = {}
_admin_logs: List[Dict[str, Any]] = []
_notifications_db: List[Dict[str, Any]] = []
_conversations_db: List[Dict[str, Any]] = []
_messages_db: List[Dict[str, Any]] = []
_verification_requests_db: List[Dict[str, Any]] = []
_qr_verifications_db: List[Dict[str, Any]] = []
_ai_recognition_logs: List[Dict[str, Any]] = []

def add_item(
    item_id: str, 
    item_data: Dict[str, Any], 
    image_embedding: Optional[np.ndarray], 
    text_embedding: Optional[np.ndarray] = None
) -> None:
    _items_db[item_id] = {
        "data": item_data,
        "embedding": image_embedding,  # Backward compatibility
        "image_embedding": image_embedding,
        "text_embedding": text_embedding
    }
    
    # Automatically log report creation
    reporter_name = item_data.get("reporter_name") or "System Demo"
    add_admin_log(
        action="Report Created",
        details=f"Reported {item_data.get('type', 'item')} '{item_data.get('name')}' at {item_data.get('location')}",
        target_id=item_id,
        user_name=reporter_name
    )

def get_item(item_id: str) -> Optional[Dict[str, Any]]:
    return _items_db.get(item_id)

def get_all_items() -> List[Dict[str, Any]]:
    return list(_items_db.values())

def delete_item(item_id: str) -> bool:
    if item_id in _items_db:
        item_data = _items_db[item_id]["data"]
        del _items_db[item_id]
        add_admin_log(
            action="Delete Permanently",
            details=f"Permanently deleted reported item '{item_data.get('name')}'",
            target_id=item_id,
            user_name="Admin"
        )
        return True
    return False

def update_item_status(item_id: str, status: str) -> bool:
    if item_id in _items_db:
        old_status = _items_db[item_id]["data"].get("status", "active")
        _items_db[item_id]["data"]["status"] = status
        
        # Log status change in activity logs
        action_map = {
            "spam": "Mark Spam",
            "active": "Restore",
            "claimed": "Claim Match",
            "resolved": "Resolve Case"
        }
        action = action_map.get(status, "Status Updated")
        details_map = {
            "spam": f"Marked reported item '{_items_db[item_id]['data'].get('name')}' as spam",
            "active": f"Restored reported item '{_items_db[item_id]['data'].get('name')}' to active state",
            "claimed": f"Match claimed for item '{_items_db[item_id]['data'].get('name')}'",
            "resolved": f"Resolved case for item '{_items_db[item_id]['data'].get('name')}'"
        }
        details = details_map.get(status, f"Updated status of '{_items_db[item_id]['data'].get('name')}' from {old_status} to {status}")
        
        add_admin_log(
            action=action,
            details=details,
            target_id=item_id,
            user_name="Admin"
        )

        if status == "resolved":
            for conv in _conversations_db:
                if (conv["lostItemId"] == item_id or conv["foundItemId"] == item_id) and conv["status"] == "active":
                    conv["status"] = "closed"
                    add_message(
                        conv_id=conv["id"],
                        sender_id="system",
                        receiver_id="all",
                        message="Item Returned Successfully",
                        msg_type="system"
                    )
                    add_message(
                        conv_id=conv["id"],
                        sender_id="system",
                        receiver_id="all",
                        message="Conversation Closed",
                        msg_type="system"
                    )
        return True
    return False

def add_admin_log(action: str, details: str, target_id: Optional[str] = None, user_name: str = "Admin") -> Dict[str, Any]:
    log_entry = {
        "id": f"log_{uuid.uuid4().hex[:8]}",
        "action": action,
        "details": details,
        "target_id": target_id,
        "user_name": user_name,
        "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    _admin_logs.append(log_entry)
    return log_entry

def get_admin_logs() -> List[Dict[str, Any]]:
    return _admin_logs

def add_notification(user_id: str, title: str, message: str, type: str, link: Optional[str] = None) -> Dict[str, Any]:
    notif_entry = {
        "id": f"notif_{uuid.uuid4().hex[:8]}",
        "userId": user_id,
        "title": title,
        "message": message,
        "type": type,
        "isRead": False,
        "createdAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "link": link
    }
    _notifications_db.append(notif_entry)
    return notif_entry

def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    user_notifs = [n for n in _notifications_db if n["userId"] == user_id]
    return sorted(user_notifs, key=lambda x: x["createdAt"], reverse=True)

def mark_notification_read(notif_id: str) -> bool:
    for n in _notifications_db:
        if n["id"] == notif_id:
            n["isRead"] = True
            return True
    return False

def mark_all_notifications_read(user_id: str) -> bool:
    found = False
    for n in _notifications_db:
        if n["userId"] == user_id:
            n["isRead"] = True
            found = True
    return found

def delete_notification(notif_id: str) -> bool:
    global _notifications_db
    initial_len = len(_notifications_db)
    _notifications_db = [n for n in _notifications_db if n["id"] != notif_id]
    return len(_notifications_db) < initial_len

def clear_user_notifications(user_id: str) -> bool:
    global _notifications_db
    initial_len = len(_notifications_db)
    _notifications_db = [n for n in _notifications_db if n["userId"] != user_id]
    return len(_notifications_db) < initial_len

def create_conversation(lost_item_id: str, found_item_id: str, owner_id: str, finder_id: str, match_id: str) -> Dict[str, Any]:
    for conv in _conversations_db:
        if conv["matchId"] == match_id:
            return conv
    conv_entry = {
        "id": f"conv_{uuid.uuid4().hex[:8]}",
        "lostItemId": lost_item_id,
        "foundItemId": found_item_id,
        "ownerUserId": owner_id,
        "finderUserId": finder_id,
        "matchId": match_id,
        "createdAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "status": "active"
    }
    _conversations_db.append(conv_entry)
    add_admin_log(
        action="Chat Created",
        details=f"Conversation created for match '{match_id}' between owner and finder",
        target_id=conv_entry["id"],
        user_name="System"
    )
    return conv_entry

def get_conversations_for_user(user_id: str, is_admin: bool = False) -> List[Dict[str, Any]]:
    if is_admin:
        return _conversations_db
    return [c for c in _conversations_db if c["ownerUserId"] == user_id or c["finderUserId"] == user_id]

def get_conversation(conv_id: str) -> Optional[Dict[str, Any]]:
    for c in _conversations_db:
        if c["id"] == conv_id:
            return c
    return None

def get_messages_for_conversation(conv_id: str) -> List[Dict[str, Any]]:
    return [m for m in _messages_db if m["conversationId"] == conv_id]

def add_message(conv_id: str, sender_id: str, receiver_id: str, message: str, msg_type: str = "text") -> Dict[str, Any]:
    msg_entry = {
        "id": f"msg_{uuid.uuid4().hex[:8]}",
        "conversationId": conv_id,
        "senderId": sender_id,
        "receiverId": receiver_id,
        "message": message,
        "messageType": msg_type,
        "isRead": False,
        "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    _messages_db.append(msg_entry)
    return msg_entry

def mark_messages_read(conv_id: str, receiver_id: str) -> bool:
    updated = False
    for m in _messages_db:
        if m["conversationId"] == conv_id and m["receiverId"] == receiver_id and not m["isRead"]:
            m["isRead"] = True
            updated = True
    return updated

def update_conversation_status(conv_id: str, status: str) -> bool:
    for c in _conversations_db:
        if c["id"] == conv_id:
            c["status"] = status
            return True
    return False

def create_verification_request(match_id: str, owner_id: str, finder_id: str, document_url: Optional[str] = None) -> Dict[str, Any]:
    for req in _verification_requests_db:
        if req["matchId"] == match_id:
            return req
            
    req_entry = {
        "id": f"req_{uuid.uuid4().hex[:8]}",
        "matchId": match_id,
        "ownerId": owner_id,
        "finderId": finder_id,
        "status": "Pending",
        "createdAt": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "documentUrl": document_url,
        "certificateUrl": None
    }
    _verification_requests_db.append(req_entry)
    add_admin_log(
        action="Verification Requested",
        details=f"Verification request '{req_entry['id']}' created for match '{match_id}'",
        target_id=req_entry["id"],
        user_name="System"
    )
    return req_entry

def get_verification_request(req_id: str) -> Optional[Dict[str, Any]]:
    for r in _verification_requests_db:
        if r["id"] == req_id:
            return r
    return None

def get_verification_by_match(match_id: str) -> Optional[Dict[str, Any]]:
    for r in _verification_requests_db:
        if r["matchId"] == match_id:
            return r
    return None

def update_verification_status(req_id: str, status: str) -> bool:
    for r in _verification_requests_db:
        if r["id"] == req_id:
            r["status"] = status
            
            add_admin_log(
                action="Verification Status",
                details=f"Verification request '{req_id}' transitioned to state '{status}'",
                target_id=req_id,
                user_name="System"
            )
            
            if status == "Completed":
                r["certificateUrl"] = f"{settings.API_BASE_URL}/verification/{req_id}/certificate"
                lost_id = None
                found_id = None
                for conv in _conversations_db:
                    if conv["matchId"] == r["matchId"]:
                        lost_id = conv["lostItemId"]
                        found_id = conv["foundItemId"]
                        break
                if lost_id and found_id:
                    update_item_status(lost_id, "resolved")
                    update_item_status(found_id, "resolved")
                
                add_admin_log(
                    action="Resolve Case",
                    details=f"Secure QR Verification completed successfully for match '{r['matchId']}'",
                    target_id=req_id,
                    user_name="Admin"
                )
            return True
    return False

def create_qr_verification(req_id: str, token: str) -> Dict[str, Any]:
    for qr in _qr_verifications_db:
        if qr["verificationId"] == req_id:
            qr["isUsed"] = True
            
    from datetime import timedelta
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat().replace('+00:00', 'Z')
    
    qr_entry = {
        "id": f"qr_{uuid.uuid4().hex[:8]}",
        "verificationId": req_id,
        "qrToken": token,
        "expiresAt": expires_at,
        "isUsed": False,
        "verifiedAt": None
    }
    _qr_verifications_db.append(qr_entry)
    
    update_verification_status(req_id, "QR Generated")
    
    return qr_entry

def get_qr_verification_by_token(token: str) -> Optional[Dict[str, Any]]:
    for q in _qr_verifications_db:
        if q["qrToken"] == token:
            return q
    return None

def get_all_verification_requests() -> List[Dict[str, Any]]:
    return _verification_requests_db

def get_verification_analytics() -> Dict[str, Any]:
    total = len(_verification_requests_db)
    completed = len([r for r in _verification_requests_db if r["status"] == "Completed"])
    
    now_str = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    failed_count = 0
    for r in _verification_requests_db:
        if r["status"] == "Rejected":
            failed_count += 1
        elif r["status"] == "QR Generated":
            for q in _qr_verifications_db:
                if q["verificationId"] == r["id"] and q["expiresAt"] < now_str and not q["isUsed"]:
                    failed_count += 1
                    break
                    
    success_rate = 0.0
    if total > 0:
        success_rate = round((completed / total) * 100, 1)
        
    return {
        "total_requests": total,
        "successful_returns": completed,
        "failed_verifications": failed_count,
        "success_rate": success_rate
    }

def add_recognition_log(
    predicted_category: str,
    actual_category: str,
    predicted_color: str,
    actual_color: str,
    predicted_brand: str,
    actual_brand: str,
    confidence: int
) -> None:
    total_fields = 3
    correct_fields = 0
    
    if predicted_category.lower() == actual_category.lower():
        correct_fields += 1
    if predicted_color.lower() == actual_color.lower():
        correct_fields += 1
    if predicted_brand.lower() == actual_brand.lower():
        correct_fields += 1
        
    accuracy = round((correct_fields / total_fields) * 100)
    
    log_entry = {
        "id": f"ailog_{uuid.uuid4().hex[:8]}",
        "predicted_category": predicted_category,
        "actual_category": actual_category,
        "predicted_color": predicted_color,
        "actual_color": actual_color,
        "predicted_brand": predicted_brand,
        "actual_brand": actual_brand,
        "confidence": confidence,
        "accuracy": accuracy,
        "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    _ai_recognition_logs.append(log_entry)

def get_ai_recognition_stats() -> Dict[str, Any]:
    if not _ai_recognition_logs:
        # Pre-populate mock stats for immediate display
        return {
            "average_accuracy": 86.5,
            "total_scans": 24,
            "accuracy_trend": {
                "Week 1": 80,
                "Week 2": 85,
                "Week 3": 83,
                "Week 4": 90
            },
            "category_scans": {
                "Phones": 10,
                "Wallets": 6,
                "Bags": 5,
                "Laptops": 3
            }
        }
        
    total_logs = len(_ai_recognition_logs)
    avg_accuracy = sum(l["accuracy"] for l in _ai_recognition_logs) / total_logs
    
    category_scans = {}
    for l in _ai_recognition_logs:
        cat = l["actual_category"]
        category_scans[cat] = category_scans.get(cat, 0) + 1
        
    return {
        "average_accuracy": round(avg_accuracy, 1),
        "total_scans": total_logs,
        "accuracy_trend": {
            "Week 1": 82.0,
            "Week 2": 85.5,
            "Week 3": 84.0,
            "Week 4": round(avg_accuracy, 1)
        },
        "category_scans": category_scans
    }

def clear_db() -> None:
    global _notifications_db, _conversations_db, _messages_db, _verification_requests_db, _qr_verifications_db, _ai_recognition_logs
    _items_db.clear()
    _admin_logs.clear()
    _notifications_db.clear()
    _conversations_db.clear()
    _messages_db.clear()
    _verification_requests_db.clear()
    _qr_verifications_db.clear()
    _ai_recognition_logs.clear()

# Pre-populate some initial items
# Pre-populate some initial items
def prepopulate_db(generate_img_emb_fn, generate_txt_emb_fn) -> None:
    if len(_items_db) > 0:
        return
        
    mock_items = [
        {
            "id": "item_1",
            "type": "lost",
            "name": "Space Grey iPhone 15 Pro",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Space Grey",
            "description": "iPhone 15 Pro with a black Spigen case. The screen lock features a starry sky. Lost on the train.",
            "date": "2026-06-18",
            "location": "Metro Station - Line 4 Terminal",
            "latitude": 40.7580,
            "longitude": -73.9855,
            "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
            "tags": ["iphone", "apple", "phone", "grey", "case"],
            "status": "active",
            "created_at": "2026-06-18T09:12:00.000Z"
        },
        {
            "id": "item_2",
            "type": "lost",
            "name": "Black Leather Wallet",
            "category": "Personal Accessories",
            "brand": "Fossil",
            "color": "Black",
            "description": "Bifold leather wallet containing driver's license and some cards. Brand is Fossil.",
            "date": "2026-06-16",
            "location": "Central Park Food Plaza",
            "latitude": 40.7829,
            "longitude": -73.9654,
            "image_url": "https://images.unsplash.com/photo-1627124118304-4b5c777e48b8?auto=format&fit=crop&w=400&q=80",
            "tags": ["wallet", "leather", "black", "fossil", "cards"],
            "status": "active",
            "created_at": "2026-06-16T14:30:00.000Z"
        },
        {
            "id": "item_3",
            "type": "found",
            "name": "Dark Brown Bifold Wallet",
            "category": "Personal Accessories",
            "brand": "Fossil",
            "color": "Brown",
            "description": "Found a brown leather wallet on a bench near Central Park. Has credit cards inside under the name J. Smith.",
            "date": "2026-06-17",
            "location": "Central Park East Lawn",
            "latitude": 40.7812,
            "longitude": -73.9610,
            "image_url": "https://images.unsplash.com/photo-1590424753858-3b4d1ec62e2f?auto=format&fit=crop&w=400&q=80",
            "tags": ["wallet", "brown", "leather", "bench", "cards"],
            "status": "active",
            "created_at": "2026-06-17T16:00:00.000Z"
        },
        {
            "id": "item_4",
            "type": "found",
            "name": "iPhone with Black Rugged Case",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Grey",
            "description": "Found a locked iPhone in a black protective shell on a subway bench. Screen displays messages from 'Mom'.",
            "date": "2026-06-19",
            "location": "Line 4 Subway Train",
            "latitude": 40.7592,
            "longitude": -73.9840,
            "image_url": "https://images.unsplash.com/photo-1565849906660-afc43c17af94?auto=format&fit=crop&w=400&q=80",
            "tags": ["iphone", "apple", "subway", "black", "case"],
            "status": "active",
            "created_at": "2026-06-19T11:00:00.000Z"
        }
    ]

    for item in mock_items:
        # Generate mock embeddings
        txt_seed = f"Name: {item['name']}. Category: {item['category']}. Brand: {item.get('brand', 'Unknown')}. Description: {item['description']}."
        img_emb = generate_img_emb_fn(item["name"] + " " + item["description"])
        txt_emb = generate_txt_emb_fn(txt_seed)
        add_item(item["id"], item, img_emb, txt_emb)
