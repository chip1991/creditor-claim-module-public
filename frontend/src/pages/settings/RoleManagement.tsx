import { useState, useEffect } from 'react';
import { Search, RotateCcw, Settings, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

interface Role {
  id: number;
  name: string;
  code: string;
  desc?: string;
  users?: number;
  isActive?: boolean;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface RoleFormState {
  name: string;
  code: string;
  desc: string;
  isActive: boolean;
}

export default function RoleManagement() {
  const navigate = useNavigate();
  const [data, setData] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleSubmitting, setRoleSubmitting] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleFormState>({ name: '', code: '', desc: '', isActive: true });
  const { showToast, ToastComponent } = useToast();

  const formatTime = (value: unknown) => {
    if (!value) return '-';
    if (typeof value === 'string') return value.replace('T', ' ').replace('Z', '');
    return String(value);
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      return (error as { response?: { data?: { msg?: string } } }).response?.data?.msg ?? fallback;
    }
    return fallback;
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/iam/roles/page', {
        params: {
          page,
          size,
          keyword: keyword ? keyword.trim() : undefined,
        },
      });
      const payload = response.data || {};
      setTotal(Number(payload.total || 0));
      const records = (payload.records || []) as any[];
      setData(
        records.map((r) => ({
          id: Number(r.id),
          name: String(r.name ?? ''),
          code: String(r.code ?? r.key ?? ''),
          desc: r.desc ?? undefined,
          users: typeof r.users === 'number' ? r.users : undefined,
          isActive: typeof r.isActive === 'boolean' ? r.isActive : undefined,
          updatedAt: r.updatedAt ?? null,
          createdAt: r.createdAt ?? null,
        }))
      );
    } catch (error) {
      console.error('获取角色列表失败:', error);
      showToast('获取角色列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [page, size, keyword]);

  const totalPages = Math.max(1, Math.ceil(total / size));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const handleSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
  };

  const handleReset = () => {
    setKeywordInput('');
    setKeyword('');
    setPage(1);
    setSize(20);
  };

  const resetRoleForm = () => {
    setEditingRole(null);
    setRoleForm({ name: '', code: '', desc: '', isActive: true });
    setRoleModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleForm({ name: '', code: '', desc: '', isActive: true });
    setRoleModalOpen(true);
  };

  const openEditModal = (row: Role) => {
    setEditingRole(row);
    setRoleForm({
      name: row.name,
      code: row.code,
      desc: row.desc || '',
      isActive: row.isActive ?? true,
    });
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    const payload = {
      name: roleForm.name.trim(),
      code: roleForm.code.trim(),
      desc: roleForm.desc.trim() || null,
      isActive: roleForm.isActive,
    };
    if (!payload.name) {
      showToast('请输入角色名称', 'error');
      return;
    }
    if (!payload.code) {
      showToast('请输入角色编码', 'error');
      return;
    }

    setRoleSubmitting(true);
    try {
      if (editingRole) {
        await axios.put(`/iam/roles/${editingRole.id}`, payload);
        showToast('角色更新成功', 'success');
      } else {
        await axios.post('/iam/roles', payload);
        showToast('角色创建成功', 'success');
      }
      resetRoleForm();
      await fetchRoles();
    } catch (error) {
      console.error('Failed to save role:', error);
      showToast(getErrorMessage(error, editingRole ? '角色更新失败' : '角色创建失败'), 'error');
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleDeleteRole = async (row: Role) => {
    const ok = window.confirm(`确认删除角色“${row.name}”吗？`);
    if (!ok) return;
    try {
      await axios.delete(`/iam/roles/${row.id}`);
      showToast('角色删除成功', 'success');
      await fetchRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      showToast(getErrorMessage(error, '角色删除失败'), 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">角色名称/角色编码</label>
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
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 个角色
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus size={14} />
            新建角色
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
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">角色名称</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">角色编码</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">角色描述</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">关联用户数</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">更新时间</th>
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
                    onClick={() => navigate(`/system/permission-center/roles/${row.id}`, { state: { role: row } })}
                  >
                    {row.name}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.code}</td>
                  <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{row.desc || '-'}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${row.isActive === false ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      {row.isActive === false ? '禁用' : '启用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {typeof row.users === 'number' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border bg-brand-light text-brand-dark border-brand-100">
                        {row.users} 人
                      </span>
                    ) : (
                      <span className="text-neutral-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-400 whitespace-nowrap">
                    {formatTime(row.updatedAt || row.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => openEditModal(row)}
                        className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors"
                      >
                        <Pencil size={14} /> 编辑
                      </button>
                      <button
                        onClick={() => navigate(`/system/permission-center/roles/${row.id}`, { state: { role: row } })}
                        className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors"
                      >
                        <Settings size={14} /> 菜单权限配置
                      </button>
                      <button
                        onClick={() => handleDeleteRole(row)}
                        className="flex items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} /> 删除
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

      {roleModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={resetRoleForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-100">
                <div className="text-lg font-semibold text-neutral-900">{editingRole ? '编辑角色' : '新建角色'}</div>
                <div className="text-sm text-neutral-500 mt-1">
                  {editingRole ? '修改角色基础信息，权限配置仍在详情页维护。' : '先创建角色，再进入详情页配置菜单权限、接口权限和数据范围。'}
                </div>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">角色名称</label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入角色名称"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">角色编码</label>
                  <input
                    type="text"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="请输入角色编码"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">角色描述</label>
                  <textarea
                    value={roleForm.desc}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, desc: e.target.value }))}
                    placeholder="请输入角色描述"
                    rows={4}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow resize-none"
                  />
                </div>
                <label className="flex items-center gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={roleForm.isActive}
                    onChange={(e) => setRoleForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  启用该角色
                </label>
              </div>
              <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetRoleForm}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={roleSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {roleSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingRole ? '保存修改' : '确认创建'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
