import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ItemService } from '../../core/services/item.service';
import { AuthService } from '../../core/services/auth.service';
import { MatchService } from '../../core/services/match.service';
import { MatchResult, LostFoundItem } from '../../core/models/item.model';
import { User } from '../../core/models/user.model';

import { MapComponent } from '../../shared/components/map/map.component';
import { MatchExplanationComponent } from '../../shared/components/match-explanation/match-explanation.component';

@Component({
  selector: 'app-match-results',
  standalone: true,
  imports: [CommonModule, RouterModule, MapComponent, MatchExplanationComponent],
  template: `
    <div class="container py-5 fade-in" *ngIf="currentUser">
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h1 class="h2 text-white fw-bold mb-1">
            <i class="bi bi-cpu text-gradient-ai me-2"></i>AI Match Results
          </h1>
          <p class="text-muted mb-0">Our AI algorithm dynamically compares descriptions, locations, dates, and categories to match items.</p>
        </div>
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <!-- Backend Connection Status badge -->
          <span class="badge border py-2 px-3" 
                [class.bg-success-subtle]="isApiOnline" [class.text-success]="isApiOnline" [class.border-success-subtle]="isApiOnline"
                [class.bg-warning-subtle]="!isApiOnline" [class.text-warning]="!isApiOnline" [class.border-warning-subtle]="!isApiOnline"
                style="font-size: 0.85rem;">
            <i class="bi bi-circle-fill me-1" [class.text-success]="isApiOnline" [class.text-warning]="!isApiOnline" style="font-size: 0.6rem;"></i>
            {{ isApiOnline ? 'AI Engine Online' : 'Local Emulation Mode' }}
          </span>
          <button class="btn btn-outline-glass btn-sm py-2 px-3" (click)="refreshMatches()" [disabled]="isLoading">
            <span class="spinner-border spinner-border-sm me-1" *ngIf="isLoading"></span>
            <i class="bi bi-arrow-clockwise me-1" *ngIf="!isLoading"></i> Scan & Sync
          </button>
          <a class="btn btn-outline-glass btn-sm py-2 px-3" routerLink="/dashboard"><i class="bi bi-grid-fill me-1"></i> Dashboard</a>
        </div>
      </div>

      <!-- Sync feedback banners -->
      <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-20 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="syncSuccessMessage">
        <i class="bi bi-check-circle-fill me-2 fs-5"></i>
        <span>{{ syncSuccessMessage }}</span>
      </div>
      <div class="alert alert-warning bg-warning bg-opacity-10 border-warning border-opacity-20 text-warning rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="syncErrorMessage">
        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        <span>{{ syncErrorMessage }}</span>
      </div>

      <!-- Skeleton loading placeholders -->
      <div class="row g-4" *ngIf="isLoading">
        <div class="col-12" *ngFor="let placeholder of [1, 2]">
          <div class="glass-panel p-4 mb-3 shimmer-loading">
            <div class="border-bottom border-secondary pb-3 mb-4 d-flex justify-content-between">
              <div class="shimmer-line w-25"></div>
              <div class="shimmer-line w-10"></div>
            </div>
            <div class="row g-4 align-items-center">
              <div class="col-md-5">
                <div class="p-3 bg-dark bg-opacity-10 rounded border border-secondary">
                  <div class="d-flex align-items-center">
                    <div class="shimmer-box me-3"></div>
                    <div class="w-70">
                      <div class="shimmer-line w-75 mb-2"></div>
                      <div class="shimmer-line w-50"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-md-2 text-center">
                <div class="shimmer-line w-50 mx-auto mb-2"></div>
                <div class="shimmer-line w-75 mx-auto"></div>
              </div>
              <div class="col-md-5">
                <div class="p-3 bg-dark bg-opacity-10 rounded border border-secondary">
                  <div class="d-flex align-items-center">
                    <div class="shimmer-box me-3"></div>
                    <div class="w-70">
                      <div class="shimmer-line w-75 mb-2"></div>
                      <div class="shimmer-line w-50"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Match Results List -->
      <div class="row g-4" *ngIf="!isLoading && userMatches.length > 0; else noMatches">
        <div class="col-12" *ngFor="let match of userMatches">
          <div class="card glass-panel border-secondary mb-4 overflow-hidden shadow">
            
            <!-- Match Header -->
            <div class="card-header bg-transparent border-bottom border-secondary py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
              <div class="d-flex align-items-center gap-2">
                <span class="badge py-2 px-3 bg-dark text-white-50 border border-secondary" style="font-size: 0.8rem;">
                  ID: {{ match.id }}
                </span>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span class="badge py-2 px-3 text-uppercase badge-status"
                  [class.badge-lost]="match.status === 'pending'"
                  [class.badge-matched]="match.status === 'claimed'"
                  [class.badge-resolved]="match.status === 'resolved'">
                  {{ match.status === 'pending' ? 'Pending Claim' : (match.status === 'claimed' ? 'Claimed' : 'Resolved') }}
                </span>
              </div>
            </div>

            <!-- Match Body -->
            <div class="card-body p-4">
              
              <!-- Similarity Score & Match Confidence -->
              <div class="row align-items-center mb-4">
                <div class="col-md-4 mb-3 mb-md-0">
                  <div class="text-white-50 small mb-1"><i class="bi bi-percent text-gradient-ai me-1"></i>Similarity Score</div>
                  <h3 class="fw-bold text-white mb-0 d-flex align-items-baseline">
                    {{ match.matchPercentage }}%
                    <small class="fs-6 text-muted fw-normal ms-2">AI Match Confidence</small>
                  </h3>
                </div>
                <div class="col-md-4 mb-3 mb-md-0 text-md-center">
                  <div class="text-white-50 small mb-1"><i class="bi bi-shield-check text-gradient-ai me-1"></i>Confidence Level</div>
                  <span class="badge px-3 py-2 fw-bold text-uppercase"
                        [class.bg-high-match-badge]="match.matchPercentage >= 90"
                        [class.bg-medium-match-badge]="match.matchPercentage >= 70 && match.matchPercentage < 90"
                        [class.bg-low-match-badge]="match.matchPercentage < 70">
                    <i class="bi me-1" 
                       [class.bi-shield-fill-check]="match.matchPercentage >= 90" 
                       [class.bi-shield-fill-exclamation]="match.matchPercentage >= 70 && match.matchPercentage < 90" 
                       [class.bi-shield-fill-x]="match.matchPercentage < 70"></i>
                    {{ match.matchPercentage >= 90 ? 'High Match' : (match.matchPercentage >= 70 ? 'Medium Match' : 'Low Match') }}
                  </span>
                </div>
                <div class="col-md-4 text-md-end">
                  <div class="text-white-50 small mb-1"><i class="bi bi-calendar3 text-gradient-ai me-1"></i>Scan Time</div>
                  <span class="text-muted small">Updated Real-time</span>
                </div>
              </div>

              <!-- Bootstrap Progress Bar -->
              <div class="progress bg-dark bg-opacity-50 border border-secondary mb-4" style="height: 1.5rem; border-radius: 30px;">
                <div class="progress-bar progress-bar-striped progress-bar-animated"
                     role="progressbar"
                     [style.width.%]="match.matchPercentage"
                     [ngClass]="{
                       'bg-high-match': match.matchPercentage >= 90,
                       'bg-medium-match': match.matchPercentage >= 70 && match.matchPercentage < 90,
                       'bg-low-match': match.matchPercentage < 70
                     }">
                  <span class="fw-bold text-white px-2" style="font-size: 0.85rem; text-shadow: 0 1px 2px rgba(0,0,0,0.6);">
                    {{ match.matchPercentage }}% Similarity
                  </span>
                </div>
              </div>

              <!-- Match Signals -->
              <div class="mb-4">
                <div class="d-flex align-items-center flex-wrap gap-2">
                  <span class="small text-white-50 me-1"><i class="bi bi-cpu text-gradient-ai me-1"></i>Matching Signals:</span>
                  <span *ngFor="let field of match.matchedFields" class="badge bg-secondary bg-opacity-20 border border-secondary text-white-50 px-3 py-1.5 small rounded-pill">
                    <i class="bi bi-check-circle-fill text-success me-1"></i>{{ field }}
                  </span>
                </div>
              </div>

              <!-- Toggled Match Explanation Component -->
              <div class="mb-4" *ngIf="isExpanded(match.id)">
                <app-match-explanation [match]="match"></app-match-explanation>
              </div>

              <!-- Side-by-Side Bootstrap Cards for Lost and Found Items -->
              <div class="row g-4">
                
                <!-- Left: Lost Item -->
                <div class="col-md-6">
                  <div class="card bg-black bg-opacity-25 border-secondary h-100 shadow-sm transition-hover">
                    <div class="card-header border-secondary bg-transparent d-flex justify-content-between align-items-center py-2 px-3">
                      <span class="text-danger fw-bold small text-uppercase tracking-wider">
                        <i class="bi bi-x-circle me-1"></i>Lost Item
                      </span>
                      <span class="badge badge-lost scale-xs">LOST</span>
                    </div>
                    <div class="card-body p-3">
                      <div class="d-flex gap-3">
                        <div class="position-relative overflow-hidden rounded border border-secondary" style="width: 100px; height: 100px; min-width: 100px;">
                          <img [src]="match.lostItem.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'" 
                               class="img-fluid object-fit-cover w-100 h-100" 
                               alt="Lost Item Image">
                        </div>
                        <div class="flex-grow-1 min-w-0">
                          <h5 class="text-white fw-bold mb-1 text-truncate">{{ match.lostItem.name }}</h5>
                          <p class="text-muted small mb-2 text-truncate-3-lines" style="line-height: 1.4;">{{ match.lostItem.description }}</p>
                          <div class="d-flex flex-wrap gap-1">
                            <span class="badge bg-secondary bg-opacity-35 text-white-50 border border-secondary-subtle scale-xs">{{ match.lostItem.category }}</span>
                            <span *ngIf="match.lostItem.brand" class="badge bg-dark border border-secondary text-white-50 scale-xs">{{ match.lostItem.brand }}</span>
                            <span *ngIf="match.lostItem.color" class="badge bg-dark border border-secondary text-white-50 scale-xs">{{ match.lostItem.color }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="card-footer border-secondary bg-transparent small text-muted py-2 px-3">
                      <div class="row g-2">
                        <div class="col-6 text-truncate" [title]="match.lostItem.date">
                          <i class="bi bi-calendar-event me-1 text-danger"></i>{{ match.lostItem.date }}
                        </div>
                        <div class="col-6 text-truncate" [title]="match.lostItem.location">
                          <i class="bi bi-geo-alt-fill me-1 text-danger"></i>{{ match.lostItem.location }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right: Found Item -->
                <div class="col-md-6">
                  <div class="card bg-black bg-opacity-25 border-secondary h-100 shadow-sm transition-hover">
                    <div class="card-header border-secondary bg-transparent d-flex justify-content-between align-items-center py-2 px-3">
                      <span class="text-cyan fw-bold small text-uppercase tracking-wider">
                        <i class="bi bi-check-circle me-1"></i>Found Item
                      </span>
                      <span class="badge badge-found scale-xs">FOUND</span>
                    </div>
                    <div class="card-body p-3">
                      <div class="d-flex gap-3">
                        <div class="position-relative overflow-hidden rounded border border-secondary" style="width: 100px; height: 100px; min-width: 100px;">
                          <img [src]="match.foundItem.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'" 
                               class="img-fluid object-fit-cover w-100 h-100" 
                               alt="Found Item Image">
                        </div>
                        <div class="flex-grow-1 min-w-0">
                          <h5 class="text-white fw-bold mb-1 text-truncate">{{ match.foundItem.name }}</h5>
                          <p class="text-muted small mb-2 text-truncate-3-lines" style="line-height: 1.4;">{{ match.foundItem.description }}</p>
                          <div class="d-flex flex-wrap gap-1">
                            <span class="badge bg-secondary bg-opacity-35 text-white-50 border border-secondary-subtle scale-xs">{{ match.foundItem.category }}</span>
                            <span *ngIf="match.foundItem.brand" class="badge bg-dark border border-secondary text-white-50 scale-xs">{{ match.foundItem.brand }}</span>
                            <span *ngIf="match.foundItem.color" class="badge bg-dark border border-secondary text-white-50 scale-xs">{{ match.foundItem.color }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="card-footer border-secondary bg-transparent small text-muted py-2 px-3">
                      <div class="row g-2">
                        <div class="col-6 text-truncate" [title]="match.foundItem.date">
                          <i class="bi bi-calendar-event me-1 text-cyan"></i>{{ match.foundItem.date }}
                        </div>
                        <div class="col-6 text-truncate" [title]="match.foundItem.location">
                          <i class="bi bi-geo-alt-fill me-1 text-cyan"></i>{{ match.foundItem.location }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Map Visualization -->
              <div class="row g-4 mt-3">
                <div class="col-12">
                  <div class="p-3 bg-black bg-opacity-20 border border-secondary rounded shadow-sm">
                    <div class="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <div class="small fw-semibold text-gradient-ai">
                        <i class="bi bi-map-fill me-1"></i> AI Proximity Mapping
                      </div>
                      <div class="small text-muted">
                        Lost at <span class="text-white">{{ match.lostItem.location }}</span> 
                        <span *ngIf="match.lostItem.latitude">({{ match.lostItem.latitude | number:'1.4-4' }}, {{ match.lostItem.longitude | number:'1.4-4' }})</span>
                        &bull; Found at <span class="text-white">{{ match.foundItem.location }}</span> 
                        <span *ngIf="match.foundItem.latitude">({{ match.foundItem.latitude | number:'1.4-4' }}, {{ match.foundItem.longitude | number:'1.4-4' }})</span>
                      </div>
                    </div>
                    <app-map 
                      [lostLat]="match.lostItem.latitude || 40.7829" 
                      [lostLng]="match.lostItem.longitude || -73.9654"
                      [foundLat]="match.foundItem.latitude || 40.7580" 
                      [foundLng]="match.foundItem.longitude || -73.9855">
                    </app-map>
                  </div>
                </div>
              </div>

            </div>

            <!-- Action buttons footer -->
            <div class="card-footer bg-transparent border-top border-secondary py-3 px-4 d-flex justify-content-between gap-2 flex-wrap align-items-center">
              <div>
                <button class="btn btn-outline-glass btn-sm px-3" (click)="toggleExplanation(match.id)">
                  <i class="bi bi-info-circle me-1"></i> 
                  {{ isExpanded(match.id) ? 'Hide Details' : 'Explain AI Match' }}
                </button>
              </div>
              <div class="d-flex gap-2">
                <!-- If pending: user can claim/contact -->
                <a class="btn btn-secondary-gradient btn-sm px-3" 
                   *ngIf="match.status === 'pending' && match.matchPercentage >= 70" 
                   [routerLink]="['/chat']" 
                   [queryParams]="{
                     start: 'true',
                     lostItemId: match.lostItem.id,
                     foundItemId: match.foundItem.id,
                     ownerUserId: match.lostItem.reporterId,
                     finderUserId: match.foundItem.reporterId,
                     matchId: match.id
                   }">
                  <i class="bi bi-chat-dots-fill me-1"></i> Start Secure Chat
                </a>
                <button class="btn btn-outline-glass btn-sm px-3" 
                        *ngIf="match.status === 'pending' && match.matchPercentage < 70" 
                        disabled
                        title="Chat locked. Requires at least 70% AI similarity score.">
                  <i class="bi bi-lock-fill me-1"></i> Chat Locked ({{ match.matchPercentage }}%)
                </button>
                <button class="btn btn-primary-gradient btn-sm px-3" *ngIf="match.status === 'pending'" (click)="onClaim(match.id)">
                  <i class="bi bi-check2-square me-1"></i> Confirm & Claim Item
                </button>

                <!-- If claimed: user can resolve -->
                <button class="btn btn-success-custom btn-sm px-3" *ngIf="match.status === 'claimed'" (click)="onResolve(match.id)">
                  <i class="bi bi-check-circle me-1"></i> Mark as Safely Returned
                </button>
                
                <!-- If resolved -->
                <span class="text-success small d-flex align-items-center" *ngIf="match.status === 'resolved'">
                  <i class="bi bi-check-circle-fill me-2 fs-5"></i> This case was successfully resolved!
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- No Matches template -->
      <ng-template #noMatches>
        <div class="glass-panel p-5 text-center text-muted py-5" *ngIf="!isLoading">
          <i class="bi bi-cpu display-3 mb-3 d-block text-gradient-ai"></i>
          <h4 class="text-white fw-bold">No AI matches found yet</h4>
          <p class="mb-4">Reports are constantly scanned. Submit more descriptive reports or adjust item descriptions to improve match probability.</p>
          <div class="d-flex justify-content-center gap-2">
            <a class="btn btn-primary-gradient" routerLink="/report-lost">Report Lost</a>
            <a class="btn btn-secondary-gradient" routerLink="/report-found">Report Found</a>
          </div>
        </div>
      </ng-template>

      <!-- Simulated Contact Modal -->
      <div class="modal-backdrop fade show" *ngIf="activeModalMatch"></div>
      <div class="modal fade show d-block" tabindex="-1" *ngIf="activeModalMatch" style="top: 20%;">
        <div class="modal-dialog">
          <div class="modal-content glass-panel text-white p-4 border-secondary">
            <div class="modal-header border-0 pb-0">
              <h5 class="modal-title fw-bold"><i class="bi bi-chat-dots text-gradient-ai me-2"></i>Contact Details</h5>
              <button type="button" class="btn-close btn-close-white" (click)="closeContactModal()"></button>
            </div>
            <div class="modal-body py-3">
              <p>You can contact the reporter of the matched item directly using the contact information below:</p>
              <div class="p-3 bg-dark bg-opacity-40 rounded border border-secondary mb-3">
                <div class="small text-muted mb-1">Reporter Name:</div>
                <div class="fw-bold mb-2 text-white">{{ getOppositeItem(activeModalMatch).reporterName }}</div>
                <div class="small text-muted mb-1">Contact Info:</div>
                <div class="fw-bold text-cyan">{{ getOppositeItem(activeModalMatch).reporterContact }}</div>
              </div>
              <p class="small text-muted mb-0">Please coordinate in a safe public place to exchange the item. Be sure to verify ownership by asking detailed questions.</p>
            </div>
            <div class="modal-footer border-0 pt-0 justify-content-end gap-2">
              <button type="button" class="btn btn-outline-glass btn-sm" (click)="closeContactModal()">Close Dialog</button>
              <button type="button" class="btn btn-secondary-gradient btn-sm" (click)="onContactInitiate()">
                <i class="bi bi-chat-dots-fill me-1"></i> Send Contact Request
              </button>
              <button type="button" class="btn btn-primary-gradient btn-sm" (click)="onClaimFromModal()">Confirm & Claim</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-cyan {
      color: var(--secondary);
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
    }
    .btn-success-custom {
      background-color: var(--success);
      color: white;
      font-weight: 600;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      transition: opacity 0.2s ease;
    }
    .btn-success-custom:hover {
      opacity: 0.9;
    }
    .modal-backdrop {
      z-index: 1040;
    }
    .modal {
      z-index: 1050;
    }
    .object-fit-cover {
      object-fit: cover;
    }
    .bg-success-subtle {
      background-color: rgba(25, 135, 84, 0.15);
    }
    .bg-warning-subtle {
      background-color: rgba(255, 193, 7, 0.15);
    }
    .text-success {
      color: #198754 !important;
    }
    .text-warning {
      color: #ffc107 !important;
    }
    .border-success-subtle {
      border-color: rgba(25, 135, 84, 0.3) !important;
    }
    .border-warning-subtle {
      border-color: rgba(255, 193, 7, 0.3) !important;
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
    .shimmer-box {
      width: 70px;
      height: 70px;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
      border-radius: 6px;
    }
    .w-70 { width: 70%; }
    .w-25 { width: 25%; }
    .w-10 { width: 10%; }
    .w-50 { width: 50%; }
    .w-75 { width: 75%; }
    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }

    /* Match confidence badge styles */
    .bg-high-match-badge {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
      box-shadow: 0 4px 10px rgba(217, 70, 239, 0.3);
    }
    .bg-medium-match-badge {
      background: linear-gradient(135deg, var(--warning) 0%, #fb923c 100%);
      color: white;
      box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
    }
    .bg-low-match-badge {
      background: linear-gradient(135deg, var(--danger) 0%, #f43f5e 100%);
      color: white;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
    }

    /* Progress bar gradient colors */
    .bg-high-match {
      background: linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%) !important;
    }
    .bg-medium-match {
      background: linear-gradient(90deg, var(--warning) 0%, #fb923c 100%) !important;
    }
    .bg-low-match {
      background: linear-gradient(90deg, var(--danger) 0%, #f43f5e 100%) !important;
    }

    /* Utility text clamp for description */
    .text-truncate-3-lines {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;  
      overflow: hidden;
    }
    .transition-hover {
      transition: all 0.3s ease;
    }
    .transition-hover:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2) !important;
    }
  `]
})
export class MatchResultsComponent implements OnInit {
  currentUser: User | null = null;
  userMatches: MatchResult[] = [];
  activeModalMatch: MatchResult | null = null;
  
