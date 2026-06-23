import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * Uploads an image (Base64 string) to the FastAPI upload server.
   * @param path The path of the file (used to derive filename).
   * @param base64Data The image string (data:image/jpeg;base64,...)
   */
  uploadImage(path: string, base64Data: string): Observable<string> {
    const blob = this.dataURLtoBlob(base64Data);
    const filename = this.getFilenameFromPath(path) || 'upload.png';
    const formData = new FormData();
    formData.append('file', blob, filename);

    return this.http.post<{ file_url: string }>(`${this.apiBaseUrl}/upload`, formData).pipe(
      map(res => res.file_url)
    );
  }

  private getFilenameFromPath(path: string): string {
    if (!path) return 'upload.png';
    const parts = path.split('/');
    const base = parts[parts.length - 1];
    return base.indexOf('.') > -1 ? base : `${base}.png`;
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
