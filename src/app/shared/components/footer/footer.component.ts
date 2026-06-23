import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="glass-panel mx-3 mt-5 mb-3 p-4">
      <div class="container-fluid">
        <div class="row align-items-center">
          <div class="col-md-6 text-center text-md-start mb-3 mb-md-0">
            <span class="fw-bold text-white fs-5 d-flex align-items-center justify-content-center justify-content-md-start">
              <i class="bi bi-shield-shaded text-gradient-ai me-2"></i>
              Lost<span class="text-gradient-primary">AI</span>
            </span>
            <p class="text-muted small mt-1 mb-0">AI-Powered intelligent match system for missing items. Secure, fast, and automatic.</p>
          </div>
          <div class="col-md-6 text-center text-md-end">
            <div class="d-flex justify-content-center justify-content-md-end gap-3 mb-2">
              <a href="#" class="social-icon"><i class="bi bi-twitter-x"></i></a>
              <a href="#" class="social-icon"><i class="bi bi-github"></i></a>
              <a href="#" class="social-icon"><i class="bi bi-linkedin"></i></a>
            </div>
            <span class="text-muted small">&copy; {{ currentYear }} LostAI Inc. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    footer {
      border-radius: 16px;
    }
    .social-icon {
      color: var(--text-secondary);
      font-size: 1.2rem;
      transition: color 0.2s ease, transform 0.2s ease;
      display: inline-block;
    }
    .social-icon:hover {
      color: var(--primary);
      transform: scale(1.1);
    }
  `]
})
export class FooterComponent {
  currentYear = new Date().getFullYear();
}
