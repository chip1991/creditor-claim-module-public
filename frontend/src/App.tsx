import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Legal from './pages/Legal';
import DataCenter from './pages/DataCenter';
import DataDetail from './pages/DataDetail';
import RawBatches from './pages/data/RawBatches';
import RawBatchDetail from './pages/data/RawBatchDetail';
import RawRowDetail from './pages/data/RawRowDetail';
import ScoreStats from './pages/data/ScoreStats';
import IssueList from './pages/data/IssueList';
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
import PermissionCenter from './pages/system/PermissionCenter';
import OrgManagement from './pages/settings/OrgManagement';
import RoleManagement from './pages/settings/RoleManagement';
import RoleDetail from './pages/settings/RoleDetail';
import UserManagement from './pages/settings/UserManagement';
import LLMConfig from './pages/settings/LLMConfig';
import AgentConfig from './pages/settings/AgentConfig';

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
        <Route index element={<Navigate to="/data/raw" replace />} />
        <Route path="data/center" element={<DataCenter />} />
        <Route path="data/detail" element={<DataDetail />} />
        <Route path="data/raw" element={<RawBatches />} />
        <Route path="data/raw/:batchId" element={<RawBatchDetail />} />
        <Route path="data/raw/rows/:rowId" element={<RawRowDetail />} />
        <Route path="data/score" element={<ScoreStats />} />
        <Route path="data/issues" element={<IssueList />} />
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
        <Route path="system/ai/llms" element={<LLMConfig />} />
        <Route path="system/ai/agents" element={<AgentConfig />} />
        <Route path="system/permission-center" element={<PermissionCenter />}>
          <Route index element={<Navigate to="/system/permission-center/orgs" replace />} />
          <Route path="orgs" element={<OrgManagement />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="roles/:roleId" element={<RoleDetail />} />
          <Route path="users" element={<UserManagement />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
