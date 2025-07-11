import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useAuthStore } from '../../auth-store';
import { getAuthService } from '../../services/auth-service';
import { mockAuth } from '../../mock-auth';

// モック設定
jest.mock('../../services/auth-service');
jest.mock('../../mock-auth');

describe('認証フロー統合テスト', () => {
  beforeEach(() => {
    // ストアの初期化
    const store = useAuthStore.getState();
    store.signOut();
    store.clearError();
    
    // モックのリセット
    jest.clearAllMocks();
  });

  afterEach(() => {
    // クリーンアップ
    const store = useAuthStore.getState();
    store.signOut();
  });

  describe('サインアップ → 確認 → ログインフロー', () => {
    it('完全なユーザー登録フローが正常に動作する', async () => {
      const store = useAuthStore.getState();
      const userData = {
        username: 'testuser' + Date.now(),  // ユニークなユーザー名
        email: 'test@example.com',
        password: 'TempPassword123!',
        companyName: 'テスト会社'
      };

      // 1. サインアップ
      await store.signUp(userData);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);

      // 2. 確認コード送信
      await store.confirmSignUp(userData.username, '123456');
      expect(store.isLoading).toBe(false);

      // 3. ログイン
      await store.signIn({
        username: userData.username,
        password: userData.password
      });

      // 認証成功の確認
      expect(store.isAuthenticated()).toBe(true);
      expect(store.user).toBeTruthy();
      expect(store.tokens).toBeTruthy();
    });

    it('確認コード再送信が正常に動作する', async () => {
      const store = useAuthStore.getState();
      const username = 'testuser';

      await store.resendConfirmationCode(username);
      
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);
    });
  });

  describe('パスワードリセットフロー', () => {
    it('パスワードリセット → 確認フローが正常に動作する', async () => {
      const store = useAuthStore.getState();
      const username = 'testuser';
      const newPassword = 'NewPassword123!';

      // 1. パスワードリセット開始
      await store.forgotPassword(username);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);

      // 2. パスワードリセット確認
      await store.confirmForgotPassword(username, '123456', newPassword);
      expect(store.isLoading).toBe(false);
      expect(store.error).toBe(null);

      // 3. 新しいパスワードでログイン
      await store.signIn({
        username: username,
        password: newPassword
      });

      expect(store.isAuthenticated()).toBe(true);
    });
  });

  describe('トークン管理フロー', () => {
    it('トークンリフレッシュが正常に動作する', async () => {
      const store = useAuthStore.getState();
      // まずログイン
      await store.signIn({
        username: 'testuser',
        password: 'password123'
      });

      const originalTokens = store.tokens;
      expect(originalTokens).toBeTruthy();

      // トークンリフレッシュ実行
      await store.refreshAuth();

      // 新しいトークンが設定されていることを確認
      const newTokens = store.tokens;
      expect(newTokens).toBeTruthy();
      expect(newTokens?.accessToken).toBeTruthy();
      expect(store.isAuthenticated()).toBe(true);
    });

    it('無効なリフレッシュトークンでエラーハンドリングが動作する', async () => {
      const store = useAuthStore.getState();
      // 不正なトークンを設定
      (store as any).tokens = {
        accessToken: 'invalid-access-token',
        idToken: 'invalid-id-token',
        refreshToken: 'invalid-refresh-token',
        expiresAt: Date.now() + 3600000
      };

      await store.refreshAuth();

      // エラー時はログアウト状態になることを確認
      expect(store.isAuthenticated()).toBe(false);
      expect(store.tokens).toBe(null);
    });

    it('トークン有効期限チェックが正常に動作する', () => {
      const store = useAuthStore.getState();
      // 期限切れトークンを設定
      (store as any).tokens = {
        accessToken: 'access-token',
        idToken: 'id-token',  
        refreshToken: 'refresh-token',
        expiresAt: Date.now() - 1000 // 1秒前（期限切れ）
      };

      expect(store.isTokenExpired()).toBe(true);
      expect(store.isAuthenticated()).toBe(false);

      // 有効なトークンを設定
      (store as any).tokens = {
        accessToken: 'access-token',
        idToken: 'id-token',
        refreshToken: 'refresh-token', 
        expiresAt: Date.now() + 3600000 // 1時間後
      };

      expect(store.isTokenExpired()).toBe(false);
      expect(store.isAuthenticated()).toBe(true);
    });
  });

  describe('ログアウトフロー', () => {
    it('ログアウトで状態が適切にクリアされる', async () => {
      const store = useAuthStore.getState();
      // まずログイン
      await store.signIn({
        username: 'testuser',
        password: 'password123'
      });

      expect(store.isAuthenticated()).toBe(true);

      // ログアウト
      await store.signOut();

      // 状態がクリアされていることを確認
      expect(store.isAuthenticated()).toBe(false);
      expect(store.user).toBe(null);
      expect(store.tokens).toBe(null);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラー時の適切なエラー処理', async () => {
      const store = useAuthStore.getState();
      // モックでエラーを発生させる
      const mockError = new Error('Network error');
      (getAuthService().signIn as jest.Mock).mockRejectedValueOnce(mockError);

      await expect(store.signIn({
        username: 'testuser',
        password: 'wrongpassword'
      })).rejects.toThrow();

      // エラーが適切に処理されることを確認
      expect(store.error).toBeTruthy();
      expect(store.isLoading).toBe(false);
      expect(store.isAuthenticated()).toBe(false);
    });

    it('エラー状態のクリアが正常に動作する', async () => {
      const store = useAuthStore.getState();
      // エラー状態を設定
      (store as any).error = 'Test error';
      expect(store.error).toBe('Test error');

      // エラークリア
      store.clearError();
      expect(store.error).toBe(null);
    });
  });
});

// TODO: Cursor - 受入テスト実施 - 実際のCognito環境でのテスト実行 