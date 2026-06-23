import { Component, Input, OnInit, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../../core/services/map.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper border border-secondary rounded shadow-sm overflow-hidden position-relative" style="min-height: 250px; height: 100%;">
      <div *ngIf="apiLoaded; else fallbackMap" #mapContainer class="w-100 h-100" style="min-height: 250px;"></div>
      
      <ng-template #fallbackMap>
        <!-- Mock Map visualization grid -->
        <div class="fallback-map-container w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3 text-center position-relative" style="min-height: 250px; height: 100%;">
          <div class="map-grid-overlay"></div>
          
          <div class="z-index-1 mb-2">
            <i class="bi bi-map text-gradient-ai display-6"></i>
          </div>
          
          <div class="small fw-semibold text-white mb-1 z-index-1">AI Location Proximity Map</div>
          <div class="text-muted small mb-3 z-index-1 px-4">
            Distance: <span class="text-cyan fw-bold">{{ formattedDistance }} km</span>
          </div>

          <!-- Side-by-side coordinates display -->
          <div class="d-flex justify-content-center gap-3 w-100 px-3 z-index-1 flex-wrap">
            <div class="card bg-dark bg-opacity-70 border-danger border-opacity-30 p-2 text-start flex-fill" style="min-width: 130px; font-size: 0.8rem;">
              <span class="text-danger fw-bold"><i class="bi bi-x-circle me-1"></i>Lost Coordinates</span>
              <span class="text-muted mt-1 d-block">{{ lostLat.toFixed(5) }}, {{ lostLng.toFixed(5) }}</span>
            </div>
            <div class="card bg-dark bg-opacity-70 border-info border-opacity-30 p-2 text-start flex-fill" style="min-width: 130px; font-size: 0.8rem;">
              <span class="text-cyan fw-bold"><i class="bi bi-check-circle me-1"></i>Found Coordinates</span>
              <span class="text-muted mt-1 d-block">{{ foundLat.toFixed(5) }}, {{ foundLng.toFixed(5) }}</span>
            </div>
          </div>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .fallback-map-container {
      background: radial-gradient(circle at center, #1b1b32 0%, #080810 100%);
      overflow: hidden;
    }
    .map-grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
      background-size: 15px 15px;
      opacity: 0.7;
    }
    .z-index-1 {
      z-index: 1;
    }
    .text-cyan {
      color: var(--secondary);
    }
    .text-gradient-ai {
      background: linear-gradient(135deg, #a5b4fc 0%, #f472b6 50%, #06b6d4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
  `]
})
export class MapComponent implements OnInit, OnChanges {
  @Input() lostLat = 40.7829;
  @Input() lostLng = -73.9654;
  @Input() foundLat = 40.7580;
  @Input() foundLng = -73.9855;

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  apiLoaded = false;
  formattedDistance = '0.00';
  mapObj: any = null;

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    this.mapService.apiLoaded$.subscribe(loaded => {
      this.apiLoaded = loaded;
      if (loaded) {
        setTimeout(() => this.initMap(), 100);
      }
    });
    this.updateDistance();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.updateDistance();
    if (this.apiLoaded) {
      this.initMap();
    }
  }

  private updateDistance(): void {
    const dist = this.calculateDistance(this.lostLat, this.lostLng, this.foundLat, this.foundLng);
    this.formattedDistance = dist.toFixed(2);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private initMap(): void {
    if (!this.mapContainer || !this.apiLoaded) return;

    try {
      const google = (window as any).google;
      const mapOptions = {
        center: { lat: (this.lostLat + this.foundLat) / 2, lng: (this.lostLng + this.foundLng) / 2 },
        zoom: 13,
        disableDefaultUI: false,
        zoomControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1f1f2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1f1f2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8c8ca3' }] },
          {
            featureType: 'administrative.locality',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#c084fc' }]
          },
          {
            featureType: 'poi',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#a78bfa' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry',
            stylers: [{ color: '#2e2e42' }]
          },
          {
            featureType: 'road',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#1e1e2f' }]
          },
          {
            featureType: 'road',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#6b7280' }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#0f172a' }]
          }
        ]
      };

      const map = new google.maps.Map(this.mapContainer.nativeElement, mapOptions);
      this.mapObj = map;

      const lostPos = { lat: this.lostLat, lng: this.lostLng };
      const foundPos = { lat: this.foundLat, lng: this.foundLng };

      // Lost Marker
      new google.maps.Marker({
        position: lostPos,
        map: map,
        title: 'Lost Location',
        icon: {
          path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#ef4444',
          fillOpacity: 1.0,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        }
      });

      // Found Marker
      new google.maps.Marker({
        position: foundPos,
        map: map,
        title: 'Found Location',
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#06b6d4',
          fillOpacity: 1.0,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        }
      });

      // Geodesic connector line
      new google.maps.Polyline({
        path: [lostPos, foundPos],
        geodesic: true,
        strokeColor: '#d946ef',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: map
      });

      // Fit map boundary zoom
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(lostPos);
      bounds.extend(foundPos);
      map.fitBounds(bounds);
    } catch (e) {
      console.error('Error rendering Google Map:', e);
    }
  }
}
