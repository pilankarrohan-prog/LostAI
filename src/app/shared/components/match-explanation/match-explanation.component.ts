import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchResult } from '../../../core/models/item.model';

@Component({
  selector: 'app-match-explanation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="match-explanation-panel p-4 bg-black bg-opacity-20 border border-secondary border-opacity-40 rounded-3 shadow-lg fade-in">
      
      <!-- Side-by-Side Images -->
      <div class="row g-3 mb-4">
        <!-- Lost Item Image Card -->
        <div class="col-6">
          <div class="image-compare-card p-2 rounded bg-black bg-opacity-30 border border-secondary border-opacity-20 text-center">
            <span class="small text-danger fw-bold d-block mb-2 text-uppercase tracking-wider">
              <i class="bi bi-x-circle me-1"></i>Lost Item Image
            </span>
            <div class="position-relative overflow-hidden rounded border border-secondary border-opacity-30 mx-auto" style="width: 100%; max-width: 160px; aspect-ratio: 1; min-height: 120px;">
              <img [src]="match.lostItem.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'" 
                   class="img-fluid object-fit-cover w-100 h-100" 
                   alt="Lost Item">
            </div>
            <div class="text-white fw-semibold small mt-2 text-truncate">{{ match.lostItem.name }}</div>
          </div>
        </div>

        <!-- Found Item Image Card -->
        <div class="col-6">
          <div class="image-compare-card p-2 rounded bg-black bg-opacity-30 border border-secondary border-opacity-20 text-center">
            <span class="small text-cyan fw-bold d-block mb-2 text-uppercase tracking-wider">
              <i class="bi bi-check-circle me-1"></i>Found Item Image
            </span>
            <div class="position-relative overflow-hidden rounded border border-secondary border-opacity-30 mx-auto" style="width: 100%; max-width: 160px; aspect-ratio: 1; min-height: 120px;">
              <img [src]="match.foundItem.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'" 
                   class="img-fluid object-fit-cover w-100 h-100" 
                   alt="Found Item">
            </div>
            <div class="text-white fw-semibold small mt-2 text-truncate">{{ match.foundItem.name }}</div>
          </div>
        </div>
      </div>

      <!-- Confidence Badge Banner -->
      <div class="d-flex align-items-center justify-content-between mb-4 p-3 bg-dark bg-opacity-40 border border-secondary border-opacity-25 rounded-3">
        <span class="text-white-50 small fw-semibold"><i class="bi bi-shield-check text-gradient-primary me-2"></i>AI Confidence Level</span>
        <span class="badge py-2 px-3 fw-bold text-uppercase"
              [class.bg-high-match-badge]="getMatchPercentage() >= 90"
              [class.bg-medium-match-badge]="getMatchPercentage() >= 70 && getMatchPercentage() < 90"
              [class.bg-low-match-badge]="getMatchPercentage() < 70"
              style="font-size: 0.85rem; border-radius: 20px;">
          <i class="bi me-1" 
             [class.bi-shield-fill-check]="getMatchPercentage() >= 90" 
             [class.bi-shield-fill-exclamation]="getMatchPercentage() >= 70 && getMatchPercentage() < 90" 
             [class.bi-shield-fill-x]="getMatchPercentage() < 70"></i>
          {{ getConfidenceLevel() }} ({{ getMatchPercentage() }}%)
        </span>
      </div>

      <!-- AI Similarity Breakdown Cards Grid -->
      <div class="row g-3 mb-4">
        
        <!-- Image Similarity -->
        <div class="col-md-4 col-sm-6">
          <div class="breakdown-card p-3 rounded bg-black bg-opacity-35 border border-secondary border-opacity-20">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-white-50"><i class="bi bi-image text-cyan me-2"></i>Image Similarity</span>
              <span class="small font-monospace text-cyan fw-bold">{{ roundVal(match.imageSimilarity) }}%</span>
            </div>
            <div class="progress bg-dark" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-cyan" role="progressbar" [style.width.%]="match.imageSimilarity"></div>
            </div>
          </div>
        </div>

        <!-- Text Similarity -->
        <div class="col-md-4 col-sm-6">
          <div class="breakdown-card p-3 rounded bg-black bg-opacity-35 border border-secondary border-opacity-20">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-white-50"><i class="bi bi-chat-left-text text-warning me-2"></i>Text Similarity</span>
              <span class="small font-monospace text-warning fw-bold">{{ roundVal(match.textSimilarity) }}%</span>
            </div>
            <div class="progress bg-dark" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-warning" role="progressbar" [style.width.%]="match.textSimilarity"></div>
            </div>
          </div>
        </div>

        <!-- Location Proximity -->
        <div class="col-md-4 col-sm-6">
          <div class="breakdown-card p-3 rounded bg-black bg-opacity-35 border border-secondary border-opacity-20">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-white-50"><i class="bi bi-geo-alt text-danger me-2"></i>Location Match</span>
              <span class="small font-monospace text-danger fw-bold">{{ roundVal(match.locationSimilarity) }}%</span>
            </div>
            <div class="progress bg-dark" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-danger" role="progressbar" [style.width.%]="match.locationSimilarity"></div>
            </div>
          </div>
        </div>

        <!-- Brand Match -->
        <div class="col-md-6 col-sm-6">
          <div class="breakdown-card p-3 rounded bg-black bg-opacity-35 border border-secondary border-opacity-20">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-white-50"><i class="bi bi-bookmark-check text-success me-2"></i>Brand Match</span>
              <span class="small font-monospace text-success fw-bold">{{ roundVal(match.brandSimilarity) }}%</span>
            </div>
            <div class="progress bg-dark" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-success" role="progressbar" [style.width.%]="match.brandSimilarity"></div>
            </div>
          </div>
        </div>

        <!-- Color Match -->
        <div class="col-md-6 col-sm-12">
          <div class="breakdown-card p-3 rounded bg-black bg-opacity-35 border border-secondary border-opacity-20">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="small text-white-50"><i class="bi bi-palette text-purple me-2"></i>Color Match</span>
              <span class="small font-monospace text-purple fw-bold">{{ roundVal(match.colorSimilarity) }}%</span>
            </div>
            <div class="progress bg-dark" style="height: 6px; border-radius: 10px;">
              <div class="progress-bar bg-purple" role="progressbar" [style.width.%]="match.colorSimilarity"></div>
            </div>
          </div>
        </div>

      </div>

      <!-- AI Explanation Section -->
      <div class="p-3 bg-black bg-opacity-30 border border-secondary border-opacity-20 rounded-3">
        <div class="small fw-bold text-white mb-2">
          <i class="bi bi-cpu-fill text-gradient-primary me-2"></i>Explainable AI Analysis
        </div>
        <p class="text-muted small mb-0 font-monospace" style="line-height: 1.6; font-size: 0.85rem;">
          "{{ match.explanation }}"
        </p>
      </div>

    </div>
  `,
  styles: [`
    .text-cyan {
      color: var(--secondary) !important;
    }
    .text-purple {
      color: #a855f7 !important;
    }
    .bg-cyan {
      background-color: var(--secondary) !important;
    }
    .bg-purple {
      background-color: #a855f7 !important;
    }
    .object-fit-cover {
      object-fit: cover;
    }
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
    .breakdown-card {
      transition: all 0.25s ease;
    }
    .breakdown-card:hover {
      border-color: rgba(255, 255, 255, 0.15) !important;
      transform: translateY(-1px);
    }
    .font-monospace {
      font-family: var(--bs-font-monospace);
    }
  `]
})
export class MatchExplanationComponent {
  @Input() match!: MatchResult;

  getMatchPercentage(): number {
    return Math.round(this.match.overallConfidence ?? this.match.matchPercentage ?? 50);
  }

  getConfidenceLevel(): string {
    return this.match.confidenceLevel ?? (this.getMatchPercentage() >= 90 ? 'High Match' : (this.getMatchPercentage() >= 70 ? 'Medium Match' : 'Low Match'));
  }

  roundVal(val: number | undefined): number {
    return Math.round(val ?? 50);
  }
}
