import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Legal from './pages/Legal';
import DataCenter from './pages/DataCenter';
import DataDetail from './pages/DataDetail';
import AnalysisList from './pages/AnalysisList';
import AnalysisDetail from './pages/AnalysisDetail';
import WorkOrderList from './pages/WorkOrderList';
import WorkOrderDetail from './pages/WorkOrderDetail';
import Dashboard from './pages/Dashboard';
import AssistantQA from './pages/AssistantQA';
import ReportList from './pages/ReportList';
import ReportDetail from './pages/ReportDetail';
import CategoryConfig from './pages/system/CategoryConfig';
import KnowledgeConfig from './pages/system/KnowledgeConfig';
import PermissionConfig from './pages/system/PermissionConfig';
import RulesConfig from './pages/system/RulesConfig';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('satoken');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/legal" element={<Legal />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/data/center" replace />} />
        <Route path="data/center" element={<DataCenter />} />
        <Route path="data/detail" element={<DataDetail />} />
        <Route path="analysis/list" element={<AnalysisList />} />
        <Route path="analysis/detail" element={<AnalysisDetail />} />
        <Route path="workorder/list" element={<WorkOrderList />} />
        <Route path="workorder/detail" element={<WorkOrderDetail />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="assistant/qa" element={<AssistantQA />} />
        <Route path="assistant/report" element={<ReportList />} />
        <Route path="assistant/report/detail" element={<ReportDetail />} />
        <Route path="system/category" element={<CategoryConfig />} />
        <Route path="system/knowledge" element={<KnowledgeConfig />} />
        <Route path="system/permission" element={<PermissionConfig />} />
        <Route path="system/rules" element={<RulesConfig />} />
      </Route>
    </Routes>
  );
}

export default App;
