import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="container py-5 fade-in">
      <div class="row justify-content-center py-4">
        <div class="col-lg-6 col-md-8 col-sm-10">
          <div class="glass-panel p-5 shadow-lg">
            
            <!-- Header -->
            <div class="text-center mb-4">
              <svg class="mb-3 animate-bounce" width="56" height="56" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.5));">
                <defs>
                  <linearGradient id="lostai-logo-reg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#8b5cf6" />
                    <stop offset="50%" stop-color="#d946ef" />
                    <stop offset="100%" stop-color="#06b6d4" />
                  </linearGradient>
                </defs>
                <path d="M50 10 C68 10 82 22 82 40 C82 62 50 90 50 90 C50 90 18 62 18 40 C18 22 32 10 50 10 Z" stroke="url(#lostai-logo-reg-grad)" stroke-width="8" stroke-linejoin="round" />
                <path d="M50 25 C58 25 66 30 66 40 C66 52 50 72 50 72 C50 72 34 52 34 40 C34 30 42 25 50 25 Z" fill="url(#lostai-logo-reg-grad)" />
                <circle cx="50" cy="42" r="6" fill="#ffffff" />
              </svg>
              <h2 class="text-white fw-bold">Create Account</h2>
              <p class="text-muted small">Join LostAI to start tracking and matching missing items instantly</p>
            </div>

            <!-- Error Banner -->
            <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-30 text-danger rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="errorMessage">
              <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Form -->
            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
              
              <!-- Name -->
              <div class="form-field mb-3">
                <label class="form-label small" for="name">Full Name</label>
                <input type="text" id="name" formControlName="name" class="modern-input" placeholder="John Doe"
                  [class.is-invalid]="submitted && f['name'].errors">
                <div *ngIf="submitted && f['name'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['name'].errors['required']">Full Name is required.</span>
                </div>
              </div>

              <!-- Email -->
              <div class="form-field mb-3">
                <label class="form-label small" for="email">Email Address</label>
                <input type="email" id="email" formControlName="email" class="modern-input" placeholder="john@example.com"
                  [class.is-invalid]="submitted && f['email'].errors">
                <div *ngIf="submitted && f['email'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['email'].errors['required']">Email is required.</span>
                  <span *ngIf="f['email'].errors['email']">Please enter a valid email address.</span>
                </div>
              </div>

              <!-- Phone -->
              <div class="form-field mb-3">
                <label class="form-label small" for="phone">Phone Number</label>
                <input type="text" id="phone" formControlName="phone" class="modern-input" placeholder="+1 (555) 012-3456"
                  [class.is-invalid]="submitted && f['phone'].errors">
                <div *ngIf="submitted && f['phone'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['phone'].errors['required']">Phone number is required.</span>
                </div>
              </div>

              <!-- Password -->
              <div class="form-field mb-3">
                <label class="form-label small" for="password">Password</label>
                <input type="password" id="password" formControlName="password" class="modern-input" placeholder="••••••••"
                  [class.is-invalid]="submitted && f['password'].errors">
                <div *ngIf="submitted && f['password'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['password'].errors['required']">Password is required.</span>
                  <span *ngIf="f['password'].errors['minlength']">Password must be at least 6 characters.</span>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="form-field mb-4">
                <label class="form-label small" for="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" formControlName="confirmPassword" class="modern-input" placeholder="••••••••"
                  [class.is-invalid]="submitted && registerForm.hasError('mismatch')">
                <div *ngIf="submitted && registerForm.hasError('mismatch')" class="invalid-feedback d-block small mt-1">
                  Passwords do not match.
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" class="btn btn-primary-gradient w-100 py-3 mb-3 d-flex align-items-center justify-content-center" [disabled]="loading">
                <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="loading"></span>
                <i class="bi bi-person-plus me-2" *ngIf="!loading"></i> Create Account
              </button>
            </form>

            <!-- Footer -->
            <div class="text-center mt-3">
              <span class="text-muted small">Already have an account? </span>
              <a class="text-cyan small text-decoration-none fw-semibold" routerLink="/login">Sign in instead</a>
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
  `]
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  get f() { return this.registerForm.controls; }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    const { name, email, phone, password } = this.registerForm.value;

    this.authService.register(name, email, phone, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Registration failed. Please try again.';
      }
    });
  }
}
