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
  total?: number;
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

// プロジェクト関連
export interface Project {
  projectId: string;
  projectName: string;
  description: string;
  customerId: string;
  customerName?: string; // UI表示用（結合データ）
  location: {
    prefecture: string;
    city: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  projectType: 'co2_removal' | 'wastewater_treatment' | 'combined';
  targetMetrics: {
    co2RemovalTarget?: number; // トン/年
    wastewaterVolumeTarget?: number; // m³/日
    processingCapacity?: number;
  };
  timeline: {
    startDate: string;
    endDate: string;
    milestones?: Array<{
      id: string;
      name: string;
      targetDate: string;
      status: 'pending' | 'in_progress' | 'completed';
    }>;
  };
  budget: {
    totalBudget: number;
    usedBudget?: number;
    currency: 'JPY' | 'USD';
  };
  status: 'planning' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  tags?: string[];
  assignedPersonnel?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  projectName: string;
  description: string;
  customerId: string;
  location: {
    prefecture: string;
    city: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  projectType: 'co2_removal' | 'wastewater_treatment' | 'combined';
  targetMetrics: {
    co2RemovalTarget?: number;
    wastewaterVolumeTarget?: number;
    processingCapacity?: number;
  };
  timeline: {
    startDate: string;
    endDate: string;
  };
  budget: {
    totalBudget: number;
    currency: 'JPY' | 'USD';
  };
  status?: 'planning' | 'active';
  tags?: string[];
  assignedPersonnel?: string[];
}

export interface UpdateProjectRequest {
  projectName?: string;
  description?: string;
  location?: {
    prefecture?: string;
    city?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  projectType?: 'co2_removal' | 'wastewater_treatment' | 'combined';
  targetMetrics?: {
    co2RemovalTarget?: number;
    wastewaterVolumeTarget?: number;
    processingCapacity?: number;
  };
  timeline?: {
    startDate?: string;
    endDate?: string;
  };
  budget?: {
    totalBudget?: number;
    usedBudget?: number;
    currency?: 'JPY' | 'USD';
  };
  status?: 'planning' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  tags?: string[];
  assignedPersonnel?: string[];
}

export interface ProjectQuery {
  limit?: number;
  nextToken?: string;
  customerId?: string;
  status?: 'planning' | 'active' | 'completed' | 'cancelled' | 'on_hold';
  projectType?: 'co2_removal' | 'wastewater_treatment' | 'combined';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProjectListResponse {
  projects: Project[];
  nextToken?: string;
  total?: number;
}