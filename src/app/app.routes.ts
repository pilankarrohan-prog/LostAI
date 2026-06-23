import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { unauthGuard } from './core/guards/unauth.guard';

export const routes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) 
  },
  { 
    path: 'login', 
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [unauthGuard]
  },
  { 
    path: 'register', 
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [unauthGuard]
  },
  { 
    path: 'dashboard', 
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'report-lost', 
    loadComponent: () => import('./pages/report-lost/report-lost.component').then(m => m.ReportLostComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'report-found', 
    loadComponent: () => import('./pages/report-found/report-found.component').then(m => m.ReportFoundComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'matches', 
    loadComponent: () => import('./pages/match-results/match-results.component').then(m => m.MatchResultsComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'my-reports', 
    loadComponent: () => import('./pages/my-reports/my-reports.component').then(m => m.MyReportsComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'profile', 
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'notifications', 
    loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'chat', 
    loadComponent: () => import('./pages/chat/chat.component').then(m => m.ChatComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'verification/:id', 
    loadComponent: () => import('./pages/verification/verification.component').then(m => m.VerificationComponent),
    canActivate: [authGuard] 
  },
  { 
    path: 'not-found', 
    loadComponent: () => import('./pages/not-found/not-found.component').then(m => m.NotFoundComponent)
  },
  { 
    path: '**', 
    redirectTo: 'not-found' 
  }
];
