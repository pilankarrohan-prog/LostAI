import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ItemService } from '../../core/services/item.service';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="container py-5 fade-in" *ngIf="user">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="glass-panel p-4 p-md-5 shadow-lg">
            
            <!-- Header -->
            <div class="d-flex align-items-center mb-4 pb-3 border-bottom border-secondary">
              <a class="btn btn-outline-glass btn-sm me-3" routerLink="/dashboard"><i class="bi bi-arrow-left"></i></a>
              <div>
                <h2 class="text-white fw-bold mb-0">My Profile Settings</h2>
                <p class="text-muted small mb-0">Configure your personal information and contact options for item matches.</p>
              </div>
            </div>

            <!-- Success Notification -->
            <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-30 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="successMessage">
              <i class="bi bi-check-circle-fill me-2 fs-5"></i>
              <span>{{ successMessage }}</span>
            </div>

            <!-- Reputation Badge -->
            <div class="row mb-4">
              <div class="col-12">
                <div class="p-4 bg-dark bg-opacity-20 rounded border border-secondary d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <div class="rounded-circle p-3 me-3 d-flex align-items-center justify-content-center border shadow-sm"
                         [ngClass]="getBadgeColorClasses(reputationLevel)"
                         style="width: 60px; height: 60px;">
                      <i class="bi bi-shield-fill-check fs-3"></i>
                    </div>
                    <div>
                      <h4 class="text-white fw-bold mb-1">{{ reputationLevel }} Finder</h4>
                      <p class="text-muted small mb-0">Community Reputation Score: <strong>{{ reputationScore }} pts</strong></p>
                    </div>
                  </div>
                  <div class="text-end d-none d-md-block">
                    <div class="small text-muted mb-1">Next rank at {{ getNextRankScore(reputationScore) }} pts</div>
                    <div class="progress" style="height: 6px; width: 150px; background-color: rgba(255,255,255,0.1);">
                      <div class="progress-bar" [ngClass]="getBadgeBgClass(reputationLevel)" role="progressbar" [style.width]="getRankProgress(reputationScore) + '%'"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Statistics Grid -->
            <div class="row g-3 mb-4 text-center">
              <div class="col-4">
                <div class="p-3 bg-dark bg-opacity-20 rounded border border-secondary">
                  <div class="h3 fw-bold text-white mb-1">{{ totalReported }}</div>
                  <div class="text-muted small" style="font-size: 0.75rem;">Items Reported</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-dark bg-opacity-20 rounded border border-secondary">
                  <div class="h3 fw-bold text-warning mb-1">{{ totalMatched }}</div>
                  <div class="text-muted small" style="font-size: 0.75rem;">AI Matches</div>
                </div>
              </div>
              <div class="col-4">
                <div class="p-3 bg-dark bg-opacity-20 rounded border border-secondary">
                  <div class="h3 fw-bold text-success mb-1">{{ totalResolved }}</div>
                  <div class="text-muted small" style="font-size: 0.75rem;">Safely Returned</div>
                </div>
              </div>
            </div>

            <div class="row g-4 mb-4">
              <!-- Avatar Display & Picker -->
              <div class="col-md-4 text-center">
                <div class="position-relative d-inline-block">
                  <img [src]="avatarToUse || user.avatarUrl" alt="Avatar" class="rounded-circle border border-4 border-primary shadow mb-3" width="120" height="120">
                </div>
                <div class="small text-muted mb-2">Preset Avatars:</div>
                <div class="d-flex justify-content-center gap-2 flex-wrap mb-3">
                  <img *ngFor="let av of presetAvatars" 
                       [src]="av" 
                       class="rounded-circle border border-2 cursor-pointer transition-transform preset-avatar-img" 
                       [class.border-primary]="avatarToUse === av"
                       [class.border-secondary]="avatarToUse !== av"
                       width="36" 
                       height="36" 
                       style="cursor: pointer; transition: transform 0.2s;"
                       (click)="selectPresetAvatar(av)">
                </div>
                <button type="button" class="btn btn-sm btn-outline-glass w-100" (click)="randomizeAvatar()">
                  <i class="bi bi-shuffle me-1"></i> Randomize Seed
                </button>
                <div class="mt-3">
                  <input type="file" #profileImgInput (change)="onProfileImgSelected($event)" accept="image/*" class="d-none" />
                  <button type="button" class="btn btn-sm btn-outline-primary w-100" (click)="profileImgInput.click()" [disabled]="uploadingProfileImg">
                    <span class="spinner-border spinner-border-sm me-1" role="status" *ngIf="uploadingProfileImg"></span>
                    <i class="bi bi-upload me-1"></i> Upload Custom Photo
                  </button>
                </div>
              </div>

              <!-- Form Details -->
              <div class="col-md-8">
                <form [formGroup]="profileForm" (ngSubmit)="onSubmit()">
                  <div class="row g-3">
                    
                    <!-- Name -->
                    <div class="col-12">
                      <label class="form-label small" for="name">Full Name</label>
                      <input type="text" id="name" formControlName="name" class="form-control" [class.is-invalid]="submitted && f['name'].errors">
                      <div *ngIf="submitted && f['name'].errors" class="invalid-feedback">
                        Name is required.
                      </div>
                    </div>

                    <!-- Email (Locked) -->
                    <div class="col-md-6">
                      <label class="form-label small" for="email">Email Address (Locked)</label>
                      <input type="email" id="email" formControlName="email" class="form-control bg-dark bg-opacity-50 text-muted" readonly>
                    </div>

                    <!-- Phone -->
                    <div class="col-md-6">
                      <label class="form-label small" for="phone">Phone Number</label>
                      <input type="text" id="phone" formControlName="phone" class="form-control" [class.is-invalid]="submitted && f['phone'].errors">
                      <div *ngIf="submitted && f['phone'].errors" class="invalid-feedback">
                        Phone number is required.
                      </div>
                    </div>

                    <!-- Toggle settings -->
                    <div class="col-12 my-3">
                      <div class="form-check form-switch p-3 bg-dark bg-opacity-20 rounded border border-secondary">
                        <input class="form-check-input ms-0 me-2" type="checkbox" id="notify" formControlName="notificationsEnabled" style="cursor: pointer;">
                        <label class="form-check-label text-white small" for="notify" style="cursor: pointer; padding-left: 1.5rem;">
                          <strong>Enable Match Push Notifications</strong><br>
                          <span class="text-muted">Receive instantaneous email alerts when LostAI identifies a potential match.</span>
                        </label>
                      </div>
                    </div>

                    <!-- Save Profile Actions -->
                    <div class="col-12 mt-4 d-flex justify-content-end gap-2">
                      <button type="submit" class="btn btn-primary-gradient px-4" [disabled]="loading">
                        <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="loading"></span>
                        <i class="bi bi-save me-1" *ngIf="!loading"></i> Save Profile
                      </button>
                    </div>

                  </div>
                </form>
              </div>
            </div>

            <!-- Danger Zone reset settings -->
            <div class="mt-5 pt-4 border-top border-danger border-opacity-30">
              <h4 class="text-danger fw-bold h5 mb-2"><i class="bi bi-exclamation-octagon-fill me-2"></i>Developer Settings</h4>
              <p class="text-muted small mb-4">Reset the demo system back to factory defaults. This deletes custom logs, sessions, reports, and recreates demo wallets and phone matches.</p>
              
              <button class="btn btn-outline-danger" (click)="onReset()">
                <i class="bi bi-trash-fill me-1"></i> Reset Application Database
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .form-check-input:checked {
      background-color: var(--primary);
      border-color: var(--primary);
    }
    .btn-outline-danger {
      background: rgba(239, 68, 68, 0.05);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
      padding: 0.6rem 1.2rem;
    }
    .btn-outline-danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fff;
    }
    .preset-avatar-img:hover {
      transform: scale(1.15);
    }
  `]
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  profileForm!: FormGroup;
  submitted = false;
  loading = false;
  successMessage = '';

  // Stats State
  totalReported = 0;
  totalMatched = 0;
  totalResolved = 0;

  // Reputation State
  reputationScore = 0;
  reputationLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Unranked' = 'Unranked';

  // Preset Avatars
  avatarToUse = '';
  presetAvatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Coco',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Willow'
  ];

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private itemService: ItemService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.user = u;
      if (u) {
        this.initForm(u);
        this.avatarToUse = u.avatarUrl || '';
        this.loadStatistics(u.id);
      }
    });
  }

  loadStatistics(userId: string): void {
    this.itemService.items$.subscribe(items => {
      const myItems = items.filter(i => i.reporterId === userId);
      this.totalReported = myItems.length;
      this.totalResolved = myItems.filter(i => i.status === 'resolved').length;
      this.totalMatched = myItems.filter(i => i.status === 'matched').length;

      // Calculate reputation
      this.reputationScore = (this.totalResolved * 50) + (this.totalReported * 10);
      
      if (this.reputationScore >= 500) {
        this.reputationLevel = 'Platinum';
      } else if (this.reputationScore >= 150) {
        this.reputationLevel = 'Gold';
      } else if (this.reputationScore >= 50) {
        this.reputationLevel = 'Silver';
      } else if (this.reputationScore > 0) {
        this.reputationLevel = 'Bronze';
      } else {
        this.reputationLevel = 'Unranked';
      }
    });
  }

  initForm(user: User): void {
    this.profileForm = this.formBuilder.group({
      name: [user.name, Validators.required],
      email: [user.email],
      phone: [user.phone || '', Validators.required],
      notificationsEnabled: [user.notificationsEnabled ?? true]
    });
  }

  get f() { return this.profileForm.controls; }

  selectPresetAvatar(url: string): void {
    this.avatarToUse = url;
  }

  randomizeAvatar(): void {
    const newSeed = Math.random().toString(36).substring(2, 9);
    this.avatarToUse = `https://api.dicebear.com/7.x/adventurer/svg?seed=${newSeed}`;
  }

  uploadingProfileImg = false;

  onProfileImgSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadingProfileImg = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Url = e.target.result;
        this.authService.uploadProfileImage(this.user!.id, base64Url).subscribe({
          next: (url) => {
            this.avatarToUse = url;
            this.uploadingProfileImg = false;
          },
          error: (err) => {
            console.error('Profile image upload failed:', err);
            this.uploadingProfileImg = false;
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';

    if (this.profileForm.invalid) {
      return;
    }

    this.loading = true;
    const { name, phone, notificationsEnabled } = this.profileForm.value;

    this.authService.updateProfile({
      name,
      phone,
      notificationsEnabled,
      avatarUrl: this.avatarToUse
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Profile updated successfully!';
        setTimeout(() => this.successMessage = '', 4000);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onReset(): void {
    if (confirm('Are you sure you want to reset all mock databases back to default? This will sign you out.')) {
      this.authService.resetAllData();
      this.router.navigate(['/']);
    }
  }

  getBadgeColorClasses(level: string): string {
    switch(level) {
      case 'Platinum': return 'bg-info bg-opacity-25 text-info border-info';
      case 'Gold': return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'Silver': return 'bg-secondary bg-opacity-50 text-light border-secondary';
      case 'Bronze': return 'bg-danger bg-opacity-25 text-danger border-danger';
      default: return 'bg-dark text-muted border-secondary';
    }
  }

  getBadgeBgClass(level: string): string {
    switch(level) {
      case 'Platinum': return 'bg-info';
      case 'Gold': return 'bg-warning';
      case 'Silver': return 'bg-secondary';
      case 'Bronze': return 'bg-danger';
      default: return 'bg-dark';
    }
  }

  getNextRankScore(score: number): number {
    if (score < 50) return 50;
    if (score < 150) return 150;
    if (score < 500) return 500;
    return 1000;
  }

  getRankProgress(score: number): number {
    if (score >= 500) return 100;
    if (score >= 150) return ((score - 150) / (500 - 150)) * 100;
    if (score >= 50) return ((score - 50) / (150 - 50)) * 100;
    return (score / 50) * 100;
  }
}
