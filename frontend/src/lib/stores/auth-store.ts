import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, AuthUser } from '@/types';
import { authService, AuthTokens } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

interface AuthStore extends AuthState {
  // アクション
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // 状態管理
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // 内部状態
  isLoading: boolean;
  error: string | null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      isAuthenticated: false,
      user: null,
      accessToken: null,
      idToken: null,
      isLoading: false,
      error: null,

      // ログイン
      signIn: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const tokens = await authService.signIn({ username, password });
          const user = await authService.getCurrentUser(tokens.accessToken);
          
          // APIクライアントにトークンを設定
          apiClient.setAccessToken(tokens.accessToken);
          
          set({
            isAuthenticated: true,
            user,
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            idToken: null,
            isLoading: false,
            error: error.message,
          });
          throw error;
        }
      },

      // ログアウト
      signOut: async () => {
        const { accessToken } = get();
        
        set({ isLoading: true, error: null });
        
        try {
          if (accessToken) {
            await authService.signOut(accessToken);
          }
        } catch (error) {
          console.error('Logout error:', error);
          // エラーが発生してもログアウト処理は続行
        } finally {
          // APIクライアントのトークンをクリア
          apiClient.setAccessToken(null);
          
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            idToken: null,
            isLoading: false,
            error: null,
          });
        }
      },

      // 保存された認証情報を読み込み
      loadStoredAuth: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const tokens = authService.getStoredTokens();
          
          if (tokens) {
            const user = await authService.getCurrentUser(tokens.accessToken);
            
            // APIクライアントにトークンを設定
            apiClient.setAccessToken(tokens.accessToken);
            
            set({
              isAuthenticated: true,
              user,
              accessToken: tokens.accessToken,
              idToken: tokens.idToken,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isAuthenticated: false,
              user: null,
              accessToken: null,
              idToken: null,
              isLoading: false,
              error: null,
            });
          }
        } catch (error: any) {
          console.error('Load stored auth error:', error);
          // 認証情報が無効な場合はクリア
          set({
            isAuthenticated: false,
            user: null,
            accessToken: null,
            idToken: null,
            isLoading: false,
            error: null,
          });
        }
      },

      // ユーザー情報を更新
      refreshUser: async () => {
        const { accessToken } = get();
        
        if (!accessToken) {
          throw new Error('No access token available');
        }
        
        try {
          const user = await authService.getCurrentUser(accessToken);
          set({ user });
        } catch (error: any) {
          console.error('Refresh user error:', error);
          throw error;
        }
      },

      // ローディング状態設定
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // エラー状態設定
      setError: (error: string | null) => {
        set({ error });
      },

      // エラークリア
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        idToken: state.idToken,
      }),
    }
  )
);