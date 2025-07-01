import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCognitoAuth, User, LoginCredentials, SignUpData } from './cognito';
import { mockAuth } from './mock-auth';

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
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
          const useMock = process.env.NODE_ENV === 'development' || !process.env.COGNITO_USER_POOL_ID;
          
          let response, user;
          
          if (useMock) {
            // モック認証
            response = await mockAuth.signIn(credentials);
            user = await mockAuth.getCurrentUser(response.AuthenticationResult.AccessToken);
          } else {
            // 実際のCognito認証
            const cognitoAuth = getCognitoAuth();
            response = await cognitoAuth.signIn(credentials);
            user = await cognitoAuth.getCurrentUser(response.AuthenticationResult.AccessToken!);
          }
          
          if (response.AuthenticationResult) {
            const tokens: AuthTokens = {
              accessToken: response.AuthenticationResult.AccessToken!,
              idToken: response.AuthenticationResult.IdToken!,
              refreshToken: response.AuthenticationResult.RefreshToken!,
              expiresAt: Date.now() + (response.AuthenticationResult.ExpiresIn! * 1000),
            };

            set({ tokens, user, isLoading: false });
          } else {
            throw new Error('認証に失敗しました');
          }
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
          const useMock = process.env.NODE_ENV === 'development' || !process.env.COGNITO_USER_POOL_ID;
          
          if (useMock) {
            await mockAuth.signUp(data);
          } else {
            const cognitoAuth = getCognitoAuth();
            await cognitoAuth.signUp(data);
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
          const cognitoAuth = getCognitoAuth();
          await cognitoAuth.confirmSignUp(username, code);
          set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '確認に失敗しました',
            isLoading: false 
          });
          throw error;
        }
      },

      signOut: () => {
        set({ user: null, tokens: null, error: null });
      },

      forgotPassword: async (username: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const cognitoAuth = getCognitoAuth();
          await cognitoAuth.forgotPassword(username);
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
          const cognitoAuth = getCognitoAuth();
          await cognitoAuth.confirmForgotPassword(username, code, newPassword);
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
          const cognitoAuth = getCognitoAuth();
          await cognitoAuth.resendConfirmationCode(username);
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
        if (!tokens || !tokens.refreshToken) return;

        set({ isLoading: true });
        
        try {
          // TODO: リフレッシュトークンを使って新しいアクセストークンを取得
          // 現在はシンプルな実装のため、ログアウトして再ログインを促す
          set({ user: null, tokens: null, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'トークン更新に失敗しました',
            isLoading: false,
            user: null,
            tokens: null
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      // Getters
      isAuthenticated: () => {
        const { tokens } = get();
        return tokens !== null && !get().isTokenExpired();
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
        tokens: state.tokens,
      }),
    }
  )
);