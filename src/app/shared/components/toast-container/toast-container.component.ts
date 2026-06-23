import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationItem } from '../../../core/models/item.model';
import { Subscription } from 'rxjs';

interface ActiveToast {
  id: string;
  item: NotificationItem;
  exiting: boolean;
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="toast-container-wrapper position-fixed top-0 end-0 p-3" style="z-index: 1080;">
      <div *ngFor="let toast of toasts" 
           class="toast-alert glass-panel mb-2 p-3 shadow-lg d-flex align-items-center justify-content-between"
           [class.slide-in]="!toast.exiting"
           [class.slide-out]="toast.exiting"
           style="width: 320px; border-radius: 12px; pointer-events: auto;">
        
        <a [routerLink]="toast.item.link || '/notifications'" 
           (click)="dismiss(toast.id)" 
           class="text-decoration-none d-flex align-items-start gap-2.5 flex-grow-1 min-w-0">
          
          <div class="icon-indicator rounded-circle d-flex align-items-center justify-content-center mt-0.5" 
               [ngClass]="getCategoryIconBg(toast.item.type)"
               style="width: 28px; height: 28px; min-width: 28px; font-size: 0.8rem;">
            <i class="bi" [ngClass]="getCategoryIcon(toast.item.type)"></i>
          </div>
          
          <div class="min-w-0">
            <h6 class="text-white fw-bold mb-0.5 small" style="font-size: 0.82rem;">{{ toast.item.title }}</h6>
            <p class="text-white-50 mb-0 small text-truncate" style="font-size: 0.76rem;">{{ toast.item.message }}</p>
          </div>
          
        </a>

        <button class="btn-close btn-close-white ms-2 small" 
                (click)="dismiss(toast.id)" 
                style="font-size: 0.65rem;"
                title="Dismiss"></button>
                
      </div>
    </div>
  `,
  styles: [`
    .toast-container-wrapper {
      pointer-events: none;
    }
    .toast-alert {
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      backdrop-filter: blur(16px);
      background-color: rgba(15, 23, 42, 0.9) !important;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    .text-cyan {
      color: var(--secondary) !important;
    }
    .slide-in {
      animation: slide-in-anim 0.3s forwards;
    }
    .slide-out {
      animation: slide-out-anim 0.3s forwards;
    }
    @keyframes slide-in-anim {
      from {
        transform: translateX(120%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slide-out-anim {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(120%);
        opacity: 0;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: ActiveToast[] = [];
  private sub: Subscription | null = null;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.sub = this.notificationService.toastAlerts$.subscribe(item => {
      this.addToast(item);
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }

  addToast(item: NotificationItem) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ActiveToast = {
      id,
      item,
      exiting: false
    };
    this.toasts.push(newToast);

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      this.dismiss(id);
    }, 5000);
  }

  dismiss(id: string) {
    const toast = this.toasts.find(t => t.id === id);
    if (toast && !toast.exiting) {
      toast.exiting = true;
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t.id !== id);
      }, 300); // match animation duration
    }
  }

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
}
