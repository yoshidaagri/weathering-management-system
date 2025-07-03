import {
  CognitoIdentityProviderClient,
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

export interface CognitoConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}

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

export class CognitoAuth {
  private client: CognitoIdentityProviderClient;
  private config: CognitoConfig;

  constructor(config: CognitoConfig) {
    this.config = config;
    this.client = new CognitoIdentityProviderClient({
      region: config.region,
    });
  }

  // ユーザー登録
  async signUp(data: SignUpData): Promise<SignUpCommandOutput> {
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
  }

  // ユーザー登録確認
  async confirmSignUp(username: string, confirmationCode: string): Promise<void> {
    const command = new ConfirmSignUpCommand({
      ClientId: this.config.clientId,
      Username: username,
      ConfirmationCode: confirmationCode,
    });

    await this.client.send(command);
  }

  // 確認コード再送信
  async resendConfirmationCode(username: string): Promise<void> {
    const command = new ResendConfirmationCodeCommand({
      ClientId: this.config.clientId,
      Username: username,
    });

    await this.client.send(command);
  }

  // ログイン
  async signIn(credentials: LoginCredentials): Promise<InitiateAuthCommandOutput> {
    const command = new InitiateAuthCommand({
      ClientId: this.config.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: credentials.username,
        PASSWORD: credentials.password,
      },
    });

    return await this.client.send(command);
  }

  // パスワードリセット開始
  async forgotPassword(username: string): Promise<void> {
    const command = new ForgotPasswordCommand({
      ClientId: this.config.clientId,
      Username: username,
    });

    await this.client.send(command);
  }

  // パスワードリセット確認
  async confirmForgotPassword(
    username: string,
    confirmationCode: string,
    newPassword: string
  ): Promise<void> {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: this.config.clientId,
      Username: username,
      ConfirmationCode: confirmationCode,
      Password: newPassword,
    });

    await this.client.send(command);
  }

  // ユーザー情報取得
  async getCurrentUser(accessToken: string): Promise<User> {
    const command = new GetUserCommand({
      AccessToken: accessToken,
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
  }
}

// シングルトンインスタンス
let cognitoAuth: CognitoAuth | null = null;

export const getCognitoAuth = (): CognitoAuth => {
  if (!cognitoAuth) {
    const config: CognitoConfig = {
      region: process.env.AWS_REGION || 'ap-northeast-1',
      userPoolId: process.env.COGNITO_USER_POOL_ID || 'mock-user-pool',
      clientId: process.env.COGNITO_CLIENT_ID || 'mock-client-id',
    };

    cognitoAuth = new CognitoAuth(config);
  }

  return cognitoAuth;
};