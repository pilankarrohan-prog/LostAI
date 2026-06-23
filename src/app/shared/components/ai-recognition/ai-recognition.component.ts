import { Component, EventEmitter, Output, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AIRecognitionService, AIRecognitionResult } from '../../../core/services/ai-recognition.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ai-recognition',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ai-scanner-container w-100 mb-3">
      <!-- Upload Dropzone -->
      <div 
        *ngIf="!imageSrc" 
        class="drag-drop-zone d-flex flex-column align-items-center justify-content-center border-dashed rounded-3 p-5 text-center transition-all cursor-pointer"
        [class.drag-over]="isDragOver"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()">
        
        <i class="bi bi-cpu-fill text-gradient-ai fs-1 mb-3 animate-pulse"></i>
        <h5 class="text-white fw-bold">Drag & Drop Item Image</h5>
        <p class="text-muted small px-3">or click to browse files from your computer</p>
        <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-1.5 rounded-pill mt-2">
          <i class="bi bi-shield-check me-1"></i>Secure AI Classify Enabled
        </span>
        
        <input 
          #fileInput 
          type="file" 
          class="d-none" 
          accept="image/*" 
          (change)="onFileSelected($event)">
      </div>

      <!-- Scanning Preview Card -->
      <div *ngIf="imageSrc" class="scanner-preview-box position-relative rounded-3 overflow-hidden bg-dark border border-secondary border-opacity-50 p-2">
        <div class="position-relative d-flex justify-content-center align-items-center bg-black rounded" style="min-height: 250px; max-height: 400px; overflow: hidden;">
          <img [src]="imageSrc" alt="Item Preview" class="img-fluid object-fit-contain w-100 h-100" style="max-height: 380px;">
          
          <!-- Laser Scanner Line -->
          <div *ngIf="isScanning" class="laser-scanner-line w-100 position-absolute"></div>
          
          <!-- Loading Overlay -->
          <div *ngIf="isScanning" class="position-absolute top-0 start-0 w-100 h-100 bg-black bg-opacity-70 d-flex flex-column align-items-center justify-content-center text-center p-3 animate-fade-in">
            <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;" role="status">
              <span class="visually-hidden">Scanning...</span>
            </div>
            
            <h5 class="text-white fw-bold mb-1"><i class="bi bi-robot text-gradient-ai me-2"></i>AI Computer Vision Analysis</h5>
            <div class="text-muted small font-monospace transition-all py-1 px-3 bg-dark rounded border border-secondary border-opacity-50 mt-2" style="min-height: 30px;">
              {{ currentScanLog }}
            </div>
            
            <div class="progress w-75 mt-3" style="height: 6px; background-color: rgba(255, 255, 255, 0.1);">
              <div class="progress-bar progress-bar-striped progress-bar-animated bg-gradient-ai" role="progressbar" [style.width.%]="scanProgress"></div>
            </div>
          </div>
        </div>
        
        <!-- Controls -->
        <div class="d-flex justify-content-between align-items-center mt-3 px-1">
          <span class="text-muted small" *ngIf="fileName"><i class="bi bi-file-earmark-image me-1"></i>{{ fileName | slice:0:30 }}{{ fileName.length > 30 ? '...' : '' }}</span>
          <button type="button" class="btn btn-outline-danger btn-sm px-3 rounded-pill py-1.5" (click)="resetScanner()" [disabled]="isScanning">
            <i class="bi bi-trash-fill me-1"></i>Remove Image
          </button>
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
    .bg-gradient-ai {
      background: linear-gradient(90deg, #a5b4fc 0%, #f472b6 50%, #06b6d4 100%);
    }
    .border-dashed {
      border: 2px dashed rgba(255, 255, 255, 0.2);
    }
    .drag-drop-zone {
      background-color: rgba(255, 255, 255, 0.02);
    }
    .drag-drop-zone:hover, .drag-over {
      border-color: #6366f1;
      background-color: rgba(99, 102, 241, 0.05);
      transform: translateY(-2px);
    }
    .cursor-pointer {
      cursor: pointer;
    }
    .transition-all {
      transition: all 0.3s ease;
    }
    .animate-pulse {
      animation: pulse-ai 2s infinite;
    }
    @keyframes pulse-ai {
      0%, 100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(99, 102, 241, 0)); }
      50% { transform: scale(1.08); filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4)); }
    }
    
    /* Laser scanner line sweeping up and down */
    .laser-scanner-line {
      height: 4px;
      background: linear-gradient(90deg, transparent, #ef4444, #f43f5e, #ef4444, transparent);
      box-shadow: 0 0 12px #ef4444, 0 0 4px #ef4444;
      animation: scan-sweep 2.5s infinite linear;
      z-index: 10;
    }
    @keyframes scan-sweep {
      0% { top: 0%; }
      50% { top: 98%; }
      100% { top: 0%; }
    }
    
    .scanner-preview-box {
      border: 1px solid rgba(255, 255, 255, 0.1);
      background-color: rgba(255, 255, 255, 0.02);
    }
  `]
})
export class AIRecognitionComponent implements OnDestroy {
  @Output() scanComplete = new EventEmitter<AIRecognitionResult>();
  @Output() imageCleared = new EventEmitter<void>();
  @Input() initialImageSrc: string | null = null;

  imageSrc: string | null = null;
  fileName: string = '';
  isDragOver = false;
  isScanning = false;
  scanProgress = 0;
  currentScanLog = 'Initializing AI scanner...';
  
  private logCycleInterval: any;
  private progressInterval: any;
  private scanSubscription: Subscription | null = null;

  private scanLogs = [
    'Initializing AI scanner...',
    'Extracting image features...',
    'Loading CLIP zero-shot classification...',
    'Analyzing OpenCV dominant color clustering...',
    'Predicting brand logo signatures...',
    'Generating semantic descriptions...',
    'Finalizing classification...'
  ];

  constructor(private aiService: AIRecognitionService) {
    if (this.initialImageSrc) {
      this.imageSrc = this.initialImageSrc;
    }
  }

  ngOnDestroy(): void {
    this.clearScanningIntervals();
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.processFile(file);
    }
  }

  resetScanner(): void {
    this.clearScanningIntervals();
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe();
    }
    this.imageSrc = null;
    this.fileName = '';
    this.isScanning = false;
    this.scanProgress = 0;
    this.imageCleared.emit();
  }

  private processFile(file: File): void {
    this.fileName = file.name;
    this.isScanning = true;
    this.scanProgress = 0;
    this.currentScanLog = this.scanLogs[0];
    
    // Create image preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imageSrc = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Start UI scanning logs animation
    let logIdx = 0;
    this.logCycleInterval = setInterval(() => {
      logIdx = (logIdx + 1) % this.scanLogs.length;
      this.currentScanLog = this.scanLogs[logIdx];
    }, 600);

    // Simulate progress bar increment
    this.progressInterval = setInterval(() => {
      if (this.scanProgress < 90) {
        this.scanProgress += Math.floor(Math.random() * 8) + 2;
      }
    }, 200);

    // Call service to run image recognition
    this.scanSubscription = this.aiService.recognize(file).subscribe({
      next: (result) => {
        this.scanProgress = 100;
        setTimeout(() => {
          this.isScanning = false;
          this.clearScanningIntervals();
          this.scanComplete.emit({
            ...result,
            imageSrc: this.imageSrc || ''
          } as any);
        }, 400);
      },
      error: (err) => {
        console.error('Scan error', err);
        this.isScanning = false;
        this.clearScanningIntervals();
      }
    });
  }

  private clearScanningIntervals(): void {
    if (this.logCycleInterval) {
      clearInterval(this.logCycleInterval);
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }
}
