// モック認証機能
import { LoginCredentials, SignUpData, User } from './cognito';

// テスト用ユーザーデータ
const mockUsers = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@example.com',
    companyName: '管理者アカウント',
    isVerified: true,
  },
  {
    username: 'testuser',
    password: 'Test123!',
    email: 'test@example.com',
    companyName: 'テスト株式会社',
    isVerified: true,
  },
];

export class MockAuth {
  // モックログイン
  async signIn(credentials: LoginCredentials) {
    // 1秒の遅延を追加してリアルな感じに
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(
      u => u.username === credentials.username && u.password === credentials.password
    );
    
    if (!user) {
      throw new Error('ユーザー名またはパスワードが正しくありません');
    }
    
    // モックトークンを生成
    const mockTokens = {
      AccessToken: `mock-access-token-${Date.now()}`,
      IdToken: `mock-id-token-${Date.now()}`,
      RefreshToken: `mock-refresh-token-${Date.now()}`,
      ExpiresIn: 3600, // 1時間
    };
    
    return {
      AuthenticationResult: mockTokens,
    };
  }
  
  // モックユーザー情報取得
  async getCurrentUser(accessToken: string): Promise<User> {
    // アクセストークンからユーザー名を抽出（モック）
    const username = 'admin'; // 簡略化
    const user = mockUsers.find(u => u.username === username);
    
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    return {
      username: user.username,
      email: user.email,
      companyName: user.companyName,
      isVerified: user.isVerified,
    };
  }
  
  // モックユーザー登録
  async signUp(data: SignUpData) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 既存ユーザーチェック
    const existingUser = mockUsers.find(u => u.username === data.username);
    if (existingUser) {
      throw new Error('このユーザー名は既に使用されています');
    }
    
    // モックユーザーを追加
    mockUsers.push({
      username: data.username,
      password: data.password,
      email: data.email,
      companyName: data.companyName || '',
      isVerified: false,
    });
    
    return {
      UserSub: `mock-user-${Date.now()}`,
    };
  }
  
  // モック確認
  async confirmSignUp(username: string, confirmationCode: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 確認コードは常に"123456"で成功
    if (confirmationCode !== '123456') {
      throw new Error('確認コードが正しくありません');
    }
    
    // ユーザーを確認済みに更新
    const userIndex = mockUsers.findIndex(u => u.username === username);
    if (userIndex >= 0) {
      mockUsers[userIndex].isVerified = true;
    }
  }
  
  // モックパスワードリセット
  async forgotPassword(username: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const user = mockUsers.find(u => u.username === username);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    // 実際にはメール送信処理
    console.log(`パスワードリセットコードを ${user.email} に送信しました（モック）`);
  }
  
  // モックパスワード変更確認
  async confirmForgotPassword(username: string, confirmationCode: string, newPassword: string) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // 確認コードは常に"123456"で成功
    if (confirmationCode !== '123456') {
      throw new Error('確認コードが正しくありません');
    }
    
    // パスワードを更新
    const userIndex = mockUsers.findIndex(u => u.username === username);
    if (userIndex >= 0) {
      mockUsers[userIndex].password = newPassword;
    }
  }
  
  // モック確認コード再送信
  async resendConfirmationCode(username: string) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const user = mockUsers.find(u => u.username === username);
    if (!user) {
      throw new Error('ユーザーが見つかりません');
    }
    
    console.log(`確認コードを ${user.email} に再送信しました（モック）`);
  }
}

export const mockAuth = new MockAuth();