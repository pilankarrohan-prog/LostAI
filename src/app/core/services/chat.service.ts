import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, Subject } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Conversation, ChatMessage } from '../models/item.model';
import { NotificationService } from './notification.service';
import { AuthService } from './auth.service';
import { StorageService } from './storage.service';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  onSnapshot 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private incomingMessageSubject = new Subject<ChatMessage>();
  public incomingMessage$ = this.incomingMessageSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService,
    private authService: AuthService,
    private storageService: StorageService,
    private firestore: Firestore
  ) {}

  getConversations(userId: string): Observable<Conversation[]> {
    return new Observable<Conversation[]>(observer => {
      const conversationsCol = collection(this.firestore, 'conversations');
      const q = query(conversationsCol);

      return onSnapshot(q, {
        next: (snapshot) => {
          const list: Conversation[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const conv: Conversation = {
              id: docSnap.id,
              lostItemId: data['lostItemId'],
              foundItemId: data['foundItemId'],
              ownerUserId: data['ownerUserId'],
              finderUserId: data['finderUserId'],
              matchId: data['matchId'],
              createdAt: data['createdAt'],
              status: data['status'] || 'active'
            };
            if (userId === 'admin' || conv.ownerUserId === userId || conv.finderUserId === userId) {
              list.push(conv);
            }
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          observer.next(list);
        },
        error: (err) => observer.error(err)
      });
    });
  }

  getMessages(conversationId: string, userId: string): Observable<ChatMessage[]> {
    return new Observable<ChatMessage[]>(observer => {
      const messagesCol = collection(this.firestore, 'messages');
      const q = query(messagesCol, where('conversationId', '==', conversationId));

      return onSnapshot(q, {
        next: (snapshot) => {
          const list: ChatMessage[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              conversationId: data['conversationId'],
              senderId: data['senderId'],
              receiverId: data['receiverId'],
              message: data['message'],
              messageType: data['messageType'] || 'text',
              isRead: data['isRead'] || false,
              timestamp: data['timestamp']
            });
          });
          list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          observer.next(list);
        },
        error: (err) => observer.error(err)
      });
    });
  }

  sendMessage(
    conversationId: string, 
    senderId: string, 
    receiverId: string, 
    message: string, 
    type: 'text' | 'image' | 'system' = 'text'
  ): Observable<ChatMessage> {
    const messagesCol = collection(this.firestore, 'messages');
    
    // Upload image to FastAPI backend first if it is base64 data
    const upload$ = (type === 'image' && message.startsWith('data:'))
      ? this.storageService.uploadImage(`chats/${conversationId}/${Date.now()}`, message)
      : of(message);

    return upload$.pipe(
      switchMap(finalMessage => {
        const msgData = {
          conversationId,
          senderId,
          receiverId,
          message: finalMessage,
          messageType: type,
          isRead: false,
          timestamp: new Date().toISOString()
        };

        return from(addDoc(messagesCol, msgData)).pipe(
          map(ref => {
            const newMsg: ChatMessage = {
              id: ref.id,
              ...msgData
            };

            // Emit message locally
            this.incomingMessageSubject.next(newMsg);

            // Add matching notification for receiver
            if (type !== 'system') {
              const snippet = finalMessage.length > 40 ? finalMessage.substring(0, 40) + '...' : finalMessage;
              const notifCol = collection(this.firestore, 'notifications');
              addDoc(notifCol, {
                userId: receiverId,
                title: 'New Chat Message',
                message: `New message: ${snippet}`,
                type: 'message',
                isRead: false,
                createdAt: new Date().toISOString(),
                link: '/chat'
              }).catch(err => {
                console.error('Failed to create chat notification document:', err);
              });
            }

            return newMsg;
          })
        );
      })
    );
  }

  markMessagesRead(conversationId: string, userId: string): Observable<any> {
    const messagesCol = collection(this.firestore, 'messages');
    const q = query(
      messagesCol, 
      where('conversationId', '==', conversationId),
      where('receiverId', '==', userId),
      where('isRead', '==', false)
    );

    return from(getDocs(q)).pipe(
      switchMap(snapshot => {
        const promises: Promise<any>[] = [];
        snapshot.forEach(docSnap => {
          const docRef = doc(this.firestore, 'messages', docSnap.id);
          promises.push(updateDoc(docRef, { isRead: true }));
        });
        return from(Promise.all(promises));
      })
    );
  }

  startConversation(
    lostItemId: string, 
    foundItemId: string, 
    ownerUserId: string, 
    finderUserId: string, 
    matchId: string
  ): Observable<Conversation> {
    const conversationsCol = collection(this.firestore, 'conversations');
    const convData = {
      lostItemId,
      foundItemId,
      ownerUserId,
      finderUserId,
      matchId,
      createdAt: new Date().toISOString(),
      status: 'active' as const
    };

    return from(addDoc(conversationsCol, convData)).pipe(
      switchMap(ref => {
        const newConv: Conversation = {
          id: ref.id,
          ...convData
        };

        // Add system message
        const messagesCol = collection(this.firestore, 'messages');
        const sysMsgData = {
          conversationId: ref.id,
          senderId: 'system',
          receiverId: 'all',
          message: 'AI Match Found',
          messageType: 'system' as const,
          isRead: true,
          timestamp: new Date().toISOString()
        };

        return from(addDoc(messagesCol, sysMsgData)).pipe(
          map(() => newConv)
        );
      })
    );
  }

  getAdminChatStats(): Observable<any> {
    const conversationsCol = collection(this.firestore, 'conversations');
    const messagesCol = collection(this.firestore, 'messages');

    return from(Promise.all([
      getDocs(conversationsCol),
      getDocs(messagesCol)
    ])).pipe(
      map(([convsSnap, msgsSnap]) => {
        const total_convs = convsSnap.size;
        let active_convs = 0;
        let resolved_convs = 0;
        convsSnap.forEach(docSnap => {
          const status = docSnap.data()['status'];
          if (status === 'closed') resolved_convs++;
          else active_convs++;
        });
        const total_msgs = msgsSnap.size;
        const success_rate = total_convs > 0 ? parseFloat(((resolved_convs / total_convs) * 100).toFixed(1)) : 0.0;

        return {
          total_conversations: total_convs,
          active_conversations: active_convs,
          resolved_conversations: resolved_convs,
          messages_sent: total_msgs,
          success_rate: success_rate
        };
      })
    );
  }
}
