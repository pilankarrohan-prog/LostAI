import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="container py-5 fade-in">
      <div class="row justify-content-center py-5">
        <div class="col-lg-5 col-md-8 col-sm-10">
          <div class="glass-panel p-5 shadow-lg">
            
            <!-- Header -->
            <div class="text-center mb-4">
              <i class="bi bi-shield-shaded text-gradient-ai display-5 mb-2"></i>
              <h2 class="text-white fw-bold">Welcome Back</h2>
              <p class="text-muted small">Sign in to report items and review your AI matches</p>
            </div>

            <!-- Error Banner -->
            <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-30 text-danger rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="errorMessage">
              <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Form -->
            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
              <!-- Email -->
              <div class="mb-3">
                <label class="form-label small" for="email">Email Address</label>
                <div class="input-group">
                  <span class="input-group-text bg-dark border-secondary text-muted"><i class="bi bi-envelope"></i></span>
                  <input type="email" id="email" formControlName="email" class="form-control" placeholder="name@example.com"
                    [class.is-invalid]="submitted && f['email'].errors">
                </div>
                <div *ngIf="submitted && f['email'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['email'].errors['required']">Email is required.</span>
                  <span *ngIf="f['email'].errors['email']">Please enter a valid email address.</span>
                </div>
              </div>

              <!-- Password -->
              <div class="mb-4">
                <div class="d-flex justify-content-between mb-1">
                  <label class="form-label small mb-0" for="password">Password</label>
                  <a class="small text-decoration-none text-cyan" style="cursor: pointer;">Forgot Password?</a>
                </div>
                <div class="input-group">
                  <span class="input-group-text bg-dark border-secondary text-muted"><i class="bi bi-lock"></i></span>
                  <input type="password" id="password" formControlName="password" class="form-control" placeholder="••••••••"
                    [class.is-invalid]="submitted && f['password'].errors">
                </div>
                <div *ngIf="submitted && f['password'].errors" class="invalid-feedback d-block small mt-1">
                  <span *ngIf="f['password'].errors['required']">Password is required.</span>
                  <span *ngIf="f['password'].errors['minlength']">Password must be at least 6 characters.</span>
                </div>
              </div>

              <!-- Submit -->
              <button type="submit" class="btn btn-primary-gradient w-100 py-3 mb-3 d-flex align-items-center justify-content-center" [disabled]="loading">
                <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="loading"></span>
                <i class="bi bi-box-arrow-in-right me-2" *ngIf="!loading"></i> Sign In
              </button>
            </form>

            <!-- Demo Bypass Button -->
            <button type="button" class="btn btn-outline-glass w-100 py-2 mb-4 small" (click)="quickDemoLogin()">
              <i class="bi bi-lightning-charge-fill text-warning me-1"></i> Quick Demo Sign In
            </button>

            <!-- Footer -->
            <div class="text-center mt-3">
              <span class="text-muted small">Don't have an account? </span>
              <a class="text-cyan small text-decoration-none fw-semibold" routerLink="/register">Register here</a>
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
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // If already logged in, send to dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';

    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Incorrect credentials. Please try again.';
      }
    });
  }

  quickDemoLogin(): void {
    this.loginForm.patchValue({
      email: 'john@example.com',
      password: 'password123'
    });
    this.onSubmit();
  }
}
