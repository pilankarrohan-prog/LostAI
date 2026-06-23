import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';
import { AuthService } from '../../core/services/auth.service';
import { LostFoundItem } from '../../core/models/item.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-5 fade-in">
      <!-- Hero Section -->
      <div class="row align-items-center text-center text-lg-start mb-5 py-4">
        <div class="col-lg-6 mb-4 mb-lg-0">
          <span class="badge ai-match-badge mb-3">
            <i class="bi bi-cpu-fill me-1"></i> AI Matcher Active
          </span>
          <h1 class="display-3 fw-bold text-white mb-3 tracking-tight">
            Lost & Found, <br>
            <span class="text-gradient-ai">Reimagined by AI.</span>
          </h1>
          <p class="lead text-muted fs-4 mb-4">
            Instant matching, automatic image recognition tagging, and smart geographic filtering. Reconnect with your belongings in minutes.
          </p>
          <div class="d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
            <a class="btn btn-primary-gradient px-4 py-3 fs-5" routerLink="/report-lost">
              <i class="bi bi-search me-2"></i> I Lost Something
            </a>
            <a class="btn btn-secondary-gradient px-4 py-3 fs-5" routerLink="/report-found">
              <i class="bi bi-eye me-2"></i> I Found Something
            </a>
          </div>
        </div>
        <div class="col-lg-6 d-none d-lg-block text-center position-relative">
          <div class="hero-image-glow"></div>
          <div class="glass-panel p-4 mx-auto rounded-3 d-inline-block position-relative hero-box shadow-2xl">
            <i class="bi bi-gpu-card text-gradient-ai display-1 mb-3"></i>
            <div class="p-3 bg-dark bg-opacity-50 rounded shadow-sm border border-secondary text-start">
              <div class="d-flex align-items-center mb-2">
                <div class="spinner-grow spinner-grow-sm text-cyan me-2" role="status"></div>
                <span class="small fw-semibold text-cyan">Scanning Database...</span>
              </div>
              <p class="text-white small mb-0 font-monospace">MATCH FOUND: Wallet #2312 matches Wallet #2516 (94% confidence)</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="row g-4 mb-5">
        <div class="col-md-3 col-sm-6" *ngFor="let stat of stats">
          <div class="glass-panel text-center p-4 glass-card-interactive">
            <div class="text-gradient-primary display-5 fw-extrabold mb-1">{{ stat.value }}</div>
            <div class="text-muted text-uppercase tracking-wider small fw-bold">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <!-- Search & Browse Section -->
      <div class="glass-panel p-4 p-md-5 mb-5">
        <!-- Advanced Filtering Row -->
        <div class="row mb-4 g-3 align-items-center">
          <div class="col-xl-5 col-lg-12">
            <h2 class="h3 text-white mb-1"><i class="bi bi-grid-fill text-gradient-primary me-2"></i>Recent Reports Feed</h2>
            <p class="text-muted mb-0">Browse through recently lost and found items.</p>
          </div>
          <div class="col-xl-7 col-lg-12">
            <div class="row g-2">
              <div class="col-md-5">
                <div class="input-group">
                  <span class="input-group-text bg-dark border-secondary text-muted py-1.5"><i class="bi bi-search"></i></span>
                  <input type="text" class="form-control py-1.5" placeholder="Search keywords..." [(ngModel)]="searchQuery" (input)="onSearch()">
                </div>
              </div>
              <div class="col-md-4 col-6">
                <select class="form-select py-1.5" [(ngModel)]="selectedCategory" (change)="onSearch()">
                  <option *ngFor="let cat of categories" [value]="cat">{{ cat }}</option>
                </select>
              </div>
              <div class="col-md-3 col-6">
                <select class="form-select py-1.5" [(ngModel)]="activeStatus" (change)="onSearch()">
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="matched">Matched</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="d-flex gap-2 mb-4 overflow-auto pb-2">
          <button class="btn btn-sm" [class.btn-outline-glass]="activeTab !== 'all'" [class.btn-primary-gradient]="activeTab === 'all'" (click)="setTab('all')">All Reports</button>
          <button class="btn btn-sm" [class.btn-outline-glass]="activeTab !== 'lost'" [class.btn-primary-gradient]="activeTab === 'lost'" (click)="setTab('lost')">Lost Items</button>
          <button class="btn btn-sm" [class.btn-outline-glass]="activeTab !== 'found'" [class.btn-primary-gradient]="activeTab === 'found'" (click)="setTab('found')">Found Items</button>
        </div>

        <!-- Skeleton Loading Placeholders -->
        <div class="row g-4" *ngIf="isLoading">
          <div class="col-lg-4 col-md-6" *ngFor="let placeholder of [1, 2, 3]">
            <div class="card h-100 glass-panel shimmer-loading border-0" style="min-height: 400px;">
              <div class="shimmer-box w-100" style="height: 200px; border-top-left-radius: 16px; border-top-right-radius: 16px;"></div>
              <div class="card-body p-4">
                <div class="d-flex justify-content-between mb-2">
                  <div class="shimmer-line w-25"></div>
                  <div class="shimmer-line w-25"></div>
                </div>
                <div class="shimmer-line w-75 mb-3" style="height: 1.5rem;"></div>
                <div class="shimmer-line w-100 mb-2"></div>
                <div class="shimmer-line w-100 mb-2"></div>
                <div class="shimmer-line w-50 mb-3"></div>
                <div class="border-top border-secondary pt-3 mt-4 d-flex justify-content-between">
                  <div class="shimmer-line w-40"></div>
                  <div class="shimmer-line w-20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Item Cards Grid -->
        <div class="row g-4" *ngIf="!isLoading && paginatedItems.length > 0; else noItems">
          <div class="col-lg-4 col-md-6" *ngFor="let item of paginatedItems">
            <div class="card h-100 glass-panel glass-card-interactive overflow-hidden d-flex flex-column border-0 text-white">
              <!-- Item Image -->
              <div class="position-relative overflow-hidden card-img-container">
                <img [src]="item.imageUrl" [alt]="item.name" class="card-img-top w-100 h-100 object-fit-cover transition-transform">
                <span class="badge position-absolute top-3 start-3 badge-status" [class.badge-lost]="item.type === 'lost'" [class.badge-found]="item.type === 'found'">
                  {{ item.type | uppercase }}
                </span>
                <span class="badge position-absolute top-3 end-3 badge-status" 
                  [class.badge-resolved]="item.status === 'resolved'"
                  [class.badge-matched]="item.status === 'matched'"
                  [class.badge-lost]="item.status === 'active' && item.type === 'lost'"
                  [class.badge-found]="item.status === 'active' && item.type === 'found'">
                  {{ item.status | uppercase }}
                </span>
              </div>

              <!-- Card Body -->
              <div class="card-body p-4 d-flex flex-column flex-grow-1">
                <div class="d-flex align-items-center justify-content-between mb-2">
                  <span class="text-cyan small fw-semibold"><i class="bi bi-tag-fill me-1"></i>{{ item.category }}</span>
                  <span class="text-muted small"><i class="bi bi-calendar-event me-1"></i>{{ item.date }}</span>
                </div>
                <h5 class="card-title text-white fw-bold mb-2">{{ item.name }}</h5>
                <p class="card-text text-muted small flex-grow-1">{{ item.description | slice:0:100 }}{{ item.description.length > 100 ? '...' : '' }}</p>
                
                <!-- Tags -->
                <div class="d-flex flex-wrap gap-1 mb-3">
                  <span class="badge bg-secondary bg-opacity-20 text-muted small" *ngFor="let tag of item.tags">#{{ tag }}</span>
                </div>
                
                <div class="border-top border-secondary pt-3 mt-auto d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center">
                    <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                    <span class="small text-muted text-truncate" style="max-width: 150px;">{{ item.location }}</span>
                  </div>
                  <a class="btn btn-sm btn-outline-glass px-3 py-1 small" [routerLink]="authService.isLoggedIn() ? '/dashboard' : '/login'">Details</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No Items Fallback -->
        <ng-template #noItems>
          <div class="text-center py-5" *ngIf="!isLoading">
            <i class="bi bi-inboxes text-muted display-4 mb-3 d-block"></i>
            <h4 class="text-white fw-bold">No reports found</h4>
            <p class="text-muted">Try adjusting your filters or search keywords.</p>
          </div>
        </ng-template>

        <!-- Pagination Controls -->
        <div class="d-flex justify-content-between align-items-center mt-5 flex-wrap gap-3" *ngIf="!isLoading && totalPages > 1">
          <span class="text-muted small">Showing page <strong>{{ currentPage }}</strong> of <strong>{{ totalPages }}</strong></span>
          <nav>
            <ul class="pagination pagination-sm mb-0 gap-2">
              <li class="page-item" [class.disabled]="currentPage === 1">
                <button class="page-link btn btn-outline-glass border-secondary py-2 px-3 text-white" (click)="prevPage()"><i class="bi bi-chevron-left"></i></button>
              </li>
              <li class="page-item" *ngFor="let page of [].constructor(totalPages); let i = index" [class.active]="currentPage === (i + 1)">
                <button class="page-link btn py-2 px-3 text-white" 
                        [class.btn-primary-gradient]="currentPage === (i + 1)" 
                        [class.btn-outline-glass]="currentPage !== (i + 1)" 
                        (click)="goToPage(i + 1)">
                  {{ i + 1 }}
                </button>
              </li>
              <li class="page-item" [class.disabled]="currentPage === totalPages">
                <button class="page-link btn btn-outline-glass border-secondary py-2 px-3 text-white" (click)="nextPage()"><i class="bi bi-chevron-right"></i></button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      <!-- Features Section -->
      <div class="py-5 my-5 text-center">
        <h2 class="display-5 fw-bold text-white mb-5">Why Choose <span class="text-gradient-primary">LostAI?</span></h2>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="glass-panel p-5 h-100 feature-card transition-transform">
              <i class="bi bi-cpu text-cyan display-4 mb-4 d-block"></i>
              <h4 class="text-white fw-bold">AI-Powered Matching</h4>
              <p class="text-muted">Our advanced neural networks instantly connect lost and found items based on image similarity and semantic descriptions.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="glass-panel p-5 h-100 feature-card transition-transform">
              <i class="bi bi-map text-primary display-4 mb-4 d-block"></i>
              <h4 class="text-white fw-bold">Smart Campus Map</h4>
              <p class="text-muted">Visualize loss hotspots and filter items by location using our interactive, heat-mapped geographic interface.</p>
            </div>
          </div>
          <div class="col-md-4">
            <div class="glass-panel p-5 h-100 feature-card transition-transform">
              <i class="bi bi-shield-check text-success display-4 mb-4 d-block"></i>
              <h4 class="text-white fw-bold">Secure Verification</h4>
              <p class="text-muted">Protect your identity with generated QR verification certificates, ensuring items are only returned to their rightful owners.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- How It Works Section -->
      <div class="py-5 my-5">
        <div class="row align-items-center">
          <div class="col-lg-5 mb-4 mb-lg-0">
            <h2 class="display-5 fw-bold text-white mb-4">How It <span class="text-gradient-ai">Works</span></h2>
            <div class="d-flex mb-4 step-item">
              <div class="step-number me-4">1</div>
              <div>
                <h5 class="text-white fw-bold">Report an Item</h5>
                <p class="text-muted">Snap a photo and provide a brief description. Our AI will automatically extract keywords and categorize the item.</p>
              </div>
            </div>
            <div class="d-flex mb-4 step-item">
              <div class="step-number me-4">2</div>
              <div>
                <h5 class="text-white fw-bold">Instant AI Matching</h5>
                <p class="text-muted">LostAI continuously scans the database, comparing images and descriptions to find potential matches instantly.</p>
              </div>
            </div>
            <div class="d-flex step-item">
              <div class="step-number me-4">3</div>
              <div>
                <h5 class="text-white fw-bold">Secure Return</h5>
                <p class="text-muted">Once a match is verified, a secure QR certificate is generated for a safe and hassle-free exchange.</p>
              </div>
            </div>
          </div>
          <div class="col-lg-6 offset-lg-1">
             <div class="glass-panel p-2 shadow-2xl position-relative">
               <div class="browser-mockup-header d-flex gap-2 p-2 mb-2 border-bottom border-secondary">
                 <span class="rounded-circle bg-danger d-inline-block" style="width:12px; height:12px;"></span>
                 <span class="rounded-circle bg-warning d-inline-block" style="width:12px; height:12px;"></span>
                 <span class="rounded-circle bg-success d-inline-block" style="width:12px; height:12px;"></span>
               </div>
               <img src="assets/dashboard-mockup.svg" alt="Dashboard Demo" class="img-fluid rounded" style="opacity: 0.8; filter: grayscale(50%);">
               <div class="position-absolute top-50 start-50 translate-middle text-center">
                  <i class="bi bi-play-circle-fill display-1 text-primary cursor-pointer play-btn-pulse"></i>
               </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Testimonials -->
      <div class="py-5 my-5 text-center">
        <h2 class="display-5 fw-bold text-white mb-5">Trusted by the <span class="text-gradient-primary">Community</span></h2>
        <div class="row g-4">
          <div class="col-md-4">
            <div class="glass-panel p-4 h-100 text-start">
              <div class="d-flex text-warning mb-3 gap-1">
                <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
              </div>
              <p class="text-white fst-italic mb-4">"I lost my keys near the library and within 2 hours, LostAI matched my report with someone who found them. The QR code made the exchange super safe!"</p>
              <div class="d-flex align-items-center">
                <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">JS</div>
                <div>
                  <h6 class="mb-0 text-white">Jane Smith</h6>
                  <small class="text-muted">Student</small>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="glass-panel p-4 h-100 text-start">
              <div class="d-flex text-warning mb-3 gap-1">
                <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i>
              </div>
              <p class="text-white fst-italic mb-4">"The AI image recognition is crazy accurate. It knew exactly what type of headphones I uploaded and immediately paired it with a lost report."</p>
              <div class="d-flex align-items-center">
                <div class="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">MD</div>
                <div>
                  <h6 class="mb-0 text-white">Mike Davis</h6>
                  <small class="text-muted">Campus Staff</small>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="glass-panel p-4 h-100 text-start">
              <div class="d-flex text-warning mb-3 gap-1">
                <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-half"></i>
              </div>
              <p class="text-white fst-italic mb-4">"As a platinum finder, I love the reputation system. It encourages people to do the right thing and brings the community together."</p>
              <div class="d-flex align-items-center">
                <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">AL</div>
                <div>
                  <h6 class="mb-0 text-white">Alex Lee</h6>
                  <small class="text-muted">Platinum Finder</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="py-5 my-5">
        <h2 class="display-5 fw-bold text-white text-center mb-5">Frequently Asked <span class="text-gradient-ai">Questions</span></h2>
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="accordion accordion-flush" id="faqAccordion">
              <div class="accordion-item glass-panel mb-3 border-0 rounded-3 overflow-hidden">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed bg-transparent text-white fw-bold p-4 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">
                    How does the AI matching work?
                  </button>
                </h2>
                <div id="faq1" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body text-muted px-4 pb-4 pt-0">
                    Our platform uses advanced computer vision to extract features from uploaded images and NLP to understand descriptions. It compares your report against the database to find items with a high similarity score.
                  </div>
                </div>
              </div>
              <div class="accordion-item glass-panel mb-3 border-0 rounded-3 overflow-hidden">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed bg-transparent text-white fw-bold p-4 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">
                    Is my personal information safe?
                  </button>
                </h2>
                <div id="faq2" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body text-muted px-4 pb-4 pt-0">
                    Yes! We never share your direct contact details. When a match is made, you communicate through our secure in-app chat, and the exchange is facilitated via a generated QR code.
                  </div>
                </div>
              </div>
              <div class="accordion-item glass-panel mb-3 border-0 rounded-3 overflow-hidden">
                <h2 class="accordion-header">
                  <button class="accordion-button collapsed bg-transparent text-white fw-bold p-4 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">
                    How do I become a Platinum Finder?
                  </button>
                </h2>
                <div id="faq3" class="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div class="accordion-body text-muted px-4 pb-4 pt-0">
                    The reputation system rewards you for successfully returning items. You earn points for fast responses, successful verifications, and positive ratings from owners.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact/CTA -->
      <div class="py-5 mb-5 text-center">
        <div class="glass-panel p-5 rounded-4 hero-gradient-bg border-primary border">
          <h2 class="display-5 fw-bold text-white mb-3">Ready to find your item?</h2>
          <p class="lead text-white-50 mb-4 mx-auto" style="max-width: 600px;">Join thousands of students and staff who have successfully recovered their belongings through LostAI.</p>
          <a class="btn btn-light btn-lg px-5 py-3 fw-bold rounded-pill text-dark" routerLink="/register">Get Started Now</a>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .tracking-tight {
      letter-spacing: -0.02em;
    }
    .text-cyan {
      color: var(--secondary);
    }
    .hero-box {
      width: 320px;
      z-index: 2;
    }
    .hero-image-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 250px;
      background: radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%);
      filter: blur(30px);
      z-index: 1;
    }
    .card-img-container {
      height: 200px;
    }
    .card-img-top {
      transition: transform 0.5s ease;
    }
    .card:hover .card-img-top {
      transform: scale(1.05);
    }
    .object-fit-cover {
      object-fit: cover;
    }
    .font-monospace {
      font-family: SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
    }
    .top-3 {
      top: 1rem;
    }
    .start-3 {
      left: 1rem;
    }
    .end-3 {
      right: 1rem;
    }

    /* Skeleton Loading Shimmer animations */
    .shimmer-loading {
      position: relative;
      overflow: hidden;
    }
    .shimmer-box {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
    }
    .shimmer-line {
      height: 1rem;
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 37%, rgba(255, 255, 255, 0.03) 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease infinite;
      border-radius: 4px;
    }
    @keyframes shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
    .w-40 { width: 40%; }
    .w-20 { width: 20%; }
    
    /* New SaaS Sections Styles */
    .feature-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      border-color: rgba(99, 102, 241, 0.5);
    }
    .step-number {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.25rem;
      flex-shrink: 0;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
    }
    .step-item {
      transition: all 0.3s ease;
    }
    .step-item:hover {
      transform: translateX(10px);
    }
    .hero-gradient-bg {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1));
    }
    .play-btn-pulse {
      animation: pulse-glow 2s infinite;
    }
    @keyframes pulse-glow {
      0% { text-shadow: 0 0 0 rgba(99, 102, 241, 0.7); }
      70% { text-shadow: 0 0 20px rgba(99, 102, 241, 0); }
      100% { text-shadow: 0 0 0 rgba(99, 102, 241, 0); }
    }
    
    /* Accordion Overrides */
    .accordion-button::after {
      filter: invert(1) grayscale(100%) brightness(200%);
    }
    .accordion-button:not(.collapsed) {
      color: white;
      background-color: rgba(99, 102, 241, 0.1);
      box-shadow: none;
    }
  `]
})
export class HomeComponent implements OnInit {
  allItems: LostFoundItem[] = [];
  filteredItems: LostFoundItem[] = [];
  paginatedItems: LostFoundItem[] = [];
  
  // Skeletons State
  isLoading = true;

  // Search & Filter State
  searchQuery: string = '';
  activeTab: 'all' | 'lost' | 'found' = 'all';
  categories = ['All Categories', 'Electronics', 'Personal Accessories', 'Documents', 'Other'];
  selectedCategory = 'All Categories';
  activeStatus: 'all' | 'active' | 'matched' | 'resolved' = 'all';

  // Pagination State
  currentPage = 1;
  pageSize = 6;
  totalPages = 1;

  stats = [
    { label: 'Total Reports', value: '450+' },
    { label: 'AI Match Rate', value: '92.4%' },
    { label: 'Matches Resolved', value: '180+' },
    { label: 'Active Users', value: '2,400+' }
  ];

  constructor(public itemService: ItemService, public authService: AuthService) {}

  ngOnInit(): void {
    this.itemService.items$.subscribe(items => {
      this.allItems = items;
      this.onSearch();
      
      // Simulate loading state for skeletons (800ms)
      setTimeout(() => {
        this.isLoading = false;
      }, 800);
    });
  }

  setTab(tab: 'all' | 'lost' | 'found'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.onSearch();
  }

  onSearch(): void {
    let result = this.allItems;

    // Filter by type
    if (this.activeTab !== 'all') {
      result = result.filter(item => item.type === this.activeTab);
    }

    // Filter by category
    if (this.selectedCategory !== 'All Categories') {
      result = result.filter(item => item.category.toLowerCase() === this.selectedCategory.toLowerCase());
    }

    // Filter by status
    if (this.activeStatus !== 'all') {
      result = result.filter(item => item.status === this.activeStatus);
    }

    // Filter by query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.tags || []).some(t => t.toLowerCase().includes(q)) ||
        item.location.toLowerCase().includes(q)
      );
    }

    this.filteredItems = result;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedItems = this.filteredItems.slice(startIndex, startIndex + this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }
}
