// 基本型定義
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

export interface CreateCustomerRequest {
  companyName: string;
  contactInfo: {
    email: string;
    phone: string;
    address: string;
  };
  industry: string;
  status?: 'active' | 'inactive';
}

export interface UpdateCustomerRequest {
  companyName?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  industry?: string;
  status?: 'active' | 'inactive';
}

export interface CustomerQuery {
  limit?: number;
  nextToken?: string;
  status?: 'active' | 'inactive';
  industry?: string;
  search?: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  nextToken?: string;
  totalCount?: number;
}

// APIレスポンス型
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

// 認証関連
export interface AuthUser {
  username: string;
  email: string;
  attributes?: Record<string, string>;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  idToken: string | null;
}

// UI状態管理
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
}

// プロジェクト関連（将来使用）
export interface Project {
  projectId: string;
  name: string;
  description: string;
  customerId: string;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}