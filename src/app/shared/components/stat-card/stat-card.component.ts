import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="glass-panel p-4 d-flex align-items-center h-100" [class.glass-card-interactive]="!isLoading">
      <ng-container *ngIf="!isLoading; else loadingSkeleton">
        <div class="rounded-circle p-3 me-3 text-white border d-flex align-items-center justify-content-center" 
          [ngClass]="[iconBgClass, iconBorderClass]" style="width: 60px; height: 60px; min-width: 60px; height: 60px;">
          <i class="bi" [ngClass]="icon" style="font-size: 1.75rem;"></i>
        </div>
        <div>
          <div class="text-muted small fw-semibold text-uppercase tracking-wider">{{ title }}</div>
          <h3 class="text-white fw-extrabold mb-0 mt-1">{{ value }}</h3>
          <p class="text-muted small mb-0 mt-1" *ngIf="description" style="font-size: 0.8rem;">{{ description }}</p>
        </div>
      </ng-container>
      
      <ng-template #loadingSkeleton>
        <div class="rounded-circle shimmer-box me-3" style="width: 60px; height: 60px; min-width: 60px;"></div>
        <div class="flex-grow-1">
          <div class="shimmer-line w-75 mb-2"></div>
          <div class="shimmer-line w-50 mb-1" style="height: 1.5rem;"></div>
          <div class="shimmer-line w-40"></div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .fw-extrabold {
      font-weight: 800;
    }
    .shimmer-box {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    .shimmer-line {
      height: 0.85rem;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
      border-radius: 4px;
    }
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
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = 0;
  @Input() icon: string = '';
  @Input() iconBgClass: string = 'bg-primary bg-opacity-10';
  @Input() iconBorderClass: string = 'border-primary border-opacity-25';
  @Input() description?: string = '';
  @Input() isLoading: boolean = false;
}
