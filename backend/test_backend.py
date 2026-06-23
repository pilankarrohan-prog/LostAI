from fastapi.testclient import TestClient
import io
from PIL import Image

try:
    from app.main import app
    client = TestClient(app)
except Exception as e:
    print(f"Failed to load FastAPI TestClient. Ensure dependencies are active: {e}")
    client = None

def test_api_flow():
    if client is None:
        print("Skipping tests because client is not initialized.")
        return

    print("Running Backend REST API flow tests...")

    # 1. Create a dummy image in memory
    img = Image.new('RGB', (100, 100), color='red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()

    # 2. Register a lost wallet
    lost_response = client.post(
        "/lost-item",
        data={
            "name": "Red Leather Wallet",
            "category": "Personal Accessories",
            "brand": "Fossil",
            "color": "Red",
            "description": "Lost my red leather Fossil wallet with cash.",
            "date": "2026-06-19",
            "location": "Main Street Starbucks",
            "latitude": 40.7589,
            "longitude": -73.9851
        },
        files={"image": ("wallet.jpg", img_bytes, "image/jpeg")}
    )
    
    assert lost_response.status_code == 200, f"Failed lost-item post: {lost_response.text}"
    lost_data = lost_response.json()
    lost_id = lost_data["id"]
    print(f"[OK] Success: Registered lost item. ID = {lost_id}")
    assert lost_data["type"] == "lost"
    assert lost_data["brand"] == "Fossil"
    assert lost_data["latitude"] == 40.7589
    assert lost_data["longitude"] == -73.9851

    # 3. Register a found wallet (match candidate)
    found_response = client.post(
        "/found-item",
        data={
            "name": "Found Leather Wallet",
            "category": "Personal Accessories",
            "brand": "Fossil",
            "color": "Black",
            "description": "Found a red leather bifold wallet on a bench",
            "date": "2026-06-19",
            "location": "Main Street Starbucks",
            "latitude": 40.7589,
            "longitude": -73.9851
        },
        files={"image": ("wallet_found.jpg", img_bytes, "image/jpeg")}
    )
    
    assert found_response.status_code == 200, f"Failed found-item post: {found_response.text}"
    found_data = found_response.json()
    found_id = found_data["id"]
    print(f"[OK] Success: Registered found item. ID = {found_id}")
    assert found_data["latitude"] == 40.7589
    assert found_data["longitude"] == -73.9851

    # 4. Fetch similarity matches for the lost wallet
    matches_response = client.get(f"/matches/{lost_id}")
    assert matches_response.status_code == 200, f"Failed matches retrieve: {matches_response.text}"
    matches_data = matches_response.json()
    
    print("[OK] Success: Matches checklist retrieved successfully:")
    matches = matches_data["matches"]
    assert len(matches) > 0, "No matches found"
    
    for match in matches:
        print(f"   - Match: {match['item']['name']} ({match['item']['color']}) at {match['item']['location']}")
        print(f"     Similarity Score: {match['similarity_score']}%")
        print(f"     Matched fields: {match['matched_fields']}")
        print(f"     Overall Confidence: {match['overallConfidence']}%")
        print(f"     Confidence Level: {match['confidenceLevel']}")
        print(f"     Explanation: {match['explanation']}")
        print(f"     Text Similarity: {match['textSimilarity']}")
        
        assert match['similarity_score'] >= 40.0
        assert match['overallConfidence'] >= 40.0
        assert match['confidenceLevel'] in ["High Match", "Medium Match", "Low Match"]
        assert len(match['explanation']) > 0
        assert isinstance(match['textSimilarity'], float)
        assert match['overallConfidence'] == match['similarity_score']

    # 5. Notifications API Integration Tests
    print("Running Notifications API flow tests...")
    
    # POST a custom system notification
    notif_post = client.post(
        "/notifications",
        json={
            "userId": "test_user_123",
            "title": "Welcome Alert",
            "message": "Welcome to the real-time notifications test!",
            "type": "system",
            "link": "/dashboard"
        }
    )
    assert notif_post.status_code == 200, f"Failed notifications post: {notif_post.text}"
    notif_data = notif_post.json()
    notif_id = notif_data["id"]
    print(f"   - Created Notification ID = {notif_id}")
    assert notif_data["userId"] == "test_user_123"
    assert notif_data["title"] == "Welcome Alert"
    assert notif_data["isRead"] is False
    
    # GET user notifications
    notifs_get = client.get("/notifications/test_user_123")
    assert notifs_get.status_code == 200, f"Failed notifications retrieve: {notifs_get.text}"
    notifs_list = notifs_get.json()
    assert len(notifs_list) > 0, "Retrieve list is empty"
    assert notifs_list[0]["id"] == notif_id
    print(f"   - Retrieved {len(notifs_list)} user notifications successfully")

    # PUT mark notification as read
    read_put = client.put(f"/notifications/{notif_id}/read")
    assert read_put.status_code == 200, f"Failed mark read: {read_put.text}"
    
    # GET user notifications again to assert read state is true
    notifs_get2 = client.get("/notifications/test_user_123")
    assert notifs_get2.status_code == 200
    notifs_list2 = notifs_get2.json()
    assert notifs_list2[0]["isRead"] is True
    print("   - Marked notification as read successfully")

    # PUT mark all read
    read_all_put = client.put("/notifications/user/test_user_123/read-all")
    assert read_all_put.status_code == 200, f"Failed mark all read: {read_all_put.text}"
    print("   - Marked all read successfully")

    # DELETE notification
    delete_res = client.delete(f"/notifications/{notif_id}")
    assert delete_res.status_code == 200, f"Failed delete: {delete_res.text}"
    
    # GET user notifications to assert empty
    notifs_get3 = client.get("/notifications/test_user_123")
    assert notifs_get3.status_code == 200
    assert len(notifs_get3.json()) == 0
    print("   - Deleted notification successfully")

    # 6. Secure Chat API Flow Tests
    print("Running Secure Chat API flow tests...")
    
    # POST /conversations: Start conversation for matched wallet items
    match_id = f"match_{lost_id}_{found_id}"
    conv_post = client.post(
        "/conversations",
        json={
            "lostItemId": lost_id,
            "foundItemId": found_id,
            "ownerUserId": "test_owner",
            "finderUserId": "test_finder",
            "matchId": match_id
        }
    )
    assert conv_post.status_code == 200, f"Failed conversation post: {conv_post.text}"
    conv_data = conv_post.json()
    conv_id = conv_data["id"]
    print(f"   - Created Conversation ID = {conv_id}")
    assert conv_data["status"] == "active"
    assert conv_data["ownerUserId"] == "test_owner"
    assert conv_data["finderUserId"] == "test_finder"

    # POST /conversations with invalid match or low confidence (expect rejection)
    invalid_conv_post = client.post(
        "/conversations",
        json={
            "lostItemId": "item_nonexistent",
            "foundItemId": found_id,
            "ownerUserId": "test_owner",
            "finderUserId": "test_finder",
            "matchId": "invalid_match"
        }
    )
    assert invalid_conv_post.status_code == 400 or invalid_conv_post.status_code == 404 or invalid_conv_post.status_code == 403, "Invalid match should be rejected"
    print("   - Conversation rejection for nonexistent items works as expected")

    # POST /messages: Send message as participant
    msg_post = client.post(
        "/messages",
        json={
            "conversationId": conv_id,
            "senderId": "test_owner",
            "receiverId": "test_finder",
            "message": "Hello, I think you have my red Fossil wallet.",
            "messageType": "text"
        }
    )
    assert msg_post.status_code == 200, f"Failed to send message: {msg_post.text}"
    msg_data = msg_post.json()
    msg_id = msg_data["id"]
    print(f"   - Message sent successfully. Message ID = {msg_id}")
    assert msg_data["isRead"] is False

    # POST /messages: Send message as Admin (expect 403 Forbidden - read-only audit)
    admin_msg_post = client.post(
        "/messages",
        json={
            "conversationId": conv_id,
            "senderId": "admin",
            "receiverId": "test_finder",
            "message": "Let me intervene here.",
            "messageType": "text"
        }
    )
    assert admin_msg_post.status_code == 403, "Admins should be prohibited from sending messages"
    print("   - Admin send prohibition verified successfully (read-only audit)")

    # POST /messages: Send message as outsider (expect 403 Forbidden)
    outsider_msg_post = client.post(
        "/messages",
        json={
            "conversationId": conv_id,
            "senderId": "outsider_user",
            "receiverId": "test_finder",
            "message": "Spam message",
            "messageType": "text"
        }
    )
    assert outsider_msg_post.status_code == 403, "Non-participants should be prohibited from sending messages"
    print("   - Non-participant message send prohibition verified successfully")

    # GET /messages/{conversationId}: Fetch messages as participant
    owner_messages_get = client.get(f"/messages/{conv_id}?user_id=test_owner")
    assert owner_messages_get.status_code == 200, f"Failed to get messages: {owner_messages_get.text}"
    owner_msgs = owner_messages_get.json()
    assert len(owner_msgs) > 0
    print(f"   - Participant successfully retrieved {len(owner_msgs)} messages")

    # GET /messages/{conversationId}: Fetch messages as outsider (expect 403 Forbidden)
    outsider_messages_get = client.get(f"/messages/{conv_id}?user_id=outsider_user")
    assert outsider_messages_get.status_code == 403, "Outsider should not be allowed to read thread"
    print("   - Outsider read prohibition verified successfully")

    # GET /messages/{conversationId}: Fetch messages as Admin (expect 200 - read-only audit)
    admin_messages_get = client.get(f"/messages/{conv_id}?user_id=admin")
    assert admin_messages_get.status_code == 200, "Admins should be allowed to audit messages"
    print("   - Admin read-only access verified successfully")

    # PUT /messages/read: Mark messages as read
    read_receipt_put = client.put(f"/messages/read?conversation_id={conv_id}&user_id=test_finder")
    assert read_receipt_put.status_code == 200
    print("   - Read receipts marked successfully")

    # GET /admin/chat/stats: Check dashboard statistics
    chat_stats_get = client.get("/admin/chat/stats")
    assert chat_stats_get.status_code == 200
    stats_data = chat_stats_get.json()
    assert stats_data["total_conversations"] >= 1
    assert stats_data["messages_sent"] >= 1
    print(f"   - Retrieved Admin Chat Stats successfully: {stats_data}")

    # 7. Verification API Integration Tests
    print("Running Verification API flow tests...")

    # A. Creating verification requests rejects matches with < 80% confidence
    # The first match (match_id) has confidence 70.5% (which is < 80%)
    req_fail_post = client.post(
        "/verification/request",
        json={
            "matchId": match_id,
            "ownerId": "test_owner",
            "finderId": "test_finder"
        }
    )
    assert req_fail_post.status_code == 403, f"Expected 403 Forbidden for low confidence match, got {req_fail_post.status_code}"
    print("   - Request rejected for match confidence < 80% as expected")

    # B. Create a high confidence match (>= 80%)
    # Let's register a new high confidence pair
    high_lost_response = client.post(
        "/lost-item",
        data={
            "name": "High Match iPhone",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Black",
            "description": "High match description test.",
            "date": "2026-06-20",
            "location": "Metro Station",
            "latitude": 40.7580,
            "longitude": -73.9855
        },
        files={"image": ("iphone.jpg", img_bytes, "image/jpeg")}
    )
    assert high_lost_response.status_code == 200
    high_lost_id = high_lost_response.json()["id"]

    high_found_response = client.post(
        "/found-item",
        data={
            "name": "High Match iPhone",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Black",
            "description": "High match description test.",
            "date": "2026-06-20",
            "location": "Metro Station",
            "latitude": 40.7580,
            "longitude": -73.9855
        },
        files={"image": ("iphone_found.jpg", img_bytes, "image/jpeg")}
    )
    assert high_found_response.status_code == 200
    high_found_id = high_found_response.json()["id"]

    # Verify that the match confidence is >= 80%
    high_matches_response = client.get(f"/matches/{high_lost_id}")
    assert high_matches_response.status_code == 200
    high_matches_data = high_matches_response.json()
    high_match_candidate = high_matches_data["matches"][0]
    high_match_score = high_match_candidate["overallConfidence"]
    assert high_match_score >= 80.0, f"Expected match confidence >= 80%, got {high_match_score}"
    print(f"   - Generated high-confidence match: {high_match_score}%")

    # Start conversation first (required by verification/request)
    high_match_id = f"match_{high_lost_id}_{high_found_id}"
    high_conv_post = client.post(
        "/conversations",
        json={
            "lostItemId": high_lost_id,
            "foundItemId": high_found_id,
            "ownerUserId": "high_owner",
            "finderUserId": "high_finder",
            "matchId": high_match_id
        }
    )
    assert high_conv_post.status_code == 200
    high_conv_id = high_conv_post.json()["id"]

    # C. Successful request creation sets status to Pending and pushes notifications
    req_success_post = client.post(
        "/verification/request",
        json={
            "matchId": high_match_id,
            "ownerId": "high_owner",
            "finderId": "high_finder"
        }
    )
    assert req_success_post.status_code == 200, f"Failed verification request: {req_success_post.text}"
    req_data = req_success_post.json()
    req_id = req_data["id"]
    assert req_data["status"] == "Pending"
    print(f"   - Created verification request ID = {req_id} with status Pending")

    # Verify finder received notification
    finder_notifs = client.get("/notifications/high_finder")
    assert finder_notifs.status_code == 200
    assert any(n["type"] == "match" and "Verification Requested" in n["title"] for n in finder_notifs.json())
    print("   - Verified finder received request notification")

    # D. Successful request approval transitions to Approved and pushes notifications
    approve_post = client.post(
        "/verification/approve",
        json={"requestId": req_id}
    )
    assert approve_post.status_code == 200, f"Failed verification approval: {approve_post.text}"
    assert approve_post.json()["status"] == "Approved"
    print("   - Verification request approved by finder")

    # Verify owner received notification
    owner_notifs = client.get("/notifications/high_owner")
    assert owner_notifs.status_code == 200
    assert any(n["type"] == "match" and "Verification Approved" in n["title"] for n in owner_notifs.json())
    print("   - Verified owner received approval notification")

    # E. Successful QR code generation transitions status to QR Generated
    qr_gen_post = client.post(
        "/verification/generate-qr",
        json={"requestId": req_id}
    )
    assert qr_gen_post.status_code == 200, f"Failed QR generation: {qr_gen_post.text}"
    qr_data = qr_gen_post.json()
    qr_token = qr_data["qrToken"]
    assert qr_token is not None
    print(f"   - Generated QR code with token: {qr_token}")

    # Verify status in request is QR Generated
    req_status_get = client.get(f"/verification/{req_id}")
    assert req_status_get.status_code == 200
    assert req_status_get.json()["status"] == "QR Generated"
    print("   - Verified request status transitioned to 'QR Generated'")

    # F. Verify scanning validation rules
    # 1. Scanning with invalid token rejects
    scan_invalid = client.post(
        "/verification/scan",
        json={
            "qrToken": "invalid_token_12345",
            "ownerId": "high_owner"
        }
    )
    assert scan_invalid.status_code == 404, f"Expected 404 for invalid token, got {scan_invalid.status_code}"

    # 2. Scanning with incorrect ownerId rejects
    scan_bad_owner = client.post(
        "/verification/scan",
        json={
            "qrToken": qr_token,
            "ownerId": "outsider_owner"
        }
    )
    assert scan_bad_owner.status_code == 403, f"Expected 403 for mismatch ownerId, got {scan_bad_owner.status_code}"
    print("   - Checked scanner owner identity verification rejects mismatched claimant")

    # G. Successful scan transitions status to Completed, marks items resolved, closes chat
    scan_success = client.post(
        "/verification/scan",
        json={
            "qrToken": qr_token,
            "ownerId": "high_owner"
        }
    )
    assert scan_success.status_code == 200, f"Scan failed: {scan_success.text}"
    assert scan_success.json()["status"] == "Completed"
    print("   - Successfully scanned and verified exchange!")

    # Verify items are resolved
    lost_item_check = client.get(f"/matches/{high_lost_id}")
    assert lost_item_check.status_code == 200
    assert lost_item_check.json()["target_item"]["status"] == "resolved", f"Expected lost item to be resolved, got {lost_item_check.json()['target_item']['status']}"
    print("   - Verified lost item status transitioned to 'resolved'")

    # Verify conversation is closed and system messages appended
    high_conv_check = client.get(f"/conversations/high_owner")
    assert high_conv_check.status_code == 200
    high_convs = high_conv_check.json()
    assert any(c["id"] == high_conv_id and c["status"] == "closed" for c in high_convs), "Expected high match conversation to be closed"
    print("   - Verified coordination conversation status is 'closed'")

    high_messages_check = client.get(f"/messages/{high_conv_id}?user_id=high_owner")
    assert high_messages_check.status_code == 200
    high_msgs = high_messages_check.json()
    assert any(m["message"] == "Item Returned Successfully" and m["messageType"] == "system" for m in high_msgs)
    assert any(m["message"] == "Conversation Closed" and m["messageType"] == "system" for m in high_msgs)
    print("   - Verified system messages appended to conversation thread")

    # Verify activity logs appended
    admin_logs_check = client.get("/admin/logs")
    assert admin_logs_check.status_code == 200
    logs_list = admin_logs_check.json()
    assert any(l["action"] == "Resolve Case" and "Verification completed successfully" in l["details"] for l in logs_list)
    print("   - Verified administrative audit logs appended successfully")

    # H. Verify double use check
    scan_double = client.post(
        "/verification/scan",
        json={
            "qrToken": qr_token,
            "ownerId": "high_owner"
        }
    )
    assert scan_double.status_code == 400, f"Expected 400 for double usage check, got {scan_double.status_code}"
    assert "already been used" in scan_double.json()["detail"]
    print("   - Double usage verification check passed (rejected)")

    # I. Verify 24h expiration check
    # Register a third lost/found pair to generate a new verification and QR code
    exp_lost_response = client.post(
        "/lost-item",
        data={
            "name": "Exp Match iPhone",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Black",
            "description": "Exp match description test.",
            "date": "2026-06-20",
            "location": "Metro Station",
            "latitude": 40.7580,
            "longitude": -73.9855
        },
        files={"image": ("iphone.jpg", img_bytes, "image/jpeg")}
    )
    assert exp_lost_response.status_code == 200
    exp_lost_id = exp_lost_response.json()["id"]

    exp_found_response = client.post(
        "/found-item",
        data={
            "name": "Exp Match iPhone",
            "category": "Electronics",
            "brand": "Apple",
            "color": "Black",
            "description": "Exp match description test.",
            "date": "2026-06-20",
            "location": "Metro Station",
            "latitude": 40.7580,
            "longitude": -73.9855
        },
        files={"image": ("iphone_found.jpg", img_bytes, "image/jpeg")}
    )
    assert exp_found_response.status_code == 200
    exp_found_id = exp_found_response.json()["id"]

    exp_match_id = f"match_{exp_lost_id}_{exp_found_id}"
    exp_conv_post = client.post(
        "/conversations",
        json={
            "lostItemId": exp_lost_id,
            "foundItemId": exp_found_id,
            "ownerUserId": "exp_owner",
            "finderUserId": "exp_finder",
            "matchId": exp_match_id
        }
    )
    assert exp_conv_post.status_code == 200
    exp_conv_id = exp_conv_post.json()["id"]

    exp_req_post = client.post(
        "/verification/request",
        json={
            "matchId": exp_match_id,
            "ownerId": "exp_owner",
            "finderId": "exp_finder"
        }
    )
    assert exp_req_post.status_code == 200
    exp_req_id = exp_req_post.json()["id"]

    client.post(
        "/verification/approve",
        json={"requestId": exp_req_id}
    )

    exp_qr_post = client.post(
        "/verification/generate-qr",
        json={"requestId": exp_req_id}
    )
    assert exp_qr_post.status_code == 200
    exp_qr_token = exp_qr_post.json()["qrToken"]

    # Manually modify expiration in database
    from app import database
    for q in database._qr_verifications_db:
        if q["qrToken"] == exp_qr_token:
            q["expiresAt"] = "2020-01-01T00:00:00Z"
            break

    # Scan expired token
    scan_expired = client.post(
        "/verification/scan",
        json={
            "qrToken": exp_qr_token,
            "ownerId": "exp_owner"
        }
    )
    assert scan_expired.status_code == 400, f"Expected 400 for expired QR code, got {scan_expired.status_code}"
    assert "expired" in scan_expired.json()["detail"]
    print("   - Expiration validation check passed (rejected)")

    # J. Verify Return Certificate PDF streaming
    cert_response = client.get(f"/verification/{req_id}/certificate")
    assert cert_response.status_code == 200
    assert cert_response.headers.get("content-type") == "application/pdf"
    assert len(cert_response.content) > 0
    assert cert_response.content.startswith(b"%PDF")
    print("   - Verification Return Certificate PDF binary stream checked successfully")

    # Verify that downloading certificate for non-completed verification fails
    cert_fail_response = client.get(f"/verification/{exp_req_id}/certificate")
    assert cert_fail_response.status_code == 400
    assert "only available for Completed" in cert_fail_response.json()["detail"]
    print("   - Locked Return Certificate check passed (rejected)")

    # 8. AI Recognition API Integration Tests
    print("Running AI Recognition API integration tests...")
    recognize_res = client.post(
        "/ai/recognize",
        files={"image": ("phone.jpg", img_bytes, "image/jpeg")}
    )
    assert recognize_res.status_code == 200, f"Failed AI recognition request: {recognize_res.text}"
    recognize_data = recognize_res.json()
    assert "category" in recognize_data
    assert "color" in recognize_data
    assert "predictedBrand" in recognize_data
    assert "confidence" in recognize_data
    print(f"   - Recognized Category: {recognize_data['category']}")
    print(f"   - Recognized Color: {recognize_data['color']}")
    print(f"   - Recognized Brand: {recognize_data['predictedBrand']}")
    print(f"   - Confidence: {recognize_data['confidence']}%")

    print("All backend API flow tests completed successfully!")

if __name__ == "__main__":
    test_api_flow()
