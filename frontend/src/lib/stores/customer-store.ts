import { create } from 'zustand';
import { Customer, CustomerQuery, CreateCustomerRequest, UpdateCustomerRequest } from '@/types';
import { apiClient } from '@/lib/api-client';

interface CustomerStore {
  // 状態
  customers: Customer[];
  currentCustomer: Customer | null;
  nextToken?: string;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  
  // フィルタ・検索状態
  filters: {
    search: string;
    status?: 'active' | 'inactive';
    industry?: string;
  };

  // アクション
  fetchCustomers: (query?: CustomerQuery, append?: boolean) => Promise<void>;
  fetchCustomer: (customerId: string) => Promise<void>;
  createCustomer: (data: CreateCustomerRequest) => Promise<Customer>;
  updateCustomer: (customerId: string, data: UpdateCustomerRequest) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  
  // UI状態管理
  setFilters: (filters: Partial<CustomerStore['filters']>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  // 初期状態
  customers: [],
  currentCustomer: null,
  nextToken: undefined,
  totalCount: 0,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    status: undefined,
    industry: undefined,
  },

  // 顧客一覧取得
  fetchCustomers: async (query?: CustomerQuery, append = false) => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters } = get();
      
      const searchQuery: CustomerQuery = {
        limit: 20,
        search: filters.search || undefined,
        status: filters.status,
        industry: filters.industry,
        ...query,
      };

      const response = await apiClient.getCustomers(searchQuery);
      
      set(state => ({
        customers: append ? [...state.customers, ...response.customers] : response.customers,
        nextToken: response.nextToken,
        totalCount: response.totalCount || response.customers.length,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '顧客一覧の取得に失敗しました',
      });
      throw error;
    }
  },

  // 顧客詳細取得
  fetchCustomer: async (customerId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.getCustomer(customerId);
      
      set({
        currentCustomer: response.customer,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        currentCustomer: null,
        isLoading: false,
        error: error.message || '顧客情報の取得に失敗しました',
      });
      throw error;
    }
  },

  // 顧客作成
  createCustomer: async (data: CreateCustomerRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.createCustomer(data);
      
      // 既存リストに追加
      set(state => ({
        customers: [response.customer, ...state.customers],
        totalCount: state.totalCount + 1,
        isLoading: false,
        error: null,
      }));
      
      return response.customer;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '顧客の作成に失敗しました',
      });
      throw error;
    }
  },

  // 顧客更新
  updateCustomer: async (customerId: string, data: UpdateCustomerRequest) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await apiClient.updateCustomer(customerId, data);
      
      // リストとcurrentCustomerを更新
      set(state => ({
        customers: state.customers.map(customer =>
          customer.customerId === customerId ? response.customer : customer
        ),
        currentCustomer: state.currentCustomer?.customerId === customerId 
          ? response.customer 
          : state.currentCustomer,
        isLoading: false,
        error: null,
      }));
      
      return response.customer;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '顧客の更新に失敗しました',
      });
      throw error;
    }
  },

  // 顧客削除
  deleteCustomer: async (customerId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      await apiClient.deleteCustomer(customerId);
      
      // リストから削除
      set(state => ({
        customers: state.customers.filter(customer => customer.customerId !== customerId),
        currentCustomer: state.currentCustomer?.customerId === customerId 
          ? null 
          : state.currentCustomer,
        totalCount: state.totalCount - 1,
        isLoading: false,
        error: null,
      }));
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '顧客の削除に失敗しました',
      });
      throw error;
    }
  },

  // フィルタ設定
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
    }));
  },

  // エラークリア
  clearError: () => {
    set({ error: null });
  },

  // ローディング設定
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  // リセット
  reset: () => {
    set({
      customers: [],
      currentCustomer: null,
      nextToken: undefined,
      totalCount: 0,
      isLoading: false,
      error: null,
      filters: {
        search: '',
        status: undefined,
        industry: undefined,
      },
    });
  },
}));