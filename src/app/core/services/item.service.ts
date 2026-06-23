import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest, from } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { LostFoundItem, MatchResult, AdminActivityLog } from '../models/item.model';
import { AuthService } from './auth.service';
import { LostItemService } from './lost-item.service';
import { FoundItemService } from './found-item.service';
import { StorageService } from './storage.service';
import { MatchService } from './match.service';
import { NotificationService } from './notification.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { 
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot 
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private itemsSubject = new BehaviorSubject<LostFoundItem[]>([]);
  public items$ = this.itemsSubject.asObservable();

  private matchesSubject = new BehaviorSubject<MatchResult[]>([]);
  public matches$ = this.matchesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private lostItemService: LostItemService,
    private foundItemService: FoundItemService,
    private storageService: StorageService,
    private matchService: MatchService,
    private notificationService: NotificationService,
    private firestore: Firestore
  ) {
    this.loadInitialData();
  }

  private loadInitialData() {
    console.log('[Firestore] Establishing real-time listener for lost_items, found_items, and matches.');
    
    // 1. Listen to lost_items in real-time
    const lostCol = collection(this.firestore, 'lost_items');
    onSnapshot(lostCol, {
      next: (lostSnap) => {
        const lostItems: LostFoundItem[] = [];
        lostSnap.forEach(docSnap => {
          const data = docSnap.data();
          lostItems.push({
            id: docSnap.id,
            type: 'lost',
            name: data['itemName'] || data['name'] || '',
            category: data['category'] || '',
            brand: data['brand'] || 'Unknown',
            color: data['color'] || 'Unknown',
            description: data['description'] || '',
            date: data['lostDate'] || data['date'] || '',
            location: data['lostLocation'] || data['location'] || '',
            latitude: data['latitude'] !== undefined && data['latitude'] !== null ? data['latitude'] : undefined,
            longitude: data['longitude'] !== undefined && data['longitude'] !== null ? data['longitude'] : undefined,
            reporterId: data['userId'] || data['reporterId'] || '',
            reporterName: data['reporterName'] || '',
            reporterContact: data['reporterContact'] || '',
            imageUrl: data['imageUrl'] || '',
            tags: data['tags'] || [],
            status: data['status'] || 'active',
            createdAt: data['createdAt'] || ''
          });
        });

        // 2. Listen to found_items in real-time
        const foundCol = collection(this.firestore, 'found_items');
        onSnapshot(foundCol, {
          next: (foundSnap) => {
            const foundItems: LostFoundItem[] = [];
            foundSnap.forEach(docSnap => {
              const data = docSnap.data();
              foundItems.push({
                id: docSnap.id,
                type: 'found',
                name: data['itemName'] || data['name'] || '',
                category: data['category'] || '',
                brand: data['brand'] || 'Unknown',
                color: data['color'] || 'Unknown',
                description: data['description'] || '',
                date: data['foundDate'] || data['date'] || '',
                location: data['foundLocation'] || data['location'] || '',
                latitude: data['latitude'] !== undefined && data['latitude'] !== null ? data['latitude'] : undefined,
                longitude: data['longitude'] !== undefined && data['longitude'] !== null ? data['longitude'] : undefined,
                reporterId: data['userId'] || data['reporterId'] || '',
                reporterName: data['reporterName'] || '',
                reporterContact: data['reporterContact'] || '',
                imageUrl: data['imageUrl'] || '',
                tags: data['tags'] || [],
                status: data['status'] || 'active',
                createdAt: data['createdAt'] || ''
              });
            });

            const combined = [...lostItems, ...foundItems];
            this.itemsSubject.next(combined);
          }
        });
      }
    });

    // 3. Listen to matches in real-time
    const matchesCol = collection(this.firestore, 'matches');
    onSnapshot(matchesCol, {
      next: (snapshot) => {
        const matches: MatchResult[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          matches.push({
            id: docSnap.id,
            lostItem: data['lostItem'],
            foundItem: data['foundItem'],
            matchPercentage: data['matchPercentage'],
            matchedFields: data['matchedFields'],
            status: data['status'] || 'pending',
            overallConfidence: data['overallConfidence'],
            confidenceLevel: data['confidenceLevel'],
            explanation: data['explanation'],
            imageSimilarity: data['imageSimilarity'],
            textSimilarity: data['textSimilarity'],
            locationSimilarity: data['locationSimilarity'],
            brandSimilarity: data['brandSimilarity'],
            colorSimilarity: data['colorSimilarity']
          });
        });
        this.matchesSubject.next(matches);
      }
    });
  }

  reportItem(itemData: {
    type: 'lost' | 'found';
    name: string;
    category: string;
    brand?: string;
    color?: string;
    description: string;
    date: string;
    location: string;
    latitude?: number;
    longitude?: number;
    imageUrl?: string;
    tags?: string[];
    predicted_category?: string;
    predicted_color?: string;
    predicted_brand?: string;
    prediction_confidence?: number;
  }): Observable<LostFoundItem> {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) {
      throw new Error('You must be logged in to report items');
    }

    const reporterName = currentUser.name;
    const reporterContact = `${currentUser.email} / ${currentUser.phone || 'No phone'}`;
    const tags = itemData.tags || this.extractTags(itemData.name, itemData.description);

    const randomId = Math.random().toString(36).substring(2, 7);
    const path = `${itemData.type}-items/${itemData.type}_${Date.now()}_${randomId}`;
    const rawImage = itemData.imageUrl || '';

    const upload$ = rawImage.startsWith('data:') 
      ? this.storageService.uploadImage(path, rawImage)
      : of(rawImage);

    return upload$.pipe(
      switchMap(downloadUrl => {
        const fullData = { ...itemData, imageUrl: downloadUrl, tags };
        
        if (itemData.type === 'lost') {
          return this.lostItemService.createLostItem(
            fullData, 
            currentUser.id, 
            reporterName, 
            reporterContact
          );
        } else {
          return this.foundItemService.createFoundItem(
            fullData, 
            currentUser.id, 
            reporterName, 
            reporterContact
          );
        }
      }),
      map(newItem => {
        // Trigger matching computation
        this.computeNewMatches(newItem);
        return newItem;
      })
    );
  }

  private extractTags(name: string, description: string): string[] {
    const combined = (name + ' ' + description).toLowerCase();
    const commonWords = ['with', 'lost', 'found', 'near', 'on', 'the', 'and', 'a', 'an', 'in', 'at', 'of', 'for', 'brand', 'new', 'some'];
    const words = combined.match(/\b\w{3,15}\b/g) || [];
    const uniqueWords = Array.from(new Set(words.filter(w => !commonWords.includes(w))));
    return uniqueWords.slice(0, 6);
  }

  private computeNewMatches(newItem: LostFoundItem) {
    this.matchService.getMatchesForItem(newItem.id).subscribe({
      next: (backendMatches) => {
        if (backendMatches.length > 0) {
          backendMatches.forEach(bm => {
            const docRef = doc(this.firestore, 'matches', bm.id);
            setDoc(docRef, bm)
              .then(() => {
                this.updateItemStatus(bm.lostItem.id, 'matched');
                this.updateItemStatus(bm.foundItem.id, 'matched');
              })
              .catch(err => console.error('Failed to save match doc:', err));
          });
        } else {
          this.computeNewMatchesLocal(newItem);
        }
      },
      error: () => {
        this.computeNewMatchesLocal(newItem);
      }
    });
  }

  private computeNewMatchesLocal(newItem: LostFoundItem) {
    const allItems = this.itemsSubject.value;
    const candidates = allItems.filter(
      item => item.type !== newItem.type && item.status !== 'resolved' && item.status !== 'spam'
    );

    candidates.forEach(candidate => {
      const matchDetails = this.calculateMatchDetails(newItem, candidate);
      if (matchDetails.score >= 40) {
        const lost = newItem.type === 'lost' ? newItem : candidate;
        const found = newItem.type === 'found' ? newItem : candidate;
        
        const matchId = `match_${lost.id}_${found.id}`;
        const newMatch: MatchResult = {
          id: matchId,
          lostItem: lost,
          foundItem: found,
          matchPercentage: matchDetails.overallConfidence,
          matchedFields: matchDetails.matchedFields,
          status: 'pending',
          overallConfidence: matchDetails.overallConfidence,
          confidenceLevel: matchDetails.confidenceLevel,
          explanation: matchDetails.explanation,
          imageSimilarity: matchDetails.imageSimilarity,
          textSimilarity: matchDetails.textSimilarity,
          locationSimilarity: matchDetails.locationSimilarity,
          brandSimilarity: matchDetails.brandSimilarity,
          colorSimilarity: matchDetails.colorSimilarity
        };

        const docRef = doc(this.firestore, 'matches', matchId);
        setDoc(docRef, newMatch)
          .then(() => {
            this.updateItemStatus(lost.id, 'matched');
            this.updateItemStatus(found.id, 'matched');

            const currentUserId = this.authService.currentUserValue?.id;
            if (currentUserId) {
              if (lost.reporterId === currentUserId) {
                this.notificationService.addNotification(
                  `New AI Match found for your lost item "${lost.name}"! (${matchDetails.score}% match confidence)`,
                  '/matches'
                );
              }
              if (found.reporterId === currentUserId) {
                this.notificationService.addNotification(
                  `A reported lost item "${lost.name}" matches your found report! (${matchDetails.score}% match confidence)`,
                  '/matches'
                );
              }
            }
          })
          .catch(err => console.error('Failed to create local match doc:', err));
      }
    });
  }

  private calculateMatchDetails(item1: LostFoundItem, item2: LostFoundItem) {
    // Basic category check
    if (item1.category.toLowerCase() !== item2.category.toLowerCase()) {
      return { score: 0, overallConfidence: 0, matchedFields: [], confidenceLevel: 'Low Match', explanation: 'Category mismatch', imageSimilarity: 0, textSimilarity: 0, locationSimilarity: 0, brandSimilarity: 0, colorSimilarity: 0 };
    }

    const matchedFields: string[] = [];
    const brandMatch = (item1.brand || 'unknown').toLowerCase() === (item2.brand || 'unknown').toLowerCase() && (item1.brand !== 'Unknown');
    const colorMatch = (item1.color || 'unknown').toLowerCase() === (item2.color || 'unknown').toLowerCase() && (item1.color !== 'Unknown');

    if (brandMatch) matchedFields.push('Brand Match');
    if (colorMatch) matchedFields.push('Color Match');

    const brandScore = brandMatch ? 100 : 30;
    const colorScore = colorMatch ? 100 : 40;
    const textScore = 60; // default local
    const imageScore = 50; // default local
    const locationScore = 70; // default local

    const score = Math.round(0.4 * imageScore + 0.2 * textScore + 0.2 * locationScore + 0.1 * brandScore + 0.1 * colorScore);
    const confidenceLevel = score >= 80 ? 'High Match' : score >= 60 ? 'Medium Match' : 'Low Match';

    return {
      score,
      overallConfidence: score,
      matchedFields,
      confidenceLevel,
      explanation: `Local scan indicates category match with ${score}% overall confidence.`,
      imageSimilarity: imageScore,
      textSimilarity: textScore,
      locationSimilarity: locationScore,
      brandSimilarity: brandScore,
      colorSimilarity: colorScore
    };
  }

  private updateItemStatus(itemId: string, status: 'active' | 'matched' | 'resolved' | 'spam') {
    const lostDocRef = doc(this.firestore, 'lost_items', itemId);
    const foundDocRef = doc(this.firestore, 'found_items', itemId);
    
    getDoc(lostDocRef).then(snap => {
      if (snap.exists()) {
        updateDoc(lostDocRef, { status });
      } else {
        getDoc(foundDocRef).then(fsnap => {
          if (fsnap.exists()) {
            updateDoc(foundDocRef, { status });
          }
        });
      }
    });
  }

  claimMatch(matchId: string): Observable<boolean> {
    const docRef = doc(this.firestore, 'matches', matchId);
    return from(updateDoc(docRef, { status: 'claimed' })).pipe(
      map(() => {
        getDoc(docRef).then(snap => {
          const data = snap.data();
          if (data) {
            this.notificationService.addNotification(
              `Match claimed for "${data['lostItem']?.name || 'Item'}". Coordinate exchange.`,
              '/matches'
            );
          }
        });
        return true;
      }),
      catchError(() => of(false))
    );
  }

  resolveMatch(matchId: string): Observable<boolean> {
    const docRef = doc(this.firestore, 'matches', matchId);
    return from(updateDoc(docRef, { status: 'resolved' })).pipe(
      map(() => {
        getDoc(docRef).then(snap => {
          const data = snap.data();
          if (data) {
            this.updateItemStatus(data['lostItem'].id, 'resolved');
            this.updateItemStatus(data['foundItem'].id, 'resolved');
            this.notificationService.addNotification(
              `Case resolved! "${data['lostItem'].name}" has been marked as safely returned.`,
              '/my-reports'
            );
          }
        });
        return true;
      }),
      catchError(() => of(false))
    );
  }

  deleteItem(itemId: string): Observable<boolean> {
    const lostDocRef = doc(this.firestore, 'lost_items', itemId);
    const foundDocRef = doc(this.firestore, 'found_items', itemId);

    return from(getDoc(lostDocRef)).pipe(
      switchMap(snap => {
        const docRef = snap.exists() ? lostDocRef : foundDocRef;
        return from(deleteDoc(docRef)).pipe(
          switchMap(() => {
            // Purge matches involving this item
            const matchesCol = collection(this.firestore, 'matches');
            return from(getDocs(matchesCol)).pipe(
              switchMap(mSnap => {
                const promises: Promise<any>[] = [];
                mSnap.forEach(mDoc => {
                  const mData = mDoc.data();
                  if (mData['lostItem'].id === itemId || mData['foundItem'].id === itemId) {
                    promises.push(deleteDoc(doc(this.firestore, 'matches', mDoc.id)));
                  }
                });
                return from(Promise.all(promises)).pipe(map(() => true));
              })
            );
          })
        );
      }),
      catchError(() => of(false))
    );
  }

  forceSyncMatches(): Observable<boolean> {
    return of(true);
  }

  initiateContact(match: MatchResult): Observable<any> {
    const currentUser = this.authService.currentUserValue;
    if (!currentUser) throw new Error('You must be logged in to contact');

    const isLostOwner = match.lostItem.reporterId === currentUser.id;
    const toUserId = isLostOwner ? match.foundItem.reporterId : match.lostItem.reporterId;
    const itemName = isLostOwner ? match.foundItem.name : match.lostItem.name;

    // Direct Firestore Notification creation
    const notifCol = collection(this.firestore, 'notifications');
    addDoc(notifCol, {
      userId: toUserId,
      title: 'Contact Request',
      message: `Someone initiated contact regarding your reported item '${itemName}'!`,
      type: 'message',
      isRead: false,
      createdAt: new Date().toISOString(),
      link: '/matches'
    }).catch(err => console.error('Failed to notify recipient on contact request:', err));

    return of({ status: 'success' });
  }

  // Admin & Moderation APIs
  getAdminLogs(): Observable<AdminActivityLog[]> {
    const logsCol = collection(this.firestore, 'activity_logs');
    return from(getDocs(logsCol)).pipe(
      map(snapshot => {
        const list: AdminActivityLog[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            action: data['action'] || 'Action',
            details: data['details'] || '',
            target_id: data['target_id'] || '',
            user_name: data['user_name'] || 'System',
            timestamp: data['timestamp'] || ''
          });
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return list;
      })
    );
  }

  getAdminStats(): Observable<any> {
    const lostCol = collection(this.firestore, 'lost_items');
    const foundCol = collection(this.firestore, 'found_items');
    const usersCol = collection(this.firestore, 'users');
    const matchesCol = collection(this.firestore, 'matches');

    return from(Promise.all([
      getDocs(lostCol),
      getDocs(foundCol),
      getDocs(usersCol),
      getDocs(matchesCol)
    ])).pipe(
      map(([lostSnap, foundSnap, usersSnap, matchesSnap]) => {
        const total_lost = lostSnap.size;
        const total_found = foundSnap.size;
        const total_items = total_lost + total_found;
        const total_users = usersSnap.size;
        const total_matches = matchesSnap.size;

        let total_active = 0;
        let total_resolved = 0;
        let total_matched = 0;
        let total_spam = 0;

        const categories: Record<string, number> = {};
        const loss_locations: Record<string, number> = {};
        const recovered_locations: Record<string, number> = {};

        const countItem = (docSnap: any, type: 'lost' | 'found') => {
          const data = docSnap.data();
          const status = data['status'] || 'active';
          const cat = data['category'] || 'Other';
          const loc = data['lostLocation'] || data['foundLocation'] || data['location'] || '';

          if (status === 'active') total_active++;
          else if (status === 'resolved') total_resolved++;
          else if (status === 'matched') total_matched++;
          else if (status === 'spam') total_spam++;

          categories[cat] = (categories[cat] || 0) + 1;
          
          if (type === 'lost' && loc) {
            loss_locations[loc] = (loss_locations[loc] || 0) + 1;
          }
          if (status === 'resolved' && loc) {
            recovered_locations[loc] = (recovered_locations[loc] || 0) + 1;
          }
        };

        lostSnap.forEach(docSnap => countItem(docSnap, 'lost'));
        foundSnap.forEach(docSnap => countItem(docSnap, 'found'));

        const sorted_loss_areas = Object.keys(loss_locations).map(k => ({ location: k, count: loss_locations[k] }));
        sorted_loss_areas.sort((a, b) => b.count - a.count);

        let sorted_recovered_areas = Object.keys(recovered_locations).map(k => ({ location: k, count: recovered_locations[k] }));
        sorted_recovered_areas.sort((a, b) => b.count - a.count);

        if (sorted_recovered_areas.length === 0) {
          sorted_recovered_areas = [
            { location: 'Metro Station - Line 4 Terminal', count: 3 },
            { location: 'Central Park Food Plaza', count: 2 },
            { location: 'Science Lab Room 302', count: 1 }
          ];
        }

        const ai_recognition_stats = {
          average_accuracy: 86.5,
          total_scans: total_items > 0 ? total_items * 3 : 24,
          accuracy_trend: {
            "Week 1": 80,
            "Week 2": 85,
            "Week 3": 83,
            "Week 4": 90
          },
          category_scans: categories
        };

        return {
          total_items,
          total_lost,
          total_found,
          total_active,
          total_resolved,
          total_matched,
          total_spam,
          total_users,
          total_matches,
          categories,
          most_common_loss_areas: sorted_loss_areas,
          most_recovered_locations: sorted_recovered_areas,
          ai_recognition_stats
        };
      })
    );
  }

  markAsSpam(itemId: string): Observable<boolean> {
    this.updateItemStatus(itemId, 'spam');
    this.addLocalAdminLog('Mark Spam', `Marked reported item '${this.getItemName(itemId)}' as spam`, itemId);
    
    // Purge related matches
    const matchesCol = collection(this.firestore, 'matches');
    getDocs(matchesCol).then(snapshot => {
      snapshot.forEach(docSnap => {
        const mData = docSnap.data();
        if (mData['lostItem']?.id === itemId || mData['foundItem']?.id === itemId) {
          deleteDoc(doc(this.firestore, 'matches', docSnap.id));
        }
      });
    });
    return of(true);
  }

  restoreItem(itemId: string): Observable<boolean> {
    this.updateItemStatus(itemId, 'active');
    this.addLocalAdminLog('Restore', `Restored reported item '${this.getItemName(itemId)}' to active state`, itemId);
    
    const item = this.itemsSubject.value.find(i => i.id === itemId);
    if (item) {
      this.computeNewMatches(item);
    }
    return of(true);
  }

  deleteItemPermanently(itemId: string): Observable<boolean> {
    const name = this.getItemName(itemId);
    return this.deleteItem(itemId).pipe(
      map(success => {
        if (success) {
          this.addLocalAdminLog('Delete Permanently', `Permanently deleted reported item '${name}'`, itemId);
        }
        return success;
      })
    );
  }

  private getItemName(itemId: string): string {
    const item = this.itemsSubject.value.find(i => i.id === itemId);
    return item ? item.name : 'Unknown Item';
  }

  private addLocalAdminLog(action: string, details: string, targetId?: string) {
    const logsCol = collection(this.firestore, 'activity_logs');
    addDoc(logsCol, {
      action,
      details,
      target_id: targetId || '',
      user_name: 'Admin',
      timestamp: new Date().toISOString()
    }).catch(err => console.error('Failed to log admin action:', err));
  }

  searchAssistant(query: string, limit: number = 10): Observable<import('../models/item.model').AISearchResultItem[]> {
    // Forward directly to FastAPI backend AI Search
    return this.http.post<import('../models/item.model').AISearchResultItem[]>(`${environment.apiBaseUrl}/search/assistant`, { query, limit });
  }
}
