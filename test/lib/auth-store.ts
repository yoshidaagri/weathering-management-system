import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getAuthService, refreshTokens, User, LoginCredentials, SignUpData, AuthTokens } from './services/auth-service';
import { mockAuth } from './mock-auth';

export interface AuthTokensWithExpiry {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokensWithExpiry | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  confirmSignUp: (username: string, code: string) => Promise<void>;
  signOut: () => void;
  forgotPassword: (username: string) => Promise<void>;
  confirmForgotPassword: (username: string, code: string, newPassword: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
  
  // Getters
  isAuthenticated: () => boolean;
  isTokenExpired: () => boolean;
}

// Cookie管理ユーティリティ
const setCookie = (name: string, value: string, expiresAt: number) => {
  if (typeof document === 'undefined') return; // サーバーサイドでは実行しない
  
  const expires = new Date(expiresAt).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; secure; samesite=strict`;
};

const removeCookie = (name: string) => {
  if (typeof document === 'undefined') return; // サーバーサイドでは実行しない
  
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isLoading: false,
      error: null,

      // Actions
      signIn: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          // 開発環境ではモック認証を使用
          const useMock = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
          
          let tokens: AuthTokens, user: User;
          
          if (useMock) {
            // モック認証
            const response = await mockAuth.signIn(credentials);
            if (!response.AuthenticationResult) {
              throw new Error('認証に失敗しました');
            }
            tokens = {
              accessToken: response.AuthenticationResult.AccessToken!,
              idToken: response.AuthenticationResult.IdToken!,
              refreshToken: response.AuthenticationResult.RefreshToken!,
            };
            user = await mockAuth.getCurrentUser(response.AuthenticationResult.AccessToken);
          } else {
            // 実際のCognito認証
            const authService = getAuthService();
            tokens = await authService.signIn(credentials);
            user = await authService.getCurrentUser();
          }
          
          const tokensWithExpiry: AuthTokensWithExpiry = {
            ...tokens,
            expiresAt: Date.now() + (3600 * 1000), // 1時間後
          };

          // Cookieに認証情報を保存（middleware用）
          setCookie('auth-session', JSON.stringify({
            accessToken: tokensWithExpiry.accessToken,
            idToken: tokensWithExpiry.idToken,
            expiresAt: tokensWithExpiry.expiresAt,
          }), tokensWithExpiry.expiresAt);

          set({ tokens: tokensWithExpiry, user, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
            isLoading: false 
          });
          throw error;
        }
      },

      signUp: async (data: SignUpData) => {
        set({ isLoading: true, error: null });
        
        try {
          const useMock = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
          
          if (useMock) {
            await mockAuth.signUp(data);
          } else {
            const authService = getAuthService();
            await authService.signUp(data);
          }
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'ユーザー登録に失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      confirmSignUp: async (username: string, code: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const authService = getAuthService();
          await authService.confirmSignUp(username, code);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '確認に失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      signOut: async () => {
        const authService = getAuthService();
        await authService.signOut();
        
        // Cookieから認証情報を削除
        removeCookie('auth-session');
        
        set({ user: null, tokens: null, error: null });
      },

      forgotPassword: async (username: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const authService = getAuthService();
          await authService.forgotPassword(username);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'パスワードリセットに失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      confirmForgotPassword: async (username: string, code: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const authService = getAuthService();
          await authService.confirmForgotPassword(username, code, newPassword);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'パスワード変更に失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      resendConfirmationCode: async (username: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const authService = getAuthService();
          await authService.resendConfirmationCode(username);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '確認コード再送信に失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      refreshAuth: async () => {
        const { tokens } = get();
        if (!tokens || !tokens.refreshToken) {
          console.log('No refresh token available');
          return;
        }

        set({ isLoading: true });
        
        try {
          // 開発環境ではモック認証を使用
          const useMock = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
          
          if (useMock) {
            // モック環境では単純にログアウト
            console.log('Mock environment: logging out instead of refreshing');
            removeCookie('auth-session');
            set({ user: null, tokens: null, isLoading: false });
            return;
          }

          // 実際のCognitoでリフレッシュ
          console.log('Refreshing tokens...');
          const newTokens = await refreshTokens(tokens.refreshToken);
          
          const tokensWithExpiry: AuthTokensWithExpiry = {
            ...newTokens,
            expiresAt: Date.now() + (3600 * 1000), // 1時間後
          };

          // Cookieを更新
          setCookie('auth-session', JSON.stringify({
            accessToken: tokensWithExpiry.accessToken,
            idToken: tokensWithExpiry.idToken,
            expiresAt: tokensWithExpiry.expiresAt,
          }), tokensWithExpiry.expiresAt);

          set({ tokens: tokensWithExpiry, isLoading: false });
          console.log('Tokens refreshed successfully');
        } catch (error) {
          console.error('Token refresh failed:', error);
          set({ 
            error: error instanceof Error ? error.message : 'トークン更新に失敗しました',
            isLoading: false,
            user: null,
            tokens: null
          });
          removeCookie('auth-session');
        }
      },

      clearError: () => set({ error: null }),

      // Getters
      isAuthenticated: () => {
        const { tokens } = get();
        return !!(tokens && !get().isTokenExpired());
      },

      isTokenExpired: () => {
        const { tokens } = get();
        if (!tokens) return true;
        return Date.now() >= tokens.expiresAt;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        tokens: state.tokens 
      }),
    }
  )
);