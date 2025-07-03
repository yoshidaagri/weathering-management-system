import { useAuthStore } from './auth-store';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  location: string;
  status: 'planning' | 'active' | 'completed' | 'suspended';
  startDate: string;
  endDate: string;
  co2Target: number;
  co2Achieved: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementData {
  id: string;
  projectId: string;
  timestamp: string;
  pH: number;
  temperature: number;
  flowRate: number;
  co2Absorption: number;
  metalConcentration: {
    iron: number;
    copper: number;
    zinc: number;
  };
  efficiency: number;
}

export interface Customer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.API_GATEWAY_URL || 'https://api.example.com';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { tokens } = useAuthStore.getState();
      
      // ヘッダーを構築
      const baseHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // 認証トークンを追加
      const headers = tokens?.accessToken 
        ? { ...baseHeaders, 'Authorization': `Bearer ${tokens.accessToken}` }
        : baseHeaders;

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // 401エラーの場合は認証切れ
        if (response.status === 401) {
          useAuthStore.getState().signOut();
          throw new Error('認証が切れました。再度ログインしてください。');
        }

        throw new Error(data.message || `HTTP Error: ${response.status}`);
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  }

  // GET リクエスト
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST リクエスト
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT リクエスト
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE リクエスト
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // === Customer API ===
  async getCustomers(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    return this.get<PaginatedResponse<Customer>>(`/customers?page=${page}&pageSize=${pageSize}`);
  }

  async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    return this.get<Customer>(`/customers/${customerId}`);
  }

  async createCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    return this.post<Customer>('/customers', customer);
  }

  async updateCustomer(customerId: string, customer: Partial<Customer>): Promise<ApiResponse<Customer>> {
    return this.put<Customer>(`/customers/${customerId}`, customer);
  }

  async deleteCustomer(customerId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/customers/${customerId}`);
  }

  // === Project API ===
  async getProjects(customerId?: string, page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Project>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    
    if (customerId) {
      params.append('customerId', customerId);
    }

    return this.get<PaginatedResponse<Project>>(`/projects?${params.toString()}`);
  }

  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return this.get<Project>(`/projects/${projectId}`);
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'co2Achieved'>): Promise<ApiResponse<Project>> {
    return this.post<Project>('/projects', project);
  }

  async updateProject(projectId: string, project: Partial<Project>): Promise<ApiResponse<Project>> {
    return this.put<Project>(`/projects/${projectId}`, project);
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/projects/${projectId}`);
  }

  // === Measurement API ===
  async getMeasurements(
    projectId: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<ApiResponse<PaginatedResponse<MeasurementData>>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return this.get<PaginatedResponse<MeasurementData>>(`/projects/${projectId}/measurements?${params.toString()}`);
  }

  async getMeasurement(projectId: string, measurementId: string): Promise<ApiResponse<MeasurementData>> {
    return this.get<MeasurementData>(`/projects/${projectId}/measurements/${measurementId}`);
  }

  async createMeasurement(projectId: string, measurement: Omit<MeasurementData, 'id' | 'projectId'>): Promise<ApiResponse<MeasurementData>> {
    return this.post<MeasurementData>(`/projects/${projectId}/measurements`, measurement);
  }

  async createMeasurementBatch(projectId: string, measurements: Omit<MeasurementData, 'id' | 'projectId'>[]): Promise<ApiResponse<MeasurementData[]>> {
    return this.post<MeasurementData[]>(`/projects/${projectId}/measurements/batch`, { measurements });
  }

  // === Report API ===
  async generateReport(
    projectId: string,
    reportType: 'monthly' | 'quarterly' | 'annual' | 'custom',
    options: {
      startDate: string;
      endDate: string;
      includeItems: string[];
      format: 'pdf' | 'excel' | 'csv';
    }
  ): Promise<ApiResponse<{ reportId: string }>> {
    return this.post<{ reportId: string }>(`/projects/${projectId}/reports/generate`, {
      reportType,
      ...options,
    });
  }

  async getReports(projectId: string): Promise<ApiResponse<any[]>> {
    return this.get<any[]>(`/projects/${projectId}/reports`);
  }

  async getReport(projectId: string, reportId: string): Promise<ApiResponse<any>> {
    return this.get<any>(`/projects/${projectId}/reports/${reportId}`);
  }

  async downloadReport(projectId: string, reportId: string): Promise<Response> {
    const { tokens } = useAuthStore.getState();
    
    return fetch(`${this.baseUrl}/projects/${projectId}/reports/${reportId}/download`, {
      headers: {
        'Authorization': `Bearer ${tokens?.accessToken}`,
      },
    });
  }

  // === Analytics API ===
  async getProjectAnalytics(
    projectId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<ApiResponse<any>> {
    return this.get<any>(`/projects/${projectId}/analytics?period=${period}`);
  }

  async getSystemHealth(): Promise<ApiResponse<{
    status: 'healthy' | 'warning' | 'error';
    services: Array<{
      name: string;
      status: 'up' | 'down';
      latency: number;
    }>;
    lastChecked: string;
  }>> {
    return this.get<any>('/health');
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// React hooks for API calls
export const useApi = () => {
  const { tokens, isTokenExpired, signOut } = useAuthStore();

  const callApi = async <T>(apiCall: () => Promise<ApiResponse<T>>): Promise<ApiResponse<T>> => {
    // トークンの有効性チェック
    if (!tokens || isTokenExpired()) {
      signOut();
      return {
        success: false,
        error: '認証が必要です。ログインしてください。',
      };
    }

    try {
      return await apiCall();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '予期しないエラーが発生しました',
      };
    }
  };

  return {
    callApi,
    isAuthenticated: !!tokens && !isTokenExpired(),
  };
};