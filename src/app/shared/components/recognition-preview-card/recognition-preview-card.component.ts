import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AIRecognitionResult } from '../../../core/services/ai-recognition.service';

@Component({
  selector: 'app-recognition-preview-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="glass-panel p-4 mb-4 animate-slide-up" *ngIf="prediction">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="h5 text-white fw-bold mb-0">
          <i class="bi bi-patch-check-fill text-success me-2 animate-bounce"></i>AI Scan Predictions
        </h4>
        <div class="d-flex align-items-center gap-2">
          <span class="small text-muted">Scan Confidence</span>
          <span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-35 px-2.5 py-1.5 rounded fw-bold fs-6">
            {{ prediction.confidence }}%
          </span>
        </div>
      </div>

      <!-- Confidence Progress Bar -->
      <div class="progress mb-4 bg-dark bg-opacity-50" style="height: 8px;">
        <div 
          class="progress-bar transition-all" 
          role="progressbar" 
          [style.width.%]="prediction.confidence"
          [class.bg-success]="prediction.confidence >= 80"
          [class.bg-warning]="prediction.confidence >= 50 && prediction.confidence < 80"
          [class.bg-danger]="prediction.confidence < 50">
        </div>
      </div>

      <p class="text-muted small mb-4">Review and refine the parameters identified by the image processor below before submitting your report.</p>

      <div class="row g-3">
        <!-- Predicted Category -->
        <div class="col-md-6">
          <label class="form-label small text-white-50" for="ai-category">Mapped Category</label>
          <select 
            id="ai-category" 
            [(ngModel)]="appCategory" 
            (ngModelChange)="onModelChange()" 
            class="form-select bg-dark border-secondary text-white">
            <option *ngFor="let cat of appCategories" [value]="cat">{{ cat }}</option>
          </select>
          <div class="text-info-subtle small mt-1 font-monospace" style="font-size: 0.72rem;">
            Original AI output: <span class="fw-bold">{{ prediction.category }}</span>
          </div>
        </div>

        <!-- Brand -->
        <div class="col-md-6">
          <label class="form-label small text-white-50" for="ai-brand">Item Brand</label>
          <input 
            type="text" 
            id="ai-brand" 
            [(ngModel)]="prediction.predictedBrand" 
            (ngModelChange)="onModelChange()" 
            class="form-control bg-dark border-secondary text-white" 
            placeholder="e.g. Apple, Fossil">
        </div>

        <!-- Color -->
        <div class="col-md-6">
          <label class="form-label small text-white-50" for="ai-color">Dominant Color</label>
          <input 
            type="text" 
            id="ai-color" 
            [(ngModel)]="prediction.color" 
            (ngModelChange)="onModelChange()" 
            class="form-control bg-dark border-secondary text-white" 
            placeholder="e.g. Black, Grey">
        </div>

        <!-- Custom Tag Input -->
        <div class="col-md-6">
          <label class="form-label small text-white-50" for="ai-new-tag">Add Custom Tag</label>
          <div class="input-group">
            <input 
              type="text" 
              id="ai-new-tag" 
              #tagInput 
              class="form-control bg-dark border-secondary text-white" 
              placeholder="e.g. leather, screen"
              (keyup.enter)="addTag(tagInput.value); tagInput.value = ''">
            <button 
              type="button" 
              class="btn btn-outline-glass border-secondary" 
              (click)="addTag(tagInput.value); tagInput.value = ''">
              Add
            </button>
          </div>
        </div>

        <!-- Editable Description -->
        <div class="col-12">
          <label class="form-label small text-white-50" for="ai-desc">Suggested Description</label>
          <textarea 
            id="ai-desc" 
            [(ngModel)]="prediction.description" 
            (ngModelChange)="onModelChange()" 
            rows="2" 
            class="form-control bg-dark border-secondary text-white" 
            placeholder="Item details..."></textarea>
        </div>

        <!-- Editable Tags -->
        <div class="col-12 mt-2">
          <label class="form-label small text-white-50 d-block mb-2">Item Tags (Click to remove)</label>
          <div class="d-flex flex-wrap gap-2">
            <span 
              *ngFor="let tag of prediction.tags" 
              class="badge bg-secondary bg-opacity-25 text-white border border-secondary border-opacity-35 p-2 rounded cursor-pointer tag-badge hover-remove"
              (click)="removeTag(tag)"
              title="Click to remove">
              #{{ tag }} <i class="bi bi-x ms-1 text-danger-subtle"></i>
            </span>
            <div *ngIf="prediction.tags.length === 0" class="text-muted small py-1">No tags assigned.</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .transition-all {
      transition: all 0.3s ease;
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .tag-badge:hover {
      background-color: rgba(239, 68, 68, 0.1) !important;
      border-color: rgba(239, 68, 68, 0.3) !important;
      color: #f87171 !important;
    }
    .animate-bounce {
      animation: bounce-icon 2s infinite;
    }
    @keyframes bounce-icon {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `]
})
export class RecognitionPreviewCardComponent implements OnInit, OnChanges {
  @Input() prediction!: AIRecognitionResult;
  @Output() predictionChange = new EventEmitter<AIRecognitionResult & { appCategory: string }>();

  appCategory = '';
  appCategories = [
    'Electronics',
    'Personal Accessories',
    'Keys',
    'Documents',
    'Clothing',
    'Pets/Animals',
    'Bags & Luggage',
    'Others'
  ];

  ngOnInit(): void {
    if (this.prediction) {
      this.appCategory = this.mapCategoryToAppCategory(this.prediction.category);
      this.onModelChange();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prediction'] && changes['prediction'].currentValue) {
      this.appCategory = this.mapCategoryToAppCategory(this.prediction.category);
      this.onModelChange();
    }
  }

  mapCategoryToAppCategory(aiCat: string): string {
    const mapping: Record<string, string> = {
      'Phones': 'Electronics',
      'Wallets': 'Personal Accessories',
      'Bags': 'Bags & Luggage',
      'Keys': 'Keys',
      'Watches': 'Personal Accessories',
      'Laptops': 'Electronics',
      'Earbuds': 'Electronics',
      'ID Cards': 'Documents',
      'Water Bottles': 'Others',
      'Other': 'Others'
    };
    return mapping[aiCat] || 'Others';
  }

  addTag(tag: string): void {
    const cleanTag = tag.trim().toLowerCase().replace(/#/g, '');
    if (cleanTag && !this.prediction.tags.includes(cleanTag)) {
      this.prediction.tags.push(cleanTag);
      this.onModelChange();
    }
  }

  removeTag(tag: string): void {
    this.prediction.tags = this.prediction.tags.filter(t => t !== tag);
    this.onModelChange();
  }

  onModelChange(): void {
    this.predictionChange.emit({
      ...this.prediction,
      appCategory: this.appCategory
    });
  }
}
