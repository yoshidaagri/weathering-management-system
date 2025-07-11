import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { useAuthStore } from '../../auth-store';

// API Client の簡単な実装をモック
class MockApiClient {
  async get(url: string) {
    return global.fetch(url, { method: 'GET' });
  }
  
  async post(url: string, data: any) {
    return global.fetch(url, { method: 'POST', body: JSON.stringify(data) });
  }
  
  async put(url: string, data: any) {
    return global.fetch(url, { method: 'PUT', body: JSON.stringify(data) });
  }
  
  async delete(url: string) {
    return global.fetch(url, { method: 'DELETE' });
  }
}

// モック設定
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('API統合テスト', () => {
  let apiClient: MockApiClient;
  
  beforeEach(() => {
    apiClient = new MockApiClient();
    
    // 認証状態をセットアップ
    const store = useAuthStore.getState();
    store.signOut();
    store.clearError();
    
    // fetchモックをリセット
    (fetch as jest.MockedFunction<typeof fetch>).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('認証ヘッダー付きAPI呼び出し', () => {
    it('アクセストークンが適切にヘッダーに設定される', async () => {
      // 認証状態をセットアップ
      const store = useAuthStore.getState();
      (store as any).tokens = {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        expiresAt: Date.now() + 3600000
      };

      // レスポンスをモック
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
        headers: new Headers(),
        redirected: false,
        statusText: 'OK',
        type: 'default',
        url: '',
        clone: jest.fn(),
        body: null,
        bodyUsed: false,
        arrayBuffer: jest.fn(),
        blob: jest.fn(),
        formData: jest.fn(),
        text: jest.fn(),
      } as Response);

      await apiClient.get('/test-endpoint');

      // fetchが適切な認証ヘッダーで呼び出されることを確認
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test-endpoint'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-access-token'
          })
        })
      );
    });

    it('未認証時は認証ヘッダーが設定されない', async () => {
      // 未認証状態
      const store = useAuthStore.getState();
      store.signOut();

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' }),
      } as Response);

      await apiClient.get('/test-endpoint');

      // Authorizationヘッダーが含まれていないことを確認
      const fetchCall = (fetch as jest.MockedFunction<typeof fetch>).mock.calls[0];
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers?.Authorization).toBeUndefined();
    });
  });

  describe('エラーレスポンス処理', () => {
    it('401エラー時に適切にエラーを処理する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
        statusText: 'Unauthorized',
      } as Response);

      await expect(apiClient.get('/protected-endpoint')).rejects.toThrow('HTTP 401');
    });

    it('500エラー時に適切にエラーを処理する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal Server Error' }),
        statusText: 'Internal Server Error',
      } as Response);

      await expect(apiClient.get('/error-endpoint')).rejects.toThrow('HTTP 500');
    });

    it('ネットワークエラー時に適切にエラーを処理する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(apiClient.get('/network-fail')).rejects.toThrow('Network error');
    });
  });

  describe('CRUD操作統合テスト', () => {
    const mockProject = {
      id: 'test-project-id',
      name: 'テストプロジェクト',
      description: 'テスト用のプロジェクト',
      customerId: 'test-customer-id',
      status: 'active'
    };

    it('プロジェクト作成が正常に動作する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ project: mockProject }),
      } as Response);

      const result = await apiClient.post('/projects', mockProject);

      expect(result.project).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/projects'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockProject)
        })
      );
    });

    it('プロジェクト取得が正常に動作する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ project: mockProject }),
      } as Response);

      const result = await apiClient.get(`/projects/${mockProject.id}`);

      expect(result.project).toEqual(mockProject);
    });

    it('プロジェクト更新が正常に動作する', async () => {
      const updatedProject = { ...mockProject, name: '更新されたプロジェクト' };
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ project: updatedProject }),
      } as Response);

      const result = await apiClient.put(`/projects/${mockProject.id}`, updatedProject);

      expect(result.project.name).toBe('更新されたプロジェクト');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/projects/${mockProject.id}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updatedProject)
        })
      );
    });

    it('プロジェクト削除が正常に動作する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ message: 'Project deleted successfully' }),
      } as Response);

      const result = await apiClient.delete(`/projects/${mockProject.id}`);

      expect(result.message).toBe('Project deleted successfully');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/projects/${mockProject.id}`),
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  describe('測定データAPI統合テスト', () => {
    const mockMeasurement = {
      id: 'test-measurement-id',
      projectId: 'test-project-id',
      timestamp: new Date().toISOString(),
      values: {
        ph: 7.2,
        temperature: 15.5,
        flow_rate: 100.0,
        co2_concentration: 400.0
      },
      status: 'normal'
    };

    it('測定データ一覧取得が正常に動作する', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          measurements: [mockMeasurement],
          pagination: { total: 1, limit: 20, offset: 0 }
        }),
      } as Response);

      const result = await apiClient.get('/measurements?projectId=test-project-id');

      expect(result.measurements).toHaveLength(1);
      expect(result.measurements[0]).toEqual(mockMeasurement);
    });

    it('バッチ測定データ作成が正常に動作する', async () => {
      const measurements = [mockMeasurement, { ...mockMeasurement, id: 'test-measurement-id-2' }];
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ 
          measurements,
          message: 'Measurements created successfully'
        }),
      } as Response);

      const result = await apiClient.post('/measurements/batch', { measurements });

      expect(result.measurements).toHaveLength(2);
      expect(result.message).toBe('Measurements created successfully');
    });
  });

  describe('レポート生成API統合テスト', () => {
    it('レポート生成リクエストが正常に動作する', async () => {
      const reportRequest = {
        projectId: 'test-project-id',
        type: 'MRV',
        parameters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          includeAnalysis: true
        }
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ 
          reportId: 'test-report-id',
          status: 'processing',
          message: 'Report generation started'
        }),
      } as Response);

      const result = await apiClient.post('/reports/generate', reportRequest);

      expect(result.reportId).toBe('test-report-id');
      expect(result.status).toBe('processing');
    });

    it('レポートダウンロードURLが正常に取得できる', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ 
          downloadUrl: 'https://example.com/reports/test-report.pdf',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        }),
      } as Response);

      const result = await apiClient.get('/reports/test-report-id/download');

      expect(result.downloadUrl).toContain('test-report.pdf');
      expect(result.expiresAt).toBeTruthy();
    });
  });
});

// TODO: Cursor - 受入テスト実施 - 実際のAPI環境でのテスト実行 