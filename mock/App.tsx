// App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Main from './components/Main';
import Menu from './components/Menu';  // 追加
import SimulationDashboard from './components/SimulationDashboard';
import MeasurementDashboard from './components/MeasurementDashboard';
import PlanActualDashboard from './components/PlanActualDashboard';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />}>
          {/* メインメニューを初期画面に */}
          <Route index element={<Menu />} />
          <Route path="simulation" element={<SimulationDashboard />} />
          <Route path="measurement" element={<MeasurementDashboard />} />
          <Route path="plan-actual" element={<PlanActualDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;