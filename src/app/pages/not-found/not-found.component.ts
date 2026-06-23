import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container py-5 text-center fade-in">
      <div class="row justify-content-center align-items-center" style="min-height: 60vh;">
        <div class="col-lg-6">
          <div class="glass-panel p-5 shadow-lg position-relative overflow-hidden border-secondary">
            <div class="glow-bg"></div>
            <div class="position-relative" style="z-index: 2;">
              <i class="bi bi-shield-exclamation display-1 text-gradient-ai mb-4 d-block"></i>
              <h1 class="display-5 fw-bold text-white mb-3">404 - Lost in Space</h1>
              <p class="text-muted fs-5 mb-4">
                The page you are looking for has been misplaced. Let our AI guide you back.
              </p>
              <div class="d-flex justify-content-center gap-3 flex-wrap">
                <a class="btn btn-primary-gradient px-4 py-2.5" routerLink="/"><i class="bi bi-house-door-fill me-1"></i> Go Home</a>
                <a class="btn btn-outline-glass px-4 py-2.5" routerLink="/dashboard"><i class="bi bi-grid-fill me-1"></i> Dashboard</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .glow-bg {
      position: absolute;
      top: -20%;
      left: -20%;
      width: 140%;
      height: 140%;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 60%);
      pointer-events: none;
      z-index: 1;
    }
  `]
})
export class NotFoundComponent {}
