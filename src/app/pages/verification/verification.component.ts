import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { VerificationService, VerificationRequest } from '../../core/services/verification.service';
import { ItemService } from '../../core/services/item.service';
import { LostFoundItem } from '../../core/models/item.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="container py-5 fade-in" *ngIf="currentUser">
      
      <!-- Back Header -->
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 class="h2 text-white fw-bold mb-1">
            <i class="bi bi-qr-code text-gradient-primary me-2"></i>Ownership Handover Center
          </h1>
          <p class="text-muted mb-0">Coordinate meetup verification using secure single-use verification tokens.</p>
        </div>
        <div class="d-flex gap-2">
          <a class="btn btn-outline-glass btn-sm py-2 px-3" routerLink="/chat">
            <i class="bi bi-chat-dots-fill me-1"></i> Back to Chat
          </a>
        </div>
      </div>

      <!-- Feedback Banners -->
      <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-20 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="successMsg">
        <i class="bi bi-check-circle-fill me-2 fs-5"></i>
        <span>{{ successMsg }}</span>
      </div>
      <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-20 text-danger rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="errorMsg">
        <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
        <span>{{ errorMsg }}</span>
      </div>

      <div class="row g-4" *ngIf="verification">
        
        <!-- Step Progress Timeline (Header row span) -->
        <div class="col-12">
          <div class="glass-panel p-4">
            <h5 class="text-white fw-bold mb-4"><i class="bi bi-clipboard-check-fill text-primary me-2"></i>Verification Timeline</h5>
            
            <div class="position-relative d-flex justify-content-between align-items-center mb-2 px-md-5">
              <!-- Timeline Bar -->
              <div class="position-absolute bg-secondary bg-opacity-35" style="height: 4px; left: 55px; right: 55px; top: 22px; z-index: 0;"></div>
              <div class="position-absolute bg-primary-gradient" [style.width.%]="getProgressPercent()" style="height: 4px; left: 55px; transition: width 0.4s ease; top: 22px; z-index: 0;"></div>
              
              <!-- Step 1: Requested -->
              <div class="d-flex flex-column align-items-center position-relative" style="z-index: 1;">
                <div class="step-circle rounded-circle border d-flex align-items-center justify-content-center"
                     [class.step-done]="isStepDone(1)" [class.step-active]="isStepActive(1)" [class.step-todo]="isStepTodo(1)">
                  <i class="bi" [class.bi-check-lg]="isStepDone(1)" [class.bi-send-fill]="!isStepDone(1)"></i>
                </div>
                <span class="small mt-2 fw-semibold" [class.text-white]="isStepActive(1) || isStepDone(1)" [class.text-muted]="isStepTodo(1)">Requested</span>
              </div>
              
              <!-- Step 2: Approved -->
              <div class="d-flex flex-column align-items-center position-relative" style="z-index: 1;">
                <div class="step-circle rounded-circle border d-flex align-items-center justify-content-center"
                     [class.step-done]="isStepDone(2)" [class.step-active]="isStepActive(2)" [class.step-todo]="isStepTodo(2)">
                  <i class="bi" [class.bi-check-lg]="isStepDone(2)" [class.bi-patch-check-fill]="!isStepDone(2)"></i>
                </div>
                <span class="small mt-2 fw-semibold" [class.text-white]="isStepActive(2) || isStepDone(2)" [class.text-muted]="isStepTodo(2)">Approved</span>
              </div>
              
              <!-- Step 3: QR Generated -->
              <div class="d-flex flex-column align-items-center position-relative" style="z-index: 1;">
                <div class="step-circle rounded-circle border d-flex align-items-center justify-content-center"
                     [class.step-done]="isStepDone(3)" [class.step-active]="isStepActive(3)" [class.step-todo]="isStepTodo(3)">
                  <i class="bi" [class.bi-check-lg]="isStepDone(3)" [class.bi-qr-code]="!isStepDone(3)"></i>
                </div>
                <span class="small mt-2 fw-semibold" [class.text-white]="isStepActive(3) || isStepDone(3)" [class.text-muted]="isStepTodo(3)">QR Ready</span>
              </div>
              
              <!-- Step 4: Exchanged -->
              <div class="d-flex flex-column align-items-center position-relative" style="z-index: 1;">
                <div class="step-circle rounded-circle border d-flex align-items-center justify-content-center"
                     [class.step-done]="isStepDone(4)" [class.step-active]="isStepActive(4)" [class.step-todo]="isStepTodo(4)">
                  <i class="bi" [class.bi-check-lg]="isStepDone(4)" [class.bi-hand-thumbs-up-fill]="!isStepDone(4)"></i>
                </div>
                <span class="small mt-2 fw-semibold" [class.text-white]="isStepActive(4) || isStepDone(4)" [class.text-muted]="isStepTodo(4)">Completed</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Left Column: Item match context -->
        <div class="col-lg-6">
          <div class="glass-panel p-4 h-100 d-flex flex-column gap-3">
            <h5 class="text-white fw-bold mb-2"><i class="bi bi-info-circle text-primary me-2"></i>Handover Item Details</h5>
            
            <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded d-flex gap-3">
              <img [src]="lostItem?.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=150&q=80'" 
                   class="rounded object-fit-cover border border-secondary" style="width: 80px; height: 80px;" alt="Lost" />
              <div>
                <span class="badge bg-danger scale-xs mb-1">LOST REPORT</span>
                <h6 class="text-white fw-bold mb-0.5">{{ lostItem?.name }}</h6>
                <div class="small text-muted">{{ lostItem?.category }}</div>
                <div class="small text-muted mt-1"><i class="bi bi-geo-alt me-1"></i>{{ lostItem?.location }}</div>
              </div>
            </div>

            <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded d-flex gap-3">
              <img [src]="foundItem?.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=150&q=80'" 
                   class="rounded object-fit-cover border border-secondary" style="width: 80px; height: 80px;" alt="Found" />
              <div>
                <span class="badge bg-cyan scale-xs mb-1">FOUND REPORT</span>
                <h6 class="text-white fw-bold mb-0.5">{{ foundItem?.name }}</h6>
                <div class="small text-muted">{{ foundItem?.category }}</div>
                <div class="small text-muted mt-1"><i class="bi bi-geo-alt me-1"></i>{{ foundItem?.location }}</div>
              </div>
            </div>

            <!-- Verification Document Proof -->
            <div *ngIf="verification.documentUrl" class="p-3 bg-dark bg-opacity-20 border border-secondary rounded mb-3 small text-white-50">
              <h6 class="text-white fw-bold mb-1.5"><i class="bi bi-file-earmark-text text-primary me-1"></i>Ownership Proof Document:</h6>
              <div class="d-flex align-items-center justify-content-between">
                <span class="text-muted text-truncate me-2" style="max-width: 250px;">{{ verification.documentUrl }}</span>
                <a [href]="verification.documentUrl" target="_blank" class="btn btn-outline-glass btn-xs text-cyan text-decoration-none">
                  <i class="bi bi-eye me-1"></i>View Document
                </a>
              </div>
            </div>

            <!-- Meetup Instructions -->
            <div class="mt-auto p-3 bg-primary bg-opacity-10 border border-primary border-opacity-25 rounded small text-white-50">
              <h6 class="text-white fw-bold mb-2"><i class="bi bi-shield-fill-exclamation me-1 text-primary"></i>Meetup Safety Instructions:</h6>
              <ul class="mb-0 ps-3">
                <li>Coordinate exchange inside a well-lit, public location (e.g. metro terminal or police station).</li>
                <li>Do not share passwords, pins, or banking details.</li>
                <li>Verify item condition and identification matches before processing QR scan verification.</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Right Column: Verification Actions -->
        <div class="col-lg-6">
          <div class="glass-panel p-4 h-100 d-flex flex-column">
            <h5 class="text-white fw-bold mb-3"><i class="bi bi-cpu-fill text-gradient-ai me-2"></i>Claim Verification Workflow</h5>

            <!-- Role details -->
            <div class="mb-4 small text-muted">
              Logged in user: <strong class="text-white">{{ currentUser.name }}</strong> (Role: <span class="badge bg-secondary">{{ isOwner ? 'Claimant/Owner' : 'Reporter/Finder' }}</span>)
            </div>

            <!-- Case 1: Status = Pending -->
            <div *ngIf="verification.status === 'Pending'" class="my-auto text-center py-4">
              <!-- Finder View: Approve / Reject Actions -->
              <div *ngIf="!isOwner">
                <i class="bi bi-question-circle text-warning display-4 mb-3 d-block"></i>
                <h5 class="text-white fw-bold mb-2">Claim Verification Requested</h5>
                <p class="text-muted small px-3">The owner has requested verification. Confirm that you have matching items and are ready to schedule a coordinate exchange meetup.</p>
                <div class="d-flex justify-content-center gap-2 mt-4">
                  <button class="btn btn-secondary-gradient px-4" (click)="approveVerification()">
                    <i class="bi bi-patch-check-fill me-1"></i> Approve Claim Request
                  </button>
                </div>
              </div>

              <!-- Owner View: Waiting -->
              <div *ngIf="isOwner">
                <i class="bi bi-hourglass-split text-cyan display-4 mb-3 d-block animate-pulse"></i>
                <h5 class="text-white fw-bold mb-2">Awaiting Finder's Approval</h5>
                <p class="text-muted small px-3">Your ownership verification request has been logged. Finder has been notified and needs to approve the claim meetup request.</p>
              </div>
            </div>

            <!-- Case 2: Status = Approved -->
            <div *ngIf="verification.status === 'Approved'" class="my-auto text-center py-4">
              <!-- Finder View: Generate QR -->
              <div *ngIf="!isOwner">
                <i class="bi bi-qr-code text-cyan display-4 mb-3 d-block"></i>
                <h5 class="text-white fw-bold mb-2">Generate Exchange Token</h5>
                <p class="text-muted small px-3">You approved the request. Click below to generate a cryptographically secure token. The owner will scan this during your meetup exchange.</p>
                <button class="btn btn-primary-gradient px-4 mt-4" (click)="generateToken()">
                  <i class="bi bi-magic me-1"></i> Generate Verification QR
                </button>
              </div>

              <!-- Owner View: Waiting for Token -->
              <div *ngIf="isOwner">
                <i class="bi bi-hourglass-split text-warning display-4 mb-3 d-block animate-pulse"></i>
                <h5 class="text-white fw-bold mb-2">Awaiting Meetup Code</h5>
                <p class="text-muted small px-3">The finder approved your claim request! Finder is currently generating the meetup QR token. Meet up with them to scan the token.</p>
              </div>
            </div>

            <!-- Case 3: Status = QR Generated -->
            <div *ngIf="verification.status === 'QR Generated'" class="my-auto">
              
              <!-- Finder View: Display QR code -->
              <div *ngIf="!isOwner" class="text-center py-2">
                <div class="glass-panel p-4 text-center mx-auto" style="max-width: 320px;">
                  <h6 class="text-white-50 mb-3">Meetup Handover QR Code</h6>
                  <img *ngIf="qrToken" [src]="'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + qrToken" 
                       alt="QR Code" class="img-fluid rounded border border-light p-2 bg-white mb-3" style="width: 170px; height: 170px;" />
                  <div class="font-monospace text-cyan small select-all" style="font-size: 0.78rem;">
                    Token: {{ qrToken }}
                  </div>
                  <p class="small text-muted mt-2.5 mb-0" style="font-size: 0.72rem; line-height: 1.35;">
                    Show this code to the owner during meetup. Code is single-use and expires in 24 hours.
                  </p>
                </div>
              </div>

              <!-- Owner View: Scanner simulator -->
              <div *ngIf="isOwner" class="text-center py-2">
                <div class="glass-panel p-3 text-center mx-auto" style="max-width: 380px;">
                  <h6 class="text-white fw-bold mb-2"><i class="bi bi-camera-fill text-primary me-2"></i>Secure QR Code Scanner</h6>
                  
                  <div class="scanner-viewport position-relative overflow-hidden rounded mb-3 bg-black" style="height: 140px;">
                    <div class="scanner-laser"></div>
                    <div class="scanner-borders"></div>
                    
                    <div class="scanner-placeholder d-flex flex-column align-items-center justify-content-center h-100 text-white-50">
                      <i class="bi bi-qr-code-scan display-6 mb-2 opacity-50 animate-pulse"></i>
                      <span class="small" style="font-size: 0.78rem;">Align QR code inside viewport</span>
                    </div>
                  </div>
                  
                  <!-- Paste Field -->
                  <div class="text-start mt-3">
                    <label class="form-label small text-muted">Verification Token</label>
                    <div class="input-group">
                      <input type="text" class="form-control form-control-sm font-monospace text-white bg-dark border-secondary" 
                             placeholder="Paste QR token..." 
                             [(ngModel)]="scannedToken" />
                      <button class="btn btn-primary-gradient btn-sm" (click)="verifyScannedToken()" [disabled]="!scannedToken.trim()">
                        Verify
                      </button>
                    </div>
                    
                    <!-- Sim Helper -->
                    <div class="mt-2.5 bg-dark bg-opacity-20 border border-secondary p-2 rounded text-center">
                      <button type="button" class="btn btn-outline-glass btn-xs" (click)="autoSimulateTokenFetch()">
                        <i class="bi bi-magic me-1"></i> Auto-fetch Meetup Token
                      </button>
                      <div class="small text-muted mt-1" style="font-size: 0.7rem;">Simulates meetup alignment by querying generated code.</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <!-- Case 4: Status = Completed -->
            <div *ngIf="verification.status === 'Completed'" class="my-auto text-center py-4">
              <div class="success-checkmark mb-3">
                <div class="check-icon rounded-circle bg-success bg-opacity-25 text-success d-flex align-items-center justify-content-center mx-auto" style="width: 80px; height: 80px;">
                  <i class="bi bi-check-circle-fill display-4 animate-scale"></i>
                </div>
              </div>
              
              <h4 class="text-success fw-bold mb-2">Item Safely Returned!</h4>
              <p class="text-muted small px-3">Security handshake successfully verified. Both reports have been resolved, and chat coordinates are frozen.</p>
              
              <!-- Download PDF button -->
              <div class="mt-4">
                <a [href]="getCertificateDownloadUrl()" 
                   class="btn btn-success-custom px-4 py-2 text-white text-decoration-none d-inline-flex align-items-center gap-2 rounded-3 shadow"
                   target="_blank">
                  <i class="bi bi-file-earmark-pdf-fill fs-5"></i> Download Return Certificate
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .step-circle {
      width: 48px;
      height: 48px;
      background-color: var(--bg-surface);
      border-width: 2px !important;
      transition: all 0.3s ease;
    }
    .step-done {
      background: var(--success) !important;
      border-color: var(--success) !important;
      color: white !important;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
    }
    .step-active {
      background: var(--primary) !important;
      border-color: var(--primary) !important;
      color: white !important;
      box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
      animation: pulse-step 2s infinite;
    }
    .step-todo {
      border-color: var(--border-color) !important;
      color: var(--text-muted) !important;
    }
    @keyframes pulse-step {
      0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
      70% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
      100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
    }

    .scanner-viewport {
      border: 2px dashed rgba(255, 255, 255, 0.2);
    }
    .scanner-laser {
      position: absolute;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--primary);
      box-shadow: 0 0 8px var(--primary);
      animation: scan-vertical 2s linear infinite;
      z-index: 1;
    }
    @keyframes scan-vertical {
      0% { top: 0%; }
      50% { top: 100%; }
      100% { top: 0%; }
    }

    .animate-scale {
      animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .btn-success-custom {
      background-color: var(--success);
      border: none;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    .btn-success-custom:hover {
      opacity: 0.95;
    }
    .text-gradient-primary {
      background: linear-gradient(135deg, #a5b4fc 0%, var(--primary) 50%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
    }
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 6px;
    }
    .object-fit-cover {
      object-fit: cover;
    }
  `]
})
export class VerificationComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  requestId: string = '';
  verification: VerificationRequest | null = null;
  
  lostItem: LostFoundItem | null = null;
  foundItem: LostFoundItem | null = null;
  
  isOwner: boolean = false;
  qrToken: string = '';
  scannedToken: string = '';

  successMsg: string = '';
  errorMsg: string = '';
  private pollInterval: any;

  constructor(
    private authService: AuthService,
    private verificationService: VerificationService,
    private itemService: ItemService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      if (u) {
        this.route.params.subscribe(params => {
          this.requestId = params['id'];
          this.loadVerification();
          
          // Poll status every 3 seconds to catch real-time approvals/scans
          this.startPolling();
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  loadVerification(): void {
    if (!this.requestId) return;

    this.verificationService.getVerification(this.requestId).subscribe({
      next: (req) => {
        this.verification = req;
        this.isOwner = req.ownerId === this.currentUser?.id;
        
        // Load items details
        this.itemService.items$.subscribe(allItems => {
          // Resolve item details
          // To trace correct item names, we search conversations by matchId
          const matchesJson = localStorage.getItem('lostai_matches');
          if (matchesJson) {
            try {
              const matches = JSON.parse(matchesJson) as any[];
              const match = matches.find(m => m.id === req.matchId);
              if (match) {
                this.lostItem = allItems.find(i => i.id === match.lostItem.id) || null;
                this.foundItem = allItems.find(i => i.id === match.foundItem.id) || null;
              }
            } catch (e) {}
          }
          if (!this.lostItem || !this.foundItem) {
            // Fallback: search database direct items
            const parsedMatch = req.matchId.split('_');
            const lostId = parsedMatch[1] || '';
            const foundId = parsedMatch[2] || '';
            this.lostItem = allItems.find(i => i.id === lostId) || null;
            this.foundItem = allItems.find(i => i.id === foundId) || null;
          }
        });

        // Load active QR code if generated
        if (req.status === 'QR Generated') {
          this.verificationService.getActiveQR(req.id).subscribe(qr => {
            if (qr) {
              this.qrToken = qr.qrToken;
            }
          });
        }
      },
      error: (err) => {
        this.errorMsg = 'Failed to load claim verification request: ' + (err.error?.detail || err.message);
      }
    });
  }

  startPolling(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    
    this.pollInterval = setInterval(() => {
      if (this.verification && this.verification.status !== 'Completed') {
        this.verificationService.getVerification(this.requestId).subscribe(req => {
          if (this.verification && this.verification.status !== req.status) {
            this.verification = req;
            
            // Reload token if transitioned
            if (req.status === 'QR Generated') {
              this.verificationService.getActiveQR(req.id).subscribe(qr => {
                if (qr) this.qrToken = qr.qrToken;
              });
            }
          }
        });
      }
    }, 3000);
  }

  approveVerification(): void {
    if (!this.verification) return;
    this.verificationService.approveVerification(this.verification.id).subscribe({
      next: (req) => {
        this.verification = req;
        this.successMsg = 'Verification request approved successfully!';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err) => {
        this.errorMsg = 'Failed to approve claim request: ' + (err.error?.detail || err.message);
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  generateToken(): void {
    if (!this.verification) return;
    this.verificationService.generateQR(this.verification.id).subscribe({
      next: (qr) => {
        this.qrToken = qr.qrToken;
        if (this.verification) this.verification.status = 'QR Generated';
        this.successMsg = 'Verification QR Code generated! Please present it to the claimant.';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: (err) => {
        this.errorMsg = 'Failed to generate token: ' + (err.error?.detail || err.message);
        setTimeout(() => this.errorMsg = '', 4000);
      }
    });
  }

  verifyScannedToken(): void {
    if (!this.scannedToken.trim() || !this.currentUser) return;
    this.verificationService.scanQR(this.scannedToken.trim(), this.currentUser.id).subscribe({
      next: (req) => {
        this.verification = req;
        this.successMsg = 'Ownership verification succeeded! The item is returned.';
        setTimeout(() => this.successMsg = '', 4000);
        
        // Force refresh local listings to show resolved state
        this.itemService.forceSyncMatches().subscribe();
      },
      error: (err) => {
        this.errorMsg = 'Scan failed: ' + (err.error?.detail || err.message);
        setTimeout(() => this.errorMsg = '', 5000);
      }
    });
  }

  autoSimulateTokenFetch(): void {
    if (!this.verification) return;
    this.verificationService.getActiveQR(this.verification.id).subscribe({
      next: (qr) => {
        if (qr) {
          this.scannedToken = qr.qrToken;
          this.successMsg = 'Meetup token auto-fetched successfully. Ready to scan.';
          setTimeout(() => this.successMsg = '', 3000);
        } else {
          this.errorMsg = 'No active QR token found. Is the code generated yet?';
          setTimeout(() => this.errorMsg = '', 3000);
        }
      },
      error: () => {
        this.errorMsg = 'Failed to scan simulator: token retrieval failed.';
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  getCertificateDownloadUrl(): string {
    return this.verification?.certificateUrl || this.verificationService.getCertificateUrl(this.requestId);
  }

  // Progress timeline helpers
  getProgressPercent(): number {
    if (!this.verification) return 0;
    switch (this.verification.status) {
      case 'Pending': return 0;
      case 'Approved': return 33;
      case 'QR Generated': return 66;
      case 'Verified':
      case 'Completed': return 100;
      default: return 0;
    }
  }

  isStepDone(step: number): boolean {
    if (!this.verification) return false;
    const status = this.verification.status;
    if (status === 'Completed' || status === 'Verified') return true;
    
    if (step === 1) return true; // Request always done
    if (step === 2) return status === 'Approved' || status === 'QR Generated';
    if (step === 3) return status === 'QR Generated';
    return false;
  }

  isStepActive(step: number): boolean {
    if (!this.verification) return false;
    const status = this.verification.status;
    if (status === 'Completed' || status === 'Verified') return step === 4;

    if (step === 1) return false; // always done
    if (step === 2) return status === 'Pending';
    if (step === 3) return status === 'Approved';
    if (step === 4) return status === 'QR Generated';
    return false;
  }

  isStepTodo(step: number): boolean {
    return !this.isStepDone(step) && !this.isStepActive(step);
  }
}
