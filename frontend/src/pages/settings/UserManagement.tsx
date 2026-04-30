import { useMemo, useState, useEffect } from 'react';
import { Search, RotateCcw, Eye, Ban, ShieldCheck, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

interface User {
  id: number;
  name: string;
  empId?: string;
  phone?: string;
  org?: string;
  orgId?: number | null;
  status: string;
  isActive?: boolean;
  syncTime?: string;
}

interface OrgTreeNode {
  id: number;
  name: string;
  isActive?: boolean;
  children: OrgTreeNode[];
}

interface RoleOption {
  id: number;
  name: string;
  code: string;
  isActive?: boolean;
}

export default function UserManagement() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [total, setTotal] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [orgTree, setOrgTree] = useState<OrgTreeNode[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);
  const [userRolesLoading, setUserRolesLoading] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<number>>(new Set());
  const [roleKeywordInput, setRoleKeywordInput] = useState('');
  const [roleKeyword, setRoleKeyword] = useState('');
  const { showToast, ToastComponent } = useToast();

  const formatTime = (value: unknown) => {
    if (!value) return '-';
    if (typeof value === 'string') return value.replace('T', ' ').replace('Z', '');
    return String(value);
  };

  const orgOptions = useMemo(() => {
    const items: Array<{ id: number; name: string; depth: number; isActive?: boolean }> = [];
    const walk = (list: OrgTreeNode[], depth: number) => {
      for (const n of list) {
        items.push({ id: n.id, name: n.name, depth, isActive: n.isActive });
        if (n.children?.length) walk(n.children, depth + 1);
      }
    };
    walk(orgTree, 0);
    return items;
  }, [orgTree]);

  const fetchOrgTree = async () => {
    setOrgLoading(true);
    try {
      const response = await axios.get('/iam/org/tree');
      setOrgTree((response.data?.tree || []) as OrgTreeNode[]);
    } catch (error) {
      console.error('Failed to fetch org tree:', error);
      showToast('获取组织架构失败', 'error');
    } finally {
      setOrgLoading(false);
    }
  };

  const mapUser = (raw: any): User => {
    const isActive =
      typeof raw?.isActive === 'boolean'
        ? raw.isActive
        : typeof raw?.status === 'string'
          ? raw.status === '启用' || raw.status === 'ENABLED' || raw.status === 'ACTIVE'
          : undefined;
    const status = typeof raw?.status === 'string' ? String(raw.status) : isActive === false ? '禁用' : '启用';
    return {
      id: Number(raw?.id),
      name: String(raw?.name ?? raw?.username ?? ''),
      empId: raw?.empId ?? raw?.emp_id ?? raw?.employeeId ?? raw?.employeeNo ?? undefined,
      phone: raw?.phone ?? raw?.mobile ?? raw?.tel ?? undefined,
      org: raw?.org ?? raw?.deptName ?? raw?.orgName ?? raw?.departmentName ?? undefined,
      orgId: raw?.orgId ?? raw?.deptId ?? raw?.departmentId ?? null,
      status,
      isActive,
      syncTime: formatTime(raw?.syncTime ?? raw?.updatedAt ?? raw?.createdAt),
    };
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const isActive = statusFilter === '启用' ? true : statusFilter === '禁用' ? false : undefined;
      const response = await axios.get('/iam/users/page', {
        params: {
          page,
          size,
          keyword: keyword ? keyword.trim() : undefined,
          orgId: selectedOrgId ?? undefined,
          deptId: selectedOrgId ?? undefined,
          status: statusFilter ? statusFilter : undefined,
          isActive,
        },
      });
      const payload = response.data || {};
      setTotal(Number(payload.total || 0));
      const records = (payload.records || []) as any[];
      setData(records.map(mapUser));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('获取用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgTree();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [page, size, keyword, selectedOrgId, statusFilter]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await axios.post('/iam/users/sync');
      const payload = response.data || {};
      const msg = payload.message ? `同步完成：${payload.message}` : '同步成功';
      showToast(msg, payload.status === 'SUCCESS' ? 'success' : 'info');
      fetchUsers();
    } catch (error) {
      console.error('Failed to sync users:', error);
      showToast('同步失败', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const currentActive = currentStatus === '启用';
    const nextActive = !currentActive;
    const newStatus = nextActive ? '启用' : '禁用';
    try {
      await axios.put(`/iam/users/${id}/status`, { isActive: nextActive });
      showToast(`已${newStatus}该用户`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('状态更新失败', 'error');
    }
  };

  const fetchRoleOptions = async () => {
    setRoleOptionsLoading(true);
    try {
      const response = await axios.get('/iam/roles/page', { params: { page: 1, size: 200, isActive: true } });
      const payload = response.data || {};
      const records = (payload.records || []) as any[];
      setRoleOptions(
        records.map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? ''),
          code: String(r.code ?? r.key ?? ''),
          isActive: typeof r.isActive === 'boolean' ? r.isActive : undefined,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      showToast('获取角色列表失败', 'error');
    } finally {
      setRoleOptionsLoading(false);
    }
  };

  const fetchUserRoles = async (userId: number) => {
    setUserRolesLoading(true);
    try {
      let payload: any;
      try {
        const response = await axios.get(`/rbac/users/${userId}`);
        payload = response.data;
      } catch {
        const response = await axios.get(`/rbac/users/${userId}/roles`);
        payload = response.data;
      }
      const roleIds = (payload?.roleIds || payload?.roles || []) as any[];
      setSelectedRoleIds(new Set(roleIds.map((x) => Number(x)).filter((x) => Number.isFinite(x))));
    } catch (error) {
      console.error('Failed to fetch user roles:', error);
      showToast('获取用户角色失败', 'error');
      setSelectedRoleIds(new Set());
    } finally {
      setUserRolesLoading(false);
    }
  };

  useEffect(() => {
    if (!activeUser) return;
    fetchUserRoles(activeUser.id);
    if (roleOptions.length === 0 && !roleOptionsLoading) fetchRoleOptions();
    setRoleKeywordInput('');
    setRoleKeyword('');
  }, [activeUser?.id]);

  const filteredRoleOptions = useMemo(() => {
    const kw = roleKeyword.trim().toLowerCase();
    if (!kw) return roleOptions;
    return roleOptions.filter((r) => `${r.name} ${r.code}`.toLowerCase().includes(kw));
  }, [roleOptions, roleKeyword]);

  const toggleRole = (roleId: number, checked: boolean) => {
    setSelectedRoleIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(roleId);
      else next.delete(roleId);
      return next;
    });
  };

  const saveUserRoles = async () => {
    if (!activeUser) return;
    setRoleSaving(true);
    try {
      await axios.post(`/rbac/users/${activeUser.id}/roles`, { roleIds: Array.from(selectedRoleIds) });
      showToast('角色分配保存成功', 'success');
      fetchUserRoles(activeUser.id);
    } catch (error) {
      console.error('Failed to save user roles:', error);
      showToast('角色分配保存失败', 'error');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const handleReset = () => {
    setKeywordInput('');
    setKeyword('');
    setSelectedOrgId(null);
    setStatusFilter('');
    setPage(1);
    setSize(20);
  };

  const totalPages = Math.max(1, Math.ceil(total / size));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      <AnimatePresence>
        {activeUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setActiveUser(null)}
            />
            <motion.div
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              className="fixed top-0 right-0 h-full w-[420px] bg-white z-50 shadow-[-12px_0_24px_-12px_rgba(0,0,0,0.25)] border-l border-neutral-100 flex flex-col"
            >
              <div className="px-6 py-5 border-b border-neutral-100">
                <div className="text-sm text-neutral-500 mb-1">用户详情</div>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-neutral-900 truncate">{activeUser.name}</div>
                    <div className="text-sm text-neutral-500 mt-1">
                      <span className="font-mono">{activeUser.empId || '-'}</span>
                      <span className="mx-2 text-neutral-300">·</span>
                      <span className="font-mono">{activeUser.phone || '-'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveUser(null)}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">所属组织</div>
                    <div className="text-sm text-neutral-900">{activeUser.org || '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">状态</div>
                    <div className="text-sm text-neutral-900">{activeUser.status || '-'}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">最新同步时间</div>
                    <div className="text-sm font-mono text-neutral-600">{activeUser.syncTime || '-'}</div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[13px] font-semibold text-neutral-900">分配角色</div>
                    <button
                      type="button"
                      onClick={saveUserRoles}
                      disabled={roleSaving || roleOptionsLoading || userRolesLoading}
                      className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {roleSaving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      保存
                    </button>
                  </div>
                  <div className="text-[13px] font-medium text-neutral-500 mb-3">
                    已选择 <span className="font-semibold text-neutral-900">{selectedRoleIds.size}</span> 个角色
                  </div>
                  <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[220px]">
                    {(roleOptionsLoading || userRolesLoading) && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                        <Loader2 className="animate-spin text-brand" size={28} />
                      </div>
                    )}
                    <div className="p-3 border-b border-neutral-200 bg-neutral-50/50">
                      <input
                        type="text"
                        placeholder="搜索角色名称/编码..."
                        value={roleKeywordInput}
                        onChange={(e) => setRoleKeywordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setRoleKeyword(roleKeywordInput.trim());
                        }}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          type="button"
                          onClick={() => setRoleKeyword(roleKeywordInput.trim())}
                          className="px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm"
                        >
                          搜索
                        </button>
                      </div>
                    </div>
                    <div className="p-3 overflow-y-auto max-h-[420px]">
                      {filteredRoleOptions.map((r) => {
                        const checked = selectedRoleIds.has(r.id);
                        return (
                          <label
                            key={r.id}
                            className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-neutral-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleRole(r.id, e.target.checked)}
                              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium text-neutral-800">{r.name}</div>
                              <div className="truncate text-[12px] text-neutral-400 font-mono">{r.code || '-'}</div>
                            </div>
                            {r.isActive === false && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-red-50 text-red-600 border-red-100">
                                禁用
                              </span>
                            )}
                          </label>
                        );
                      })}
                      {!roleOptionsLoading && filteredRoleOptions.length === 0 && (
                        <div className="px-3 py-10 text-center text-sm text-neutral-500">暂无角色</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">员工姓名/工号/手机号</label>
            <input 
              type="text" 
              placeholder="请输入关键词检索..." 
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">所属组织</label>
            <select
              value={selectedOrgId === null ? '' : String(selectedOrgId)}
              disabled={orgLoading}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedOrgId(v ? Number(v) : null);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">全部组织</option>
              {orgOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {`${o.depth ? '—'.repeat(Math.min(6, o.depth)) + ' ' : ''}${o.name}${o.isActive === false ? '（禁用）' : ''}`}
                </option>
              ))}
            </select>
          </div>
          <div className="w-40 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">状态</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部状态</option>
              <option value="启用">启用</option>
              <option value="禁用">禁用</option>
            </select>
          </div>
          <div className="flex gap-3 ml-auto shrink-0 mt-4 xl:mt-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <RotateCcw size={16} />
              重置
            </button>
            <button
              type="button"
              onClick={handleSearch}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Search size={16} />
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Global Actions (Cardless) */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条员工记录
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            全量同步 IAM 用户
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">姓名</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">工号</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">手机号</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">所属组织</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">最新同步时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-neutral-50/50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((row, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={row.id} 
                  className="group hover:bg-neutral-50 transition-colors"
                >
                  <td
                    className="px-6 py-4 text-sm font-medium text-brand whitespace-nowrap cursor-pointer hover:underline"
                    onClick={() => setActiveUser(row)}
                  >
                    {row.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.empId || '-'}</td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.phone || '-'}</td>
                  <td className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">{row.org || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${row.status === '启用' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-400 whitespace-nowrap">{row.syncTime || '-'}</td>
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setActiveUser(row)}
                        className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors"
                      >
                        <Eye size={14} /> 查看
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(row.id, row.status)}
                        className={`flex items-center gap-1 transition-colors ${row.status === '启用' ? 'text-neutral-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'}`}
                      >
                        <Ban size={14} /> {row.status === '启用' ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-neutral-500">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-4">
          <span className="text-sm text-neutral-500">共 {total} 条记录</span>
          <div className="flex items-center gap-3">
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-1.5 text-sm bg-white border border-neutral-200 rounded-md text-neutral-700 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
            >
              <option value={10}>10 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
              <option value={100}>100 条/页</option>
            </select>
            <div className="flex gap-1 items-center">
              <button
                type="button"
                onClick={() => canPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                className={`px-3 py-1 text-sm rounded transition-colors ${canPrev ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 cursor-not-allowed'}`}
              >
                上一页
              </button>
              <button type="button" className="px-3 py-1 text-sm bg-neutral-900 text-white rounded">
                {page}
              </button>
              <button
                type="button"
                onClick={() => canNext && setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext}
                className={`px-3 py-1 text-sm rounded transition-colors ${canNext ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 cursor-not-allowed'}`}
              >
                下一页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
