import { useMemo, useState, useEffect } from 'react';
import { Building2, Search, RotateCcw, Loader2, ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

interface OrgRecord {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface OrgTreeNode {
  id: number;
  name: string;
  parentId: number | null;
  isActive: boolean;
  children: OrgTreeNode[];
}

interface OrgFormState {
  name: string;
  parentId: string;
  isActive: boolean;
}

export default function OrgManagement() {
  const [records, setRecords] = useState<OrgRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [tree, setTree] = useState<OrgTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingOrg, setEditingOrg] = useState<OrgRecord | null>(null);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [orgSubmitting, setOrgSubmitting] = useState(false);
  const [orgForm, setOrgForm] = useState<OrgFormState>({ name: '', parentId: '', isActive: true });
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

  const collectExpandableIds = (nodes: OrgTreeNode[]) => {
    const ids: number[] = [];
    const walk = (list: OrgTreeNode[]) => {
      for (const n of list) {
        if (n.children?.length) ids.push(n.id);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(nodes);
    return ids;
  };

  const fetchOrgTree = async () => {
    setTreeLoading(true);
    try {
      const response = await axios.get('/iam/org/tree', { params: { includeInactive: true } });
      const nextTree = (response.data?.tree || []) as OrgTreeNode[];
      setTree(nextTree);
      setExpandedIds(new Set(collectExpandableIds(nextTree)));
    } catch (error) {
      console.error('Failed to fetch org tree:', error);
      showToast('获取组织架构树失败', 'error');
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchOrgPage = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/iam/org/page', {
        params: {
          page,
          size,
          keyword: keyword ? keyword.trim() : undefined,
          parentId: selectedParentId ?? undefined,
        },
      });
      const payload = response.data || {};
      setTotal(Number(payload.total || 0));
      setRecords((payload.records || []) as OrgRecord[]);
    } catch (error) {
      console.error('Failed to fetch org page:', error);
      showToast('获取组织机构列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgTree();
  }, []);

  useEffect(() => {
    fetchOrgPage();
  }, [page, size, keyword, selectedParentId]);

  const parentNameMap = useMemo(() => {
    const map = new Map<number, string>();
    const walk = (nodes: OrgTreeNode[]) => {
      for (const n of nodes) {
        map.set(n.id, n.name);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(tree);
    return map;
  }, [tree]);

  const parentOptions = useMemo(() => {
    const items: Array<{ id: number; name: string; depth: number; isActive: boolean }> = [];
    const walk = (nodes: OrgTreeNode[], depth: number) => {
      for (const node of nodes) {
        items.push({ id: node.id, name: node.name, depth, isActive: node.isActive });
        if (node.children?.length) walk(node.children, depth + 1);
      }
    };
    walk(tree, 0);
    return items;
  }, [tree]);

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
    setSelectedParentId(null);
    setPage(1);
    setSize(20);
  };

  const handleSelectTree = (parentId: number | null) => {
    setSelectedParentId(parentId);
    setPage(1);
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetOrgForm = () => {
    setOrgForm({ name: '', parentId: '', isActive: true });
    setEditingOrg(null);
    setOrgModalOpen(false);
  };

  const openCreateModal = () => {
    setEditingOrg(null);
    setOrgForm({ name: '', parentId: selectedParentId ? String(selectedParentId) : '', isActive: true });
    setOrgModalOpen(true);
  };

  const openEditModal = (row: OrgRecord) => {
    setEditingOrg(row);
    setOrgForm({
      name: row.name,
      parentId: row.parentId ? String(row.parentId) : '',
      isActive: row.isActive,
    });
    setOrgModalOpen(true);
  };

  const handleSaveOrg = async () => {
    const payload = {
      name: orgForm.name.trim(),
      parentId: orgForm.parentId ? Number(orgForm.parentId) : null,
      isActive: orgForm.isActive,
    };
    if (!payload.name) {
      showToast('请输入组织名称', 'error');
      return;
    }

    setOrgSubmitting(true);
    try {
      if (editingOrg) {
        await axios.put(`/iam/org/${editingOrg.id}`, payload);
        showToast('组织更新成功', 'success');
      } else {
        await axios.post('/iam/org', payload);
        showToast('组织创建成功', 'success');
      }
      resetOrgForm();
      await Promise.all([fetchOrgTree(), fetchOrgPage()]);
    } catch (error) {
      console.error('Failed to save org:', error);
      showToast(getErrorMessage(error, editingOrg ? '组织更新失败' : '组织创建失败'), 'error');
    } finally {
      setOrgSubmitting(false);
    }
  };

  const handleDeleteOrg = async (row: OrgRecord) => {
    const ok = window.confirm(`确认删除组织“${row.name}”吗？`);
    if (!ok) return;
    try {
      await axios.delete(`/iam/org/${row.id}`);
      if (selectedParentId === row.id) {
        setSelectedParentId(null);
      }
      showToast('组织删除成功', 'success');
      await Promise.all([fetchOrgTree(), fetchOrgPage()]);
    } catch (error) {
      console.error('Failed to delete org:', error);
      showToast(getErrorMessage(error, '组织删除失败'), 'error');
    }
  };

  const renderTreeNodes = (nodes: OrgTreeNode[], depth: number) => {
    return nodes.map((node) => {
      const expanded = expandedIds.has(node.id);
      const hasChildren = !!node.children?.length;
      const selected = selectedParentId === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1.5 py-1.5 rounded-md cursor-pointer transition-colors ${selected ? 'bg-brand/10 text-brand' : 'text-neutral-700 hover:bg-neutral-50'}`}
            style={{ paddingLeft: 12 + depth * 14 }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpanded(node.id);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors ${hasChildren ? 'text-neutral-500' : 'text-neutral-200 cursor-default'}`}
            >
              {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
            </button>
            <div
              className="flex items-center gap-2 min-w-0 flex-1"
              onClick={() => handleSelectTree(node.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSelectTree(node.id);
              }}
            >
              <span className="truncate text-sm font-medium">{node.name}</span>
              {!node.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border bg-red-50 text-red-600 border-red-100">
                  禁用
                </span>
              )}
            </div>
          </div>
          {hasChildren && expanded && <div>{renderTreeNodes(node.children, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">组织名称</label>
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

      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 个组织机构
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm"
          >
            <Plus size={14} />
            新建组织
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-4">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[200px]">
            {treeLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                <Loader2 className="animate-spin text-brand" size={32} />
              </div>
            )}
            <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
              <div className="text-sm font-semibold text-neutral-900">组织架构树</div>
              <button
                type="button"
                onClick={() => handleSelectTree(null)}
                className={`text-[13px] font-medium transition-colors ${selectedParentId === null ? 'text-brand' : 'text-neutral-500 hover:text-neutral-900'}`}
              >
                全部组织
              </button>
            </div>
            <div className="p-3 overflow-y-auto max-h-[560px]">
              {tree.length === 0 && !treeLoading ? (
                <div className="px-3 py-8 text-center text-sm text-neutral-500">暂无数据</div>
              ) : (
                <div>{renderTreeNodes(tree, 0)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8">
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
                    <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">组织名称</th>
                    <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">上级组织</th>
                    <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                    <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">更新时间</th>
                    <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-neutral-50/50">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {records.map((row, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={row.id} 
                      className="group hover:bg-neutral-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-brand flex items-center gap-2 whitespace-nowrap">
                        <Building2 size={16} className="text-neutral-400" />
                        <span className="cursor-pointer hover:underline">{row.name}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">
                        {row.parentId ? parentNameMap.get(row.parentId) || `#${row.parentId}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${row.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                          {row.isActive ? '启用' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-neutral-400 whitespace-nowrap">
                        {formatTime(row.updatedAt || row.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors"
                          >
                            <Pencil size={14} />
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrg(row)}
                            className="flex items-center gap-1 text-neutral-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                            删除
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {!loading && records.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-500">
                        暂无数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-4">
              <span className="text-sm text-neutral-500">
                共 {total} 条记录
                {selectedParentId !== null && (
                  <span className="ml-2 text-neutral-400">
                    · 当前组织：{parentNameMap.get(selectedParentId) || `#${selectedParentId}`}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-3">
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
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
      </div>

      {orgModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={resetOrgForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-100">
                <div className="text-lg font-semibold text-neutral-900">{editingOrg ? '编辑组织' : '新建组织'}</div>
                <div className="text-sm text-neutral-500 mt-1">
                  {editingOrg ? '修改组织信息并保存。' : '填写组织信息后创建新组织。'}
                </div>
              </div>
              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">组织名称</label>
                  <input
                    type="text"
                    value={orgForm.name}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入组织名称"
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">上级组织</label>
                  <select
                    value={orgForm.parentId}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, parentId: e.target.value }))}
                    className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-700"
                  >
                    <option value="">无上级组织</option>
                    {parentOptions.map((option) => (
                      <option key={option.id} value={option.id} disabled={editingOrg?.id === option.id}>
                        {`${option.depth ? '—'.repeat(Math.min(6, option.depth)) + ' ' : ''}${option.name}${option.isActive ? '' : '（禁用）'}`}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-3 text-sm text-neutral-700">
                  <input
                    type="checkbox"
                    checked={orgForm.isActive}
                    onChange={(e) => setOrgForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                  />
                  启用该组织
                </label>
              </div>
              <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetOrgForm}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrg}
                  disabled={orgSubmitting}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {orgSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingOrg ? '保存修改' : '确认创建'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
