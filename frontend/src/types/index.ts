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

// 測定データ関連型定義
export interface MeasurementData {
  measurementId: string;
  projectId: string;
  timestamp: string;
  type: 'water_quality' | 'atmospheric' | 'soil';
  location: {
    latitude: number;
    longitude: number;
    siteName?: string;
  };
  values: {
    // 水質データ
    ph?: number;
    temperature?: number;      // ℃
    turbidity?: number;        // NTU
    conductivity?: number;     // μS/cm
    dissolvedOxygen?: number;  // mg/L
    
    // 大気データ  
    co2Concentration?: number; // ppm
    humidity?: number;         // %
    airPressure?: number;      // hPa
    windSpeed?: number;        // m/s
    
    // 土壌データ
    soilPH?: number;
    soilMoisture?: number;    // %
    organicMatter?: number;   // %
    
    // 重金属濃度
    iron?: number;            // mg/L
    copper?: number;          // mg/L
    zinc?: number;            // mg/L
    lead?: number;            // mg/L
    cadmium?: number;         // mg/L
    
    // 流量・処理量
    flowRate?: number;        // L/min
    processedVolume?: number; // L
    
    // CO2除去関連
    co2Captured?: number;     // kg
    mineralPrecipitation?: number; // kg
  };
  qualityFlags: {
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    calibrationStatus: 'calibrated' | 'needs_calibration';
    anomalyDetected: boolean;
  };
  alertLevel: 'normal' | 'warning' | 'critical';
  notes?: string;
  operatorId?: string;
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeasurementRequest {
  projectId: string;
  timestamp: string;
  type: 'water_quality' | 'atmospheric' | 'soil';
  location: {
    latitude: number;
    longitude: number;
    siteName?: string;
  };
  values: Partial<MeasurementData['values']>;
  qualityFlags?: Partial<MeasurementData['qualityFlags']>;
  notes?: string;
  operatorId?: string;
  deviceId?: string;
}

export interface UpdateMeasurementRequest {
  timestamp?: string;
  type?: 'water_quality' | 'atmospheric' | 'soil';
  location?: {
    latitude?: number;
    longitude?: number;
    siteName?: string;
  };
  values?: Partial<MeasurementData['values']>;
  qualityFlags?: Partial<MeasurementData['qualityFlags']>;
  notes?: string;
  operatorId?: string;
  deviceId?: string;
}

export interface MeasurementQuery {
  limit?: number;
  nextToken?: string;
  type?: 'water_quality' | 'atmospheric' | 'soil';
  startDate?: string;
  endDate?: string;
  alertLevel?: 'normal' | 'warning' | 'critical';
  search?: string;
}

export interface MeasurementListResponse {
  measurements: MeasurementData[];
  nextToken?: string;
  total?: number;
}

// CSV取り込み関連型定義
export interface CSVImportRequest {
  projectId: string;
  measurements: CreateMeasurementRequest[];
  importOptions: {
    batchSize: number;
    duplicateHandling: 'skip' | 'overwrite' | 'error';
    deviceId?: string;
    operatorId?: string;
  };
}

export interface CSVImportResponse {
  success: boolean;
  totalRows: number;
  successCount: number;
  errorCount: number;
  skipCount: number;
  errors: Array<{
    row: number;
    message: string;
    data?: any;
  }>;
  importId: string;
}

export interface CSVColumnMapping {
  timestamp: string;
  type?: string;
  latitude?: string;
  longitude?: string;
  siteName?: string;
  ph?: string;
  temperature?: string;
  turbidity?: string;
  conductivity?: string;
  dissolvedOxygen?: string;
  co2Concentration?: string;
  humidity?: string;
  airPressure?: string;
  windSpeed?: string;
  soilPH?: string;
  soilMoisture?: string;
  organicMatter?: string;
  iron?: string;
  copper?: string;
  zinc?: string;
  lead?: string;
  cadmium?: string;
  flowRate?: string;
  processedVolume?: string;
  co2Captured?: string;
  mineralPrecipitation?: string;
  notes?: string;
  operatorId?: string;
  deviceId?: string;
}

export interface CSVValidationSettings {
  skipInvalidRows: boolean;
  dateFormat: string;
  numberFormat: 'decimal' | 'comma';
  requiredColumns: string[];
}

export interface CSVPreviewData {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
  previewRows: number;
}

// アラート関連型定義
export interface AlertRule {
  ruleId: string;
  projectId: string;
  parameter: keyof MeasurementData['values'];
  condition: {
    operator: '>' | '<' | '=' | '!=' | 'between';
    threshold: number | [number, number];
    duration: number; // 継続時間（分）
  };
  severity: 'warning' | 'critical';
  enabled: boolean;
  notificationMethods: ('email' | 'sms' | 'dashboard')[];
  recipients: string[];
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertHistory {
  alertId: string;
  ruleId: string;
  projectId: string;
  measurementId: string;
  severity: 'warning' | 'critical';
  parameter: string;
  value: number;
  threshold: number | [number, number];
  message: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  notes?: string;
  createdAt: string;
}