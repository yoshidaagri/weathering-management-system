import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { AuthUser } from '@/types';

// Cognito設定
const COGNITO_CONFIG = {
  userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || 'ap-northeast-1_BEnyexqxY',
  clientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '2gqqmrdorakjgq7ahuvlq5f9e2',
  region: process.env.NEXT_PUBLIC_REGION || 'ap-northeast-1',
};

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
});

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignUpData {
  username: string;
  password: string;
  email: string;
}

export class AuthService {
  // ログイン（デモ用モック実装）
  async signIn(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      // デモ用の簡易認証（実際のCognito認証は後で実装）
      if (credentials.username === 'demo@example.com' && credentials.password === 'password123') {
        // モックトークンを生成
        const tokens = {
          accessToken: 'mock-access-token-' + Date.now(),
          idToken: 'mock-id-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
          expiresAt: Date.now() + (3600 * 1000), // 1時間
        };

        // ローカルストレージに保存
        this.storeTokens(tokens);
        
        return tokens;
      } else {
        throw new Error('認証情報が正しくありません。demo@example.com / password123 でログインしてください。');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'ログインに失敗しました');
    }
  }

  // サインアップ
  async signUp(data: SignUpData): Promise<{ userSub: string }> {
    try {
      const command = new SignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: data.username,
        Password: data.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: data.email,
          },
        ],
      });

      const response = await cognitoClient.send(command);
      
      return {
        userSub: response.UserSub!,
      };
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'サインアップに失敗しました');
    }
  }

  // メール確認
  async confirmSignUp(username: string, confirmationCode: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      console.error('Confirm sign up error:', error);
      throw new Error(error.message || 'メール確認に失敗しました');
    }
  }

  // ユーザー情報取得（デモ用モック実装）
  async getCurrentUser(accessToken: string): Promise<AuthUser> {
    try {
      // モックトークンの場合はデモユーザー情報を返す
      if (accessToken.startsWith('mock-access-token')) {
        return {
          username: 'demo@example.com',
          email: 'demo@example.com',
          attributes: {
            email: 'demo@example.com',
            email_verified: 'true',
          },
        };
      }
      
      // 実際のCognito認証の場合
      const command = new GetUserCommand({
        AccessToken: accessToken,
      });

      const response = await cognitoClient.send(command);
      
      const attributes: Record<string, string> = {};
      response.UserAttributes?.forEach(attr => {
        if (attr.Name && attr.Value) {
          attributes[attr.Name] = attr.Value;
        }
      });

      return {
        username: response.Username!,
        email: attributes.email || '',
        attributes,
      };
    } catch (error: any) {
      console.error('Get current user error:', error);
      throw new Error(error.message || 'ユーザー情報の取得に失敗しました');
    }
  }

  // ログアウト
  async signOut(accessToken: string): Promise<void> {
    try {
      const command = new GlobalSignOutCommand({
        AccessToken: accessToken,
      });

      await cognitoClient.send(command);
      
      // ローカルストレージからトークンを削除
      this.clearTokens();
    } catch (error: any) {
      console.error('Sign out error:', error);
      // エラーが発生してもローカルストレージは削除
      this.clearTokens();
      throw new Error(error.message || 'ログアウトに失敗しました');
    }
  }

  // パスワードリセット要求
  async forgotPassword(username: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: username,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw new Error(error.message || 'パスワードリセット要求に失敗しました');
    }
  }

  // パスワードリセット確認
  async confirmForgotPassword(
    username: string, 
    confirmationCode: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: COGNITO_CONFIG.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      });

      await cognitoClient.send(command);
    } catch (error: any) {
      console.error('Confirm forgot password error:', error);
      throw new Error(error.message || 'パスワードリセットに失敗しました');
    }
  }

  // トークン保存
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  // トークン取得
  getStoredTokens(): AuthTokens | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('auth_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        // 有効期限チェック
        if (tokens.expiresAt > Date.now()) {
          return tokens;
        } else {
          this.clearTokens();
        }
      }
    }
    return null;
  }

  // トークン削除
  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_tokens');
    }
  }

  // 認証状態チェック
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return tokens !== null;
  }
}

// シングルトンインスタンス
export const authService = new AuthService();
export default authService;