import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ItemService } from '../../core/services/item.service';
import { LostFoundItem, MatchResult } from '../../core/models/item.model';
import { User } from '../../core/models/user.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { AiSearchComponent } from '../../shared/components/ai-search/ai-search.component';

interface ActivityLog {
  id: string;
  icon: string;
  iconClass: string;
  title: string;
  description: string;
  timeAgo: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatCardComponent, AiSearchComponent],
  template: `
    <div class="container py-5 fade-in" *ngIf="user">
      <!-- Welcome Header -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="glass-panel p-4 d-flex flex-md-row flex-column justify-content-between align-items-md-center align-items-start gap-3">
            <div class="d-flex align-items-center">
              <img [src]="user.avatarUrl" alt="Avatar" class="rounded-circle border border-3 border-primary shadow me-3" width="70" height="70">
              <div>
                <h1 class="h2 text-white fw-bold mb-1">Welcome Back, {{ user.name }}!</h1>
                <p class="text-muted mb-0"><i class="bi bi-clock-history me-1"></i>LostAI scanning database: Match results are updated live.</p>
              </div>
            </div>
            <div class="d-flex gap-2 w-100-mobile">
              <a class="btn btn-primary-gradient flex-fill-mobile" routerLink="/report-lost">
                <i class="bi bi-search me-1"></i> Report Lost
              </a>
              <a class="btn btn-secondary-gradient flex-fill-mobile" routerLink="/report-found">
                <i class="bi bi-eye me-1"></i> Report Found
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Metrics Grid (Reusable Stat Cards) -->
      <div class="row g-4 mb-4">
        <div class="col-xl-3 col-md-6">
          <app-stat-card
            title="Total Lost Items"
            [value]="totalLostItems"
            icon="bi-search"
            iconBgClass="bg-danger bg-opacity-10 text-danger"
            iconBorderClass="border-danger border-opacity-25"
            description="Active missing reports"
            [isLoading]="isLoading">
          </app-stat-card>
        </div>
        <div class="col-xl-3 col-md-6">
          <app-stat-card
            title="Total Found Items"
            [value]="totalFoundItems"
            icon="bi-eye"
            iconBgClass="bg-info bg-opacity-10 text-info"
            iconBorderClass="border-info border-opacity-25"
            description="Recovered item logs"
            [isLoading]="isLoading">
          </app-stat-card>
        </div>
        <div class="col-xl-3 col-md-6">
          <app-stat-card
            title="AI Potential Matches"
            [value]="potentialMatchesCount"
            icon="bi-cpu"
            iconBgClass="bg-warning bg-opacity-10 text-warning"
            iconBorderClass="border-warning border-opacity-25"
            description="Dynamic scanner pairings"
            [isLoading]="isLoading">
          </app-stat-card>
        </div>
        <div class="col-xl-3 col-md-6">
          <app-stat-card
            title="My Reports"
            [value]="myItems.length"
            icon="bi-journal-text"
            iconBgClass="bg-primary bg-opacity-10 text-primary"
            iconBorderClass="border-primary border-opacity-25"
            description="Your logged filings"
            [isLoading]="isLoading">
          </app-stat-card>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-12">
          <app-ai-search></app-ai-search>
        </div>
      </div>

      <div class="row g-4">
        <!-- Matches Recommendations -->
        <div class="col-lg-8">
          <div class="glass-panel p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-4">
              <h2 class="h4 text-white mb-0"><i class="bi bi-lightning-charge text-warning me-2"></i>My AI Match Recommendations</h2>
              <a class="btn btn-sm btn-outline-glass" routerLink="/matches">View Matches</a>
            </div>

            <!-- Loader Skeleton for Recommendations Table -->
            <div class="d-flex flex-column gap-3" *ngIf="isLoading; else tableContent">
              <div class="shimmer-line w-100" style="height: 38px; border-radius: 6px;"></div>
              <div class="shimmer-line w-100" style="height: 55px; border-radius: 6px;" *ngFor="let placeholder of [1, 2, 3]"></div>
            </div>

            <ng-template #tableContent>
              <div class="table-responsive" *ngIf="myPendingMatches.length > 0; else noMatches">
                <table class="table table-dark table-hover align-middle border-0 mb-0">
                  <thead>
                    <tr class="text-muted small">
                      <th>Your Item</th>
                      <th>Match Candidate</th>
                      <th>Confidence</th>
                      <th>Matched Elements</th>
                      <th class="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let match of myPendingMatches | slice:0:4">
                      <td>
                        <div class="d-flex align-items-center">
                          <img [src]="getUserItem(match).imageUrl" class="rounded me-2 object-fit-cover" width="40" height="40">
                          <div>
                            <div class="fw-semibold text-white small">{{ getUserItem(match).name }}</div>
                            <span class="badge badge-status scale-xs" [class.badge-lost]="getUserItem(match).type === 'lost'" [class.badge-found]="getUserItem(match).type === 'found'">
                              {{ getUserItem(match).type | uppercase }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="d-flex align-items-center">
                          <img [src]="getOppositeItem(match).imageUrl" class="rounded me-2 object-fit-cover" width="40" height="40">
                          <div>
                            <div class="fw-semibold text-white small">{{ getOppositeItem(match).name }}</div>
                            <span class="text-muted small font-monospace" style="font-size: 0.75rem;">
                              {{ getOppositeItem(match).location | slice:0:15 }}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span class="badge ai-match-badge fs-7">{{ match.matchPercentage }}% Match</span>
                      </td>
                      <td>
                        <div class="small text-muted text-truncate" style="max-width: 140px;" [title]="match.matchedFields.join(', ')">
                          {{ match.matchedFields.join(', ') }}
                        </div>
                      </td>
                      <td class="text-end">
                        <a class="btn btn-sm btn-primary-gradient px-3" routerLink="/matches">Compare</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-template>

            <ng-template #noMatches>
              <div class="text-center py-5 text-muted">
                <i class="bi bi-cpu display-4 mb-3 d-block text-gradient-ai"></i>
                <h5 class="text-white fw-bold">No Active Matches</h5>
                <p class="small">Our AI scans the database continuously. Once a similar report is uploaded, matches will appear here.</p>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- Recent Activity Feed -->
        <div class="col-lg-4">
          <div class="glass-panel p-4 h-100">
            <h2 class="h4 text-white mb-4"><i class="bi bi-activity text-primary me-2"></i>Recent System Activity</h2>
            
            <!-- Loader Skeleton for Activity Feed -->
            <div class="d-flex flex-column gap-3" *ngIf="isLoading; else activityContent">
              <div class="p-3 bg-dark bg-opacity-20 rounded border border-secondary shimmer-loading" *ngFor="let placeholder of [1, 2, 3]">
                <div class="d-flex align-items-center">
                  <div class="shimmer-box rounded-circle me-3" style="width: 38px; height: 38px; min-width: 38px;"></div>
                  <div class="flex-grow-1">
                    <div class="shimmer-line w-75 mb-2"></div>
                    <div class="shimmer-line w-50"></div>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #activityContent>
              <div class="d-flex flex-column gap-3" *ngIf="recentActivity.length > 0; else noActivity">
                <div class="d-flex p-3 rounded bg-dark bg-opacity-20 border border-secondary align-items-start" *ngFor="let act of recentActivity">
                  <div class="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" 
                    [ngClass]="act.iconClass" style="width: 38px; height: 38px; min-width: 38px;">
                    <i class="bi" [ngClass]="act.icon"></i>
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <h6 class="text-white fw-bold mb-0 text-truncate small" style="font-size: 0.85rem;">{{ act.title }}</h6>
                      <span class="text-muted small font-monospace" style="font-size: 0.7rem;">{{ act.timeAgo }}</span>
                    </div>
                    <p class="text-muted mb-0 small" style="font-size: 0.8rem;">{{ act.description }}</p>
                  </div>
                </div>
              </div>
            </ng-template>

            <ng-template #noActivity>
              <div class="text-center py-5 text-muted">
                <i class="bi bi-activity display-4 mb-3 d-block text-primary"></i>
                <h5 class="text-white fw-bold">No Activity logs</h5>
                <p class="small">Database is fresh. Log files or matches will start rendering activity streams.</p>
              </div>
            </ng-template>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-monospace {
      font-family: var(--bs-font-monospace);
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
    }
    .fs-7 {
      font-size: 0.8rem;
    }
    .object-fit-cover {
      object-fit: cover;
    }
    .bg-danger { background-color: rgba(239, 68, 68, 0.15) !important; }
    .bg-info { background-color: rgba(6, 182, 212, 0.15) !important; }
    .bg-warning { background-color: rgba(245, 158, 11, 0.15) !important; }
    .bg-primary { background-color: rgba(99, 102, 241, 0.15) !important; }
    .bg-success { background-color: rgba(16, 185, 129, 0.15) !important; }

    /* Mobile adjustments */
    @media (max-width: 575.98px) {
      .w-100-mobile {
        width: 100% !important;
      }
      .flex-fill-mobile {
        flex: 1 1 auto !important;
        text-align: center;
      }
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
  `]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  myItems: LostFoundItem[] = [];
  myPendingMatches: MatchResult[] = [];
  
  // Dashboard Metrics
  totalLostItems = 0;
  totalFoundItems = 0;
  potentialMatchesCount = 0;
  recentActivity: ActivityLog[] = [];

  // Loading Skeletons state
  isLoading = true;

  constructor(
    private authService: AuthService,
    private itemService: ItemService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.loadDashboardData(u.id);
      }
    });
  }

  loadDashboardData(userId: string): void {
    this.itemService.items$.subscribe(items => {
      this.totalLostItems = items.filter(i => i.type === 'lost').length;
      this.totalFoundItems = items.filter(i => i.type === 'found').length;
      this.myItems = items.filter(i => i.reporterId === userId);
      
      this.itemService.matches$.subscribe(matches => {
        this.potentialMatchesCount = matches.filter(m => m.status === 'pending').length;
        this.myPendingMatches = matches.filter(
          m => (m.lostItem.reporterId === userId || m.foundItem.reporterId === userId) && m.status !== 'resolved'
        );

        this.generateActivityLogs(items, matches);
        
        // Emulate scans rendering delays (800ms)
        setTimeout(() => {
          this.isLoading = false;
        }, 800);
      });
    });
  }

  getUserItem(match: MatchResult): LostFoundItem {
    return match.lostItem.reporterId === this.user?.id ? match.lostItem : match.foundItem;
  }

  getOppositeItem(match: MatchResult): LostFoundItem {
    return match.lostItem.reporterId === this.user?.id ? match.foundItem : match.lostItem;
  }

  generateActivityLogs(items: LostFoundItem[], matches: MatchResult[]): void {
    const logs: ActivityLog[] = [];

    // Add item creation logs
    items.forEach(item => {
      const isMyItem = item.reporterId === this.user?.id;
      const reporter = isMyItem ? 'You' : item.reporterName;
      
      if (item.type === 'lost') {
        logs.push({
          id: 'act_lost_' + item.id,
          icon: 'bi-search',
          iconClass: 'bg-danger text-danger',
          title: `${reporter} reported a lost item`,
          description: `"${item.name}" lost at ${item.location}`,
          timeAgo: this.formatTimeAgo(item.createdAt)
        });
      } else {
        logs.push({
          id: 'act_found_' + item.id,
          icon: 'bi-eye',
          iconClass: 'bg-info text-info',
          title: `${reporter} reported a found item`,
          description: `"${item.name}" found near ${item.location}`,
          timeAgo: this.formatTimeAgo(item.createdAt)
        });
      }
    });

    // Add matches logs
    matches.forEach(match => {
      const isMyMatch = match.lostItem.reporterId === this.user?.id || match.foundItem.reporterId === this.user?.id;
      if (match.status === 'claimed') {
        logs.push({
          id: 'act_match_claim_' + match.id,
          icon: 'bi-chat-dots-fill',
          iconClass: 'bg-primary text-primary',
          title: isMyMatch ? 'Your match claimed' : 'Match claim requested',
          description: `Claim request recorded between finder and owner for "${match.lostItem.name}"`,
          timeAgo: '2h ago'
        });
      } else if (match.status === 'resolved') {
        logs.push({
          id: 'act_match_resolve_' + match.id,
          icon: 'bi-check-circle-fill',
          iconClass: 'bg-success text-success',
          title: 'Case marked resolved',
          description: `"${match.lostItem.name}" was successfully returned to owner.`,
          timeAgo: '1d ago'
        });
      } else {
        logs.push({
          id: 'act_match_pair_' + match.id,
          icon: 'bi-cpu-fill',
          iconClass: 'bg-warning text-warning',
          title: `AI Match identified (${match.matchPercentage}% confidence)`,
          description: `Matched "${match.lostItem.name}" with "${match.foundItem.name}"`,
          timeAgo: 'Recently'
        });
      }
    });

    this.recentActivity = logs.slice(0, 5);
  }

  private formatTimeAgo(isoString: string): string {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return `${Math.max(1, diffMins)}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else {
        return `${diffDays}d ago`;
      }
    } catch (e) {
      return 'Just now';
    }
  }
}
