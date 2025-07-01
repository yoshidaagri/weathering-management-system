'use client';

import { useAuthStore } from '@/lib/auth-store';
import AuthLayout from '@/components/AuthLayout';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated()) {
    return <AuthLayout onAuthSuccess={() => window.location.reload()} />;
  }

  return <Dashboard />;
}