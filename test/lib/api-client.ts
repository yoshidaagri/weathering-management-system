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
  customerId: string;
  companyName: string;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  industry: string;
  projectCount: number;
  status: 'active' | 'inactive';
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
    this.baseUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod';
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
  async getCustomers(
    params: {
      limit?: number;
      nextToken?: string;
      search?: string;
      industry?: string;
      status?: 'active' | 'inactive';
    } = {}
  ): Promise<ApiResponse<{ customers: Customer[]; pagination: any }>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return this.get<{ customers: Customer[]; pagination: any }>(
      `/api/customers${queryString ? `?${queryString}` : ''}`
    );
  }

  async getCustomer(customerId: string): Promise<ApiResponse<{ customer: Customer }>> {
    return this.get<{ customer: Customer }>(`/api/customers/${customerId}`);
  }

  async createCustomer(customerData: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<{ customer: Customer }>> {
    return this.post<{ customer: Customer }>('/api/customers', customerData);
  }

  async updateCustomer(customerId: string, customerData: Partial<Customer>): Promise<ApiResponse<{ customer: Customer }>> {
    return this.put<{ customer: Customer }>(`/api/customers/${customerId}`, customerData);
  }

  async deleteCustomer(customerId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/customers/${customerId}`);
  }

  // === Project API ===
  async getProjects(
    params: {
      limit?: number;
      nextToken?: string;
      customerId?: string;
      status?: 'planning' | 'active' | 'completed' | 'cancelled';
      search?: string;
    } = {}
  ): Promise<ApiResponse<{ projects: Project[]; pagination: any }>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return this.get<{ projects: Project[]; pagination: any }>(
      `/api/projects${queryString ? `?${queryString}` : ''}`
    );
  }

  async getProject(projectId: string): Promise<ApiResponse<{ project: Project }>> {
    return this.get<{ project: Project }>(`/api/projects/${projectId}`);
  }

  async createProject(projectData: any): Promise<ApiResponse<{ project: Project }>> {
    return this.post<{ project: Project }>('/api/projects', projectData);
  }

  async updateProject(projectId: string, projectData: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    return this.put<{ project: Project }>(`/api/projects/${projectId}`, projectData);
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/projects/${projectId}`);
  }

  // === Measurement API ===
  async getMeasurements(
    projectId: string,
    params: {
      limit?: number;
      nextToken?: string;
      startDate?: string;
      endDate?: string;
      type?: 'water_quality' | 'atmospheric' | 'soil';
      alertsOnly?: boolean;
    } = {}
  ): Promise<ApiResponse<{ measurements: MeasurementData[]; pagination: any; summary: any }>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return this.get<{ measurements: MeasurementData[]; pagination: any; summary: any }>(
      `/api/projects/${projectId}/measurements${queryString ? `?${queryString}` : ''}`
    );
  }

  async getMeasurement(projectId: string, measurementId: string): Promise<ApiResponse<{ measurement: MeasurementData }>> {
    return this.get<{ measurement: MeasurementData }>(`/api/projects/${projectId}/measurements/${measurementId}`);
  }

  async createMeasurement(projectId: string, measurementData: any): Promise<ApiResponse<{ measurement: MeasurementData }>> {
    return this.post<{ measurement: MeasurementData }>(`/api/projects/${projectId}/measurements`, measurementData);
  }

  async createMeasurementBatch(projectId: string, measurementsData: { measurements: any[] }): Promise<ApiResponse<any>> {
    return this.post<any>(`/api/projects/${projectId}/measurements/batch`, measurementsData);
  }

  async updateMeasurement(projectId: string, measurementId: string, measurementData: any): Promise<ApiResponse<{ measurement: MeasurementData }>> {
    return this.put<{ measurement: MeasurementData }>(`/api/projects/${projectId}/measurements/${measurementId}`, measurementData);
  }

  async deleteMeasurement(projectId: string, measurementId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/projects/${projectId}/measurements/${measurementId}`);
  }

  // === Report API ===
  async getReports(
    projectId: string,
    params: {
      limit?: number;
      nextToken?: string;
      type?: 'mrv' | 'environmental' | 'performance' | 'compliance';
      status?: 'pending' | 'processing' | 'completed' | 'failed';
    } = {}
  ): Promise<ApiResponse<{ reports: any[]; pagination: any; summary: any }>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });
    
    const queryString = searchParams.toString();
    return this.get<{ reports: any[]; pagination: any; summary: any }>(
      `/api/projects/${projectId}/reports${queryString ? `?${queryString}` : ''}`
    );
  }

  async getReport(projectId: string, reportId: string): Promise<ApiResponse<{ report: any }>> {
    return this.get<{ report: any }>(`/api/projects/${projectId}/reports/${reportId}`);
  }

  async generateReport(projectId: string, reportData: any): Promise<ApiResponse<{ report: any }>> {
    return this.post<{ report: any }>(`/api/projects/${projectId}/reports`, reportData);
  }

  async deleteReport(projectId: string, reportId: string): Promise<ApiResponse<void>> {
    return this.delete<void>(`/api/projects/${projectId}/reports/${reportId}`);
  }

  async downloadReport(projectId: string, reportId: string): Promise<ApiResponse<{ downloadUrl: string; filename: string; fileSize: number }>> {
    return this.get<{ downloadUrl: string; filename: string; fileSize: number }>(`/api/projects/${projectId}/reports/${reportId}/download`);
  }

  // === Analytics API ===
  async getProjectAnalytics(
    projectId: string,
    period: '7d' | '30d' | '90d' | '1y' = '30d'
  ): Promise<ApiResponse<any>> {
    return this.get<any>(`/api/projects/${projectId}/analytics?period=${period}`);
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
    return this.get<any>('/api/health');
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