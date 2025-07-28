'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { loadStoredAuth } = useAuthStore();

  useEffect(() => {
    // アプリ起動時に保存された認証情報を読み込み
    loadStoredAuth().catch(error => {
      console.error('Failed to load stored auth:', error);
    });
  }, [loadStoredAuth]);

  return <>{children}</>;
}