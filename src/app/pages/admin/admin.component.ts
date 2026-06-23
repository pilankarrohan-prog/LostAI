import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../core/services/item.service';
import { ChatService } from '../../core/services/chat.service';
import { VerificationService, VerificationRequest } from '../../core/services/verification.service';
import { LostFoundItem, AdminActivityLog, Conversation, ChatMessage } from '../../core/models/item.model';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container py-5 fade-in">
      
      <!-- Admin Header -->
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h1 class="h2 text-white fw-bold mb-1">
            <i class="bi bi-shield-lock-fill text-gradient-primary me-2"></i>System Admin Dashboard
          </h1>
          <p class="text-muted mb-0">System audit logs, active database moderation tools, and analytics charts.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-glass btn-sm py-2 px-3" (click)="refreshAdminData()" [disabled]="isLoading">
            <span class="spinner-border spinner-border-sm me-1" *ngIf="isLoading"></span>
            <i class="bi bi-arrow-clockwise me-1" *ngIf="!isLoading"></i> Force Sync
          </button>
          <a class="btn btn-primary-gradient btn-sm py-2 px-3" routerLink="/dashboard"><i class="bi bi-grid-fill me-1"></i> Dashboard</a>
        </div>
      </div>

      <!-- Quick Metrics Grid -->
      <div class="row g-4 mb-4" *ngIf="stats">
        <div class="col-md-3 col-sm-6">
          <div class="glass-panel p-4 d-flex align-items-center">
            <div class="rounded-circle bg-primary bg-opacity-10 border border-primary border-opacity-25 p-3 me-3 text-primary d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
              <i class="bi bi-files fs-3"></i>
            </div>
            <div>
              <div class="text-white-50 small">Total Reports</div>
              <h3 class="fw-bold text-white mb-0 mt-1">{{ stats.total_items }}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="glass-panel p-4 d-flex align-items-center">
            <div class="rounded-circle bg-success bg-opacity-10 border border-success border-opacity-25 p-3 me-3 text-success d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
              <i class="bi bi-check-circle fs-3"></i>
            </div>
            <div>
              <div class="text-white-50 small">Active Filings</div>
              <h3 class="fw-bold text-white mb-0 mt-1">{{ stats.total_active }}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="glass-panel p-4 d-flex align-items-center">
            <div class="rounded-circle bg-warning bg-opacity-10 border border-warning border-opacity-25 p-3 me-3 text-warning d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
              <i class="bi bi-exclamation-triangle fs-3"></i>
            </div>
            <div>
              <div class="text-white-50 small">Spam Flagged</div>
              <h3 class="fw-bold text-white mb-0 mt-1">{{ stats.total_spam }}</h3>
            </div>
          </div>
        </div>
        <div class="col-md-3 col-sm-6">
          <div class="glass-panel p-4 d-flex align-items-center">
            <div class="rounded-circle bg-danger bg-opacity-10 border border-danger border-opacity-25 p-3 me-3 text-danger d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
              <i class="bi bi-card-checklist fs-3"></i>
            </div>
            <div>
              <div class="text-white-50 small">Total Audit Logs</div>
              <h3 class="fw-bold text-white mb-0 mt-1">{{ logs.length }}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- Feedback notifications -->
      <div class="alert alert-success bg-success bg-opacity-10 border-success border-opacity-20 text-success rounded-3 p-3 mb-4 small d-flex align-items-center" *ngIf="successMsg">
        <i class="bi bi-check-circle-fill me-2 fs-5"></i>
        <span>{{ successMsg }}</span>
      </div>

      <!-- Tab Switcher -->
      <div class="glass-panel p-2 mb-4 d-inline-flex gap-2 flex-wrap">
        <button class="btn btn-sm px-4 py-2" [class.btn-primary-gradient]="currentTab === 'moderation'" [class.btn-outline-glass]="currentTab !== 'moderation'" (click)="setTab('moderation')">
          <i class="bi bi-shield-fill me-2"></i>Report Moderation
        </button>
        <button class="btn btn-sm px-4 py-2" [class.btn-primary-gradient]="currentTab === 'chats'" [class.btn-outline-glass]="currentTab !== 'chats'" (click)="setTab('chats')">
          <i class="bi bi-chat-right-text-fill me-2"></i>Secure Chat Audit
        </button>
        <button class="btn btn-sm px-4 py-2" [class.btn-primary-gradient]="currentTab === 'verifications'" [class.btn-outline-glass]="currentTab !== 'verifications'" (click)="setTab('verifications')">
          <i class="bi bi-qr-code me-2"></i>Verification Audits
        </button>
        <button class="btn btn-sm px-4 py-2" [class.btn-primary-gradient]="currentTab === 'ai'" [class.btn-outline-glass]="currentTab !== 'ai'" (click)="setTab('ai')">
          <i class="bi bi-cpu-fill me-2"></i>AI Diagnostics
        </button>
      </div>

      <!-- Tab 1: Moderation View -->
      <div *ngIf="currentTab === 'moderation'">
        <!-- Charts Section -->
        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-4"><i class="bi bi-pie-chart-fill text-primary me-2"></i>Category Distribution</h5>
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas #categoryChartCanvas></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-4"><i class="bi bi-bar-chart-line-fill text-cyan me-2"></i>Report Type Ratio & Status</h5>
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas #statusChartCanvas></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Location Insights Section -->
        <div class="row g-4 mb-4" *ngIf="stats?.most_common_loss_areas || stats?.most_recovered_locations">
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100 animate-slide-up">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-geo-alt-fill text-danger me-2"></i>Most Common Loss Areas</h5>
              <div class="list-group list-group-flush bg-transparent">
                <div *ngFor="let area of stats.most_common_loss_areas | slice:0:5; let idx = index" 
                     class="list-group-item bg-transparent text-white border-secondary-subtle px-0 d-flex justify-content-between align-items-center py-2.5">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-danger bg-opacity-20 text-danger border border-danger border-opacity-35 rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 26px; height: 26px; font-size: 0.75rem; font-weight: 600;">
                      {{ idx + 1 }}
                    </span>
                    <span class="small text-white-50 text-truncate" style="max-width: 250px;" [title]="$any(area).location">{{ $any(area).location }}</span>
                  </div>
                  <span class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 px-2.5 py-1 small rounded-pill fw-semibold">
                    {{ $any(area).count }} reports
                  </span>
                </div>
                <div *ngIf="!stats.most_common_loss_areas?.length" class="text-muted small py-3 text-center">
                  No loss location data available
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100 animate-slide-up">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-patch-check-fill text-success me-2"></i>Most Recovered Locations</h5>
              <div class="list-group list-group-flush bg-transparent">
                <div *ngFor="let area of stats.most_recovered_locations | slice:0:5; let idx = index" 
                     class="list-group-item bg-transparent text-white border-secondary-subtle px-0 d-flex justify-content-between align-items-center py-2.5">
                  <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-success bg-opacity-20 text-success border border-success border-opacity-35 rounded-circle p-0 d-flex align-items-center justify-content-center" style="width: 26px; height: 26px; font-size: 0.75rem; font-weight: 600;">
                      {{ idx + 1 }}
                    </span>
                    <span class="small text-white-50 text-truncate" style="max-width: 250px;" [title]="$any(area).location">{{ $any(area).location }}</span>
                  </div>
                  <span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 px-2.5 py-1 small rounded-pill fw-semibold">
                    {{ $any(area).count }} returns
                  </span>
                </div>
                <div *ngIf="!stats.most_recovered_locations?.length" class="text-muted small py-3 text-center">
                  No recovery location data available
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Admin Panels Layout -->
        <div class="row g-4">
          
          <!-- Moderation Panel (Left) -->
          <div class="col-lg-8">
            <div class="glass-panel p-4 h-100">
              <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h2 class="h4 text-white mb-0"><i class="bi bi-shield-fill text-warning me-2"></i>Content Moderation</h2>
                <div class="d-flex gap-2">
                  <input type="text" class="form-control form-control-sm bg-dark border-secondary text-white input-search" 
                         placeholder="Search name/desc..." [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()">
                  <select class="form-select form-select-sm bg-dark border-secondary text-white" 
                          [(ngModel)]="statusFilter" (change)="applyFilters()" style="width: 130px;">
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="matched">Matched</option>
                    <option value="resolved">Resolved</option>
                    <option value="spam">Spam</option>
                  </select>
                </div>
              </div>

              <!-- Moderation Grid -->
              <div class="table-responsive" style="max-height: 500px;">
                <table class="table table-dark table-hover align-middle border-0 mb-0">
                  <thead>
                    <tr class="text-muted small">
                      <th>Report Info</th>
                      <th>Reporter</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th class="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let item of filteredItems" class="border-secondary-subtle">
                      <td>
                        <div class="d-flex align-items-center">
                          <img [src]="item.imageUrl" class="rounded me-2 object-fit-cover" width="40" height="40"
                               onerror="this.src='https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80'">
                          <div>
                            <div class="fw-semibold text-white small text-truncate" style="max-width: 140px;" [title]="item.name">{{ item.name }}</div>
                            <span class="badge badge-category scale-xs">{{ item.category }}</span>
                            <span class="badge scale-xs ms-1 border" [class.bg-danger-subtle]="item.type === 'lost'" [class.text-danger]="item.type === 'lost'" [class.border-danger-subtle]="item.type === 'lost'"
                                  [class.bg-info-subtle]="item.type === 'found'" [class.text-cyan]="item.type === 'found'" [class.border-info-subtle]="item.type === 'found'">
                              {{ item.type | uppercase }}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div class="small text-white text-truncate" style="max-width: 100px;">{{ item.reporterName }}</div>
                        <div class="small text-muted font-monospace text-truncate" style="max-width: 100px;" [title]="item.reporterContact">{{ item.reporterContact }}</div>
                      </td>
                      <td>
                        <span class="badge py-1.5 px-2.5 text-uppercase scale-xs"
                          [class.bg-success]="item.status === 'active'"
                          [class.bg-warning]="item.status === 'matched'"
                          [class.bg-info]="item.status === 'resolved'"
                          [class.bg-danger]="item.status === 'spam'">
                          {{ item.status }}
                        </span>
                      </td>
                      <td class="small text-muted font-monospace">
                        {{ item.date }}
                      </td>
                      <td class="text-end">
                        <div class="d-flex justify-content-end gap-1.5">
                          <button class="btn btn-outline-warning btn-xs py-1 px-2.5 rounded-pill" 
                                  *ngIf="item.status !== 'spam'" 
                                  (click)="markSpam(item.id)" 
                                  title="Mark as Spam">
                            <i class="bi bi-shield-slash-fill me-1"></i> Spam
                          </button>
                          <button class="btn btn-outline-success btn-xs py-1 px-2.5 rounded-pill" 
                                  *ngIf="item.status === 'spam'" 
                                  (click)="restoreItem(item.id)" 
                                  title="Restore Item">
                            <i class="bi bi-shield-check-fill me-1"></i> Restore
                          </button>
                          <button class="btn btn-outline-danger btn-xs py-1 px-2.5 rounded-pill" 
                                  (click)="deleteItem(item.id)" 
                                  title="Delete Permanently">
                            <i class="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="filteredItems.length === 0">
                      <td colspan="5" class="text-center py-5 text-muted small">
                        <i class="bi bi-search display-6 mb-3 d-block text-white-50"></i>
                        No reports match the current filters.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Activity Log Feed (Right) -->
          <div class="col-lg-4">
            <div class="glass-panel p-4 h-100">
              <h2 class="h4 text-white mb-4"><i class="bi bi-clock-history text-cyan me-2"></i>Admin Activity Logs</h2>
              
              <div class="logs-feed d-flex flex-column gap-3 overflow-y-auto" style="max-height: 500px; padding-right: 5px;">
                <div *ngFor="let log of logs" class="d-flex p-3 rounded bg-dark bg-opacity-20 border border-secondary align-items-start shadow-sm transition-hover">
                  <div class="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" 
                    [ngClass]="getLogIconClass(log.action)" style="width: 38px; height: 38px; min-width: 38px;">
                    <i class="bi" [ngClass]="getLogIcon(log.action)"></i>
                  </div>
                  <div class="flex-grow-1 min-w-0">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                      <h6 class="text-white fw-bold mb-0 text-truncate small" style="font-size: 0.85rem;">{{ log.action }}</h6>
                      <span class="text-muted small font-monospace" style="font-size: 0.7rem;">{{ formatLogTime(log.timestamp) }}</span>
                    </div>
                    <p class="text-muted mb-1 small" style="font-size: 0.8rem; line-height: 1.3;">{{ log.details }}</p>
                    <div class="small text-white-50 font-monospace" style="font-size: 0.72rem;">
                      <i class="bi bi-person-fill text-primary-light me-1"></i>{{ log.user_name }}
                    </div>
                  </div>
                </div>
                <div *ngIf="logs.length === 0" class="text-center py-5 text-muted small">
                  <i class="bi bi-card-text display-6 mb-3 d-block text-white-50"></i>
                  No administrative activity logs recorded.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Tab 2: Chat Audit View -->
      <div *ngIf="currentTab === 'chats'" class="fade-in">
        
        <!-- Chat Analytics Summary Row -->
        <div class="row g-4 mb-4" *ngIf="chatStats">
          <!-- Stats Panel -->
          <div class="col-md-7">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-cpu-fill text-gradient-ai me-2"></i>Secure AI Chat Metrics</h5>
              
              <div class="row g-3">
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Total Conversations</span>
                    <h4 class="text-white fw-bold mt-1 mb-0">{{ chatStats.total_conversations }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Messages Transmitted</span>
                    <h4 class="text-white fw-bold mt-1 mb-0">{{ chatStats.messages_sent }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Success Rate</span>
                    <h4 class="text-cyan fw-bold mt-1 mb-0">{{ chatStats.success_rate }}%</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Active Threads</span>
                    <h4 class="text-success fw-bold mt-1 mb-0">{{ chatStats.active_conversations }}</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Doughnut Chart Panel -->
          <div class="col-md-5">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-pie-chart-fill text-cyan me-2"></i>Active vs Closed Chats</h5>
              <div style="position: relative; height: 160px; width: 100%;">
                <canvas #chatChartCanvas></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Conversations Audit Table -->
        <div class="row g-4">
          <div class="col-12">
            <div class="glass-panel p-4">
              <h2 class="h4 text-white mb-4"><i class="bi bi-shield-shaded text-gradient-primary me-2"></i>Match-Locked Channels Audit</h2>
              
              <div class="table-responsive">
                <table class="table table-dark table-hover align-middle border-0 mb-0">
                  <thead>
                    <tr class="text-muted small">
                      <th>Conversation ID</th>
                      <th>Associated Lost Item</th>
                      <th>Associated Found Item</th>
                      <th>Owner ID</th>
                      <th>Finder ID</th>
                      <th>Status</th>
                      <th class="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let conv of conversations" class="border-secondary-subtle">
                      <td class="font-monospace text-cyan small">{{ conv.id }}</td>
                      <td>
                        <span class="fw-semibold text-white small">{{ getItemName(conv.lostItemId) }}</span>
                      </td>
                      <td>
                        <span class="fw-semibold text-white small">{{ getItemName(conv.foundItemId) }}</span>
                      </td>
                      <td class="font-monospace small text-white-50">{{ conv.ownerUserId }}</td>
                      <td class="font-monospace small text-white-50">{{ conv.finderUserId }}</td>
                      <td>
                        <span class="badge py-1 px-2 text-uppercase scale-xs"
                              [class.bg-success]="conv.status === 'active'"
                              [class.bg-secondary]="conv.status === 'closed'">
                          {{ conv.status }}
                        </span>
                      </td>
                      <td class="text-end">
                        <button class="btn btn-outline-glass btn-xs py-1 px-2.5 rounded-pill" 
                                (click)="openAuditModal(conv)">
                          <i class="bi bi-eye-fill me-1"></i> Audit Thread
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="conversations.length === 0">
                      <td colspan="7" class="text-center py-5 text-muted small">
                        <i class="bi bi-chat-square-dots-fill display-6 mb-3 d-block text-white-50"></i>
                        No coordination channels have been initialized yet.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>

      <!-- Tab 3: Verification Audits View -->
      <div *ngIf="currentTab === 'verifications'" class="fade-in">
        
        <!-- Verification Analytics Stats Cards -->
        <div class="row g-4 mb-4" *ngIf="verificationStats">
          
          <div class="col-md-7">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-qr-code text-gradient-primary me-2"></i>Verification Analytics</h5>
              
              <div class="row g-3">
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Total Verification Requests</span>
                    <h4 class="text-white fw-bold mt-1 mb-0">{{ verificationStats.total_requests }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Successful Returns</span>
                    <h4 class="text-success fw-bold mt-1 mb-0">{{ verificationStats.successful_returns }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Failed Verifications</span>
                    <h4 class="text-danger fw-bold mt-1 mb-0">{{ verificationStats.failed_verifications }}</h4>
                  </div>
                </div>
                <div class="col-6">
                  <div class="p-3 bg-dark bg-opacity-20 border border-secondary rounded">
                    <span class="text-white-50 small">Success Rate</span>
                    <h4 class="text-cyan fw-bold mt-1 mb-0">{{ verificationStats.success_rate }}%</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Doughnut verification success chart -->
          <div class="col-md-5">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-pie-chart-fill text-cyan me-2"></i>Handover Success Share</h5>
              <div style="position: relative; height: 160px; width: 100%;">
                <canvas #verificationSuccessChartCanvas></canvas>
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Monthly chart row -->
        <div class="row g-4 mb-4" *ngIf="verificationStats">
          <div class="col-12">
            <div class="glass-panel p-4">
              <h5 class="text-white fw-bold mb-3"><i class="bi bi-bar-chart-line-fill text-primary me-2"></i>Monthly Return Trends</h5>
              <div style="position: relative; height: 220px; width: 100%;">
                <canvas #monthlyChartCanvas></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Verification requests table -->
        <div class="row g-4">
          <div class="col-12">
            <div class="glass-panel p-4">
              <h2 class="h4 text-white mb-4"><i class="bi bi-shield-lock-fill text-gradient-ai me-2"></i>Security Handover Log Audits</h2>
              
              <div class="table-responsive">
                <table class="table table-dark table-hover align-middle border-0 mb-0">
                  <thead>
                    <tr class="text-muted small">
                      <th>Request ID</th>
                      <th>Match ID</th>
                      <th>Claimant Owner</th>
                      <th>Reporter Finder</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th class="text-end">Certificate Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let req of verificationRequests" class="border-secondary-subtle">
                      <td class="font-monospace text-cyan small">{{ req.id }}</td>
                      <td class="font-monospace small text-white-50">{{ req.matchId }}</td>
                      <td class="font-monospace small">{{ req.ownerId }}</td>
                      <td class="font-monospace small">{{ req.finderId }}</td>
                      <td>
                        <span class="badge py-1 px-2.5 text-uppercase scale-xs"
                              [class.bg-warning]="req.status === 'Pending'"
                              [class.bg-info]="req.status === 'Approved' || req.status === 'QR Generated'"
                              [class.bg-success]="req.status === 'Completed' || req.status === 'Verified'">
                          {{ req.status }}
                        </span>
                      </td>
                      <td class="small text-muted font-monospace">
                        {{ req.createdAt | date:'shortTime' }} {{ req.createdAt | date:'mediumDate' }}
                      </td>
                      <td class="text-end">
                        <a *ngIf="req.status === 'Completed'" 
                           [href]="getCertificateUrl(req.id)" 
                           target="_blank" 
                           class="btn btn-outline-glass btn-xs py-1 px-3 rounded-pill text-cyan text-decoration-none">
                          <i class="bi bi-file-earmark-pdf-fill me-1"></i> Download PDF
                        </a>
                        <button *ngIf="req.status !== 'Completed'" disabled class="btn btn-outline-glass btn-xs py-1 px-3 rounded-pill text-muted opacity-50">
                          <i class="bi bi-lock-fill me-1"></i> Locked
                        </button>
                      </td>
                    </tr>
                    <tr *ngIf="verificationRequests.length === 0">
                      <td colspan="7" class="text-center py-5 text-muted small">
                        <i class="bi bi-qr-code display-6 mb-3 d-block text-white-50"></i>
                        No ownership verifications are logged in the system.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>

      </div>

      <!-- Tab 4: AI Diagnostics View -->
      <div *ngIf="currentTab === 'ai'" class="fade-in">
        
        <!-- AI Diagnostics Stats Cards -->
        <div class="row g-4 mb-4" *ngIf="stats?.ai_recognition_stats">
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100 d-flex align-items-center">
              <div class="rounded-circle bg-success bg-opacity-10 border border-success border-opacity-25 p-3 me-3 text-success d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                <i class="bi bi-cpu fs-3"></i>
              </div>
              <div>
                <div class="text-white-50 small">Average Scan Accuracy</div>
                <h3 class="fw-bold text-white mb-0 mt-1">{{ stats.ai_recognition_stats.average_accuracy }}%</h3>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100 d-flex align-items-center">
              <div class="rounded-circle bg-primary bg-opacity-10 border border-primary border-opacity-25 p-3 me-3 text-primary d-flex align-items-center justify-content-center" style="width: 54px; height: 54px;">
                <i class="bi bi-camera fs-3"></i>
              </div>
              <div>
                <div class="text-white-50 small">Total Scans Analyzed</div>
                <h3 class="fw-bold text-white mb-0 mt-1">{{ stats.ai_recognition_stats.total_scans }}</h3>
              </div>
            </div>
          </div>
        </div>

        <!-- AI Charts Row -->
        <div class="row g-4 mb-4" *ngIf="stats?.ai_recognition_stats">
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-4"><i class="bi bi-graph-up text-cyan me-2"></i>Weekly Accuracy Trend</h5>
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas #accuracyChartCanvas></canvas>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="glass-panel p-4 h-100">
              <h5 class="text-white fw-bold mb-4"><i class="bi bi-bar-chart-line-fill text-primary me-2"></i>Recognized Categories Distribution</h5>
              <div style="position: relative; height: 260px; width: 100%;">
                <canvas #aiCategoryChartCanvas></canvas>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Chat Auditor Read-Only Modal -->
      <div class="modal-backdrop fade show" *ngIf="activeAuditConversation"></div>
      <div class="modal fade show d-block" tabindex="-1" *ngIf="activeAuditConversation" style="top: 10%; z-index: 1055;">
        <div class="modal-dialog modal-lg">
          <div class="modal-content glass-panel text-white border-secondary">
            
            <div class="modal-header border-bottom border-secondary p-3">
              <h5 class="modal-title fw-bold">
                <i class="bi bi-shield-lock-fill text-warning me-2"></i>
                Thread Audit: <span class="text-cyan font-monospace small">{{ activeAuditConversation.id }}</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" (click)="closeAuditModal()"></button>
            </div>

            <!-- Audit Alert Banner -->
            <div class="bg-warning bg-opacity-10 border-bottom border-warning border-opacity-20 text-warning px-3 py-2 small d-flex align-items-center">
              <i class="bi bi-exclamation-triangle-fill me-2"></i>
              <span><strong>Audit Session:</strong> This channel monitor is strictly <strong>read-only</strong>. Admins cannot send messages or alter chat payloads.</span>
            </div>

            <!-- Messages List -->
            <div class="modal-body overflow-y-auto p-4 d-flex flex-column gap-3" style="max-height: 400px; min-height: 250px; background: rgba(0,0,0,0.2);">
              
              <div *ngIf="activeAuditMessages.length === 0" class="text-center py-5 text-muted my-auto">
                No messages transmitted in this conversation.
              </div>

              <div *ngFor="let msg of activeAuditMessages" 
                   [class.align-self-end]="msg.senderId === activeAuditConversation.ownerUserId"
                   [class.align-self-start]="msg.senderId !== activeAuditConversation.ownerUserId && msg.senderId !== 'system'"
                   [class.mx-auto]="msg.senderId === 'system'"
                   [class.w-100]="msg.senderId === 'system'"
                   class="d-flex flex-column max-w-75">
                
                <!-- System caps -->
                <div *ngIf="msg.senderId === 'system'" class="text-center my-1">
                  <span class="badge border border-cyan-subtle bg-dark bg-opacity-80 text-cyan px-2.5 py-1 rounded-pill small font-monospace">
                    {{ msg.message }}
                  </span>
                </div>

                <!-- Bubbles -->
                <div *ngIf="msg.senderId !== 'system'" 
                     class="p-3 rounded-4"
                     [ngClass]="{
                       'bg-primary bg-opacity-20 border border-primary border-opacity-30': msg.senderId === activeAuditConversation.ownerUserId,
                       'bg-dark bg-opacity-40 border border-secondary': msg.senderId !== activeAuditConversation.ownerUserId
                     }">
                  
                  <div class="small text-white-50 mb-1 fw-bold">
                    {{ msg.senderId === activeAuditConversation.ownerUserId ? 'Owner (' + msg.senderId + ')' : 'Finder (' + msg.senderId + ')' }}
                  </div>

                  <!-- Text -->
                  <div *ngIf="msg.messageType === 'text'" class="text-white text-break">
                    {{ msg.message }}
                  </div>

                  <!-- Image -->
                  <div *ngIf="msg.messageType === 'image'" class="rounded overflow-hidden mt-1">
                    <img [src]="msg.message" class="img-fluid border border-secondary" style="max-height: 150px;" alt="Attachment" />
                  </div>

                  <!-- Footer info -->
                  <div class="text-end text-muted small mt-1.5 font-monospace" style="font-size: 0.68rem;">
                    {{ formatLogTime(msg.timestamp) }} &bull; {{ msg.isRead ? 'Read' : 'Unread' }}
                  </div>
                </div>

              </div>

            </div>

            <div class="modal-footer border-top border-secondary p-3 justify-content-between">
              <span class="small text-muted">
                Conversation created: {{ formatLogTime(activeAuditConversation.createdAt) }}
              </span>
              <button type="button" class="btn btn-outline-glass btn-sm" (click)="closeAuditModal()">Close Audit</button>
            </div>

          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .font-monospace {
      font-family: var(--bs-font-monospace);
    }
    .text-cyan {
      color: var(--secondary);
    }
    .text-primary-light {
      color: #a5b4fc;
    }
    .scale-xs {
      transform: scale(0.85);
      transform-origin: left center;
      display: inline-block;
    }
    .btn-xs {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
    .badge-category {
      background-color: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .border-secondary-subtle {
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
    .object-fit-cover {
      object-fit: cover;
    }
    .logs-feed::-webkit-scrollbar, .table-responsive::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .logs-feed::-webkit-scrollbar-thumb, .table-responsive::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 2px;
    }
    .transition-hover {
      transition: all 0.25s ease;
    }
    .transition-hover:hover {
      border-color: rgba(255, 255, 255, 0.15) !important;
      transform: translateY(-1px);
    }
    .bg-danger-subtle {
      background-color: rgba(239, 68, 68, 0.15) !important;
    }
    .bg-info-subtle {
      background-color: rgba(6, 182, 212, 0.15) !important;
    }
    .max-w-75 {
      max-width: 75%;
    }
    .text-cyan-subtle {
      color: #a5f3fc;
    }
    .border-cyan-subtle {
      border-color: rgba(6, 182, 212, 0.3) !important;
    }
  `]
})
export class AdminComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('categoryChartCanvas') categoryChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChartCanvas') statusChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chatChartCanvas') chatChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('monthlyChartCanvas') monthlyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('verificationSuccessChartCanvas') verificationSuccessChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('accuracyChartCanvas') accuracyChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('aiCategoryChartCanvas') aiCategoryChartCanvas!: ElementRef<HTMLCanvasElement>;

  items: LostFoundItem[] = [];
  filteredItems: LostFoundItem[] = [];
  logs: AdminActivityLog[] = [];
  stats: any = null;
  
  // Tabs
  currentTab: 'moderation' | 'chats' | 'verifications' | 'ai' = 'moderation';

  // Chats Audit fields
  conversations: Conversation[] = [];
  chatStats: any = null;
  activeAuditConversation: Conversation | null = null;
  activeAuditMessages: ChatMessage[] = [];

  // Verifications fields
  verificationStats: any = null;
  verificationRequests: VerificationRequest[] = [];

  searchQuery = '';
  statusFilter = 'all';
  isLoading = false;
  successMsg = '';

  categoryChart: any = null;
  statusChart: any = null;
  chatChart: any = null;
  monthlyChart: any = null;
  verificationSuccessChart: any = null;
  accuracyChart: any = null;
  aiCategoryChart: any = null;

  private itemsSub: Subscription | null = null;

  constructor(
    private itemService: ItemService,
    private chatService: ChatService,
    private verificationService: VerificationService
  ) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.itemsSub = this.itemService.items$.subscribe(itms => {
      this.items = itms;
      this.applyFilters();
      this.fetchStats();
      this.fetchLogs();
      this.fetchChatData();
      this.fetchVerificationData();
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.renderCharts();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.itemsSub) this.itemsSub.unsubscribe();
    this.destroyCharts();
  }

  setTab(tab: 'moderation' | 'chats' | 'verifications' | 'ai'): void {
    this.currentTab = tab;
    setTimeout(() => {
      this.renderCharts();
    }, 100);
  }

  refreshAdminData(): void {
    this.isLoading = true;
    this.itemService.forceSyncMatches().subscribe({
      next: () => {
        this.fetchStats();
        this.fetchLogs();
        this.fetchChatData();
        this.fetchVerificationData();
        this.showFeedback('Admin dashboard successfully synced with central servers.');
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  fetchStats(): void {
    this.itemService.getAdminStats().subscribe(res => {
      this.stats = res;
      this.renderCharts();
    });
  }

  fetchLogs(): void {
    this.itemService.getAdminLogs().subscribe(res => {
      this.logs = res.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.isLoading = false;
    });
  }

  fetchChatData(): void {
    this.chatService.getConversations('admin').subscribe(res => {
      this.conversations = res;
    });
    this.chatService.getAdminChatStats().subscribe(res => {
      this.chatStats = res;
      this.renderCharts();
    });
  }

  fetchVerificationData(): void {
    this.verificationService.getAdminVerificationStats().subscribe(res => {
      this.verificationStats = res;
      this.renderCharts();
    });
    this.verificationService.getAdminVerificationRequests().subscribe(res => {
      this.verificationRequests = res;
    });
  }

  openAuditModal(conv: Conversation): void {
    this.activeAuditConversation = conv;
    this.chatService.getMessages(conv.id, 'admin').subscribe(msgs => {
      this.activeAuditMessages = msgs;
    });
  }

  closeAuditModal(): void {
    this.activeAuditConversation = null;
    this.activeAuditMessages = [];
  }

  getItemName(id: string): string {
    const item = this.items.find(i => i.id === id);
    return item ? item.name : 'Unknown Item';
  }

  getCertificateUrl(id: string): string {
    return this.verificationService.getCertificateUrl(id);
  }

  applyFilters(): void {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredItems = this.items.filter(item => {
      const matchQuery = !query || 
                         item.name.toLowerCase().includes(query) || 
                         item.description.toLowerCase().includes(query) || 
                         item.category.toLowerCase().includes(query);
      const matchStatus = this.statusFilter === 'all' || item.status === this.statusFilter;
      return matchQuery && matchStatus;
    });
  }

  markSpam(itemId: string): void {
    this.isLoading = true;
    this.itemService.markAsSpam(itemId).subscribe(() => {
      this.showFeedback('Report successfully marked as spam.');
      this.fetchStats();
      this.fetchLogs();
    });
  }

  restoreItem(itemId: string): void {
    this.isLoading = true;
    this.itemService.restoreItem(itemId).subscribe(() => {
      this.showFeedback('Report successfully restored to Active status.');
      this.fetchStats();
      this.fetchLogs();
    });
  }

  deleteItem(itemId: string): void {
    if (confirm('Are you sure you want to permanently delete this report and all associated match data? This action cannot be undone.')) {
      this.isLoading = true;
      this.itemService.deleteItemPermanently(itemId).subscribe(() => {
        this.showFeedback('Report permanently purged from database.');
        this.fetchStats();
        this.fetchLogs();
      });
    }
  }

  private showFeedback(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = '', 4000);
  }

  getLogIcon(action: string): string {
    switch (action) {
      case 'Report Created': return 'bi-plus-circle-fill';
      case 'Mark Spam': return 'bi-shield-slash-fill';
      case 'Restore': return 'bi-shield-check-fill';
      case 'Delete Permanently': return 'bi-trash-fill';
      case 'Claim Match': return 'bi-hand-index-thumb-fill';
      case 'Resolve Case': return 'bi-check-circle-fill';
      case 'Chat Created': return 'bi-chat-left-dots-fill';
      case 'Verification Requested': return 'bi-qr-code';
      default: return 'bi-info-circle-fill';
    }
  }

  getLogIconClass(action: string): string {
    switch (action) {
      case 'Report Created': return 'bg-success bg-opacity-20 text-success';
      case 'Mark Spam': return 'bg-warning bg-opacity-20 text-warning';
      case 'Restore': return 'bg-info bg-opacity-20 text-info';
      case 'Delete Permanently': return 'bg-danger bg-opacity-20 text-danger';
      case 'Claim Match': return 'bg-primary bg-opacity-20 text-primary';
      case 'Resolve Case': return 'bg-success bg-opacity-20 text-success';
      case 'Chat Created': return 'bg-info bg-opacity-20 text-cyan';
      case 'Verification Requested': return 'bg-warning bg-opacity-20 text-warning';
      default: return 'bg-secondary bg-opacity-20 text-white';
    }
  }

  formatLogTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return 'Recent';
    }
  }

  destroyCharts(): void {
    if (this.categoryChart) {
      this.categoryChart.destroy();
      this.categoryChart = null;
    }
    if (this.statusChart) {
      this.statusChart.destroy();
      this.statusChart = null;
    }
    if (this.chatChart) {
      this.chatChart.destroy();
      this.chatChart = null;
    }
    if (this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = null;
    }
    if (this.verificationSuccessChart) {
      this.verificationSuccessChart.destroy();
      this.verificationSuccessChart = null;
    }
    if (this.accuracyChart) {
      this.accuracyChart.destroy();
      this.accuracyChart = null;
    }
    if (this.aiCategoryChart) {
      this.aiCategoryChart.destroy();
      this.aiCategoryChart = null;
    }
  }

  renderCharts(): void {
    this.destroyCharts();

    // 1. Category Chart
    if (this.categoryChartCanvas && this.stats && this.currentTab === 'moderation') {
      const catLabels = Object.keys(this.stats.categories || {});
      const catValues = Object.values(this.stats.categories || {});
      
      const ctx = this.categoryChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.categoryChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: catLabels,
            datasets: [{
              data: catValues,
              backgroundColor: [
                'rgba(99, 102, 241, 0.75)',  // Indigo
                'rgba(6, 182, 212, 0.75)',   // Cyan
                'rgba(245, 158, 11, 0.75)',  // Amber
                'rgba(239, 68, 68, 0.75)',   // Red
                'rgba(16, 185, 129, 0.75)',  // Emerald
                'rgba(168, 85, 247, 0.75)'   // Purple
              ],
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#94a3b8',
                  font: {
                    size: 11
                  }
                }
              }
            }
          }
        });
      }
    }

    // 2. Status Chart
    if (this.statusChartCanvas && this.stats && this.currentTab === 'moderation') {
      const ctx = this.statusChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.statusChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Active', 'Matched', 'Resolved', 'Spam'],
            datasets: [
              {
                label: 'Reports count',
                data: [
                  this.stats.total_active || 0,
                  this.stats.total_matched || 0,
                  this.stats.total_resolved || 0,
                  this.stats.total_spam || 0
                ],
                backgroundColor: 'rgba(6, 182, 212, 0.7)',
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 1.5,
                borderRadius: 4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                grid: {
                  display: false
                },
                ticks: {
                  color: '#94a3b8'
                }
              },
              y: {
                grid: {
                  color: 'rgba(255, 255, 255, 0.05)'
                },
                ticks: {
                  color: '#94a3b8',
                  stepSize: 1
                }
              }
            }
          }
        });
      }
    }

    // 3. Chat Status Chart
    if (this.chatChartCanvas && this.chatStats && this.currentTab === 'chats') {
      const ctx = this.chatChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.chatChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Active Conversations', 'Closed/Resolved'],
            datasets: [{
              data: [
                this.chatStats.active_conversations || 0,
                this.chatStats.resolved_conversations || 0
              ],
              backgroundColor: [
                'rgba(6, 182, 212, 0.75)',   // Cyan
                'rgba(16, 185, 129, 0.75)'   // Emerald
              ],
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#94a3b8',
                  font: {
                    size: 11
                  }
                }
              }
            }
          }
        });
      }
    }

    // 4. Monthly Return Verification Chart
    if (this.monthlyChartCanvas && this.verificationStats && this.currentTab === 'verifications') {
      const ctx = this.monthlyChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const labels = Object.keys(this.verificationStats.monthly_returns || {});
        const values = Object.values(this.verificationStats.monthly_returns || {});
        
        this.monthlyChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Successful Exchanges',
              data: values,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgba(99, 102, 241, 1)',
              borderWidth: 1.5,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', stepSize: 1 }
              }
            }
          }
        });
      }
    }

    // 5. Verification Success Rate Doughnut Chart
    if (this.verificationSuccessChartCanvas && this.verificationStats && this.currentTab === 'verifications') {
      const ctx = this.verificationSuccessChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        this.verificationSuccessChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Success Returns', 'Failed/Expired', 'Pending/Approved'],
            datasets: [{
              data: [
                this.verificationStats.successful_returns || 0,
                this.verificationStats.failed_verifications || 0,
                Math.max(0, this.verificationStats.total_requests - this.verificationStats.successful_returns - this.verificationStats.failed_verifications)
              ],
              backgroundColor: [
                'rgba(16, 185, 129, 0.75)',  // Emerald Green
                'rgba(239, 68, 68, 0.75)',   // Red
                'rgba(245, 158, 11, 0.75)'   // Amber
              ],
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: {
                  color: '#94a3b8',
                  font: { size: 11 }
                }
              }
            }
          }
        });
      }
    }

    // 6. Accuracy Trend Line Chart
    if (this.accuracyChartCanvas && this.stats?.ai_recognition_stats && this.currentTab === 'ai') {
      const ctx = this.accuracyChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const trend = this.stats.ai_recognition_stats.accuracy_trend || {};
        const labels = Object.keys(trend);
        const data = Object.values(trend);
        this.accuracyChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Accuracy (%)',
              data,
              borderColor: 'rgba(6, 182, 212, 1)',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2,
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
              },
              y: {
                min: 0,
                max: 100,
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8' }
              }
            }
          }
        });
      }
    }

    // 7. Recognized Categories Bar Chart
    if (this.aiCategoryChartCanvas && this.stats?.ai_recognition_stats && this.currentTab === 'ai') {
      const ctx = this.aiCategoryChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        const catScans = this.stats.ai_recognition_stats.category_scans || {};
        const labels = Object.keys(catScans);
        const data = Object.values(catScans);
        this.aiCategoryChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Scans',
              data,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: 'rgba(99, 102, 241, 1)',
              borderWidth: 1.5,
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
              },
              y: {
                grid: { color: 'rgba(255, 255, 255, 0.05)' },
                ticks: { color: '#94a3b8', stepSize: 1 }
              }
            }
          }
        });
      }
    }
  }
}
