import {
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  GetUserCommand,
  SignUpCommandOutput,
  InitiateAuthCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { getCognitoClient, getAWSConfig } from '../aws-config';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface SignUpData {
  username: string;
  password: string;
  email: string;
  companyName?: string;
}

export interface User {
  username: string;
  email: string;
  companyName?: string;
  isVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export class AuthService {
  private client = getCognitoClient();
  private config = getAWSConfig();

  /**
   * ユーザー登録
   */
  async signUp(data: SignUpData): Promise<SignUpCommandOutput> {
    try {
      const command = new SignUpCommand({
        ClientId: this.config.clientId,
        Username: data.username,
        Password: data.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: data.email,
          },
          ...(data.companyName ? [{
            Name: 'custom:company_name',
            Value: data.companyName,
          }] : []),
        ],
      });

      return await this.client.send(command);
    } catch (error) {
      console.error('SignUp failed:', error);
      throw error;
    }
  }

  /**
   * ユーザー登録確認
   */
  async confirmSignUp(username: string, confirmationCode: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.config.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('ConfirmSignUp failed:', error);
      throw error;
    }
  }

  /**
   * 確認コード再送信
   */
  async resendConfirmationCode(username: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.config.clientId,
        Username: username,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('ResendConfirmationCode failed:', error);
      throw error;
    }
  }

  /**
   * ログイン
   */
  async signIn(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: credentials.username,
          PASSWORD: credentials.password,
        },
      });

      const response = await this.client.send(command);
      
      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed: No authentication result');
      }

      const tokens: AuthTokens = {
        accessToken: response.AuthenticationResult.AccessToken || '',
        refreshToken: response.AuthenticationResult.RefreshToken || '',
        idToken: response.AuthenticationResult.IdToken || '',
      };

      // トークンをローカルストレージに保存
      this.storeTokens(tokens);

      return tokens;
    } catch (error) {
      console.error('SignIn failed:', error);
      throw error;
    }
  }

  /**
   * ログアウト
   */
  async signOut(): Promise<void> {
    try {
      // ローカルストレージからトークンを削除
      this.clearTokens();
    } catch (error) {
      console.error('SignOut failed:', error);
      throw error;
    }
  }

  /**
   * パスワードリセット開始
   */
  async forgotPassword(username: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.config.clientId,
        Username: username,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('ForgotPassword failed:', error);
      throw error;
    }
  }

  /**
   * パスワードリセット確認
   */
  async confirmForgotPassword(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.config.clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: newPassword,
      });

      await this.client.send(command);
    } catch (error) {
      console.error('ConfirmForgotPassword failed:', error);
      throw error;
    }
  }

  /**
   * 現在のユーザー情報取得
   */
  async getCurrentUser(): Promise<User> {
    try {
      const tokens = this.getStoredTokens();
      if (!tokens?.accessToken) {
        throw new Error('No access token found');
      }

      const command = new GetUserCommand({
        AccessToken: tokens.accessToken,
      });

      const response = await this.client.send(command);
      
      const getAttributeValue = (name: string) => {
        const attr = response.UserAttributes?.find((attr: { Name: string; Value: string }) => attr.Name === name);
        return attr?.Value || '';
      };

      return {
        username: response.Username || '',
        email: getAttributeValue('email'),
        companyName: getAttributeValue('custom:company_name'),
        isVerified: getAttributeValue('email_verified') === 'true',
      };
    } catch (error) {
      console.error('GetCurrentUser failed:', error);
      throw error;
    }
  }

  /**
   * 認証状態確認
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!(tokens?.accessToken);
  }

  /**
   * トークンをローカルストレージに保存
   */
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authTokens', JSON.stringify(tokens));
    }
  }

  /**
   * ローカルストレージからトークンを取得
   */
  private getStoredTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    
    const stored = localStorage.getItem('authTokens');
    if (!stored) return null;
    
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  /**
   * ローカルストレージからトークンを削除
   */
  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authTokens');
    }
  }
}

// シングルトンインスタンス
let authService: AuthService | null = null;

export const getAuthService = (): AuthService => {
  if (!authService) {
    authService = new AuthService();
  }
  return authService;
};

/**
 * リフレッシュトークンを使用して新しいアクセストークンを取得
 */
export const refreshTokens = async (refreshToken: string): Promise<AuthTokens> => {
  try {
    const refreshTokenCommand = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: getAWSConfig().clientId, // Use getAWSConfig() to get the clientId
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await getCognitoClient().send(refreshTokenCommand);

    if (!response.AuthenticationResult) {
      throw new Error('リフレッシュトークンが無効です');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken!,
      idToken: response.AuthenticationResult.IdToken!,
      refreshToken: response.AuthenticationResult.RefreshToken || refreshToken, // 新しいリフレッシュトークンまたは既存のものを使用
    };
  } catch (error) {
    console.error('RefreshTokens failed:', error);
    throw new Error('トークンの更新に失敗しました');
  }
};