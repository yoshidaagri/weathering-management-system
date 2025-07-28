import { 
  Customer, 
  CreateCustomerRequest, 
  UpdateCustomerRequest, 
  CustomerQuery, 
  CustomerListResponse,
  ApiResponse 
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://3jng8xwirl.execute-api.ap-northeast-1.amazonaws.com/prod';
const USE_MOCK_API = process.env.NODE_ENV === 'development' || !process.env.NEXT_PUBLIC_API_BASE_URL;

// モックデータ
const mockCustomers: Customer[] = [
  {
    customerId: 'customer-001',
    companyName: '株式会社グリーンテック',
    industry: 'mining',
    status: 'active',
    contactInfo: {
      email: 'contact@greentech.co.jp',
      phone: '03-1234-5678',
      address: '東京都港区芝公園1-2-3'
    },
    projectCount: 3,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-07-20T14:30:00Z'
  },
  {
    customerId: 'customer-002',
    companyName: 'エコマイニング株式会社',
    industry: 'mining',
    status: 'active',
    contactInfo: {
      email: 'info@ecomining.jp',
      phone: '06-9876-5432',
      address: '大阪府大阪市中央区本町2-4-5'
    },
    projectCount: 1,
    createdAt: '2024-02-20T10:15:00Z',
    updatedAt: '2024-07-25T16:45:00Z'
  },
  {
    customerId: 'customer-003',
    companyName: 'サステナブル工業',
    industry: 'manufacturing',
    status: 'inactive',
    contactInfo: {
      email: 'contact@sustainable.com',
      phone: '052-1111-2222',
      address: '愛知県名古屋市中区栄3-6-7'
    },
    projectCount: 0,
    createdAt: '2024-03-10T11:20:00Z',
    updatedAt: '2024-06-15T09:10:00Z'
  }
];

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private mockData: Customer[] = [...mockCustomers];

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        if (response.status === 401) {
          // 認証エラーの場合はログアウト処理
          this.handleAuthError();
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  private handleAuthError() {
    // 認証エラー時の処理（ログアウト等）
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  }

  // 顧客管理API
  async getCustomers(query?: CustomerQuery): Promise<CustomerListResponse> {
    if (USE_MOCK_API) {
      return this.mockGetCustomers(query);
    }

    const searchParams = new URLSearchParams();
    
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.nextToken) searchParams.set('nextToken', query.nextToken);
    if (query?.status) searchParams.set('status', query.status);
    if (query?.industry) searchParams.set('industry', query.industry);
    if (query?.search) searchParams.set('search', query.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/customers${queryString ? `?${queryString}` : ''}`;
    
    return this.request<CustomerListResponse>(endpoint);
  }

  async getCustomer(customerId: string): Promise<{ customer: Customer }> {
    if (USE_MOCK_API) {
      return this.mockGetCustomer(customerId);
    }
    return this.request<{ customer: Customer }>(`/api/customers/${customerId}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<{ customer: Customer; message: string }> {
    if (USE_MOCK_API) {
      return this.mockCreateCustomer(data);
    }
    return this.request<{ customer: Customer; message: string }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(
    customerId: string, 
    data: UpdateCustomerRequest
  ): Promise<{ customer: Customer; message: string }> {
    if (USE_MOCK_API) {
      return this.mockUpdateCustomer(customerId, data);
    }
    return this.request<{ customer: Customer; message: string }>(`/api/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(customerId: string): Promise<{ message: string }> {
    if (USE_MOCK_API) {
      return this.mockDeleteCustomer(customerId);
    }
    return this.request<{ message: string }>(`/api/customers/${customerId}`, {
      method: 'DELETE',
    });
  }

  // ヘルスチェック
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    if (USE_MOCK_API) {
      return {
        status: 'ok',
        timestamp: new Date().toISOString()
      };
    }
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  // モックAPI実装
  private async mockGetCustomers(query?: CustomerQuery): Promise<CustomerListResponse> {
    // 遅延シミュレーション
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredCustomers = [...this.mockData];

    // フィルタリング
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.companyName.toLowerCase().includes(searchLower) ||
        customer.contactInfo.email.toLowerCase().includes(searchLower)
      );
    }

    if (query?.status) {
      filteredCustomers = filteredCustomers.filter(customer => customer.status === query.status);
    }

    if (query?.industry) {
      filteredCustomers = filteredCustomers.filter(customer => customer.industry === query.industry);
    }

    const limit = query?.limit || 10;
    const customers = filteredCustomers.slice(0, limit);

    return {
      customers,
      nextToken: filteredCustomers.length > limit ? 'mock-next-token' : undefined,
      total: filteredCustomers.length
    };
  }

  private async mockGetCustomer(customerId: string): Promise<{ customer: Customer }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const customer = this.mockData.find(c => c.customerId === customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    return { customer };
  }

  private async mockCreateCustomer(data: CreateCustomerRequest): Promise<{ customer: Customer; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newCustomer: Customer = {
      customerId: `customer-${Date.now()}`,
      companyName: data.companyName,
      industry: data.industry,
      status: data.status,
      contactInfo: data.contactInfo,
      projectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.mockData.unshift(newCustomer);
    
    return {
      customer: newCustomer,
      message: '顧客を正常に登録しました'
    };
  }

  private async mockUpdateCustomer(customerId: string, data: UpdateCustomerRequest): Promise<{ customer: Customer; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = this.mockData.findIndex(c => c.customerId === customerId);
    if (index === -1) {
      throw new Error('Customer not found');
    }
    
    const updatedCustomer: Customer = {
      ...this.mockData[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.mockData[index] = updatedCustomer;
    
    return {
      customer: updatedCustomer,
      message: '顧客情報を正常に更新しました'
    };
  }

  private async mockDeleteCustomer(customerId: string): Promise<{ message: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockData.findIndex(c => c.customerId === customerId);
    if (index === -1) {
      throw new Error('Customer not found');
    }
    
    this.mockData.splice(index, 1);
    
    return {
      message: '顧客を正常に削除しました'
    };
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
export default apiClient;