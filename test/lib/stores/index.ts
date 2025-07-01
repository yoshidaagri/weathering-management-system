// Store exports for easy importing
export { useAuthStore } from '../auth-store';
export { useProjectStore } from './project-store';
export { useMeasurementStore } from './measurement-store';
export { useUIStore, useNotifications } from './ui-store';
export type { DashboardView, Theme } from './ui-store';

// Combined store hooks for common patterns
export const useAppState = () => {
  const auth = useAuthStore();
  const projects = useProjectStore();
  const measurements = useMeasurementStore();
  const ui = useUIStore();
  const notifications = useNotifications();

  return {
    auth,
    projects,
    measurements,
    ui,
    notifications,
  };
};