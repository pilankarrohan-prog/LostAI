import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<'dark' | 'light'>('dark');
  public theme$ = this.themeSubject.asObservable();

  constructor(@Inject(DOCUMENT) private document: Document) {
    const savedTheme = localStorage.getItem('lostai_theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    this.setTheme(initialTheme);
  }

  public get currentTheme(): 'dark' | 'light' {
    return this.themeSubject.value;
  }

  public toggleTheme(): void {
    const nextTheme = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  private setTheme(theme: 'dark' | 'light'): void {
    this.themeSubject.next(theme);
    localStorage.setItem('lostai_theme', theme);
    
    const body = this.document.body;
    if (theme === 'light') {
      body.classList.add('light-mode');
    } else {
      body.classList.remove('light-mode');
    }
  }
}
