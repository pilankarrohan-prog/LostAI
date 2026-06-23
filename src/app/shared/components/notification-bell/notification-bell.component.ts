import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bell-container position-relative" [class.shake]="isAnimating">
      <i class="bi bi-bell-fill fs-5 text-white"></i>
      <span class="position-absolute top-1 start-75 translate-middle badge rounded-pill bg-danger shadow-sm pulse-badge" 
            *ngIf="unreadCount > 0">
        {{ unreadCount }}
      </span>
    </div>
  `,
  styles: [`
    .bell-container {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .bell-container:hover {
      background: rgba(255, 255, 255, 0.08);
      transform: scale(1.05);
    }
    .pulse-badge {
      font-size: 0.65rem;
      padding: 0.25em 0.5em;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      70% {
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }
    .shake {
      animation: shake-bell 0.5s ease-in-out;
    }
    @keyframes shake-bell {
      0%, 100% { transform: rotate(0); }
      15%, 45%, 75% { transform: rotate(12deg); }
      30%, 60%, 90% { transform: rotate(-12deg); }
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnChanges {
  @Input() unreadCount = 0;
  isAnimating = false;

  ngOnInit() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['unreadCount']) {
      const prev = changes['unreadCount'].previousValue;
      const curr = changes['unreadCount'].currentValue;
      if (curr > prev && prev !== undefined) {
        this.triggerAnimation();
      }
    }
  }

  triggerAnimation() {
    this.isAnimating = true;
    setTimeout(() => {
      this.isAnimating = false;
    }, 500);
  }
}
