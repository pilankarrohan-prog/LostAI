import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private apiLoadedSubject = new BehaviorSubject<boolean>(false);
  public apiLoaded$ = this.apiLoadedSubject.asObservable();

  constructor() {
    this.loadGoogleMapsApi();
  }

  private loadGoogleMapsApi(): void {
    if (typeof window !== 'undefined' && (window as any).google && (window as any).google.maps) {
      this.apiLoadedSubject.next(true);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    // Define global callback
    (window as any).initGoogleMapsApiCallback = () => {
      this.apiLoadedSubject.next(true);
    };

    // Inject Google Maps SDK script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?callback=initGoogleMapsApiCallback`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.warn('Google Maps API failed to load. Operating in local fallback AI Location Visualizer mode.');
      this.apiLoadedSubject.next(false);
    };

    document.head.appendChild(script);
  }
}
