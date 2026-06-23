import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationItem } from '../../../core/models/item.model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { NotificationDropdownComponent } from '../notification-dropdown/notification-dropdown.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationBellComponent, NotificationDropdownComponent],
  template: `
    <nav class="navbar navbar-expand-lg sticky-top glass-panel mx-3 my-3 p-3">
      <div class="container-fluid">
        <!-- Logo -->
        <a class="navbar-brand d-flex align-items-center" routerLink="/">
          <svg class="me-2" width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.45));">
            <defs>
              <linearGradient id="lostai-logo-nav-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#8b5cf6" />
                <stop offset="50%" stop-color="#d946ef" />
                <stop offset="100%" stop-color="#06b6d4" />
              </linearGradient>
            </defs>
            <path d="M50 10 C68 10 82 22 82 40 C82 62 50 90 50 90 C50 90 18 62 18 40 C18 22 32 10 50 10 Z" stroke="url(#lostai-logo-nav-grad)" stroke-width="8" stroke-linejoin="round" />
            <path d="M50 25 C58 25 66 30 66 40 C66 52 50 72 50 72 C50 72 34 52 34 40 C34 30 42 25 50 25 Z" fill="url(#lostai-logo-nav-grad)" />
            <circle cx="50" cy="42" r="6" fill="#ffffff" />
          </svg>
          <span class="fw-extrabold text-white tracking-wide fs-4">Lost<span class="text-gradient-primary">AI</span></span>
        </a>

        <!-- Mobile toggle -->
        <button class="navbar-toggler text-white" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
          <i class="bi bi-list fs-2"></i>
        </button>

        <!-- Menu Links -->
        <div class="collapse navbar-collapse" id="navbarNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 align-items-center">
            <li class="nav-item">
              <a class="nav-link text-white px-3" routerLink="/" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">Home</a>
            </li>
            <li class="nav-item" *ngIf="authService.currentUser$ | async as user">
              <a class="nav-link text-white px-3" routerLink="/dashboard" routerLinkActive="active-link">Dashboard</a>
            </li>
            <li class="nav-item" *ngIf="authService.currentUser$ | async as user">
              <a class="nav-link text-white px-3" routerLink="/my-reports" routerLinkActive="active-link">My Reports</a>
            </li>
            <li class="nav-item" *ngIf="authService.currentUser$ | async as user">
              <a class="nav-link text-white px-3" routerLink="/matches" routerLinkActive="active-link">
                AI Matches
                <span class="badge rounded-pill bg-danger ms-1">Auto</span>
              </a>
            </li>
            <li class="nav-item" *ngIf="authService.currentUser$ | async as user">
              <a class="nav-link text-white px-3" routerLink="/chat" routerLinkActive="active-link">
                <i class="bi bi-chat-dots-fill me-1" style="font-size: 0.95rem;"></i>Secure Chat
              </a>
            </li>
            <li class="nav-item" *ngIf="authService.currentUser$ | async as user">
              <a class="nav-link text-white px-3 text-gradient-nav-admin" routerLink="/admin" routerLinkActive="active-link">
                <i class="bi bi-shield-lock-fill text-gradient-primary me-1" style="font-size: 0.95rem;"></i>Admin
              </a>
            </li>
          </ul>

          <!-- User Actions -->
          <div class="d-flex align-items-center gap-2 collapse-actions">
            <!-- Theme Toggle Switcher -->
            <button class="btn btn-outline-glass border-0 px-0 d-flex align-items-center justify-content-center" 
                    (click)="toggleTheme()" 
                    title="Toggle Theme"
                    style="width: 42px; height: 42px; border-radius: 50%;">
              <i class="bi text-white fs-5" 
                 [class.bi-moon-fill]="(currentTheme$ | async) === 'dark'" 
                 [class.bi-sun-fill]="(currentTheme$ | async) === 'light'"></i>
            </button>

            <!-- Unauthenticated -->
            <ng-container *ngIf="!(authService.currentUser$ | async)">
              <a class="btn btn-outline-glass px-4" routerLink="/login">Sign In</a>
              <a class="btn btn-primary-gradient px-4" routerLink="/register">Register</a>
            </ng-container>

            <!-- Authenticated -->
            <ng-container *ngIf="authService.currentUser$ | async as user">
              <!-- Report Dropdown -->
              <div class="dropdown">
                <button class="btn btn-secondary-gradient dropdown-toggle px-3" type="button" id="reportMenu" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-plus-circle me-1"></i> Report Item
                </button>
                <ul class="dropdown-menu dropdown-menu-dark glass-panel p-2 mt-2 border-0 shadow-lg" aria-labelledby="reportMenu">
                  <li>
                    <a class="dropdown-item rounded-3 py-2 px-3 text-white d-flex align-items-center" routerLink="/report-lost">
                      <i class="bi bi-search text-danger me-2"></i> Report Lost Item
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item rounded-3 py-2 px-3 text-white d-flex align-items-center" routerLink="/report-found">
                      <i class="bi bi-eye text-cyan me-2"></i> Report Found Item
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Notifications Bell Dropdown -->
              <div class="dropdown">
                <app-notification-bell 
                  [unreadCount]="(unreadCount$ | async) ?? 0"
                  id="notifMenu" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false">
                </app-notification-bell>
                
                <app-notification-dropdown
                  [notifications]="(notifications$ | async) ?? []"
                  [unreadCount]="(unreadCount$ | async) ?? 0"
                  (selectNotification)="markAsRead($event.id)"
                  (markAllRead)="markAllAsRead()"
                  (clearAll)="clearNotifications()"
                  (deleteNotification)="deleteNotification($event)">
                </app-notification-dropdown>
              </div>

              <!-- User Avatar Profile Menu -->
              <div class="dropdown">
                <a class="d-flex align-items-center text-decoration-none dropdown-toggle text-white" href="#" id="userMenu" data-bs-toggle="dropdown" aria-expanded="false">
                  <img [src]="user.avatarUrl" alt="Avatar" class="rounded-circle border border-2 border-primary shadow" width="40" height="40">
                  <span class="ms-2 d-none d-md-inline fw-semibold">{{ user.name }}</span>
                </a>
                <ul class="dropdown-menu dropdown-menu-end dropdown-menu-dark glass-panel p-2 mt-2 border-0 shadow-lg" aria-labelledby="userMenu">
                  <li class="px-3 py-2 text-muted small border-bottom border-secondary mb-1">
                    Logged in as <br><strong class="text-white">{{ user.email }}</strong>
                  </li>
                  <li>
                    <a class="dropdown-item rounded-3 py-2 text-white" routerLink="/profile">
                      <i class="bi bi-person me-2"></i> My Profile
                    </a>
                  </li>
                  <li>
                    <a class="dropdown-item rounded-3 py-2 text-white" routerLink="/my-reports">
                      <i class="bi bi-journal-text me-2"></i> My Reports
                    </a>
                  </li>
                  <li><hr class="dropdown-divider bg-secondary"></li>
                  <li>
                    <button class="dropdown-item rounded-3 py-2 text-danger d-flex align-items-center" (click)="onLogout()">
                      <i class="bi bi-box-arrow-right me-2"></i> Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      border-radius: 16px;
    }
    .nav-link {
      font-weight: 500;
      font-size: 1.05rem;
      transition: color 0.3s ease;
      opacity: 0.85;
    }
    .nav-link:hover {
      opacity: 1;
      color: var(--primary) !important;
    }
    .active-link {
      opacity: 1;
      color: #818cf8 !important;
      font-weight: 600;
      border-bottom: 2px solid var(--primary);
    }
    .text-cyan {
      color: var(--secondary);
    }
    .fw-extrabold {
      font-weight: 800;
    }
    .tracking-wide {
      letter-spacing: 0.05em;
    }
    .dropdown-item {
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .dropdown-item:hover {
      background-color: rgba(99, 102, 241, 0.2);
    }
    .notif-item:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    .notif-menu::-webkit-scrollbar {
      width: 4px;
    }
    .notif-menu::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }
    @media (max-width: 991.98px) {
      .collapse-actions {
        margin-top: 1.5rem;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: center;
        gap: 0.75rem !important;
        width: 100%;
      }
      .collapse-actions > * {
        text-align: center;
      }
      .dropdown-menu {
        text-align: center;
      }
      .nav-item {
        width: 100%;
        text-align: center;
      }
      .active-link {
        border-bottom: none;
        border-left: 3px solid var(--primary);
        padding-left: 0.5rem;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  notifications$: Observable<NotificationItem[]>;
  unreadCount$: Observable<number>;
  currentTheme$: Observable<'dark' | 'light'>;

  constructor(
    public authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private notificationService: NotificationService
  ) {
    this.notifications$ = this.notificationService.notifications$;
    this.unreadCount$ = this.notifications$.pipe(
      map(list => list.filter(n => !n.isRead).length)
    );
    this.currentTheme$ = this.themeService.theme$;
  }

  ngOnInit(): void {}

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  markAsRead(id: string): void {
    this.notificationService.markAsRead(id);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  clearNotifications(): void {
    this.notificationService.clearAll();
  }

  deleteNotification(id: string): void {
    this.notificationService.deleteNotification(id);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
