import { 
  Customer, 
  CreateCustomerRequest, 
  UpdateCustomerRequest, 
  CustomerQuery, 
  CustomerListResponse,
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectQuery,
  ProjectListResponse,
  MeasurementData,
  CreateMeasurementRequest,
  UpdateMeasurementRequest,
  MeasurementQuery,
  MeasurementListResponse,
  CSVImportRequest,
  CSVImportResponse,
  AlertRule,
  AlertHistory,
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

// モック プロジェクトデータ
const mockProjects: Project[] = [
  {
    projectId: 'project-001',
    projectName: '北海道石炭採掘CO2除去プロジェクト',
    description: '石炭採掘廃水を利用した風化促進によるCO2除去実証実験',
    customerId: 'customer-001',
    customerName: '株式会社グリーンテック',
    location: {
      prefecture: '北海道',
      city: '夕張市',
      address: '夕張市清水沢宮前町1-1',
      coordinates: {
        latitude: 43.0642,
        longitude: 141.9716
      }
    },
    projectType: 'co2_removal',
    targetMetrics: {
      co2RemovalTarget: 1000,
      wastewaterVolumeTarget: 500,
      processingCapacity: 200
    },
    timeline: {
      startDate: '2024-04-01T00:00:00Z',
      endDate: '2025-03-31T23:59:59Z',
      milestones: [
        {
          id: 'milestone-001',
          name: '実証実験設備設置',
          targetDate: '2024-06-30T23:59:59Z',
          status: 'completed'
        },
        {
          id: 'milestone-002',
          name: '第1期データ収集完了',
          targetDate: '2024-09-30T23:59:59Z',
          status: 'in_progress'
        }
      ]
    },
    budget: {
      totalBudget: 50000000,
      usedBudget: 20000000,
      currency: 'JPY'  
    },
    status: 'active',
    tags: ['co2-removal', 'mining', 'pilot'],
    assignedPersonnel: ['田中太郎', '佐藤花子'],
    createdAt: '2024-03-15T09:00:00Z',
    updatedAt: '2024-07-25T14:30:00Z'
  },
  {
    projectId: 'project-002', 
    projectName: '大阪工業廃水処理統合システム',
    description: '製造業廃水の処理と同時CO2除去を実現する統合システム開発',
    customerId: 'customer-002',
    customerName: 'エコマイニング株式会社',
    location: {
      prefecture: '大阪府',
      city: '堺市',
      address: '堺市西区築港浜寺町1-1',
      coordinates: {
        latitude: 34.5731,
        longitude: 135.4631
      }
    },
    projectType: 'combined',
    targetMetrics: {
      co2RemovalTarget: 800,
      wastewaterVolumeTarget: 1000,
      processingCapacity: 400
    },
    timeline: {
      startDate: '2024-06-01T00:00:00Z',
      endDate: '2025-05-31T23:59:59Z'
    },
    budget: {
      totalBudget: 75000000,
      usedBudget: 15000000,
      currency: 'JPY'
    },
    status: 'planning',
    tags: ['wastewater', 'manufacturing', 'integration'],
    assignedPersonnel: ['山田一郎'],
    createdAt: '2024-05-10T10:15:00Z',
    updatedAt: '2024-07-20T16:45:00Z'
  }
];

// モック測定データ
const mockMeasurements: MeasurementData[] = [
  {
    measurementId: 'measurement-001',
    projectId: 'project-001',
    timestamp: '2024-07-28T09:00:00Z',
    type: 'water_quality',
    location: {
      latitude: 43.0642,
      longitude: 141.9716,
      siteName: '夕張市測定ポイントA'
    },
    values: {
      ph: 7.2,
      temperature: 25.5,
      turbidity: 2.1,
      conductivity: 250,
      dissolvedOxygen: 8.5,
      co2Concentration: 400,
      iron: 0.1,
      copper: 0.05,
      zinc: 0.2,
      flowRate: 100.5
    },
    qualityFlags: {
      dataQuality: 'excellent',
      calibrationStatus: 'calibrated',
      anomalyDetected: false
    },
    alertLevel: 'normal',
    notes: '正常運転中',
    operatorId: 'operator-001',
    deviceId: 'device-001',
    createdAt: '2024-07-28T09:00:00Z',
    updatedAt: '2024-07-28T09:00:00Z'
  },
  {
    measurementId: 'measurement-002',
    projectId: 'project-001',
    timestamp: '2024-07-28T09:15:00Z',
    type: 'water_quality',
    location: {
      latitude: 43.0642,
      longitude: 141.9716,
      siteName: '夕張市測定ポイントA'
    },
    values: {
      ph: 6.9,
      temperature: 26.1,
      turbidity: 2.8,
      conductivity: 265,
      dissolvedOxygen: 8.2,
      co2Concentration: 410,
      iron: 0.15,
      copper: 0.06,
      zinc: 0.25,
      flowRate: 95.8
    },
    qualityFlags: {
      dataQuality: 'good',
      calibrationStatus: 'calibrated',
      anomalyDetected: false
    },
    alertLevel: 'warning',
    notes: 'pH値がやや低下傾向',
    operatorId: 'operator-001',
    deviceId: 'device-001',
    createdAt: '2024-07-28T09:15:00Z',
    updatedAt: '2024-07-28T09:15:00Z'
  },
  {
    measurementId: 'measurement-003',
    projectId: 'project-002',
    timestamp: '2024-07-28T10:00:00Z',
    type: 'atmospheric',
    location: {
      latitude: 34.5731,
      longitude: 135.4631,
      siteName: '堺市大気測定ポイント'
    },
    values: {
      co2Concentration: 450,
      humidity: 65,
      airPressure: 1013,
      windSpeed: 2.5,
      temperature: 28.3
    },
    qualityFlags: {
      dataQuality: 'excellent',
      calibrationStatus: 'calibrated',
      anomalyDetected: false
    },
    alertLevel: 'normal',
    notes: '通常範囲内',
    operatorId: 'operator-002',
    deviceId: 'device-002',
    createdAt: '2024-07-28T10:00:00Z',
    updatedAt: '2024-07-28T10:00:00Z'
  }
];

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private mockData: Customer[] = [...mockCustomers];
  private mockProjectData: Project[] = [...mockProjects];
  private mockMeasurementData: MeasurementData[] = [...mockMeasurements];

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

  // プロジェクト管理API
  async getProjects(query?: ProjectQuery): Promise<ProjectListResponse> {
    if (USE_MOCK_API) {
      return this.mockGetProjects(query);
    }

    const searchParams = new URLSearchParams();
    
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.nextToken) searchParams.set('nextToken', query.nextToken);
    if (query?.customerId) searchParams.set('customerId', query.customerId);
    if (query?.status) searchParams.set('status', query.status);
    if (query?.projectType) searchParams.set('projectType', query.projectType);
    if (query?.search) searchParams.set('search', query.search);
    if (query?.startDate) searchParams.set('startDate', query.startDate);
    if (query?.endDate) searchParams.set('endDate', query.endDate);

    const queryString = searchParams.toString();
    const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;
    
    return this.request<ProjectListResponse>(endpoint);
  }

  async getProject(projectId: string): Promise<{ project: Project }> {
    if (USE_MOCK_API) {
      return this.mockGetProject(projectId);
    }
    return this.request<{ project: Project }>(`/api/projects/${projectId}`);
  }

  async createProject(data: CreateProjectRequest): Promise<{ project: Project; message: string }> {
    if (USE_MOCK_API) {
      return this.mockCreateProject(data);
    }
    return this.request<{ project: Project; message: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    projectId: string, 
    data: UpdateProjectRequest
  ): Promise<{ project: Project; message: string }> {
    if (USE_MOCK_API) {
      return this.mockUpdateProject(projectId, data);
    }
    return this.request<{ project: Project; message: string }>(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(projectId: string): Promise<{ message: string }> {
    if (USE_MOCK_API) {
      return this.mockDeleteProject(projectId);
    }
    return this.request<{ message: string }>(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // 測定データ管理API
  async getMeasurements(projectId: string, query?: MeasurementQuery): Promise<MeasurementListResponse> {
    if (USE_MOCK_API) {
      return this.mockGetMeasurements(projectId, query);
    }

    const searchParams = new URLSearchParams();
    
    if (query?.limit) searchParams.set('limit', query.limit.toString());
    if (query?.nextToken) searchParams.set('nextToken', query.nextToken);
    if (query?.type) searchParams.set('type', query.type);
    if (query?.startDate) searchParams.set('startDate', query.startDate);
    if (query?.endDate) searchParams.set('endDate', query.endDate);
    if (query?.alertLevel) searchParams.set('alertLevel', query.alertLevel);
    if (query?.search) searchParams.set('search', query.search);

    const queryString = searchParams.toString();
    const endpoint = `/api/projects/${projectId}/measurements${queryString ? `?${queryString}` : ''}`;
    
    return this.request<MeasurementListResponse>(endpoint);
  }

  async getMeasurement(projectId: string, measurementId: string): Promise<{ measurement: MeasurementData }> {
    if (USE_MOCK_API) {
      return this.mockGetMeasurement(projectId, measurementId);
    }
    return this.request<{ measurement: MeasurementData }>(`/api/projects/${projectId}/measurements/${measurementId}`);
  }

  async createMeasurement(data: CreateMeasurementRequest): Promise<{ measurement: MeasurementData; message: string }> {
    if (USE_MOCK_API) {
      return this.mockCreateMeasurement(data);
    }
    return this.request<{ measurement: MeasurementData; message: string }>(`/api/projects/${data.projectId}/measurements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMeasurement(
    projectId: string,
    measurementId: string, 
    data: UpdateMeasurementRequest
  ): Promise<{ measurement: MeasurementData; message: string }> {
    if (USE_MOCK_API) {
      return this.mockUpdateMeasurement(projectId, measurementId, data);
    }
    return this.request<{ measurement: MeasurementData; message: string }>(`/api/projects/${projectId}/measurements/${measurementId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMeasurement(projectId: string, measurementId: string): Promise<{ message: string }> {
    if (USE_MOCK_API) {
      return this.mockDeleteMeasurement(projectId, measurementId);
    }
    return this.request<{ message: string }>(`/api/projects/${projectId}/measurements/${measurementId}`, {
      method: 'DELETE',
    });
  }

  // CSV一括取り込みAPI
  async importMeasurementsCSV(data: CSVImportRequest): Promise<CSVImportResponse> {
    if (USE_MOCK_API) {
      return this.mockImportMeasurementsCSV(data);
    }
    return this.request<CSVImportResponse>(`/api/projects/${data.projectId}/measurements/batch`, {
      method: 'POST',
      body: JSON.stringify(data),
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
      status: data.status || 'active',
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
      ...(data as Partial<Customer>),
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

  // プロジェクト モックAPI実装
  private async mockGetProjects(query?: ProjectQuery): Promise<ProjectListResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredProjects = [...this.mockProjectData];

    // フィルタリング
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filteredProjects = filteredProjects.filter(project =>
        project.projectName.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower) ||
        project.customerName?.toLowerCase().includes(searchLower)
      );
    }

    if (query?.status) {
      filteredProjects = filteredProjects.filter(project => project.status === query.status);
    }

    if (query?.projectType) {
      filteredProjects = filteredProjects.filter(project => project.projectType === query.projectType);
    }

    if (query?.customerId) {
      filteredProjects = filteredProjects.filter(project => project.customerId === query.customerId);
    }

    const limit = query?.limit || 10;
    const projects = filteredProjects.slice(0, limit);

    return {
      projects,
      nextToken: filteredProjects.length > limit ? 'mock-next-token' : undefined,
      total: filteredProjects.length
    };
  }

  private async mockGetProject(projectId: string): Promise<{ project: Project }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const project = this.mockProjectData.find(p => p.projectId === projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    return { project };
  }

  private async mockCreateProject(data: CreateProjectRequest): Promise<{ project: Project; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 顧客存在確認
    const customer = this.mockData.find(c => c.customerId === data.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const newProject: Project = {
      projectId: `project-${Date.now()}`,
      projectName: data.projectName,
      description: data.description,
      customerId: data.customerId,
      customerName: customer.companyName,
      location: data.location,
      projectType: data.projectType,
      targetMetrics: data.targetMetrics,
      timeline: data.timeline,
      budget: data.budget,
      status: data.status || 'planning',
      tags: data.tags || [],
      assignedPersonnel: data.assignedPersonnel || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.mockProjectData.unshift(newProject);
    
    return {
      project: newProject,
      message: 'プロジェクトを正常に登録しました'
    };
  }

  private async mockUpdateProject(projectId: string, data: UpdateProjectRequest): Promise<{ project: Project; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = this.mockProjectData.findIndex(p => p.projectId === projectId);
    if (index === -1) {
      throw new Error('Project not found');
    }
    
    const updatedProject: Project = {
      ...this.mockProjectData[index],
      ...(data as Partial<Project>),
      updatedAt: new Date().toISOString()
    };
    
    this.mockProjectData[index] = updatedProject;
    
    return {
      project: updatedProject,
      message: 'プロジェクト情報を正常に更新しました'
    };
  }

  private async mockDeleteProject(projectId: string): Promise<{ message: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockProjectData.findIndex(p => p.projectId === projectId);
    if (index === -1) {
      throw new Error('Project not found');
    }
    
    this.mockProjectData.splice(index, 1);
    
    return {
      message: 'プロジェクトを正常に削除しました'
    };
  }

  // 測定データ モックAPI実装
  private async mockGetMeasurements(projectId: string, query?: MeasurementQuery): Promise<MeasurementListResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    let filteredMeasurements = this.mockMeasurementData.filter(m => m.projectId === projectId);

    // フィルタリング
    if (query?.type) {
      filteredMeasurements = filteredMeasurements.filter(m => m.type === query.type);
    }

    if (query?.alertLevel) {
      filteredMeasurements = filteredMeasurements.filter(m => m.alertLevel === query.alertLevel);
    }

    if (query?.startDate || query?.endDate) {
      filteredMeasurements = filteredMeasurements.filter(m => {
        const measurementTime = new Date(m.timestamp).getTime();
        const start = query?.startDate ? new Date(query.startDate).getTime() : 0;
        const end = query?.endDate ? new Date(query.endDate).getTime() : Date.now();
        return measurementTime >= start && measurementTime <= end;
      });
    }

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      filteredMeasurements = filteredMeasurements.filter(m =>
        m.location.siteName?.toLowerCase().includes(searchLower) ||
        m.notes?.toLowerCase().includes(searchLower)
      );
    }

    // 日時順にソート（新しい順）
    filteredMeasurements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const limit = query?.limit || 20;
    const measurements = filteredMeasurements.slice(0, limit);

    return {
      measurements,
      nextToken: filteredMeasurements.length > limit ? 'mock-next-token' : undefined,
      total: filteredMeasurements.length
    };
  }

  private async mockGetMeasurement(projectId: string, measurementId: string): Promise<{ measurement: MeasurementData }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const measurement = this.mockMeasurementData.find(m => m.measurementId === measurementId && m.projectId === projectId);
    if (!measurement) {
      throw new Error('Measurement not found');
    }
    
    return { measurement };
  }

  private async mockCreateMeasurement(data: CreateMeasurementRequest): Promise<{ measurement: MeasurementData; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // アラートレベル自動判定
    let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
    if (data.values.ph && (data.values.ph < 6.5 || data.values.ph > 8.5)) {
      alertLevel = 'warning';
    }
    if (data.values.ph && (data.values.ph < 6.0 || data.values.ph > 9.0)) {
      alertLevel = 'critical';
    }

    const newMeasurement: MeasurementData = {
      measurementId: `measurement-${Date.now()}`,
      projectId: data.projectId,
      timestamp: data.timestamp,
      type: data.type,
      location: data.location,
      values: data.values,
      qualityFlags: {
        dataQuality: 'good',
        calibrationStatus: 'calibrated',
        anomalyDetected: alertLevel === 'critical',
        ...data.qualityFlags
      },
      alertLevel,
      notes: data.notes,
      operatorId: data.operatorId,
      deviceId: data.deviceId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.mockMeasurementData.unshift(newMeasurement);
    
    return {
      measurement: newMeasurement,
      message: '測定データを正常に登録しました'
    };
  }

  private async mockUpdateMeasurement(
    projectId: string, 
    measurementId: string, 
    data: UpdateMeasurementRequest
  ): Promise<{ measurement: MeasurementData; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const index = this.mockMeasurementData.findIndex(m => m.measurementId === measurementId && m.projectId === projectId);
    if (index === -1) {
      throw new Error('Measurement not found');
    }
    
    const updatedMeasurement: MeasurementData = {
      ...this.mockMeasurementData[index],
      ...(data as Partial<MeasurementData>),
      updatedAt: new Date().toISOString()
    };
    
    this.mockMeasurementData[index] = updatedMeasurement;
    
    return {
      measurement: updatedMeasurement,
      message: '測定データを正常に更新しました'
    };
  }

  private async mockDeleteMeasurement(projectId: string, measurementId: string): Promise<{ message: string }> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.mockMeasurementData.findIndex(m => m.measurementId === measurementId && m.projectId === projectId);
    if (index === -1) {
      throw new Error('Measurement not found');
    }
    
    this.mockMeasurementData.splice(index, 1);
    
    return {
      message: '測定データを正常に削除しました'
    };
  }

  private async mockImportMeasurementsCSV(data: CSVImportRequest): Promise<CSVImportResponse> {
    await new Promise(resolve => setTimeout(resolve, 2000)); // CSV処理時間をシミュレート
    
    const importId = `import-${Date.now()}`;
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    const errors: Array<{ row: number; message: string; data?: any }> = [];

    for (let i = 0; i < data.measurements.length; i++) {
      const measurementData = data.measurements[i];
      
      try {
        // 重複チェック
        const exists = this.mockMeasurementData.some(m => 
          m.projectId === measurementData.projectId && 
          m.timestamp === measurementData.timestamp &&
          m.location.latitude === measurementData.location.latitude &&
          m.location.longitude === measurementData.location.longitude
        );

        if (exists) {
          if (data.importOptions.duplicateHandling === 'skip') {
            skipCount++;
            continue;
          } else if (data.importOptions.duplicateHandling === 'error') {
            errors.push({
              row: i + 1,
              message: '重複するデータが存在します',
              data: measurementData
            });
            errorCount++;
            continue;
          }
        }

        // バリデーション
        if (!measurementData.timestamp) {
          errors.push({
            row: i + 1,
            message: 'タイムスタンプが必須です',
            data: measurementData
          });
          errorCount++;
          continue;
        }

        // データ作成
        const result = await this.mockCreateMeasurement(measurementData);
        successCount++;
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : '不明なエラー',
          data: measurementData
        });
        errorCount++;
      }
    }

    return {
      success: errorCount === 0,
      totalRows: data.measurements.length,
      successCount,
      errorCount,
      skipCount,
      errors,
      importId
    };
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
export default apiClient;