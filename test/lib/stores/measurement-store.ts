import { create } from 'zustand';
import { MeasurementData, apiClient } from '../api-client';
import { mockApiClient, useMockApi } from '../mock-api';

interface MeasurementState {
  // State
  measurements: MeasurementData[];
  realtimeData: MeasurementData | null;
  isLoading: boolean;
  error: string | null;
  isLiveMonitoring: boolean;
  
  // Actions
  fetchMeasurements: (projectId: string, startDate?: string, endDate?: string) => Promise<void>;
  addMeasurement: (projectId: string, measurement: Omit<MeasurementData, 'id' | 'projectId'>) => Promise<void>;
  addMeasurementBatch: (projectId: string, measurements: Omit<MeasurementData, 'id' | 'projectId'>[]) => Promise<void>;
  startLiveMonitoring: (projectId: string) => void;
  stopLiveMonitoring: () => void;
  clearMeasurements: () => void;
  clearError: () => void;
  
  // Getters
  getLatestMeasurement: () => MeasurementData | null;
  getAverageValue: (field: keyof Pick<MeasurementData, 'pH' | 'temperature' | 'flowRate' | 'co2Absorption' | 'efficiency'>) => number;
  getMeasurementsByDateRange: (startDate: string, endDate: string) => MeasurementData[];
  getTrendData: (field: keyof Pick<MeasurementData, 'pH' | 'temperature' | 'flowRate' | 'co2Absorption' | 'efficiency'>, hours: number) => Array<{ timestamp: string; value: number }>;
}

export const useMeasurementStore = create<MeasurementState>((set, get) => ({
  // Initial state
  measurements: [],
  realtimeData: null,
  isLoading: false,
  error: null,
  isLiveMonitoring: false,

  // Actions
  fetchMeasurements: async (projectId: string, startDate?: string, endDate?: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const client = useMockApi ? mockApiClient : apiClient;
      const response = await client.getMeasurements(projectId, startDate, endDate, 1, 1000);
      
      if (response.success && response.data) {
        // APIレスポンスとMockレスポンスの型を統一
        const measurements = 'measurements' in response.data 
          ? response.data.measurements 
          : 'items' in response.data 
            ? response.data.items 
            : [];
        
        set({ 
          measurements,
          isLoading: false 
        });
      } else {
        set({ 
          error: response.error || '測定データの取得に失敗しました',
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '測定データの取得に失敗しました',
        isLoading: false 
      });
    }
  },

  addMeasurement: async (projectId: string, measurement: Omit<MeasurementData, 'id' | 'projectId'>) => {
    set({ isLoading: true, error: null });
    
    try {
      const client = useMockApi ? mockApiClient : apiClient;
      const response = await client.createMeasurement(projectId, measurement);
      
      if (response.success && response.data) {
        const { measurements } = get();
        const newData = 'measurement' in response.data ? response.data.measurement : response.data;
        const newMeasurements = [newData, ...measurements]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        set({ 
          measurements: newMeasurements,
          realtimeData: newData,
          isLoading: false 
        });
      } else {
        set({ 
          error: response.error || '測定データの追加に失敗しました',
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '測定データの追加に失敗しました',
        isLoading: false 
      });
    }
  },

  addMeasurementBatch: async (projectId: string, measurements: Omit<MeasurementData, 'id' | 'projectId'>[]) => {
    set({ isLoading: true, error: null });
    
    try {
      const client = useMockApi ? mockApiClient : apiClient;
      // @ts-ignore - API型定義の不整合を一時的に回避
      const response = await client.createMeasurementBatch(projectId, measurements);
      
      if (response.success && response.data) {
        const { measurements: currentMeasurements } = get();
        const allMeasurements = [...response.data, ...currentMeasurements]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        set({ 
          measurements: allMeasurements,
          isLoading: false 
        });
      } else {
        set({ 
          error: response.error || 'バッチデータの追加に失敗しました',
          isLoading: false 
        });
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'バッチデータの追加に失敗しました',
        isLoading: false 
      });
    }
  },

  startLiveMonitoring: (projectId: string) => {
    set({ isLiveMonitoring: true });
    
    // リアルタイムデータのシミュレーション
    const interval = setInterval(() => {
      const { isLiveMonitoring } = get();
      if (!isLiveMonitoring) {
        clearInterval(interval);
        return;
      }

      // モックデータ生成
      const now = new Date();
      const mockData: MeasurementData = {
        id: `realtime-${Date.now()}`,
        projectId,
        timestamp: now.toISOString(),
        pH: 7.0 + (Math.random() - 0.5) * 1.0,
        temperature: 20 + Math.random() * 10,
        flowRate: 80 + Math.random() * 20,
        co2Absorption: 40 + Math.random() * 30,
        metalConcentration: {
          iron: Math.random() * 50,
          copper: Math.random() * 30,
          zinc: Math.random() * 20,
        },
        efficiency: 85 + Math.random() * 15,
      };

      const { measurements } = get();
      const newMeasurements = [mockData, ...measurements].slice(0, 1000); // 最新1000件を保持

      set({ 
        measurements: newMeasurements,
        realtimeData: mockData 
      });
    }, 5000); // 5秒ごとに更新
  },

  stopLiveMonitoring: () => {
    set({ isLiveMonitoring: false });
  },

  clearMeasurements: () => {
    set({ measurements: [], realtimeData: null });
  },

  clearError: () => {
    set({ error: null });
  },

  // Getters
  getLatestMeasurement: () => {
    const { measurements } = get();
    return measurements.length > 0 ? measurements[0] : null;
  },

  getAverageValue: (field) => {
    const { measurements } = get();
    if (measurements.length === 0) return 0;
    
    const sum = measurements.reduce((acc, measurement) => acc + measurement[field], 0);
    return sum / measurements.length;
  },

  getMeasurementsByDateRange: (startDate: string, endDate: string) => {
    const { measurements } = get();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return measurements.filter(measurement => {
      const date = new Date(measurement.timestamp);
      return date >= start && date <= end;
    });
  },

  getTrendData: (field, hours) => {
    const { measurements } = get();
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    return measurements
      .filter(m => new Date(m.timestamp) >= cutoffTime)
      .map(m => ({
        timestamp: m.timestamp,
        value: m[field],
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },
}));