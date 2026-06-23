import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';

@Component({
  selector: 'app-report-lost',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="container py-5 fade-in">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <div class="glass-panel p-5 shadow-lg">
            
            <!-- Header -->
            <div class="d-flex align-items-center mb-4">
              <a class="btn btn-outline-glass btn-sm me-3" routerLink="/dashboard"><i class="bi bi-arrow-left"></i></a>
              <div>
                <h2 class="text-white fw-bold mb-0">Report Lost Item</h2>
                <p class="text-muted small mb-0">Register a new lost item details. Our system will generate tags and scan candidates.</p>
              </div>
            </div>

            <!-- Success Banner -->
            <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-30 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="successMessage">
              <i class="bi bi-check-circle-fill me-2 fs-5"></i>
              <span>{{ successMessage }}</span>
            </div>

            <!-- Error Banner -->
            <div class="alert alert-danger bg-danger bg-opacity-10 border-danger border-opacity-30 text-danger rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="errorMessage">
              <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Form -->
            <form [formGroup]="lostForm" (ngSubmit)="onSubmit()">
              <div class="row g-3">
                
                <!-- Item Name -->
                <div class="col-md-6">
                  <label class="form-label small" for="name">Item Name / Title</label>
                  <input type="text" id="name" formControlName="name" class="form-control" placeholder="e.g. iPhone 15, Leather Wallet"
                    [class.is-invalid]="submitted && f['name'].errors" (input)="suggestTags()">
                  <div *ngIf="submitted && f['name'].errors" class="invalid-feedback">
                    Item Title is required.
                  </div>
                </div>

                <!-- Category -->
                <div class="col-md-6">
                  <label class="form-label small" for="category">Category</label>
                  <select id="category" formControlName="category" class="form-select" [class.is-invalid]="submitted && f['category'].errors">
                    <option value="" disabled>Select category</option>
                    <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                  </select>
                  <div *ngIf="submitted && f['category'].errors" class="invalid-feedback">
                    Please select a category.
                  </div>
                </div>

                <!-- Brand -->
                <div class="col-md-6">
                  <label class="form-label small" for="brand">Brand</label>
                  <input type="text" id="brand" formControlName="brand" class="form-control" placeholder="e.g. Apple, Fossil, Nike"
                    [class.is-invalid]="submitted && f['brand'].errors" (input)="suggestTags()">
                  <div *ngIf="submitted && f['brand'].errors" class="invalid-feedback">
                    Brand is required.
                  </div>
                </div>

                <!-- Color -->
                <div class="col-md-6">
                  <label class="form-label small" for="color">Color</label>
                  <input type="text" id="color" formControlName="color" class="form-control" placeholder="e.g. Black, Brown, Space Grey"
                    [class.is-invalid]="submitted && f['color'].errors" (input)="suggestTags()">
                  <div *ngIf="submitted && f['color'].errors" class="invalid-feedback">
                    Color parameter is required.
                  </div>
                </div>

                <!-- Date Lost -->
                <div class="col-md-6">
                  <label class="form-label small" for="date">Lost Date</label>
                  <input type="date" id="date" formControlName="date" class="form-control" [max]="today"
                    [class.is-invalid]="submitted && f['date'].errors">
                  <div *ngIf="submitted && f['date'].errors" class="invalid-feedback">
                    Please specify when the item was lost.
                  </div>
                </div>

                <!-- Lost Location -->
                <div class="col-md-6">
                  <label class="form-label small" for="location">Lost Location</label>
                  <input type="text" id="location" formControlName="location" class="form-control" placeholder="e.g. Terminal 2, Central Park Food Plaza"
                    [class.is-invalid]="submitted && f['location'].errors">
                  <div *ngIf="submitted && f['location'].errors" class="invalid-feedback">
                    Location description is required.
                  </div>
                </div>

                <!-- Coordinates -->
                <div class="col-md-3">
                  <label class="form-label small" for="latitude">Latitude (Optional)</label>
                  <input type="number" step="any" id="latitude" formControlName="latitude" class="form-control" placeholder="e.g. 40.7580"
                    [class.is-invalid]="submitted && f['latitude'].errors">
                  <div *ngIf="submitted && f['latitude'].errors" class="invalid-feedback">
                    Must be between -90 and 90.
                  </div>
                </div>

                <div class="col-md-3">
                  <label class="form-label small" for="longitude">Longitude (Optional)</label>
                  <input type="number" step="any" id="longitude" formControlName="longitude" class="form-control" placeholder="e.g. -73.9855"
                    [class.is-invalid]="submitted && f['longitude'].errors">
                  <div *ngIf="submitted && f['longitude'].errors" class="invalid-feedback">
                    Must be between -180 and 180.
                  </div>
                </div>

                <!-- Description -->
                <div class="col-12">
                  <label class="form-label small" for="description">Detailed Description</label>
                  <textarea id="description" formControlName="description" rows="3" class="form-control" 
                    placeholder="Provide identifiers, decals, screen locks, items inside, custom stickers..."
                    [class.is-invalid]="submitted && f['description'].errors" (input)="suggestTags()"></textarea>
                  <div *ngIf="submitted && f['description'].errors" class="invalid-feedback">
                    Description is required (minimum 10 characters).
                  </div>
                </div>

                <!-- AI Tag Suggester -->
                <div class="col-12" *ngIf="suggestedTags.length > 0">
                  <div class="p-3 bg-dark bg-opacity-35 rounded border border-secondary">
                    <div class="small fw-semibold text-gradient-ai mb-2">
                      <i class="bi bi-cpu-fill me-1"></i> AI Tag Suggester (Auto-Generated)
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                      <span class="badge bg-secondary bg-opacity-30 text-white p-2" *ngFor="let tag of suggestedTags">
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Upload Item Image -->
                <div class="col-12">
                  <label class="form-label small" for="imageUpload">Upload Item Image</label>
                  <input type="file" id="imageUpload" class="form-control" (change)="onFileChange($event)" accept="image/*">
                  <div class="text-muted small mt-1">If blank, our AI system will assign a standard category graphic placeholder.</div>

                  <!-- Image Preview -->
                  <div class="mt-3 text-start position-relative d-inline-block" *ngIf="imagePreview">
                    <img [src]="imagePreview" class="img-thumbnail rounded bg-dark border-secondary" style="max-height: 200px; max-width: 100%;">
                    <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center" 
                      (click)="clearImage()" style="width: 28px; height: 28px; padding: 0;">
                      <i class="bi bi-x fs-5"></i>
                    </button>
                  </div>
                </div>

                <!-- Submit Action Buttons -->
                <div class="col-12 mt-4 d-flex justify-content-end gap-3">
                  <a class="btn btn-outline-glass" routerLink="/dashboard">Cancel</a>
                  <button type="submit" class="btn btn-primary-gradient px-4" [disabled]="loading">
                    <span class="spinner-border spinner-border-sm me-2" role="status" *ngIf="loading"></span>
                    <i class="bi bi-cloud-arrow-up me-1" *ngIf="!loading"></i> Submit Report
                  </button>
                </div>

              </div>
            </form>
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
  `]
})
export class ReportLostComponent {
  lostForm: FormGroup;
  submitted = false;
  loading = false;
  successMessage = '';
  errorMessage = '';
  suggestedTags: string[] = [];
  imagePreview: string | null = null;
  today = new Date().toISOString().split('T')[0];

  categories = [
    'Electronics',
    'Personal Accessories',
    'Keys',
    'Documents',
    'Clothing',
    'Pets/Animals',
    'Bags & Luggage',
    'Others'
  ];

  constructor(
    private formBuilder: FormBuilder,
    private itemService: ItemService,
    private router: Router
  ) {
    this.lostForm = this.formBuilder.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      brand: ['', Validators.required],
      color: ['', Validators.required],
      date: [this.today, Validators.required],
      location: ['', Validators.required],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  get f() { return this.lostForm.controls; }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.imagePreview = null;
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  suggestTags(): void {
    const name = this.lostForm.get('name')?.value || '';
    const desc = this.lostForm.get('description')?.value || '';
    const brand = this.lostForm.get('brand')?.value || '';
    const color = this.lostForm.get('color')?.value || '';
    
    const combined = `${name} ${desc} ${brand} ${color}`.toLowerCase();
    const commonWords = ['with', 'lost', 'found', 'near', 'on', 'the', 'and', 'a', 'an', 'in', 'at', 'of', 'for', 'brand', 'new', 'some', 'has', 'its', 'their', 'very'];
    const words = combined.match(/\b\w{3,15}\b/g) || [];
    
    this.suggestedTags = Array.from(new Set(words.filter(w => !commonWords.includes(w)))).slice(0, 6);
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.lostForm.invalid) {
      return;
    }

    this.loading = true;
    const formData = this.lostForm.value;
    
    // Set custom unsplash links if user didn't upload image
    let finalImageUrl = this.imagePreview;
    if (!finalImageUrl) {
      if (formData.category === 'Electronics') {
        finalImageUrl = 'https://images.unsplash.com/photo-1546054454-aa26e2b734c7?auto=format&fit=crop&w=400&q=80';
      } else if (formData.category === 'Personal Accessories') {
        finalImageUrl = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80';
      } else if (formData.category === 'Keys') {
        finalImageUrl = 'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=400&q=80';
      } else if (formData.category === 'Pets/Animals') {
        finalImageUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=400&q=80';
      } else {
        finalImageUrl = 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80';
      }
    }

    this.itemService.reportItem({
      type: 'lost',
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      color: formData.color,
      date: formData.date,
      location: formData.location,
      latitude: formData.latitude !== null && formData.latitude !== '' ? parseFloat(formData.latitude) : undefined,
      longitude: formData.longitude !== null && formData.longitude !== '' ? parseFloat(formData.longitude) : undefined,
      description: formData.description,
      imageUrl: finalImageUrl,
      tags: this.suggestedTags
    }).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'Lost item reported successfully! Scanning AI database for matches...';
        setTimeout(() => {
          this.router.navigate(['/matches']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.message || 'Failed to submit report. Please try again.';
      }
    });
  }
}
