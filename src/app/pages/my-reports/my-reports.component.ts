import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';
import { AuthService } from '../../core/services/auth.service';
import { LostFoundItem } from '../../core/models/item.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-my-reports',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-5 fade-in" *ngIf="currentUser">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h1 class="h2 text-white fw-bold mb-1">
            <i class="bi bi-journal-text text-primary me-2"></i>My Reported Items
          </h1>
          <p class="text-muted mb-0">Track, edit, or delete items you have registered. View matched items detected by LostAI.</p>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-primary-gradient btn-sm d-flex align-items-center" routerLink="/report-lost">
            <i class="bi bi-search me-1"></i> Lost Report
          </a>
          <a class="btn btn-secondary-gradient btn-sm d-flex align-items-center" routerLink="/report-found">
            <i class="bi bi-eye me-1"></i> Found Report
          </a>
        </div>
      </div>

      <!-- Filters & Stats row -->
      <div class="glass-panel p-4 mb-4">
        <div class="row g-3 align-items-center mb-3">
          <!-- Filter Tabs -->
          <div class="col-lg-6 d-flex flex-wrap gap-2">
            <button class="btn btn-sm" [class.btn-outline-glass]="activeFilter !== 'all'" [class.btn-primary-gradient]="activeFilter === 'all'" (click)="setFilter('all')">All Reports ({{ reports.length }})</button>
            <button class="btn btn-sm" [class.btn-outline-glass]="activeFilter !== 'lost'" [class.btn-primary-gradient]="activeFilter === 'lost'" (click)="setFilter('lost')">Lost Items ({{ countType('lost') }})</button>
            <button class="btn btn-sm" [class.btn-outline-glass]="activeFilter !== 'found'" [class.btn-primary-gradient]="activeFilter === 'found'" (click)="setFilter('found')">Found Items ({{ countType('found') }})</button>
          </div>
          
          <!-- Search & Category drop-down -->
          <div class="col-lg-6">
            <div class="row g-2">
              <div class="col-7">
                <div class="input-group-custom">
                  <span class="input-group-icon"><i class="bi bi-search"></i></span>
                  <input type="text" class="form-control py-1.5" placeholder="Search my reports..." [(ngModel)]="searchQuery" (input)="onFilter()">
                </div>
              </div>
              <div class="col-5">
                <select class="form-select py-1.5" [(ngModel)]="selectedCategory" (change)="onFilter()">
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pt-2 border-top border-secondary border-opacity-30 d-flex justify-content-between align-items-center">
          <span class="text-muted small">
            Resolved Cases: <strong class="text-success">{{ countStatus('resolved') }}</strong> | 
            Active Matches: <strong class="text-warning">{{ countStatus('matched') }}</strong>
          </span>
        </div>
      </div>

      <!-- Skeleton Loading Placeholders -->
      <div class="row g-4" *ngIf="isLoading">
        <div class="col-md-6 col-lg-4" *ngFor="let placeholder of [1, 2, 3]">
          <div class="card h-100 glass-panel shimmer-loading border-0" style="min-height: 380px;">
            <div class="shimmer-box w-100" style="height: 180px; border-top-left-radius: 16px; border-top-right-radius: 16px;"></div>
            <div class="card-body p-4">
              <div class="d-flex justify-content-between mb-2">
                <div class="shimmer-line w-25"></div>
                <div class="shimmer-line w-25"></div>
              </div>
              <div class="shimmer-line w-75 mb-3" style="height: 1.5rem;"></div>
              <div class="shimmer-line w-100 mb-2"></div>
              <div class="shimmer-line w-50 mb-3"></div>
              <div class="border-top border-secondary pt-3 mt-4 d-flex justify-content-between">
                <div class="shimmer-line w-30"></div>
                <div class="shimmer-line w-30"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Reports List -->
      <div class="row g-4" *ngIf="!isLoading && paginatedReports.length > 0; else noReports">
        <div class="col-md-6 col-lg-4" *ngFor="let item of paginatedReports">
          <div class="card h-100 glass-panel glass-card-interactive overflow-hidden border-0 text-white d-flex flex-column">
            
            <!-- Image & Badges -->
            <div class="position-relative overflow-hidden card-img-container">
              <img [src]="item.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'" [alt]="item.name" class="card-img-top w-100 h-100 object-fit-cover">
              
              <!-- Report Type Badge -->
              <span class="badge position-absolute top-3 start-3 badge-status" [class.badge-lost]="item.type === 'lost'" [class.badge-found]="item.type === 'found'">
                {{ item.type | uppercase }}
              </span>

              <!-- Status Badge -->
              <span class="badge position-absolute top-3 end-3 badge-status"
                [class.badge-resolved]="item.status === 'resolved'"
                [class.badge-matched]="item.status === 'matched'"
                [class.badge-lost]="item.status === 'active' && item.type === 'lost'"
                [class.badge-found]="item.status === 'active' && item.type === 'found'">
                {{ item.status | uppercase }}
              </span>
            </div>

            <!-- Card Body -->
            <div class="card-body p-4 d-flex flex-column flex-grow-1">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <span class="text-cyan small fw-semibold"><i class="bi bi-tag-fill me-1"></i>{{ item.category }}</span>
                <span class="text-muted small"><i class="bi bi-calendar-event me-1"></i>{{ item.date }}</span>
              </div>
              <h5 class="card-title text-white fw-bold mb-2">{{ item.name }}</h5>
              <p class="card-text text-muted small flex-grow-1">{{ item.description }}</p>

              <div class="d-flex align-items-center mb-3">
                <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                <span class="small text-muted text-truncate" style="max-width: 200px;">{{ item.location }}</span>
              </div>

              <!-- Action triggers -->
              <div class="border-top border-secondary pt-3 mt-auto d-flex align-items-center justify-content-between">
                <!-- Delete -->
                <button class="btn btn-sm btn-outline-danger btn-delete px-3" (click)="onDelete(item.id)">
                  <i class="bi bi-trash"></i> Delete
                </button>

                <!-- View Matches (Visible if matches exist) -->
                <a class="btn btn-sm btn-primary-gradient px-3" *ngIf="item.status === 'matched'" routerLink="/matches">
                  <i class="bi bi-cpu me-1"></i> Matches
                </a>
                
                <span class="text-muted small" *ngIf="item.status === 'active'">Scanning...</span>
                <span class="text-success small d-flex align-items-center" *ngIf="item.status === 'resolved'"><i class="bi bi-check-circle-fill me-1"></i>Resolved</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- No Reports -->
      <ng-template #noReports>
        <div class="glass-panel p-5 text-center text-muted" *ngIf="!isLoading">
          <i class="bi bi-journal-text display-3 mb-3 d-block text-primary"></i>
          <h4 class="text-white fw-bold">No reports match your filters</h4>
          <p class="mb-4">Submit your lost/found items to have them analyzed by LostAI.</p>
          <div class="d-flex justify-content-center gap-2">
            <a class="btn btn-primary-gradient" routerLink="/report-lost">Report Lost</a>
            <a class="btn btn-secondary-gradient" routerLink="/report-found">Report Found</a>
          </div>
        </div>
      </ng-template>

      <!-- Pagination Controls -->
      <div class="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-3" *ngIf="!isLoading && totalPages > 1">
        <span class="text-muted small">Showing page <strong>{{ currentPage }}</strong> of <strong>{{ totalPages }}</strong></span>
        <nav>
          <ul class="pagination pagination-sm mb-0 gap-2">
            <li class="page-item" [class.disabled]="currentPage === 1">
              <button class="page-link btn btn-outline-glass border-secondary py-2 px-3 text-white" (click)="prevPage()"><i class="bi bi-chevron-left"></i></button>
            </li>
            <li class="page-item" *ngFor="let page of [].constructor(totalPages); let i = index" [class.active]="currentPage === (i + 1)">
              <button class="page-link btn py-2 px-3 text-white" 
                      [class.btn-primary-gradient]="currentPage === (i + 1)" 
                      [class.btn-outline-glass]="currentPage !== (i + 1)" 
                      (click)="goToPage(i + 1)">
                {{ i + 1 }}
              </button>
            </li>
            <li class="page-item" [class.disabled]="currentPage === totalPages">
              <button class="page-link btn btn-outline-glass border-secondary py-2 px-3 text-white" (click)="nextPage()"><i class="bi bi-chevron-right"></i></button>
            </li>
          </ul>
        </nav>
      </div>

    </div>
  `,
  styles: [`
    .card-img-container {
      height: 180px;
    }
    .text-cyan {
      color: var(--secondary);
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
    }
    .btn-outline-danger {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .btn-outline-danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fff;
    }
    .top-3 {
      top: 1rem;
    }
    .start-3 {
      left: 1rem;
    }
    .end-3 {
      right: 1rem;
    }
    .object-fit-cover {
      object-fit: cover;
    }

    /* Skeleton Loading Shimmer animations */
    .shimmer-loading {
      position: relative;
      overflow: hidden;
    }
    .shimmer-box {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    .shimmer-line {
      height: 1rem;
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
    .w-30 { width: 30%; }
  `]
})
export class MyReportsComponent implements OnInit {
  currentUser: User | null = null;
  reports: LostFoundItem[] = [];
  filteredReports: LostFoundItem[] = [];
  paginatedReports: LostFoundItem[] = [];
  activeFilter: 'all' | 'lost' | 'found' = 'all';

  // Skeletons State
  isLoading = true;

  // Search & Filter State
  searchQuery = '';
  categories = ['All Categories', 'Electronics', 'Personal Accessories', 'Documents', 'Other'];
  selectedCategory = 'All Categories';

  // Pagination State
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  constructor(
    private authService: AuthService,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadReports(u.id);
      }
    });
  }

  loadReports(userId: string): void {
    this.itemService.items$.subscribe(items => {
      this.reports = items.filter(i => i.reporterId === userId);
      this.onFilter();

      // Simulate initial loading sequence for skeletons
      setTimeout(() => {
        this.isLoading = false;
      }, 800);
    });
  }

  setFilter(filter: 'all' | 'lost' | 'found'): void {
    this.activeFilter = filter;
    this.currentPage = 1;
    this.onFilter();
  }

  onFilter(): void {
    let result = this.reports;

    // Filter by type
    if (this.activeFilter !== 'all') {
      result = result.filter(i => i.type === this.activeFilter);
    }

    // Filter by category
    if (this.selectedCategory !== 'All Categories') {
      result = result.filter(i => i.category.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    // Filter by search keywords
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
      );
    }

    this.filteredReports = result;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredReports.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedReports = this.filteredReports.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  countType(type: 'lost' | 'found'): number {
    return this.reports.filter(i => i.type === type).length;
  }

  countStatus(status: 'active' | 'matched' | 'resolved'): number {
    return this.reports.filter(i => i.status === status).length;
  }

  onDelete(itemId: string): void {
    if (confirm('Are you sure you want to delete this report? This will cancel all matches.')) {
      this.itemService.deleteItem(itemId).subscribe(() => {
        // Refreshed automatically
      });
    }
  }
}
