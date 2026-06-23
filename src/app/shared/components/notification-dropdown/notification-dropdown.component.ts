import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationItem } from '../../../core/models/item.model';

@Component({
  selector: 'app-notification-dropdown',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark glass-panel p-2 mt-2 border-0 shadow-lg notif-menu" 
        style="width: 320px; max-height: 420px; overflow-y: auto; right: 0; left: auto; border-radius: 12px;">
      
      <!-- Dropdown Header -->
      <li class="px-3 py-2 border-bottom border-secondary border-opacity-35 d-flex justify-content-between align-items-center">
        <strong class="text-white small d-flex align-items-center">
          <i class="bi bi-bell-fill text-gradient-primary me-2"></i>Notifications
          <span class="badge bg-secondary bg-opacity-25 border border-secondary text-white-50 ms-2 scale-xs" *ngIf="unreadCount > 0">
            {{ unreadCount }} new
          </span>
        </strong>
        <button class="btn btn-link text-cyan p-0 small text-decoration-none" 
                style="font-size: 0.72rem; font-weight: 500;" 
                *ngIf="unreadCount > 0" 
                (click)="onMarkAllRead($event)">
          Mark all read
        </button>
      </li>
      
      <!-- Notification Item List -->
      <ng-container *ngIf="notifications.length > 0; else emptyState">
        <li *ngFor="let notif of notifications" 
            class="p-2.5 border-bottom border-secondary border-opacity-20 rounded-3 my-1 notif-item position-relative" 
            [class.unread-bg]="!notif.isRead" 
            [class.read-bg]="notif.isRead"
            style="transition: all 0.2s ease;">
          
          <div class="d-flex align-items-start gap-2.5">
            <!-- Icon by Category -->
            <div class="icon-indicator rounded-circle d-flex align-items-center justify-content-center mt-1" 
                 [ngClass]="getCategoryIconBg(notif.type)"
                 style="width: 30px; height: 30px; min-width: 30px; font-size: 0.85rem;">
              <i class="bi" [ngClass]="getCategoryIcon(notif.type)"></i>
            </div>
            
            <!-- Message Details -->
            <div class="flex-grow-1 min-w-0" style="padding-right: 20px;">
              <a [routerLink]="notif.link || '/notifications'" 
                 (click)="onSelectNotification(notif)" 
                 class="text-decoration-none d-block">
                <div class="d-flex justify-content-between align-items-center mb-0.5">
                  <span class="small fw-semibold text-white text-truncate" [class.text-white-50]="notif.isRead">{{ notif.title }}</span>
                  <span class="text-muted small font-monospace" style="font-size: 0.65rem;">
                    {{ formatTime(notif.createdAt) }}
                  </span>
                </div>
                <p class="text-muted mb-0 small text-truncate-2-lines" 
                   [class.text-white-50]="!notif.isRead"
                   style="font-size: 0.78rem; line-height: 1.35; white-space: normal;">
                  {{ notif.message }}
                </p>
              </a>
            </div>

            <!-- Single delete button -->
            <button class="btn btn-link text-white-50 border-0 p-0 position-absolute end-2 top-2 delete-btn" 
                    (click)="onDelete(notif.id, $event)"
                    title="Delete Alert">
              <i class="bi bi-x fs-6"></i>
            </button>
          </div>
          
        </li>
      </ng-container>
      
      <!-- Empty State -->
      <ng-template #emptyState>
        <li class="px-3 py-5 text-center text-muted small">
          <i class="bi bi-bell-slash d-block fs-3 mb-2 text-white-50"></i>
          No notifications yet
        </li>
      </ng-template>
      
      <!-- Dropdown Footer -->
      <li class="pt-2 border-top border-secondary border-opacity-35 d-flex justify-content-between px-3" *ngIf="notifications.length > 0; else emptyFooter">
        <button class="btn btn-link text-danger p-0 small text-decoration-none" 
                style="font-size: 0.75rem; font-weight: 500;" 
                (click)="onClearAll($event)">
          Clear all
        </button>
        <a routerLink="/notifications" class="text-cyan small text-decoration-none" style="font-size: 0.75rem; font-weight: 500;">
          View all <i class="bi bi-arrow-right ms-1"></i>
        </a>
      </li>
      <ng-template #emptyFooter>
        <li class="pt-2 border-top border-secondary border-opacity-35 text-center">
          <a routerLink="/notifications" class="text-cyan small text-decoration-none" style="font-size: 0.75rem; font-weight: 500;">
            Notification Center <i class="bi bi-arrow-right ms-1"></i>
          </a>
        </li>
      </ng-template>
      
    </ul>
  `,
  styles: [`
    .text-cyan {
      color: var(--secondary) !important;
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
      display: inline-block;
    }
    .notif-menu {
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      backdrop-filter: blur(16px);
      background-color: rgba(15, 23, 42, 0.92) !important;
    }
    .notif-menu::-webkit-scrollbar {
      width: 4px;
    }
    .notif-menu::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }
    .notif-item {
      position: relative;
    }
    .notif-item:hover {
      background-color: rgba(255, 255, 255, 0.04);
    }
    .unread-bg {
      background-color: rgba(99, 102, 241, 0.06);
    }
    .read-bg {
      background-color: transparent;
    }
    .delete-btn {
      opacity: 0;
      transition: opacity 0.2s ease, color 0.2s ease;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .notif-item:hover .delete-btn {
      opacity: 0.8;
    }
    .delete-btn:hover {
      opacity: 1 !important;
      color: #ef4444 !important;
    }
    .text-truncate-2-lines {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;  
      overflow: hidden;
    }
    .text-gradient-primary {
      background: linear-gradient(135deg, #a5b4fc 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .bg-opacity-15 {
      background-color: rgba(255, 255, 255, 0.1);
    }
    .end-2 {
      right: 0.5rem;
    }
    .top-2 {
      top: 0.5rem;
    }
  `]
})
export class NotificationDropdownComponent {
  @Input() notifications: NotificationItem[] = [];
  @Input() unreadCount = 0;

  @Output() selectNotification = new EventEmitter<NotificationItem>();
  @Output() markAllRead = new EventEmitter<void>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() deleteNotification = new EventEmitter<string>();

  getCategoryIcon(type: string): string {
    switch (type) {
      case 'match': return 'bi-shield-check';
      case 'message': return 'bi-chat-left-text-fill';
      case 'admin': return 'bi-shield-fill-exclamation';
      default: return 'bi-bell-fill';
    }
  }

  getCategoryIconBg(type: string): string {
    switch (type) {
      case 'match': return 'bg-success bg-opacity-20 text-success';
      case 'message': return 'bg-info bg-opacity-20 text-cyan';
      case 'admin': return 'bg-warning bg-opacity-20 text-warning';
      default: return 'bg-secondary bg-opacity-20 text-white-50';
    }
  }

  formatTime(isoStr: string): string {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  }

  onSelectNotification(notif: NotificationItem) {
    this.selectNotification.emit(notif);
  }

  onMarkAllRead(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.markAllRead.emit();
  }

  onClearAll(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.clearAll.emit();
  }

  onDelete(id: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.deleteNotification.emit(id);
  }
}
