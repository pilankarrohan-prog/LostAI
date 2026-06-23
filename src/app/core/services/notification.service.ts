import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { NotificationItem, ChatMessage } from '../models/item.model';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private notificationsSubject = new BehaviorSubject<NotificationItem[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  
  private toastAlertsSubject = new Subject<NotificationItem>();
  public toastAlerts$ = this.toastAlertsSubject.asObservable();

  private chatMessageSubject = new Subject<ChatMessage>();
  public chatMessageEvents$ = this.chatMessageSubject.asObservable();
  
  private unsubscribeFn: (() => void) | null = null;

  constructor(
    private authService: AuthService,
    private firestore: Firestore
  ) {
    this.setupNotificationChannel();
  }

  ngOnDestroy(): void {
    this.unsubscribeFromNotifications();
  }

  private setupNotificationChannel() {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.subscribeToNotifications(user.id);
      } else {
        this.unsubscribeFromNotifications();
        this.notificationsSubject.next([]);
      }
    });
  }

  private subscribeToNotifications(userId: string) {
    this.unsubscribeFromNotifications();

    console.log('[Firestore] Subscribing to real-time notifications for user:', userId);
    const notifCollection = collection(this.firestore, 'notifications');
    const q = query(notifCollection, where('userId', '==', userId));

    this.unsubscribeFn = onSnapshot(q, {
      next: (snapshot) => {
        const list: NotificationItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            userId: data['userId'],
            title: data['title'],
            message: data['message'],
            type: data['type'],
            isRead: data['isRead'],
            createdAt: data['createdAt'],
            link: data['link']
          });
        });
        
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        const current = this.notificationsSubject.value;
        this.notificationsSubject.next(list);

        // Emit toast updates for new unread notifications
        list.forEach(newNotif => {
          if (!newNotif.isRead && !current.some(c => c.id === newNotif.id)) {
            this.toastAlertsSubject.next(newNotif);
          }
        });
      },
      error: (err) => {
        console.error('[Firestore] Realtime notifications feed failed:', err);
      }
    });
  }

  private unsubscribeFromNotifications() {
    if (this.unsubscribeFn) {
      this.unsubscribeFn();
      this.unsubscribeFn = null;
      console.log('[Firestore] Unsubscribed from real-time notifications.');
    }
  }

  public addNotification(
    message: string, 
    link?: string, 
    title: string = 'System Alert', 
    type: 'match' | 'message' | 'system' | 'admin' = 'system'
  ): void {
    const user = this.authService.currentUserValue;
    if (!user) return;

    const notifCollection = collection(this.firestore, 'notifications');
    addDoc(notifCollection, {
      userId: user.id,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      link: link || ''
    }).catch(err => {
      console.error('Failed to create notification document:', err);
    });
  }

  public markAsRead(id: string): void {
    const docRef = doc(this.firestore, 'notifications', id);
    updateDoc(docRef, { isRead: true }).catch(err => {
      console.error('Failed to mark notification as read:', err);
    });
  }

  public markAllAsRead(): void {
    const unread = this.notificationsSubject.value.filter(n => !n.isRead);
    unread.forEach(n => {
      const docRef = doc(this.firestore, 'notifications', n.id);
      updateDoc(docRef, { isRead: true }).catch(err => {
        console.error('Failed to mark notification read:', err);
      });
    });
  }

  public deleteNotification(id: string): void {
    const docRef = doc(this.firestore, 'notifications', id);
    deleteDoc(docRef).catch(err => {
      console.error('Failed to delete notification document:', err);
    });
  }

  public clearAll(): void {
    const current = this.notificationsSubject.value;
    current.forEach(n => {
      const docRef = doc(this.firestore, 'notifications', n.id);
      deleteDoc(docRef).catch(err => {
        console.error('Failed to clear notification:', err);
      });
    });
  }
}