  isApiOnline = false;
  isLoading = false;
  syncSuccessMessage = '';
  syncErrorMessage = '';

  constructor(
    private authService: AuthService,
    private itemService: ItemService,
    private matchService: MatchService
  ) {}

  ngOnInit(): void {
    // Monitor API status from MatchService
    this.matchService.isApiOnline$.subscribe(status => {
      this.isApiOnline = status;
    });

    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.loadMatches(u.id);
      }
    });
  }

  loadMatches(userId: string): void {
    this.itemService.matches$.subscribe(matches => {
      // Find matches containing items reported by current user
      this.userMatches = matches.filter(
        m => m.lostItem.reporterId === userId || m.foundItem.reporterId === userId
      );
    });
  }

  refreshMatches(): void {
    if (!this.currentUser) return;
    this.isLoading = true;
    this.syncSuccessMessage = '';
    this.syncErrorMessage = '';

    this.itemService.forceSyncMatches().subscribe({
      next: (isOnline) => {
        this.isLoading = false;
        if (isOnline) {
          this.syncSuccessMessage = 'AI matching scan completed successfully! Retrieved backend results.';
        } else {
          this.syncErrorMessage = 'AI Backend is offline. Computed matches using local emulation.';
        }
        setTimeout(() => {
          this.syncSuccessMessage = '';
          this.syncErrorMessage = '';
        }, 5000);
      },
      error: (err) => {
        this.isLoading = false;
        this.syncErrorMessage = 'An error occurred during matching scan: ' + (err.message || err);
        setTimeout(() => {
          this.syncErrorMessage = '';
        }, 5000);
      }
    });
  }

  getUserItem(match: MatchResult): LostFoundItem {
    return match.lostItem.reporterId === this.currentUser?.id ? match.lostItem : match.foundItem;
  }

  getOppositeItem(match: MatchResult): LostFoundItem {
    return match.lostItem.reporterId === this.currentUser?.id ? match.foundItem : match.lostItem;
  }

  onClaim(matchId: string): void {
    this.itemService.claimMatch(matchId).subscribe(() => {
      // Refreshed automatically by subscription
    });
  }

  onResolve(matchId: string): void {
    this.itemService.resolveMatch(matchId).subscribe(() => {
      // Refreshed automatically
    });
  }

  openContactModal(match: MatchResult): void {
    this.activeModalMatch = match;
  }

  closeContactModal(): void {
    this.activeModalMatch = null;
  }

  onClaimFromModal(): void {
    if (this.activeModalMatch) {
      this.onClaim(this.activeModalMatch.id);
      this.closeContactModal();
    }
  }

  onContactInitiate(): void {
    if (this.activeModalMatch) {
      this.itemService.initiateContact(this.activeModalMatch).subscribe({
        next: () => {
          this.syncSuccessMessage = 'Contact request sent successfully! The reporter will be notified.';
          this.closeContactModal();
          setTimeout(() => this.syncSuccessMessage = '', 5000);
        },
        error: (err) => {
          this.syncErrorMessage = 'Failed to send contact request: ' + (err.message || err);
          this.closeContactModal();
          setTimeout(() => this.syncErrorMessage = '', 5000);
        }
      });
    }
  }

  expandedMatchIds: Set<string> = new Set<string>();

  toggleExplanation(matchId: string): void {
    if (this.expandedMatchIds.has(matchId)) {
      this.expandedMatchIds.delete(matchId);
    } else {
      this.expandedMatchIds.add(matchId);
    }
  }

  isExpanded(matchId: string): boolean {
    return this.expandedMatchIds.has(matchId);
  }

  getPercent(sim: number | undefined): number {
    if (sim === undefined || sim === null) return 50;
    if (sim > 1.0) return Math.round(sim);
    return Math.round(sim * 100);
  }
}
