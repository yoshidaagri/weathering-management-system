// モックAPIデータ - 開発・テスト用
import { Project, MeasurementData, Customer, PaginatedResponse, ApiResponse } from './api-client';

// モックデータ
const mockCustomers: Customer[] = [
  {
    customerId: 'customer-1',
    companyName: '北海道鉱業株式会社',
    contactInfo: {
      email: 'tanaka@hokkaido-mining.co.jp',
      phone: '011-123-4567',
      address: '北海道札幌市中央区...',
    },
    industry: '鉱業',
    projectCount: 2,
    status: 'active',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-06-01T10:30:00Z',
  },
  {
    customerId: 'customer-2',
    companyName: '東北資源開発',
    contactInfo: {
      email: 'sato@tohoku-shigen.com',
      phone: '022-987-6543',
      address: '宮城県仙台市青葉区...',
    },
    industry: '鉱業',
    projectCount: 1,
    status: 'active',
    createdAt: '2024-02-01T14:20:00Z',
    updatedAt: '2024-05-15T16:45:00Z',
  },
];

const mockProjects: Project[] = [
  {
    id: 'project-1',
    customerId: 'customer-1',
    name: '鉱山A 風化促進プロジェクト',
    location: '北海道',
    status: 'active',
    startDate: '2024-01-15',
    endDate: '2024-12-31',
    co2Target: 50000,
    co2Achieved: 32000,
    description: '鉱山廃水を利用したCO2除去プロジェクト',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-06-30T15:20:00Z',
  },
  {
    id: 'project-2',
    customerId: 'customer-1',
    name: '鉱山B CO2除去システム',
    location: '岩手県',
    status: 'planning',
    startDate: '2024-03-01',
    endDate: '2025-02-28',
    co2Target: 75000,
    co2Achieved: 0,
    description: '新規CO2除去システムの導入',
    createdAt: '2024-02-10T11:30:00Z',
    updatedAt: '2024-06-15T09:45:00Z',
  },
  {
    id: 'project-3',
    customerId: 'customer-2',
    name: '鉱山C 廃水処理事業',
    location: '秋田県',
    status: 'active',
    startDate: '2023-06-01',
    endDate: '2024-05-31',
    co2Target: 30000,
    co2Achieved: 28500,
    description: '既存施設の効率化プロジェクト',
    createdAt: '2023-05-15T13:15:00Z',
    updatedAt: '2024-06-25T11:30:00Z',
  },
];

const generateMockMeasurements = (projectId: string, count: number = 50): MeasurementData[] => {
  const measurements: MeasurementData[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000)); // 1時間ごと
    
    measurements.push({
      id: `measurement-${projectId}-${i}`,
      projectId,
      timestamp: timestamp.toISOString(),
      pH: 7.0 + (Math.random() - 0.5) * 1.0, // 6.5 - 7.5
      temperature: 20 + Math.random() * 10, // 20-30°C
      flowRate: 80 + Math.random() * 20, // 80-100 L/min
      co2Absorption: 40 + Math.random() * 30, // 40-70 kg/h
      metalConcentration: {
        iron: Math.random() * 50,
        copper: Math.random() * 30,
        zinc: Math.random() * 20,
      },
      efficiency: 85 + Math.random() * 15, // 85-100%
    });
  }
  
  return measurements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// モックAPIクラス
