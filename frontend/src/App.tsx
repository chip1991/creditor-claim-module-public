import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import CaseList from './pages/CaseList';
import NoticeList from './pages/NoticeList';
import CrawlerTaskList from './pages/CrawlerTaskList';
import PoolManager from './pages/PoolManager';
import AlertList from './pages/AlertList';
import LedgerDashboard from './pages/LedgerDashboard';
import LedgerList from './pages/LedgerList';
import LedgerForm from './pages/LedgerForm';
import EnterpriseSearch from './pages/EnterpriseSearch';
import EnterpriseLedger from './pages/EnterpriseLedger';
import EnterpriseForm from './pages/EnterpriseForm';
import EnterpriseDetail from './pages/EnterpriseDetail';
import UserManagement from './pages/settings/UserManagement';
import RoleManagement from './pages/settings/RoleManagement';
import OrgManagement from './pages/settings/OrgManagement';
import OAConfig from './pages/settings/OAConfig';
import IAMConfig from './pages/settings/IAMConfig';
import WeComConfig from './pages/settings/WeComConfig';
import LLMConfig from './pages/settings/LLMConfig';
import AgentConfig from './pages/settings/AgentConfig';
import AccountSettings from './pages/AccountSettings';
import Legal from './pages/Legal';

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
        <Route index element={<Navigate to="/public-data/case" replace />} />
        <Route path="public-data/case" element={<CaseList />} />
        <Route path="public-data/notice" element={<NoticeList />} />
        <Route path="public-data/tasks" element={<CrawlerTaskList />} />
        <Route path="monitoring/pool" element={<PoolManager />} />
        <Route path="monitoring/alert" element={<AlertList />} />
        <Route path="ledger/dashboard" element={<LedgerDashboard />} />
        <Route path="ledger/list" element={<LedgerList />} />
        <Route path="ledger/form" element={<LedgerForm />} />
        <Route path="enterprise/search" element={<EnterpriseSearch />} />
        <Route path="enterprise/ledger" element={<EnterpriseLedger />} />
        <Route path="enterprise/form" element={<EnterpriseForm />} />
        <Route path="enterprise/detail" element={<EnterpriseDetail />} />
        <Route path="settings/user" element={<UserManagement />} />
        <Route path="settings/role" element={<RoleManagement />} />
        <Route path="settings/org" element={<OrgManagement />} />
        <Route path="settings/oa" element={<OAConfig />} />
        <Route path="settings/iam" element={<IAMConfig />} />
        <Route path="settings/wecom" element={<WeComConfig />} />
        <Route path="settings/llm" element={<LLMConfig />} />
        <Route path="settings/agent" element={<AgentConfig />} />
        <Route path="account/settings" element={<AccountSettings />} />
      </Route>
    </Routes>
  );
}

export default App;
