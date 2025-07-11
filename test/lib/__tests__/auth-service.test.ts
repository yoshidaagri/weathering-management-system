import { AuthService } from '../services/auth-service';

// LocalStorageのモック
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('isAuthenticated', () => {
    it('should return true when tokens exist', () => {
      const mockTokens = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        idToken: 'id-token-123',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockTokens));

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when no tokens', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should clear tokens on sign out', async () => {
      await authService.signOut();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('authTokens');
    });
  });
});

// TODO: Cursor - 受入テスト実施