export class MockApiClient {
  private delay(ms: number = 500): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    return {
      items: paginatedItems,
      total: items.length,
      page,
      pageSize,
      totalPages: Math.ceil(items.length / pageSize),
    };
  }

  // === Customer API ===
  async getCustomers(page: number = 1, pageSize: number = 20): Promise<ApiResponse<PaginatedResponse<Customer>>> {
    await this.delay();
    return {
      success: true,
      data: this.paginate(mockCustomers, page, pageSize),
    };
  }

  async getCustomer(customerId: string): Promise<ApiResponse<Customer>> {
    await this.delay();
    const customer = mockCustomers.find(c => c.customerId === customerId);
    
    if (!customer) {
      return {
        success: false,
        error: '顧客が見つかりません',
      };
    }

    return {
      success: true,
      data: customer,
    };
  }

  async createCustomer(customer: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    await this.delay();
    
    const newCustomer: Customer = {
      ...customer,
      customerId: `customer-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockCustomers.push(newCustomer);

    return {
      success: true,
      data: newCustomer,
    };
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
    await this.delay();
    
    let filteredProjects = mockProjects;
    if (params.customerId) {
      filteredProjects = mockProjects.filter(p => p.customerId === params.customerId);
    }
    if (params.status) {
      filteredProjects = filteredProjects.filter(p => p.status === params.status);
    }
    if (params.search) {
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(params.search!.toLowerCase()) ||
        p.location.toLowerCase().includes(params.search!.toLowerCase())
      );
    }

    const limit = params.limit || 20;
    const paginatedData = this.paginate(filteredProjects, 1, limit);

    return {
      success: true,
      data: {
        projects: paginatedData.items,
        pagination: {
          total: paginatedData.total,
          page: paginatedData.page,
          pageSize: paginatedData.pageSize,
          totalPages: paginatedData.totalPages,
        }
      },
    };
  }

  async getProject(projectId: string): Promise<ApiResponse<{ project: Project }>> {
    await this.delay();
    const project = mockProjects.find(p => p.id === projectId);
    
    if (!project) {
      return {
        success: false,
        error: 'プロジェクトが見つかりません',
      };
    }

    return {
      success: true,
      data: { project },
    };
  }

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'co2Achieved'>): Promise<ApiResponse<{ project: Project }>> {
    await this.delay();
    
    const newProject: Project = {
      ...project,
      id: `project-${Date.now()}`,
      co2Achieved: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockProjects.push(newProject);

    return {
      success: true,
      data: { project: newProject },
    };
  }

  async updateProject(projectId: string, project: Partial<Project>): Promise<ApiResponse<{ project: Project }>> {
    await this.delay();
    
    const index = mockProjects.findIndex(p => p.id === projectId);
    
    if (index === -1) {
      return {
        success: false,
        error: 'プロジェクトが見つかりません',
      };
    }

    const updatedProject: Project = {
      ...mockProjects[index],
      ...project,
      updatedAt: new Date().toISOString(),
    };

    mockProjects[index] = updatedProject;

    return {
      success: true,
      data: { project: updatedProject },
    };
  }

  async deleteProject(projectId: string): Promise<ApiResponse<void>> {
    await this.delay();
    
    const index = mockProjects.findIndex(p => p.id === projectId);
    
    if (index === -1) {
      return {
        success: false,
        error: 'プロジェクトが見つかりません',
      };
    }

    mockProjects.splice(index, 1);

    return {
      success: true,
    };
  }

  // === Measurement API ===
  async getMeasurements(
    projectId: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 100
  ): Promise<ApiResponse<PaginatedResponse<MeasurementData>>> {
    await this.delay();
    
    let measurements = generateMockMeasurements(projectId, 200);
    
    // 日付フィルタリング
    if (startDate || endDate) {
      measurements = measurements.filter(m => {
        const measurementDate = new Date(m.timestamp);
        if (startDate && measurementDate < new Date(startDate)) return false;
        if (endDate && measurementDate > new Date(endDate)) return false;
        return true;
      });
    }

    return {
      success: true,
      data: this.paginate(measurements, page, pageSize),
    };
  }

  async createMeasurement(projectId: string, measurement: Omit<MeasurementData, 'id' | 'projectId'>): Promise<ApiResponse<MeasurementData>> {
    await this.delay();
    
    const newMeasurement: MeasurementData = {
      ...measurement,
      id: `measurement-${Date.now()}`,
      projectId,
    };

    return {
      success: true,
      data: newMeasurement,
    };
  }

  async createMeasurementBatch(projectId: string, measurements: Omit<MeasurementData, 'id' | 'projectId'>[]): Promise<ApiResponse<MeasurementData[]>> {
    await this.delay();
    
    const newMeasurements: MeasurementData[] = measurements.map((measurement, index) => ({
      ...measurement,
      id: `measurement-${Date.now()}-${index}`,
      projectId,
    }));

    return {
      success: true,
      data: newMeasurements,
    };
  }

  // === Analytics API ===
  async getProjectAnalytics(projectId: string, period: string = '30d'): Promise<ApiResponse<any>> {
    await this.delay();
    
    // サンプル分析データ
    const analytics = {
      summary: {
        totalCO2Removed: 32000,
        averagePH: 7.2,
        averageTemperature: 24.5,
        averageFlowRate: 89.3,
        efficiency: 92.5,
      },
      trends: {
        co2Removal: [
          { date: '2024-06-25', value: 1200 },
          { date: '2024-06-26', value: 1150 },
          { date: '2024-06-27', value: 1300 },
          { date: '2024-06-28', value: 1250 },
          { date: '2024-06-29', value: 1400 },
          { date: '2024-06-30', value: 1350 },
          { date: '2024-07-01', value: 1480 },
        ],
        ph: [
          { date: '2024-06-25', value: 7.1 },
          { date: '2024-06-26', value: 7.3 },
          { date: '2024-06-27', value: 7.2 },
          { date: '2024-06-28', value: 7.4 },
          { date: '2024-06-29', value: 7.1 },
          { date: '2024-06-30', value: 7.2 },
          { date: '2024-07-01', value: 7.3 },
        ],
      },
      alerts: [
        {
          type: 'warning',
          message: 'pH値が目標範囲を下回っています',
          timestamp: '2024-07-01T10:15:00Z',
        },
        {
          type: 'info',
          message: 'CO2吸収量が目標値を達成しました',
          timestamp: '2024-07-01T09:30:00Z',
        },
      ],
    };

    return {
      success: true,
      data: analytics,
    };
  }

  async getSystemHealth(): Promise<ApiResponse<any>> {
    await this.delay(200);
    
    return {
      success: true,
      data: {
        status: 'healthy',
        services: [
          { name: 'Database', status: 'up', latency: 45 },
          { name: 'API Gateway', status: 'up', latency: 23 },
          { name: 'Lambda Functions', status: 'up', latency: 67 },
          { name: 'S3 Storage', status: 'up', latency: 12 },
        ],
        lastChecked: new Date().toISOString(),
      },
    };
  }
}

// 開発環境用のモックAPI使用フラグ
export const useMockApi = process.env.NODE_ENV === 'development' || !process.env.API_GATEWAY_URL;

// モックAPIインスタンス
export const mockApiClient = new MockApiClient();