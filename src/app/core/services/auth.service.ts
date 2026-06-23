import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { User } from '../models/user.model';
import { 
  Auth, 
  authState,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as firebaseUpdateProfile 
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc 
} from '@angular/fire/firestore';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private auth: Auth, 
    private firestore: Firestore,
    private storageService: StorageService
  ) {
    this.loadSession();
  }

  private loadSession() {
    authState(this.auth).subscribe({
      next: async (fbUser) => {
        if (fbUser) {
          const userDocRef = doc(this.firestore, 'users', fbUser.uid);
          let role = 'user';
          let avatarUrl = fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
          let status = 'active';
          let name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
          let phone = '';

          try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              const data = docSnap.data();
              role = data['role'] || 'user';
              avatarUrl = data['profileImage'] || avatarUrl;
              status = data['status'] || 'active';
              name = data['name'] || name;
              phone = data['phone'] || phone;
            } else {
              // Create user profile in Firestore if it doesn't exist
              const initialRole = fbUser.email === 'admin@example.com' ? 'admin' : 'user';
              await setDoc(userDocRef, {
                uid: fbUser.uid,
                name,
                email: fbUser.email,
                role: initialRole,
                status: 'active',
                createdAt: new Date().toISOString(),
                profileImage: avatarUrl
              });
              role = initialRole;
            }
          } catch (e) {
            console.error('Error fetching/setting user profile in Firestore:', e);
          }

          const user: User = {
            id: fbUser.uid,
            name,
            email: fbUser.email || '',
            phone,
            avatarUrl,
            notificationsEnabled: true,
            role: role as 'user' | 'admin'
          };
          this.currentUserSubject.next(user);
        } else {
          this.currentUserSubject.next(null);
        }
      },
      error: (err) => {
        console.error('Auth state change error:', err);
        this.currentUserSubject.next(null);
      }
    });
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async (credential) => {
        const fbUser = credential.user;
        const userDocRef = doc(this.firestore, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        let role = 'user';
        let avatarUrl = fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
        let name = fbUser.displayName || fbUser.email?.split('@')[0] || 'User';
        let phone = '';

        if (docSnap.exists()) {
          const data = docSnap.data();
          role = data['role'] || 'user';
          avatarUrl = data['profileImage'] || avatarUrl;
          name = data['name'] || name;
          phone = data['phone'] || phone;
        }

        const user: User = {
          id: fbUser.uid,
          name,
          email: fbUser.email || '',
          phone,
          avatarUrl,
          notificationsEnabled: true,
          role: role as 'user' | 'admin'
        };
        
        this.currentUserSubject.next(user);
        return user;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Login failed.')))
    );
  }

  register(name: string, email: string, phone: string, password: string): Observable<User> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((credential) => {
        const fbUser = credential.user;
        const defaultAvatar = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80`;

        return from(firebaseUpdateProfile(fbUser, {
          displayName: name,
          photoURL: defaultAvatar
        })).pipe(
          switchMap(async () => {
            const userDocRef = doc(this.firestore, 'users', fbUser.uid);
            const role = email === 'admin@example.com' ? 'admin' : 'user';
            
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              name,
              email: fbUser.email,
              phone,
              role,
              status: 'active',
              createdAt: new Date().toISOString(),
              profileImage: defaultAvatar
            });

            const user: User = {
              id: fbUser.uid,
              name,
              email: fbUser.email || '',
              phone,
              avatarUrl: defaultAvatar,
              notificationsEnabled: true,
              role: role as 'user' | 'admin'
            };

            this.currentUserSubject.next(user);
            return user;
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Registration failed.')))
    );
  }

  logout(): void {
    signOut(this.auth).then(() => {
      this.currentUserSubject.next(null);
    });
  }

  updateProfile(updatedUser: Partial<User>): Observable<User> {
    const current = this.currentUserValue;
    if (!current) {
      return throwError(() => new Error('No user is currently logged in.'));
    }

    const updated: User = { ...current, ...updatedUser };

    if (this.auth.currentUser) {
      const updates: any = {};
      if (updatedUser.name) updates.displayName = updatedUser.name;
      if (updatedUser.avatarUrl) updates.photoURL = updatedUser.avatarUrl;

      return from(firebaseUpdateProfile(this.auth.currentUser, updates)).pipe(
        switchMap(async () => {
          const userDocRef = doc(this.firestore, 'users', current.id);
          const firestoreUpdates: any = {};
          if (updatedUser.name) firestoreUpdates.name = updatedUser.name;
          if (updatedUser.avatarUrl) firestoreUpdates.profileImage = updatedUser.avatarUrl;
          if (updatedUser.phone) firestoreUpdates.phone = updatedUser.phone;

          await updateDoc(userDocRef, firestoreUpdates);
          this.currentUserSubject.next(updated);
          return updated;
        }),
        catchError(err => throwError(() => new Error(err.message || 'Profile update failed.')))
      );
    }

    return throwError(() => new Error('No Firebase user session.'));
  }

  resetAllData(): void {
    signOut(this.auth);
    this.currentUserSubject.next(null);
  }

  uploadProfileImage(userId: string, base64Data: string): Observable<string> {
    const path = `profiles/avatar_${userId}_${Date.now()}`;
    return this.storageService.uploadImage(path, base64Data);
  }
}
