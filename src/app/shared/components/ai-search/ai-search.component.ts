import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ItemService } from '../../../core/services/item.service';
import { AISearchResultItem } from '../../../core/models/item.model';

@Component({
  selector: 'app-ai-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="glass-panel p-4 mb-4">
      <h3 class="text-white mb-3"><i class="bi bi-robot text-gradient-ai me-2"></i>AI Search Assistant</h3>
      <p class="text-muted small mb-4">Describe the item you are looking for in natural language. Our AI will semantically match your description against our database.</p>
      
      <div class="input-group mb-3 ai-search-input">
        <span class="input-group-text bg-dark border-secondary text-muted"><i class="bi bi-search"></i></span>
        <input type="text" class="form-control bg-dark text-white border-secondary" 
               placeholder="e.g. 'I lost a black Samsung phone near the library'"
               [(ngModel)]="searchQuery"
               (keyup.enter)="onSearch()">
        <button class="btn btn-primary-gradient px-4" type="button" (click)="onSearch()" [disabled]="isLoading">
          <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
          {{ isLoading ? 'Searching...' : 'Search' }}
        </button>
      </div>

      <div *ngIf="hasSearched && results.length === 0 && !isLoading" class="alert alert-secondary bg-dark border-secondary text-white-50 mt-3">
        No matches found for your query. Try rephrasing or using different keywords.
      </div>

      <div *ngIf="results.length > 0" class="mt-4 animate-slide-up">
        <h5 class="text-white mb-3">AI Recommendations</h5>
        <div class="list-group list-group-flush gap-2">
          <div *ngFor="let res of results" class="list-group-item bg-dark bg-opacity-50 border border-secondary rounded text-white p-3 search-result-card transition-transform">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="fw-bold mb-0">
                <span class="badge me-2" [class.bg-danger]="res.item.type === 'lost'" [class.bg-info]="res.item.type === 'found'">
                  {{ res.item.type | uppercase }}
                </span>
                {{ res.item.name }}
              </h6>
              <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-25">
                {{ res.relevanceScore }}% Match
              </span>
            </div>
            
            <!-- Smart Auto-Filters Display -->
            <div *ngIf="hasAutoFilters(res.matchExplanation)" class="mb-3 d-flex flex-wrap gap-1.5 animate-fade-in">
              <span *ngFor="let filter of getAutoFilters(res.matchExplanation)" class="badge bg-cyan bg-opacity-10 text-cyan border border-cyan border-opacity-25 px-2.5 py-1 small rounded-pill fw-semibold">
                <i class="bi bi-filter-circle-fill me-1"></i>{{ filter | uppercase }}
              </span>
            </div>

            <p class="small text-muted mb-2"><i class="bi bi-geo-alt me-1"></i>{{ res.item.location }}</p>
            <p class="text-light small mb-2">{{ res.item.description }}</p>
            
            <div class="p-2 bg-dark rounded border border-secondary border-opacity-50 mt-2 mb-3">
              <div class="small text-warning mb-1"><i class="bi bi-cpu me-1"></i><strong>AI Explanation:</strong></div>
              <div class="small text-muted fst-italic">{{ getCleanExplanation(res.matchExplanation) }}</div>
            </div>

            <div class="d-flex gap-1 mb-3 flex-wrap">
              <span *ngFor="let kw of res.matchedKeywords" class="badge bg-secondary bg-opacity-50 text-light border border-secondary border-opacity-25">
                {{ kw }}
              </span>
            </div>
            
            <div class="text-end">
              <a [routerLink]="['/dashboard']" class="btn btn-sm btn-outline-glass">View Details</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-gradient-ai {
      background: linear-gradient(135deg, #a5b4fc 0%, #f472b6 50%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .text-cyan {
      color: #06b6d4 !important;
    }
    .bg-cyan {
      background-color: #06b6d4 !important;
    }
    .search-result-card:hover {
      background-color: rgba(255, 255, 255, 0.05) !important;
      transform: translateX(5px);
    }
  `]
})
export class AiSearchComponent {
  searchQuery = '';
  results: AISearchResultItem[] = [];
  isLoading = false;
  hasSearched = false;

  constructor(private itemService: ItemService) {}

  hasAutoFilters(explanation: string): boolean {
    return explanation.startsWith('[Auto-filtered:');
  }

  getAutoFilters(explanation: string): string[] {
    const match = explanation.match(/^\[Auto-filtered:\s*([^\]]+)\]/);
    if (match) {
      return match[1].split(',').map(s => s.trim());
    }
    return [];
  }

  getCleanExplanation(explanation: string): string {
    return explanation.replace(/^\[Auto-filtered:\s*[^\]]+\]\s*/, '');
  }

  onSearch() {
    if (!this.searchQuery.trim()) return;
    
    this.isLoading = true;
    this.hasSearched = true;
    this.results = [];

    this.itemService.searchAssistant(this.searchQuery, 5).subscribe({
      next: (res: AISearchResultItem[]) => {
        this.results = res;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('AI Search Failed', err);
        this.isLoading = false;
      }
    });
  }
}
