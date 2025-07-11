'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/auth-store';
import { DashboardView } from '../lib/stores/ui-store';
import Header from './Header';
import Sidebar from './Sidebar';

interface AppLayoutProviderProps {
  children: React.ReactNode;
}

// 保護されたルートの判定
const isProtectedRoute = (pathname: string) => {
  const protectedPaths = [
    '/projects',
    '/customers',
    '/measurements',
    '/monitoring',
    '/reports',
    '/simulation',
    '/plan-actual',
  ];
  return protectedPaths.some(path => pathname.startsWith(path));
};

// 認証ページの判定
const isAuthRoute = (pathname: string) => {
  const authPaths = [
    '/auth/login',
    '/auth/signup',
    '/auth/verify',
    '/auth/forgot-password',
  ];
  return authPaths.some(path => pathname.startsWith(path));
};

export default function AppLayoutProvider({ children }: AppLayoutProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [currentView, setCurrentView] = useState<DashboardView>('projects');
  const [isInitialized, setIsInitialized] = useState(false);

  // 認証状態の初期化チェック
  useEffect(() => {
    // 少し待ってからストアの状態を確認
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(initTimer);
  }, []);

  // 認証チェック（静的サイトでは middleware が使用不可のため）
  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const userIsAuthenticated = isAuthenticated();
    
    // 保護されたルートへの未認証アクセス
    if (isProtectedRoute(pathname) && !userIsAuthenticated) {
      const loginUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(loginUrl);
      return;
    }

    // 認証ページへの認証済みアクセス
    if (isAuthRoute(pathname) && userIsAuthenticated) {
      // URLパラメータからリダイレクト先を確認
      const urlParams = new URLSearchParams(window.location.search);
      const redirectTo = urlParams.get('redirect') || '/projects';
      router.push(redirectTo);
      return;
    }

    // ルートパスの処理
    if (pathname === '/') {
      if (userIsAuthenticated) {
        router.push('/projects');
      } else {
        router.push('/auth/login');
      }
      return;
    }
  }, [pathname, isAuthenticated, isInitialized, isLoading, router]);

  // 現在のビューを pathname から判定
  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith('/projects')) setCurrentView('projects');
      else if (pathname.startsWith('/customers')) setCurrentView('customers');
      else if (pathname.startsWith('/monitoring')) setCurrentView('monitoring');
      else if (pathname.startsWith('/plan-actual')) setCurrentView('analysis');
      else if (pathname.startsWith('/reports')) setCurrentView('reports');
      else if (pathname.startsWith('/measurements')) setCurrentView('monitoring');
      else if (pathname.startsWith('/simulation')) setCurrentView('analysis');
    }
  }, [pathname]);

  // ナビゲーション処理
  const handleViewChange = (view: DashboardView) => {
    setCurrentView(view);
    
    switch (view) {
      case 'monitoring':
        router.push('/monitoring');
        break;
      case 'projects':
        router.push('/projects');
        break;
      case 'customers':
        router.push('/customers');
        break;
      case 'analysis':
        router.push('/plan-actual');
        break;
      case 'reports':
        router.push('/reports');
        break;
    }
  };

  // 認証ページの場合は最小限のレイアウト
  if (isAuthRoute(pathname)) {
    return (
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    );
  }

  // ローディング中または初期化中
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 認証済みユーザーのメインレイアウト
  if (isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <div className="flex">
          <Sidebar 
            currentView={currentView} 
            onViewChange={handleViewChange}
          />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    );
  }

  // 未認証ユーザー
  // 保護されたルートの場合は認証チェック useEffect でリダイレクト済み
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 