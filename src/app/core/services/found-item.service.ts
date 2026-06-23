import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { LostFoundItem } from '../models/item.model';
import { Firestore, collection, getDocs, deleteDoc, doc, setDoc } from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FoundItemService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient, private firestore: Firestore) {}

  getFoundItems(): Observable<LostFoundItem[]> {
    const foundCollection = collection(this.firestore, 'found_items');
    return from(getDocs(foundCollection)).pipe(
      map(snapshot => {
        const items: LostFoundItem[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          items.push({
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
        return items;
      })
    );
  }

  createFoundItem(
    itemData: Omit<LostFoundItem, 'id' | 'createdAt' | 'status' | 'type' | 'reporterId' | 'reporterName' | 'reporterContact'>, 
    reporterId: string, 
    reporterName: string, 
    reporterContact: string
  ): Observable<LostFoundItem> {
    
    // Prepare FormData payload for FastAPI multipart request
    const formData = new FormData();
    formData.append('name', itemData.name);
    formData.append('category', itemData.category);
    formData.append('brand', itemData.brand || 'Unknown');
    formData.append('color', itemData.color || 'Unknown');
    formData.append('description', itemData.description);
    formData.append('date', itemData.date);
    formData.append('location', itemData.location);
    formData.append('reporter_id', reporterId);
    if (itemData.latitude !== undefined && itemData.latitude !== null) {
      formData.append('latitude', itemData.latitude.toString());
    }
    if (itemData.longitude !== undefined && itemData.longitude !== null) {
      formData.append('longitude', itemData.longitude.toString());
    }
    if (itemData.predicted_category) {
      formData.append('predicted_category', itemData.predicted_category);
    }
    if (itemData.predicted_color) {
      formData.append('predicted_color', itemData.predicted_color);
    }
    if (itemData.predicted_brand) {
      formData.append('predicted_brand', itemData.predicted_brand);
    }
    if (itemData.prediction_confidence !== undefined && itemData.prediction_confidence !== null) {
      formData.append('prediction_confidence', itemData.prediction_confidence.toString());
    }

    const fallback1x1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const imageToUse = (itemData.imageUrl && itemData.imageUrl.startsWith('data:')) ? itemData.imageUrl : fallback1x1;

    try {
      const blob = this.dataURLtoBlob(imageToUse);
      const cleanName = itemData.name.replace(/[^a-zA-Z0-9]/g, '_');
      formData.append('image', blob, `${cleanName}_found.png`);
    } catch (e) {
      console.warn('Failed to convert base64 image data to Blob file, using empty blob fallback.', e);
      const dummyBlob = new Blob([''], { type: 'image/png' });
      formData.append('image', dummyBlob, 'placeholder.png');
    }

    // Call FastAPI post endpoint
    return this.http.post<any>(`${this.apiBaseUrl}/found-item`, formData).pipe(
      switchMap(res => {
        const newItem: LostFoundItem = {
          id: res.id,
          type: 'found',
          name: res.name,
          category: res.category,
          brand: res.brand,
          color: res.color,
          description: res.description,
          date: res.date,
          location: res.location,
          latitude: res.latitude,
          longitude: res.longitude,
          reporterId: res.reporter_id || reporterId,
          reporterName,
          reporterContact,
          imageUrl: (itemData.imageUrl && !itemData.imageUrl.startsWith('data:')) ? itemData.imageUrl : res.image_url,
          tags: res.tags || [],
          status: res.status || 'active',
          createdAt: res.created_at
        };

        return this.saveToFirestore(newItem);
      }),
      catchError(err => {
        console.warn('FastAPI backend post /found-item failed or offline. Saving to Firestore directly.', err);
        const fallbackId = 'item_' + Math.random().toString(36).substring(2, 11);
        const fallbackItem: LostFoundItem = {
          id: fallbackId,
          type: 'found',
          name: itemData.name,
          category: itemData.category,
          brand: itemData.brand || 'Unknown',
          color: itemData.color || 'Unknown',
          description: itemData.description,
          date: itemData.date,
          location: itemData.location,
          latitude: itemData.latitude,
          longitude: itemData.longitude,
          reporterId,
          reporterName,
          reporterContact,
          imageUrl: itemData.imageUrl || '',
          tags: itemData.tags || [],
          status: 'active',
          createdAt: new Date().toISOString()
        };
        return this.saveToFirestore(fallbackItem);
      })
    );
  }

  private saveToFirestore(item: LostFoundItem): Observable<LostFoundItem> {
    const docRef = doc(this.firestore, 'found_items', item.id);
    const firestoreData = {
      id: item.id,
      userId: item.reporterId,
      itemName: item.name,
      category: item.category,
      brand: item.brand,
      color: item.color,
      description: item.description,
      foundDate: item.date,
      foundLocation: item.location,
      latitude: item.latitude !== undefined ? item.latitude : null,
      longitude: item.longitude !== undefined ? item.longitude : null,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt,
      status: item.status,
      reporterName: item.reporterName,
      reporterContact: item.reporterContact,
      tags: item.tags
    };

    return from(setDoc(docRef, firestoreData)).pipe(
      map(() => item)
    );
  }

  deleteFoundItem(id: string): Observable<boolean> {
    const docRef = doc(this.firestore, 'found_items', id);
    return from(deleteDoc(docRef)).pipe(
      map(() => true),
      catchError(err => {
        console.error('Firestore delete found item failed:', err);
        return of(false);
      })
    );
  }

  private dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[2] !== undefined ? arr[2] : arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
