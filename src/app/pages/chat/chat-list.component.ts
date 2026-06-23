import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, ChatMessage, LostFoundItem } from '../../core/models/item.model';

interface EnrichedConversation extends Conversation {
  itemName: string;
  itemImage: string;
  partnerName: string;
  partnerRole: string;
  lastMessageText: string;
  lastMessageTime: string;
  unreadCount: number;
}

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-sidebar h-100 d-flex flex-column">
      <!-- Search Box -->
      <div class="p-3 border-bottom border-secondary">
        <div class="input-group">
          <span class="input-group-text bg-dark border-secondary border-end-0 text-muted">
            <i class="bi bi-search"></i>
          </span>
          <input 
            type="text" 
            class="form-control bg-dark border-secondary border-start-0 ps-0 text-white" 
            placeholder="Search conversations..." 
            [(ngModel)]="searchQuery"
            (ngModelChange)="filterConversations()"
          />
        </div>
      </div>

      <!-- Conversations List -->
      <div class="flex-grow-1 overflow-y-auto p-2" style="max-height: calc(100vh - 200px);">
        <div *ngIf="filteredConversations.length === 0" class="text-center py-5 text-muted">
          <i class="bi bi-chat-left-dots fs-1 mb-2 d-block opacity-50"></i>
          <span>No conversations found</span>
        </div>

        <div 
          *ngFor="let conv of filteredConversations"
          class="chat-item p-3 mb-2 rounded-3 cursor-pointer transition-all d-flex align-items-center gap-3"
          [class.active]="conv.id === activeConversationId"
          [class.unread]="conv.unreadCount > 0"
          (click)="selectConversation(conv)"
        >
          <!-- Item Thumbnail / Avatar -->
          <div class="position-relative">
            <div class="item-avatar rounded-circle border border-secondary overflow-hidden" style="width: 48px; height: 48px;">
              <img [src]="conv.itemImage || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=80&q=80'" 
                   alt="Item Thumbnail" 
                   class="w-100 h-100 object-fit-cover" />
            </div>
            <!-- Status Dot -->
            <span 
              class="position-absolute bottom-0 end-0 rounded-circle border border-dark"
              [class.bg-success]="conv.status === 'active'"
              [class.bg-secondary]="conv.status === 'closed'"
              style="width: 12px; height: 12px;"
              [title]="conv.status === 'active' ? 'Active chat' : 'Closed case'"
            ></span>
          </div>

          <!-- Info & Snippet -->
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <h6 class="text-white text-truncate fw-bold mb-0" style="font-size: 0.95rem;">
                {{ conv.itemName }}
              </h6>
              <span class="text-muted" style="font-size: 0.75rem;">
                {{ formatTime(conv.lastMessageTime) }}
              </span>
            </div>

            <div class="d-flex justify-content-between align-items-center">
              <span class="text-truncate text-white-50" style="font-size: 0.85rem; max-width: 85%;">
                <strong>{{ conv.partnerName }}</strong>: {{ conv.lastMessageText || 'No messages yet' }}
              </span>
              <span 
                *ngIf="conv.unreadCount > 0" 
                class="badge bg-primary-gradient rounded-circle d-flex align-items-center justify-content-center fw-bold"
                style="width: 20px; height: 20px; font-size: 0.75rem;"
              >
                {{ conv.unreadCount }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      cursor: pointer;
    }
    .chat-item:hover {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .chat-item.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.3);
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.1);
    }
    .chat-item.unread {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.08);
    }
    .object-fit-cover {
      object-fit: cover;
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .transition-all {
      transition: all 0.2s ease;
    }
  `]
})
export class ChatListComponent implements OnChanges {
  @Input() conversations: Conversation[] = [];
  @Input() items: LostFoundItem[] = [];
  @Input() currentUserId: string = '';
  @Input() activeConversationId: string = '';
  @Input() allMessages: Record<string, ChatMessage[]> = {};

  @Output() conversationSelected = new EventEmitter<Conversation>();

  searchQuery: string = '';
  enrichedConversations: EnrichedConversation[] = [];
  filteredConversations: EnrichedConversation[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.enrichConversations();
    this.filterConversations();
  }

  enrichConversations(): void {
    if (!this.conversations || !this.items || !this.currentUserId) return;

    this.enrichedConversations = this.conversations.map(conv => {
      // Find lost and found items
      const lostItem = this.items.find(i => i.id === conv.lostItemId);
      const foundItem = this.items.find(i => i.id === conv.foundItemId);

      // Determine roles and names
      const isLostOwner = conv.ownerUserId === this.currentUserId;
      const partnerName = isLostOwner 
        ? (foundItem?.reporterName || 'Found Item Reporter')
        : (lostItem?.reporterName || 'Lost Item Owner');
      const partnerRole = isLostOwner ? 'Finder' : 'Owner';

      // Item description
      const targetItem = isLostOwner ? lostItem : foundItem;
      const itemName = targetItem?.name || 'Item Match';
      const itemImage = targetItem?.imageUrl || '';

      // Get messages for this conversation
      const msgs = this.allMessages[conv.id] || [];
      const textMsgs = msgs.filter(m => m.messageType !== 'system');
      const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
      
      const unreadCount = msgs.filter(
        m => m.receiverId === this.currentUserId && !m.isRead
      ).length;

      return {
        ...conv,
        itemName,
        itemImage,
        partnerName,
        partnerRole,
        lastMessageText: lastMsg ? lastMsg.message : '',
        lastMessageTime: lastMsg ? lastMsg.timestamp : conv.createdAt,
        unreadCount
      };
    });

    // Sort by last message time descending
    this.enrichedConversations.sort((a, b) => {
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });
  }

  filterConversations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = [...this.enrichedConversations];
      return;
    }

    const q = this.searchQuery.toLowerCase();
    this.filteredConversations = this.enrichedConversations.filter(c => {
      return c.itemName.toLowerCase().includes(q) || 
             c.partnerName.toLowerCase().includes(q);
    });
  }

  selectConversation(conv: EnrichedConversation): void {
    const rawConv = this.conversations.find(c => c.id === conv.id);
    if (rawConv) {
      this.conversationSelected.emit(rawConv);
    }
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Fallback
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}
