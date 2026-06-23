import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Conversation, ChatMessage, LostFoundItem } from '../../core/models/item.model';
import { Router, RouterModule } from '@angular/router';
import { VerificationService } from '../../core/services/verification.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="chat-window-container h-100 d-flex flex-column" *ngIf="conversation; else noActiveChat">
      
      <!-- Top Context Bar (Items & Match Details) -->
      <div class="chat-header p-3 border-bottom border-secondary bg-black bg-opacity-20">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
          
          <!-- Back button (mobile only) -->
          <button class="btn btn-outline-glass btn-sm d-md-none me-2" (click)="goBack.emit()">
            <i class="bi bi-arrow-left"></i>
          </button>

          <!-- Match context -->
          <div class="d-flex align-items-center gap-3 flex-grow-1">
            <!-- Lost Item -->
            <div class="d-flex align-items-center gap-2 context-item-pill px-2.5 py-1.5 rounded-pill bg-danger bg-opacity-10 border border-danger border-opacity-25" style="max-width: 180px;">
              <img [src]="lostItem?.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=40&q=80'" 
                   class="rounded-circle object-fit-cover" style="width: 24px; height: 24px;" alt="Lost" />
              <span class="text-truncate text-white fw-bold small" style="max-width: 100px;">{{ lostItem?.name || 'Lost Item' }}</span>
              <span class="badge bg-danger scale-xs">Lost</span>
            </div>

            <!-- Inter-item arrow / match badge -->
            <div class="d-flex flex-column align-items-center">
              <span class="badge py-1 px-2.5 bg-gradient-ai small fw-bold" style="font-size: 0.75rem;">
                <i class="bi bi-cpu-fill me-1"></i>{{ matchPercentage }}%
              </span>
              <i class="bi bi-arrow-left-right text-muted small"></i>
            </div>

            <!-- Found Item -->
            <div class="d-flex align-items-center gap-2 context-item-pill px-2.5 py-1.5 rounded-pill bg-cyan bg-opacity-10 border border-cyan border-opacity-25" style="max-width: 180px;">
              <img [src]="foundItem?.imageUrl || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=40&q=80'" 
                   class="rounded-circle object-fit-cover" style="width: 24px; height: 24px;" alt="Found" />
              <span class="text-truncate text-white fw-bold small" style="max-width: 100px;">{{ foundItem?.name || 'Found Item' }}</span>
              <span class="badge bg-cyan scale-xs">Found</span>
            </div>
          </div>

          <!-- Status badge / options -->
          <div class="d-flex align-items-center gap-2">
            <span class="badge border py-1.5 px-2.5" 
                  [class.bg-success-subtle]="conversation.status === 'active'" [class.text-success]="conversation.status === 'active'" [class.border-success-subtle]="conversation.status === 'active'"
                  [class.bg-secondary-subtle]="conversation.status === 'closed'" [class.text-secondary]="conversation.status === 'closed'" [class.border-secondary-subtle]="conversation.status === 'closed'">
              {{ conversation.status === 'active' ? 'Active' : 'Closed' }}
            </span>
          </div>

        </div>
      </div>

      <!-- Verification Banners (only if active chat and matchPercentage >= 80) -->
      <div *ngIf="conversation.status === 'active' && matchPercentage >= 80" class="px-3 py-2 bg-gradient-ai bg-opacity-10 border-bottom border-primary border-opacity-20 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div class="d-flex align-items-center gap-2 text-white">
          <i class="bi bi-qr-code text-cyan fs-5 animate-pulse"></i>
          
          <span *ngIf="!activeVerification" class="small">
            AI Match Similarity is <strong>{{ matchPercentage }}%</strong>! You can now initiate a secure QR-based claim handover.
          </span>
          
          <span *ngIf="activeVerification && activeVerification.status === 'Pending'" class="small">
            Ownership Handover Verification is <strong class="text-warning">Pending Approval</strong>.
          </span>
          
          <span *ngIf="activeVerification && (activeVerification.status === 'Approved' || activeVerification.status === 'QR Generated')" class="small">
            Ownership Handover is <strong class="text-info">Ready</strong>. Finder generated meetup validation code.
          </span>
        </div>
        
        <div class="d-flex gap-2">
          <div *ngIf="!activeVerification && isOwner" class="d-flex align-items-center gap-2">
            <input type="file" #verifDocInput (change)="onVerifDocSelected($event)" accept="image/*,.pdf" class="d-none" />
            <button class="btn btn-secondary-gradient btn-xs py-1 px-3" (click)="verifDocInput.click()" [disabled]="uploadingDoc">
              <span class="spinner-border spinner-border-sm me-1" role="status" *ngIf="uploadingDoc"></span>
              <i class="bi bi-file-earmark-arrow-up me-1"></i>Upload Proof & Request
            </button>
          </div>
          <span *ngIf="!activeVerification && !isOwner" class="small text-muted font-monospace py-1">Awaiting Owner Request</span>
          
          <a *ngIf="activeVerification" [routerLink]="['/verification', activeVerification.id]" class="btn btn-primary-gradient btn-xs py-1 px-3 text-white text-decoration-none">
            {{ (activeVerification.status === 'Pending' && !isOwner) ? 'Review & Approve' : 'Go to Handover' }}
          </a>
        </div>
      </div>

      <!-- Messages Thread Area -->
      <div #messageContainer class="flex-grow-1 overflow-y-auto p-3 d-flex flex-column gap-3 messages-list" style="background: rgba(0,0,0,0.15);">
        
        <div *ngIf="messages.length === 0" class="text-center py-5 text-muted my-auto">
          <i class="bi bi-chat-dots fs-1 mb-2 d-block opacity-25"></i>
          <span>No messages yet. Send a message to start coordinating.</span>
        </div>

        <div *ngFor="let msg of messages; let i = index" 
             [class.align-self-end]="msg.senderId === currentUserId"
             [class.align-self-start]="msg.senderId !== currentUserId && msg.senderId !== 'system'"
             [class.mx-auto]="msg.senderId === 'system'"
             [class.w-100]="msg.senderId === 'system'"
             class="d-flex flex-column max-w-75">
          
          <!-- System capsule -->
          <div *ngIf="msg.senderId === 'system'" class="text-center my-2">
            <span class="system-badge px-3 py-1.5 border rounded-pill small fw-bold">
              <i class="bi bi-info-circle-fill me-1 text-cyan"></i>{{ msg.message }}
            </span>
          </div>

          <!-- Text/Image Bubble -->
          <div *ngIf="msg.senderId !== 'system'" 
               class="bubble p-3 rounded-4 position-relative"
               [class.bubble-sender]="msg.senderId === currentUserId"
               [class.bubble-receiver]="msg.senderId !== currentUserId">
            
            <!-- Message Content -->
            <div *ngIf="msg.messageType === 'text'" class="text-break text-white">
              {{ msg.message }}
            </div>
            
            <!-- Image content -->
            <div *ngIf="msg.messageType === 'image'" class="image-content rounded overflow-hidden cursor-pointer" (click)="openImageModal(msg.message)">
              <img [src]="msg.message" class="img-fluid object-fit-cover" style="max-height: 200px; max-width: 100%; min-width: 150px;" alt="Chat attachment" />
              <div class="image-overlay d-flex align-items-center justify-content-center">
                <i class="bi bi-zoom-in text-white fs-3"></i>
              </div>
            </div>

            <!-- Footer info inside bubble -->
            <div class="d-flex justify-content-end align-items-center gap-1.5 mt-1.5 text-white-50" style="font-size: 0.7rem;">
              <span>{{ formatTime(msg.timestamp) }}</span>
              <span *ngIf="msg.senderId === currentUserId">
                <i class="bi" 
                   [class.bi-check2-all]="msg.isRead" [class.text-cyan]="msg.isRead"
                   [class.bi-check2]="!msg.isRead" [class.text-muted]="!msg.isRead"></i>
              </span>
            </div>

          </div>
        </div>
      </div>

      <!-- Quick Action Attachments Popover / Suggestion bar -->
      <div *ngIf="showAttachmentBar" class="p-2 border-top border-secondary bg-black bg-opacity-40 d-flex gap-2 align-items-center overflow-x-auto">
        <span class="small text-muted text-nowrap"><i class="bi bi-image me-1"></i>Sample attachments:</span>
        <button *ngFor="let suggestion of imageSuggestions" 
                class="btn btn-outline-glass btn-xs py-1 px-2.5 text-nowrap small text-white-50"
                (click)="sendSuggestedImage(suggestion.url)">
          {{ suggestion.name }}
        </button>
        <button class="btn btn-outline-danger btn-xs py-1 px-2 ms-auto" (click)="showAttachmentBar = false">
          <i class="bi bi-x"></i>
        </button>
      </div>

      <!-- Footer Input Area -->
      <div class="chat-footer p-3 border-top border-secondary bg-black bg-opacity-25">
        
        <!-- Closed indicator -->
        <div *ngIf="conversation.status === 'closed'" class="alert alert-secondary bg-secondary bg-opacity-10 border-secondary border-opacity-20 text-center py-2 px-3 mb-0 small text-white-50 rounded-3">
          <i class="bi bi-lock-fill me-1"></i> This conversation is closed because the item has been returned.
        </div>

        <form *ngIf="conversation.status === 'active'" (ngSubmit)="sendTextMessage()" class="d-flex gap-2">
          
          <!-- Hidden File Input -->
          <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="d-none" />

          <!-- Attachment Trigger -->
          <button type="button" 
                  class="btn btn-outline-glass px-3" 
                  [class.active]="showAttachmentBar"
                  (click)="toggleAttachmentBar()"
                  title="Add Attachment">
            <i class="bi bi-paperclip"></i>
          </button>

          <!-- Input field -->
          <input 
            type="text" 
            class="form-control flex-grow-1" 
            placeholder="Type your coordination message..." 
            [(ngModel)]="messageText" 
            name="message"
            autocomplete="off"
            required
          />

          <!-- Send Button -->
          <button type="submit" class="btn btn-primary-gradient px-4" [disabled]="!messageText.trim()">
            <i class="bi bi-send-fill"></i>
          </button>

        </form>
      </div>

      <!-- Image Preview Modal -->
      <div class="modal-backdrop fade show" *ngIf="activePreviewImage"></div>
      <div class="modal fade show d-block" tabindex="-1" *ngIf="activePreviewImage" (click)="activePreviewImage = null" style="top: 10%; z-index: 1060;">
        <div class="modal-dialog modal-lg modal-dialog-centered">
          <div class="modal-content glass-panel p-2 border-secondary bg-black">
            <div class="modal-header border-0 pb-0 justify-content-end">
              <button type="button" class="btn-close btn-close-white" (click)="activePreviewImage = null"></button>
            </div>
            <div class="modal-body text-center p-3">
              <img [src]="activePreviewImage" class="img-fluid rounded border border-secondary" style="max-height: 70vh; object-fit: contain;" alt="Attachment Preview" />
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- No active chat placeholder -->
    <ng-template #noActiveChat>
      <div class="h-100 d-flex flex-column align-items-center justify-content-center text-muted p-5">
        <i class="bi bi-chat-square-dots display-2 mb-3 text-gradient-primary opacity-50 animate-pulse"></i>
        <h4 class="text-white fw-bold">Your Conversation Center</h4>
        <p class="text-center" style="max-width: 400px;">Select an active matching thread from the sidebar list to start securely coordinating item pickups and verification details.</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .chat-header {
      border-top-left-radius: 12px;
      border-top-right-radius: 12px;
    }
    .messages-list {
      height: 100%;
      min-height: 350px;
    }
    .bubble {
      max-width: 100%;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    }
    .bubble-sender {
      background: linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%);
      border: 1px solid rgba(124, 58, 237, 0.4);
      border-bottom-right-radius: 2px !important;
    }
    .bubble-receiver {
      background: var(--bg-card);
      backdrop-filter: blur(8px);
      border: 1px solid var(--border-color);
      border-bottom-left-radius: 2px !important;
    }
    .system-badge {
      background: rgba(17, 24, 39, 0.8);
      border-color: rgba(6, 182, 212, 0.3) !important;
      color: #67e8f9;
      font-size: 0.8rem;
    }
    .bg-gradient-ai {
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
    }
    .text-cyan {
      color: var(--secondary) !important;
    }
    .text-cyan-muted {
      color: rgba(6, 182, 212, 0.7);
    }
    .text-danger {
      color: var(--danger) !important;
    }
    .bg-cyan {
      background-color: var(--secondary) !important;
    }
    .bg-cyan-opacity {
      background-color: rgba(6, 182, 212, 0.1) !important;
    }
    .context-item-pill {
      font-size: 0.85rem;
    }
    .scale-xs {
      transform: scale(0.8);
      transform-origin: left center;
    }
    .btn-xs {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      border-radius: 6px;
    }
    .image-content {
      position: relative;
    }
    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .image-content:hover .image-overlay {
      opacity: 1;
    }
    .max-w-75 {
      max-width: 75%;
    }
    .animate-pulse {
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        opacity: 0.4;
      }
      50% {
        opacity: 0.8;
      }
      100% {
        opacity: 0.4;
      }
    }
  `]
})
export class ChatWindowComponent implements OnChanges, AfterViewChecked {
  @Input() conversation: Conversation | null = null;
  @Input() currentUserId: string = '';
  @Input() messages: ChatMessage[] = [];
  @Input() items: LostFoundItem[] = [];

  @Output() messageSent = new EventEmitter<{ message: string, type: 'text' | 'image' | 'system' }>();
  @Output() goBack = new EventEmitter<void>();

  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  messageText: string = '';
  lostItem: LostFoundItem | null = null;
  foundItem: LostFoundItem | null = null;
  matchPercentage: number = 70;

  activeVerification: any = null;
  isOwner: boolean = false;

  showAttachmentBar: boolean = false;
  activePreviewImage: string | null = null;

  uploadingDoc = false;

  constructor(
    private verificationService: VerificationService,
    private storageService: StorageService,
    private router: Router
  ) {}

  imageSuggestions = [
    { name: 'Item Verification Photo', url: 'https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=400&q=80' },
    { name: 'Serial Number / Receipt', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80' },
    { name: 'Pickup Location Map', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=400&q=80' }
  ];

  private shouldScrollToBottom: boolean = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['conversation'] || changes['items']) {
      this.loadContext();
    }
    if (changes['messages']) {
      this.shouldScrollToBottom = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadContext(): void {
    if (!this.conversation || !this.items) return;

    this.lostItem = this.items.find(i => i.id === this.conversation!.lostItemId) || null;
    this.foundItem = this.items.find(i => i.id === this.conversation!.foundItemId) || null;
    this.isOwner = this.conversation.ownerUserId === this.currentUserId;

    // Retrieve match score
    const matchesJson = localStorage.getItem('lostai_matches');
    if (matchesJson) {
      try {
        const matches = JSON.parse(matchesJson) as any[];
        const match = matches.find(m => m.id === this.conversation!.matchId || (m.lostItem.id === this.conversation!.lostItemId && m.foundItem.id === this.conversation!.foundItemId));
        if (match) {
          this.matchPercentage = match.overallConfidence || match.matchPercentage || 70;
        }
      } catch (e) {}
    }

    // Load active verification request if any
    this.verificationService.getVerificationByMatch(this.conversation.matchId).subscribe(req => {
      this.activeVerification = req;
    });
  }

  initiateVerification(): void {
    if (!this.conversation) return;
    this.verificationService.requestVerification(
      this.conversation.matchId,
      this.conversation.ownerUserId,
      this.conversation.finderUserId
    ).subscribe(req => {
      this.activeVerification = req;
      this.router.navigate(['/verification', req.id]);
    });
  }

  onVerifDocSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadingDoc = true;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Data = e.target.result;
        const randomId = Math.random().toString(36).substring(2, 7);
        const path = `verifications/doc_${Date.now()}_${randomId}`;
        this.storageService.uploadImage(path, base64Data).subscribe({
          next: (url) => {
            this.verificationService.requestVerification(
              this.conversation!.matchId,
              this.conversation!.ownerUserId,
              this.conversation!.finderUserId,
              url
            ).subscribe({
              next: (req) => {
                this.uploadingDoc = false;
                this.activeVerification = req;
                this.router.navigate(['/verification', req.id]);
              },
              error: (err) => {
                console.error('Failed to create verification request:', err);
                this.uploadingDoc = false;
              }
            });
          },
          error: (err) => {
            console.error('Failed to upload verification document:', err);
            this.uploadingDoc = false;
          }
        });
      };
      reader.readAsDataURL(file);
    }
  }

  scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  sendTextMessage(): void {
    if (!this.messageText.trim()) return;
    this.messageSent.emit({
      message: this.messageText.trim(),
      type: 'text'
    });
    this.messageText = '';
  }

  toggleAttachmentBar(): void {
    this.showAttachmentBar = !this.showAttachmentBar;
  }

  sendSuggestedImage(url: string): void {
    this.messageSent.emit({
      message: url,
      type: 'image'
    });
    this.showAttachmentBar = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64Url = e.target.result;
        this.messageSent.emit({
          message: base64Url,
          type: 'image'
        });
      };
      reader.readAsDataURL(file);
    }
    this.showAttachmentBar = false;
  }

  openImageModal(url: string): void {
    this.activePreviewImage = url;
  }

  formatTime(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
