import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DashboardView = 'monitoring' | 'projects' | 'analysis' | 'reports';
export type Theme = 'light' | 'dark';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  autoClose?: boolean;
}

interface UIState {
  // State
  currentView: DashboardView;
  theme: Theme;
  sidebarCollapsed: boolean;
  notifications: Notification[];
  isLoading: boolean;
  
  // Actions
  setCurrentView: (view: DashboardView) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  setLoading: (loading: boolean) => void;
  
  // Getters
  getUnreadNotificationsCount: () => number;
  getNotificationsByType: (type: Notification['type']) => Notification[];
  getRecentNotifications: (limit: number) => Notification[];
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentView: 'monitoring',
      theme: 'light',
      sidebarCollapsed: false,
      notifications: [],
      isLoading: false,

      // Actions
      setCurrentView: (view: DashboardView) => {
        set({ currentView: view });
      },

      setTheme: (theme: Theme) => {
        set({ theme });
        
        // DOM要素のクラスを更新
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          if (theme === 'dark') {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      toggleSidebar: () => {
        const { sidebarCollapsed } = get();
        set({ sidebarCollapsed: !sidebarCollapsed });
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      addNotification: (notification) => {
        const { notifications } = get();
        const newNotification: Notification = {
          ...notification,
          id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };

        set({ notifications: [newNotification, ...notifications] });

        // 自動削除の設定
        if (notification.autoClose !== false) {
          setTimeout(() => {
            get().removeNotification(newNotification.id);
          }, 5000);
        }
      },

      markNotificationAsRead: (id: string) => {
        const { notifications } = get();
        const updatedNotifications = notifications.map(notification =>
          notification.id === id ? { ...notification, read: true } : notification
        );
        set({ notifications: updatedNotifications });
      },

      removeNotification: (id: string) => {
        const { notifications } = get();
        const updatedNotifications = notifications.filter(notification => notification.id !== id);
        set({ notifications: updatedNotifications });
      },

      clearAllNotifications: () => {
        set({ notifications: [] });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Getters
      getUnreadNotificationsCount: () => {
        const { notifications } = get();
        return notifications.filter(notification => !notification.read).length;
      },

      getNotificationsByType: (type: Notification['type']) => {
        const { notifications } = get();
        return notifications.filter(notification => notification.type === type);
      },

      getRecentNotifications: (limit: number) => {
        const { notifications } = get();
        return notifications
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      },
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        currentView: state.currentView,
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// 通知用のヘルパー関数
export const useNotifications = () => {
  const { addNotification, markNotificationAsRead, removeNotification } = useUIStore();

  const showSuccess = (title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message,
      autoClose: true,
    });
  };

  const showError = (title: string, message: string) => {
    addNotification({
      type: 'error',
      title,
      message,
      autoClose: false,
    });
  };

  const showWarning = (title: string, message: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      autoClose: false,
    });
  };

  const showInfo = (title: string, message: string) => {
    addNotification({
      type: 'info',
      title,
      message,
      autoClose: true,
    });
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    markAsRead: markNotificationAsRead,
    remove: removeNotification,
  };
};