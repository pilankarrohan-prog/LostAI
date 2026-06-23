import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { LostFoundItem, MatchResult } from '../models/item.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MatchService {
  private apiUrl = environment.apiBaseUrl;

  private isApiOnlineSubject = new BehaviorSubject<boolean>(false);
  public isApiOnline$ = this.isApiOnlineSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkApiStatus().subscribe();
  }

  /**
   * Performs a health check ping to the backend endpoint.
   */
  checkApiStatus(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/`, { observe: 'response' }).pipe(
      map(res => {
        const isUp = res.status === 200;
        this.isApiOnlineSubject.next(isUp);
        return isUp;
      }),
      catchError(() => {
        this.isApiOnlineSubject.next(false);
        return of(false);
      })
    );
  }

  /**
   * Fetch potential matches from the FastAPI backend for a given item.
   * Maps response schemas and handles fallback gracefully.
   */
  getMatchesForItem(itemId: string): Observable<MatchResult[]> {
    return this.http.get<{ target_item: any, matches: any[] }>(`${this.apiUrl}/matches/${itemId}`).pipe(
      map(res => {
        this.isApiOnlineSubject.next(true);
        const target = res.target_item;
        return res.matches.map(cand => {
          const lost = target.type === 'lost' ? target : cand.item;
          const found = target.type === 'found' ? target : cand.item;
          
          // Reconstruct matching fields
          return {
            id: `match_${lost.id}_${found.id}`,
            lostItem: this.mapBackendToFrontendItem(lost),
            foundItem: this.mapBackendToFrontendItem(found),
            matchPercentage: cand.overallConfidence,
            matchedFields: cand.matched_fields,
            status: 'pending',
            overallConfidence: cand.overallConfidence,
            confidenceLevel: cand.confidenceLevel,
            explanation: cand.explanation,
            imageSimilarity: cand.imageSimilarity,
            textSimilarity: cand.textSimilarity,
            locationSimilarity: cand.locationSimilarity,
            brandSimilarity: cand.brandSimilarity,
            colorSimilarity: cand.colorSimilarity
          } as MatchResult;
        });
      }),
      catchError(err => {
        this.isApiOnlineSubject.next(false);
        // Graceful error logging (doesn't crash frontend)
        console.warn(`FastAPI matching server is offline or returned an error for item ${itemId}. Operating in local AI emulation mode.`, err);
        return of([] as MatchResult[]);
      })
    );
  }

  private mapBackendToFrontendItem(backendItem: any): LostFoundItem {
    // Attempt to enrich with local reporter info if available
    let reporterId = 'system';
    let reporterName = 'System Demo';
    let reporterContact = 'system@lostai.com';

    const localItemsJson = localStorage.getItem('lostai_items');
    if (localItemsJson) {
      try {
        const localItems = JSON.parse(localItemsJson) as LostFoundItem[];
        const local = localItems.find(i => i.id === backendItem.id);
        if (local) {
          reporterId = local.reporterId;
          reporterName = local.reporterName;
          reporterContact = local.reporterContact;
        }
      } catch (e) {}
    }

    return {
      id: backendItem.id,
      type: backendItem.type,
      name: backendItem.name,
      category: backendItem.category,
      brand: backendItem.brand,
      color: backendItem.color,
      description: backendItem.description,
      date: backendItem.date,
      location: backendItem.location,
      latitude: backendItem.latitude,
      longitude: backendItem.longitude,
      reporterId: backendItem.reporterId || reporterId,
      reporterName: backendItem.reporterName || reporterName,
      reporterContact: backendItem.reporterContact || reporterContact,
      imageUrl: backendItem.image_url || 'https://images.unsplash.com/photo-1555421689-491a97ff2040?auto=format&fit=crop&w=400&q=80',
      tags: backendItem.tags || [],
      status: backendItem.status || 'active',
      createdAt: backendItem.created_at
    };
  }

  initiateContact(matchId: string, fromUserId: string, toUserId: string, itemName: string): Observable<any> {
    const formData = new FormData();
    formData.append('match_id', matchId);
    formData.append('from_user_id', fromUserId);
    formData.append('to_user_id', toUserId);
    formData.append('item_name', itemName);

    return this.http.post<any>(`${this.apiUrl}/matches/contact`, formData);
  }
}
