import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { ChatListComponent } from './chat-list.component';
import { ChatWindowComponent } from './chat-window.component';
import { AuthService } from '../../core/services/auth.service';
import { ChatService } from '../../core/services/chat.service';
import { ItemService } from '../../core/services/item.service';
import { Conversation, ChatMessage, LostFoundItem } from '../../core/models/item.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChatListComponent, ChatWindowComponent],
  template: `
    <div class="container py-4 fade-in">
      
      <!-- Page Header -->
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 class="h2 text-white fw-bold mb-1">
            <i class="bi bi-chat-right-quote-fill text-gradient-primary me-2"></i>Secure AI Chat
          </h1>
          <p class="text-muted mb-0">Coordinate safely with verification pictures and timestamps to return matched items.</p>
        </div>
        <div>
          <a class="btn btn-outline-glass btn-sm py-2 px-3" routerLink="/matches">
            <i class="bi bi-cpu-fill me-1"></i> Match Results
          </a>
        </div>
      </div>

      <!-- Sync feedback banners -->
      <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-20 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="successMsg">
        <i class="bi bi-check-circle-fill me-2 fs-5"></i>
        <span>{{ successMsg }}</span>
      </div>
      <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-20 text-danger rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="errorMsg">
        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Main Layout Panel -->
      <div class="glass-panel overflow-hidden position-relative" style="height: calc(100vh - 200px); min-height: 550px;">
        <div class="row g-0 h-100">
          
          <!-- Column 1: Conversations List Sidebar -->
          <div 
            class="col-md-4 border-end border-secondary h-100 d-flex flex-column"
            [class.d-none]="mobileView === 'window'"
            [class.d-block]="mobileView === 'list'"
          >
            <div class="sidebar-header p-3 border-bottom border-secondary bg-black bg-opacity-10">
              <h5 class="text-white fw-bold mb-0">Conversations</h5>
            </div>
            
            <div class="flex-grow-1 overflow-y-auto">
              <app-chat-list
                [conversations]="conversations"
                [items]="items"
                [currentUserId]="currentUser?.id || ''"
                [activeConversationId]="activeConversation?.id || ''"
                [allMessages]="allMessages"
                (conversationSelected)="onConversationSelected($event)"
              ></app-chat-list>
            </div>
          </div>

          <!-- Column 2: Messaging Window -->
          <div 
            class="col-md-8 h-100 d-flex flex-column"
            [class.d-none]="mobileView === 'list'"
            [class.d-block]="mobileView === 'window'"
          >
            <app-chat-window
              [conversation]="activeConversation"
              [currentUserId]="currentUser?.id || ''"
              [messages]="activeMessages"
              [items]="items"
              (messageSent)="onMessageSent($event)"
              (goBack)="toggleMobileView('list')"
            ></app-chat-window>
          </div>

        </div>
      </div>
    </div>
  `,
  styles: [`
    .sidebar-header {
      border-top-left-radius: 12px;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  conversations: Conversation[] = [];
  items: LostFoundItem[] = [];
  
  activeConversation: Conversation | null = null;
  activeMessages: ChatMessage[] = [];
  allMessages: Record<string, ChatMessage[]> = {}; // Map of convId -> ChatMessage[]

  mobileView: 'list' | 'window' = 'list';
  successMsg: string = '';
  errorMsg: string = '';

  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private chatService: ChatService,
    private itemService: ItemService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Get currentUser
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadInitialData();
      }
    });

    // 2. Listen to real-time incoming chat messages
    const incomingSub = this.chatService.incomingMessage$.subscribe(msg => {
      this.handleIncomingMessage(msg);
    });
    this.subs.push(incomingSub);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  loadInitialData(): void {
    if (!this.currentUser) return;
    const userId = this.currentUser.id;

    // Load items first
    this.itemService.items$.subscribe(items => {
      this.items = items;
      
      // Once items are loaded, fetch conversations
      this.chatService.getConversations(userId).subscribe(convs => {
        this.conversations = convs;

        // Fetch messages for all conversations to populate unread counts and snippets
        const messageObservables = convs.map(c => 
          this.chatService.getMessages(c.id, userId)
        );

        if (messageObservables.length > 0) {
          forkJoin(messageObservables).subscribe(allMsgsList => {
            allMsgsList.forEach((msgs, index) => {
              const conv = convs[index];
              this.allMessages[conv.id] = msgs;
            });
            
            // Re-trigger reference updates to force list refresh
            this.conversations = [...this.conversations];
            
            // Handle Route query parameters (e.g. /chat?id=xxx or start=true)
            this.handleQueryParams();
          });
        } else {
          this.handleQueryParams();
        }
      });
    });
  }

  handleQueryParams(): void {
    this.route.queryParams.subscribe(params => {
      const convId = params['id'];
      const startChat = params['start'] === 'true';

      if (convId) {
        const found = this.conversations.find(c => c.id === convId);
        if (found) {
          this.onConversationSelected(found);
        }
      } else if (startChat) {
        // We are starting a new conversation from details
        const lostItemId = params['lostItemId'];
        const foundItemId = params['foundItemId'];
        const ownerUserId = params['ownerUserId'];
        const finderUserId = params['finderUserId'];
        const matchId = params['matchId'];

        if (lostItemId && foundItemId && ownerUserId && finderUserId && matchId) {
          this.chatService.startConversation(
            lostItemId, 
            foundItemId, 
            ownerUserId, 
            finderUserId, 
            matchId
          ).subscribe({
            next: (conv) => {
              // Reload conversations list and select this one
              this.chatService.getConversations(this.currentUser!.id).subscribe(convs => {
                this.conversations = convs;
                
                // Add system message if not exists
                if (!this.allMessages[conv.id]) {
                  this.allMessages[conv.id] = [
                    {
                      id: 'sys_' + Math.random().toString(36).substring(2, 9),
                      conversationId: conv.id,
                      senderId: 'system',
                      receiverId: 'all',
                      message: 'AI Match Found',
                      messageType: 'system',
                      isRead: true,
                      timestamp: new Date().toISOString()
                    }
                  ];
                }

                this.onConversationSelected(conv);
                
                // Clear query params to prevent re-triggering on reload
                this.router.navigate([], {
                  relativeTo: this.route,
                  queryParams: { id: conv.id },
                  queryParamsHandling: 'merge'
                });
              });
            },
            error: (err) => {
              this.errorMsg = 'Cannot open chat: ' + (err.error?.detail || err.message || err);
              setTimeout(() => this.errorMsg = '', 5000);
            }
          });
        }
      }
    });
  }

  onConversationSelected(conv: Conversation): void {
    this.activeConversation = conv;
    this.toggleMobileView('window');

    // Load fresh messages
    this.chatService.getMessages(conv.id, this.currentUser!.id).subscribe(msgs => {
      this.activeMessages = msgs;
      this.allMessages[conv.id] = msgs;

      // Mark all incoming messages in this conv as read
      this.chatService.markMessagesRead(conv.id, this.currentUser!.id).subscribe(() => {
        // Update local status as read
        this.activeMessages.forEach(m => {
          if (m.receiverId === this.currentUser!.id) {
            m.isRead = true;
          }
        });
        this.allMessages[conv.id] = [...this.activeMessages];
        this.conversations = [...this.conversations];
      });
    });
  }

  onMessageSent(payload: { message: string, type: 'text' | 'image' | 'system' }): void {
    if (!this.activeConversation || !this.currentUser) return;

    const conv = this.activeConversation;
    const senderId = this.currentUser.id;
    const receiverId = conv.ownerUserId === senderId ? conv.finderUserId : conv.ownerUserId;

    this.chatService.sendMessage(
      conv.id,
      senderId,
      receiverId,
      payload.message,
      payload.type
    ).subscribe({
      next: (createdMsg) => {
        // We will append to active messages
        // But incomingMessage$ will also trigger to sync this. We check duplicates.
        this.appendMessageIfUnique(createdMsg);
      },
      error: (err) => {
        this.errorMsg = 'Failed to send message: ' + (err.error?.detail || err.message || err);
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  handleIncomingMessage(msg: ChatMessage): void {
    // 1. Put into allMessages map
    if (!this.allMessages[msg.conversationId]) {
      this.allMessages[msg.conversationId] = [];
    }
    
    const list = this.allMessages[msg.conversationId];
    if (!list.some(m => m.id === msg.id)) {
      list.push(msg);
      this.allMessages[msg.conversationId] = [...list];
    }

    // 2. If it is active, append to activeMessages and mark read
    if (this.activeConversation && this.activeConversation.id === msg.conversationId) {
      this.appendMessageIfUnique(msg);
      
      if (msg.receiverId === this.currentUser!.id && !msg.isRead) {
        this.chatService.markMessagesRead(msg.conversationId, this.currentUser!.id).subscribe(() => {
          msg.isRead = true;
          this.conversations = [...this.conversations];
        });
      }
    }

    // 3. Force change detection on conversations list
    this.conversations = [...this.conversations];
  }

  appendMessageIfUnique(msg: ChatMessage): void {
    if (!this.activeMessages.some(m => m.id === msg.id)) {
      this.activeMessages.push(msg);
      this.activeMessages = [...this.activeMessages];
    }
  }

  toggleMobileView(view: 'list' | 'window'): void {
    this.mobileView = view;
  }
}
