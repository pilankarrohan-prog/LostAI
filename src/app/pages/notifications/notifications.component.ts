import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/item.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5 fade-in">
      <div class="row justify-content-center">
        <div class="col-lg-10">
          <div class="glass-panel p-4 p-md-5 shadow-lg">
            
            <!-- Header -->
            <div class="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary flex-wrap gap-3">
              <div class="d-flex align-items-center">
                <a class="btn btn-outline-glass btn-sm me-3" routerLink="/dashboard"><i class="bi bi-arrow-left"></i></a>
                <div>
                  <h2 class="text-white fw-bold mb-0">Notification Center</h2>
                  <p class="text-muted small mb-0">Manage match alerts, claims, and incoming message requests.</p>
                </div>
              </div>
              
              <!-- Global Actions -->
              <div class="d-flex align-items-center gap-2" *ngIf="(totalCount$ | async) ?? 0 > 0">
                <button class="btn btn-outline-glass btn-sm" (click)="markAllRead()">
                  <i class="bi bi-check-all me-1"></i> Mark all read
                </button>
                <button class="btn btn-outline-danger-glass btn-sm" (click)="clearAll()">
                  <i class="bi bi-trash3 me-1"></i> Clear all
                </button>
              </div>
            </div>

            <!-- Tabs/Filter Bar -->
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3 p-3 bg-dark bg-opacity-25 rounded-3 border border-secondary border-opacity-40">
              <div class="d-flex flex-column gap-1">
                <span class="text-white-50 small fw-bold" style="font-size: 0.75rem;"><i class="bi bi-filter-circle me-1"></i>STATUS</span>
                <ul class="nav nav-pills bg-black bg-opacity-35 p-1 rounded-3 border border-secondary border-opacity-30">
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="statusFilter === 'all'" (click)="setStatusFilter('all')">
                      All <span class="badge bg-secondary ms-1">{{ totalCount$ | async }}</span>
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="statusFilter === 'unread'" (click)="setStatusFilter('unread')">
                      Unread <span class="badge bg-danger ms-1">{{ unreadCount$ | async }}</span>
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="statusFilter === 'read'" (click)="setStatusFilter('read')">
                      Read <span class="badge bg-dark ms-1">{{ readCount$ | async }}</span>
                    </button>
                  </li>
                </ul>
              </div>
              
              <div class="d-flex flex-column gap-1">
                <span class="text-white-50 small fw-bold" style="font-size: 0.75rem;"><i class="bi bi-tags me-1"></i>CATEGORY</span>
                <ul class="nav nav-pills bg-black bg-opacity-35 p-1 rounded-3 border border-secondary border-opacity-30">
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="categoryFilter === 'all'" (click)="setCategoryFilter('all')">
                      All Categories
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="categoryFilter === 'match'" (click)="setCategoryFilter('match')">
                      Matches
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="categoryFilter === 'message'" (click)="setCategoryFilter('message')">
                      Messages
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="categoryFilter === 'system'" (click)="setCategoryFilter('system')">
                      System
                    </button>
                  </li>
                  <li class="nav-item">
                    <button class="nav-link px-3 py-1.5 btn-sm" [class.active]="categoryFilter === 'admin'" (click)="setCategoryFilter('admin')">
                      Admin
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <!-- Notification Items List -->
            <div class="notifications-list d-flex flex-column gap-3" *ngIf="filteredList$ | async as list; else loadingSkeleton">
              <ng-container *ngIf="list.length > 0; else emptyState">
                <div *ngFor="let notif of list" 
                     class="notification-card p-3 rounded-3 border border-secondary border-opacity-35 d-flex gap-3 position-relative align-items-center"
                     [class.unread-bg]="!notif.isRead"
                     [class.read-bg]="notif.isRead"
                     style="transition: all 0.25s ease;">
                  
                  <!-- Unread indicator dot -->
                  <div class="unread-dot" *ngIf="!notif.isRead"></div>

                  <!-- Type-specific Icon -->
                  <div class="icon-wrapper d-flex align-items-center justify-content-center rounded-3 shadow-sm" 
                       [ngClass]="getNotifIconBg(notif.type)"
                       style="width: 48px; height: 48px; min-width: 48px;">
                    <i class="bi fs-4" [ngClass]="getNotifIcon(notif.type)"></i>
                  </div>

                  <!-- Notification Details -->
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
                      <div class="text-white-50 small mb-1 fw-semibold text-uppercase tracking-wider" style="font-size: 0.72rem;">
                        {{ getNotifTitle(notif) }}
                      </div>
                      <span class="text-muted font-monospace" style="font-size: 0.7rem;">
                        {{ notif.createdAt | date:'MMM d, h:mm a' }}
                      </span>
                    </div>
                    <p class="text-white mb-0 fw-medium text-wrap" style="font-size: 0.95rem; line-height: 1.4;">
                      {{ notif.message }}
                    </p>
                  </div>

                  <!-- Item Action / Mark Read -->
                  <div class="d-flex align-items-center gap-2 ms-2">
                    <a *ngIf="notif.link" 
                       [routerLink]="notif.link" 
                       (click)="markRead(notif.id)" 
                       class="btn btn-sm btn-outline-glass px-3 py-1.5" 
                       style="font-size: 0.8rem;">
                      View details <i class="bi bi-chevron-right ms-1"></i>
                    </a>
                    <button class="btn btn-link text-white-50 border-0 p-1 rounded-circle hover-red d-flex align-items-center justify-content-center" 
                            (click)="deleteNotification(notif.id)" 
                            style="width: 28px; height: 28px;"
                            title="Delete alert">
                      <i class="bi bi-x fs-5"></i>
                    </button>
                  </div>

                </div>
              </ng-container>
            </div>

            <!-- Empty State Template -->
            <ng-template #emptyState>
              <div class="glass-panel py-5 text-center text-muted border border-secondary border-opacity-25 rounded-3">
                <i class="bi bi-bell-slash text-gradient-ai display-3 mb-3 d-block"></i>
                <h4 class="text-white fw-bold">No notifications found</h4>
                <p class="mb-0">You're all caught up! Filters returned empty results.</p>
              </div>
            </ng-template>

            <!-- Loading Skeleton -->
            <ng-template #loadingSkeleton>
              <div class="d-flex flex-column gap-3">
                <div class="shimmer-card p-4 rounded-3 border border-secondary shimmer-loading" *ngFor="let s of [1, 2, 3]">
                  <div class="shimmer-line w-25 mb-2"></div>
                  <div class="shimmer-line w-75"></div>
                </div>
              </div>
            </ng-template>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-link {
      color: #94a3b8;
      font-weight: 500;
      font-size: 0.85rem;
      border-radius: 6px;
      transition: all 0.2s ease;
      background: transparent;
      border: none;
    }
    .nav-link:hover {
      color: white;
    }
    .nav-link.active {
      background-color: var(--primary) !important;
      color: white !important;
    }
    .text-primary-cyan {
      color: var(--secondary);
    }
    .unread-bg {
      background-color: rgba(99, 102, 241, 0.08);
    }
    .read-bg {
      background-color: rgba(255, 255, 255, 0.02);
    }
    .unread-dot {
      position: absolute;
      top: 50%;
      left: 8px;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #ef4444;
      box-shadow: 0 0 10px #ef4444;
    }
    .hover-red:hover {
      color: #f43f5e !important;
      background-color: rgba(244, 63, 94, 0.15);
    }
    .btn-outline-danger-glass {
      background-color: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .btn-outline-danger-glass:hover {
      background-color: #ef4444;
      color: white;
      border-color: #ef4444;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
    }
    .shimmer-loading {
      position: relative;
      overflow: hidden;
    }
    .shimmer-line {
      height: 1rem;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
      border-radius: 4px;
    }
    .shimmer-card {
      background: rgba(255, 255, 255, 0.015);
    }
    .w-25 { width: 25%; }
    .w-75 { width: 75%; }
    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
  `]
})
export class NotificationsComponent implements OnInit {
  statusFilter: 'all' | 'unread' | 'read' = 'all';
  categoryFilter: 'all' | 'match' | 'message' | 'system' | 'admin' = 'all';
  
  notifications$: Observable<NotificationItem[]>;
  filteredList$: Observable<NotificationItem[]>;
  
  totalCount$: Observable<number>;
  unreadCount$: Observable<number>;
  readCount$: Observable<number>;

  constructor(private notificationService: NotificationService) {
    this.notifications$ = this.notificationService.notifications$;
    this.totalCount$ = this.notifications$.pipe(map(list => list.length));
    this.unreadCount$ = this.notifications$.pipe(map(list => list.filter(n => !n.isRead).length));
    this.readCount$ = this.notifications$.pipe(map(list => list.filter(n => n.isRead).length));

    this.filteredList$ = this.notifications$.pipe(
      map(list => {
        return list.filter(n => {
          const matchStatus = 
            this.statusFilter === 'all' || 
            (this.statusFilter === 'unread' && !n.isRead) || 
            (this.statusFilter === 'read' && n.isRead);
          
          const matchCategory = 
            this.categoryFilter === 'all' || 
            n.type === this.categoryFilter;
            
          return matchStatus && matchCategory;
        });
      })
    );
  }

  ngOnInit(): void {}

  setStatusFilter(f: 'all' | 'unread' | 'read'): void {
    this.statusFilter = f;
  }

  setCategoryFilter(c: 'all' | 'match' | 'message' | 'system' | 'admin'): void {
    this.categoryFilter = c;
  }

  getNotifIcon(type: string): string {
    switch (type) {
      case 'match': return 'bi-shield-check';
      case 'message': return 'bi-chat-left-text-fill';
      case 'admin': return 'bi-shield-fill-exclamation';
      default: return 'bi-bell-fill';
    }
  }

  getNotifIconBg(type: string): string {
    switch (type) {
      case 'match': return 'bg-success bg-opacity-15 text-success';
      case 'message': return 'bg-info bg-opacity-15 text-primary-cyan';
      case 'admin': return 'bg-warning bg-opacity-15 text-warning';
      default: return 'bg-secondary bg-opacity-15 text-white-50';
    }
  }

  getNotifTitle(notif: NotificationItem): string {
    return notif.title || (notif.type === 'match' ? 'AI Match Alert' : notif.type === 'message' ? 'Message Request' : 'System Alert');
  }

  markRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearAll(): void {
    this.notificationService.clearAll();
  }

  deleteNotification(id: string): void {
    this.notificationService.deleteNotification(id);
  }
}
