'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import Header from './Header';
import Sidebar from './Sidebar';
import MonitoringDashboard from './MonitoringDashboard';
import ProjectManagement from './ProjectManagement';
import PlanActualAnalysis from './PlanActualAnalysis';
import ReportGeneration from './ReportGeneration';

type DashboardView = 'monitoring' | 'projects' | 'analysis' | 'reports';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<DashboardView>('monitoring');
  const { user } = useAuthStore();

  const renderContent = () => {
    switch (currentView) {
      case 'monitoring':
        return <MonitoringDashboard />;
      case 'projects':
        return <ProjectManagement />;
      case 'analysis':
        return <PlanActualAnalysis />;
      case 'reports':
        return <ReportGeneration />;
      default:
        return <MonitoringDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={user} />
      
      <div className="flex">
        <Sidebar 
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}