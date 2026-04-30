import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChevronDown, ChevronRight, Loader2, Save, Search, RotateCcw } from 'lucide-react';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

type Role = {
  id: number;
  name: string;
  code: string;
  desc?: string;
  users?: number;
  syncTime?: string;
};

type TabKey = 'menu' | 'permission' | 'dataScope';

type RoleDetailPayload = {
  role: {
    id: number;
    name: string;
    key: string;
    isActive: boolean;
    dataScope: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  menuIds: string[];
  permissionCodes: string[];
  dataScope: { scope: string; deptIds: number[] };
};

type MenuNode = {
  id: string;
  name: string;
  path?: string | null;
  permissionCode?: string | null;
  children?: MenuNode[];
};

type PermissionItem = {
  code: string;
  name: string;
  isActive?: boolean;
};

type OrgTreeNode = {
  id: number;
  name: string;
  children: OrgTreeNode[];
};

const DATA_SCOPE_OPTIONS: Array<{ value: string; label: string; desc: string }> = [
  { value: 'ALL', label: '全部数据', desc: '可访问所有部门数据' },
  { value: 'DEPT_AND_CHILD', label: '本部门及下级', desc: '可访问本部门及下级部门数据' },
  { value: 'DEPT', label: '本部门', desc: '仅可访问本部门数据' },
  { value: 'SELF', label: '仅本人', desc: '仅可访问本人创建/负责数据' },
  { value: 'CUSTOM', label: '自定义部门', desc: '选择可访问的部门范围' },
];

export default function RoleDetail() {
  const navigate = useNavigate();
  const { roleId } = useParams();
  const location = useLocation();
  const [tab, setTab] = useState<TabKey>('menu');
  const { showToast, ToastComponent } = useToast();

  const [roleDetail, setRoleDetail] = useState<RoleDetailPayload['role'] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [menuTree, setMenuTree] = useState<MenuNode[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState<Set<string>>(new Set());
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(new Set());
  const [savingMenus, setSavingMenus] = useState(false);

  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<Set<string>>(new Set());
  const [permissionKeywordInput, setPermissionKeywordInput] = useState('');
  const [permissionKeyword, setPermissionKeyword] = useState('');
  const [permissionPage, setPermissionPage] = useState(1);
  const [permissionSize, setPermissionSize] = useState(20);

  const [dataScope, setDataScope] = useState<string>('SELF');
  const [deptTree, setDeptTree] = useState<OrgTreeNode[]>([]);
  const [deptExpanded, setDeptExpanded] = useState<Set<number>>(new Set());
  const [deptLoading, setDeptLoading] = useState(false);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());
  const [savingDataScope, setSavingDataScope] = useState(false);

  const role = useMemo(() => {
    const s = location.state as { role?: Role } | null;
    return s?.role ?? null;
  }, [location.state]);

  const formatTime = (value: unknown) => {
    if (!value) return '-';
    if (typeof value === 'string') return value.replace('T', ' ').replace('Z', '');
    return String(value);
  };

  const fetchRoleDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const response = await axios.get(`/rbac/roles/${id}`);
      const payload = (response.data || {}) as RoleDetailPayload;
      if (payload.role) {
        setRoleDetail(payload.role);
        setSelectedMenuIds(new Set((payload.menuIds || []).map(String)));
        setSelectedPermissionCodes(new Set((payload.permissionCodes || []).map(String)));
        const scope = payload.dataScope?.scope || payload.role.dataScope || 'SELF';
        setDataScope(scope);
        setSelectedDeptIds(new Set((payload.dataScope?.deptIds || []).map((x) => Number(x))));
      }
    } catch (error) {
      console.error('获取角色详情失败:', error);
      showToast('获取角色详情失败', 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  const collectMenuExpandableIds = (nodes: MenuNode[]) => {
    const ids: string[] = [];
    const walk = (list: MenuNode[]) => {
      for (const n of list) {
        if (n.children?.length) ids.push(String(n.id));
        if (n.children?.length) walk(n.children);
      }
    };
    walk(nodes);
    return ids;
  };

  const fetchMenuTree = async () => {
    setMenuLoading(true);
    try {
      const response = await axios.get('/rbac/menus/tree');
      const nextTree = (response.data?.tree || []) as MenuNode[];
      setMenuTree(nextTree);
      setMenuExpanded(new Set(collectMenuExpandableIds(nextTree)));
    } catch (error) {
      console.error('获取菜单树失败:', error);
      showToast('获取菜单树失败', 'error');
    } finally {
      setMenuLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermissionLoading(true);
    try {
      const response = await axios.get('/rbac/permissions/dict');
      const list = (response.data?.permissions || []) as PermissionItem[];
      setPermissions(list);
    } catch (error) {
      console.error('获取权限码列表失败:', error);
      showToast('获取权限码列表失败', 'error');
    } finally {
      setPermissionLoading(false);
    }
  };

  const collectDeptExpandableIds = (nodes: OrgTreeNode[]) => {
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

  const fetchDeptTree = async () => {
    setDeptLoading(true);
    try {
      const response = await axios.get('/iam/org/tree');
      const tree = (response.data?.tree || []) as OrgTreeNode[];
      setDeptTree(tree);
      setDeptExpanded(new Set(collectDeptExpandableIds(tree)));
    } catch (error) {
      console.error('获取组织架构树失败:', error);
      showToast('获取组织架构树失败', 'error');
    } finally {
      setDeptLoading(false);
    }
  };

  useEffect(() => {
    const idNum = Number(roleId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    fetchRoleDetail(idNum);
    fetchMenuTree();
    fetchPermissions();
  }, [roleId]);

  useEffect(() => {
    if (dataScope === 'CUSTOM' && deptTree.length === 0 && !deptLoading) {
      fetchDeptTree();
    }
  }, [dataScope, deptTree.length, deptLoading]);

  const collectMenuIds = (node: MenuNode) => {
    const ids: string[] = [];
    const walk = (n: MenuNode) => {
      ids.push(String(n.id));
      for (const c of n.children || []) walk(c);
    };
    walk(node);
    return ids;
  };

  const toggleMenu = (node: MenuNode, checked: boolean) => {
    const ids = collectMenuIds(node);
    setSelectedMenuIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleMenuExpanded = (id: string) => {
    setMenuExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderMenuTree = (nodes: MenuNode[], depth: number) => {
    return nodes.map((node) => {
      const nodeId = String(node.id);
      const expanded = menuExpanded.has(nodeId);
      const hasChildren = !!node.children?.length;
      const checked = selectedMenuIds.has(nodeId);

      return (
        <div key={nodeId}>
          <div
            className="flex items-center gap-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-neutral-50"
            style={{ paddingLeft: 12 + depth * 14 }}
            onClick={() => hasChildren && toggleMenuExpanded(nodeId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasChildren) toggleMenuExpanded(nodeId);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleMenuExpanded(nodeId);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors ${hasChildren ? 'text-neutral-500' : 'text-neutral-200 cursor-default'}`}
            >
              {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
            </button>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggleMenu(node, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-neutral-800">{node.name}</div>
              {(node.path || node.permissionCode) && (
                <div className="truncate text-[12px] text-neutral-400 font-mono">
                  {node.path || '-'}
                  {node.permissionCode ? ` · ${node.permissionCode}` : ''}
                </div>
              )}
            </div>
          </div>
          {hasChildren && expanded && <div>{renderMenuTree(node.children || [], depth + 1)}</div>}
        </div>
      );
    });
  };

  const saveMenus = async () => {
    const idNum = Number(roleId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    setSavingMenus(true);
    try {
      await axios.post(`/rbac/roles/${idNum}/menus`, { menuIds: Array.from(selectedMenuIds) });
      showToast('菜单权限保存成功', 'success');
      fetchRoleDetail(idNum);
    } catch (error) {
      console.error('保存菜单权限失败:', error);
      showToast('菜单权限保存失败', 'error');
    } finally {
      setSavingMenus(false);
    }
  };

  const filteredPermissions = useMemo(() => {
    const kw = permissionKeyword.trim().toLowerCase();
    if (!kw) return permissions;
    return permissions.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(kw));
  }, [permissions, permissionKeyword]);

  const permissionTotal = filteredPermissions.length;
  const permissionTotalPages = Math.max(1, Math.ceil(permissionTotal / permissionSize));
  const permissionCanPrev = permissionPage > 1;
  const permissionCanNext = permissionPage < permissionTotalPages;

  const pagedPermissions = useMemo(() => {
    const start = (permissionPage - 1) * permissionSize;
    return filteredPermissions.slice(start, start + permissionSize);
  }, [filteredPermissions, permissionPage, permissionSize]);

  const togglePermission = (code: string, checked: boolean) => {
    setSelectedPermissionCodes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const handlePermissionSearch = () => {
    setPermissionPage(1);
    setPermissionKeyword(permissionKeywordInput.trim());
  };

  const handlePermissionReset = () => {
    setPermissionKeywordInput('');
    setPermissionKeyword('');
    setPermissionPage(1);
    setPermissionSize(20);
  };

  const savePermissions = async () => {
    const idNum = Number(roleId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    setPermissionSaving(true);
    try {
      await axios.post(`/rbac/roles/${idNum}/permissions`, { permissionCodes: Array.from(selectedPermissionCodes) });
      showToast('接口权限保存成功', 'success');
      fetchRoleDetail(idNum);
    } catch (error) {
      console.error('保存接口权限失败:', error);
      showToast('接口权限保存失败', 'error');
    } finally {
      setPermissionSaving(false);
    }
  };

  const collectDeptIds = (node: OrgTreeNode) => {
    const ids: number[] = [];
    const walk = (n: OrgTreeNode) => {
      ids.push(n.id);
      for (const c of n.children || []) walk(c);
    };
    walk(node);
    return ids;
  };

  const toggleDept = (node: OrgTreeNode, checked: boolean) => {
    const ids = collectDeptIds(node);
    setSelectedDeptIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const toggleDeptExpanded = (id: number) => {
    setDeptExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderDeptTree = (nodes: OrgTreeNode[], depth: number) => {
    return nodes.map((node) => {
      const expanded = deptExpanded.has(node.id);
      const hasChildren = !!node.children?.length;
      const checked = selectedDeptIds.has(node.id);
      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-neutral-50"
            style={{ paddingLeft: 12 + depth * 14 }}
            onClick={() => hasChildren && toggleDeptExpanded(node.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hasChildren) toggleDeptExpanded(node.id);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleDeptExpanded(node.id);
              }}
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 transition-colors ${hasChildren ? 'text-neutral-500' : 'text-neutral-200 cursor-default'}`}
            >
              {hasChildren ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <ChevronRight size={14} />}
            </button>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggleDept(node, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-neutral-800">{node.name}</div>
            </div>
          </div>
          {hasChildren && expanded && <div>{renderDeptTree(node.children || [], depth + 1)}</div>}
        </div>
      );
    });
  };

  const saveDataScope = async () => {
    const idNum = Number(roleId);
    if (!Number.isFinite(idNum) || idNum <= 0) return;
    setSavingDataScope(true);
    try {
      await axios.post(`/rbac/roles/${idNum}/data-scope`, {
        scope: dataScope,
        deptIds: dataScope === 'CUSTOM' ? Array.from(selectedDeptIds) : [],
      });
      showToast('数据范围保存成功', 'success');
      fetchRoleDetail(idNum);
    } catch (error) {
      console.error('保存数据范围失败:', error);
      showToast('数据范围保存失败', 'error');
    } finally {
      setSavingDataScope(false);
    }
  };

  const headerRoleName = roleDetail?.name ?? role?.name ?? `角色 ${roleId ?? ''}`;
  const headerRoleCode = roleDetail?.key ?? role?.code ?? '-';
  const headerRoleDesc = role?.desc;

  return (
    <div className="flex flex-col gap-6">
      {ToastComponent}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-neutral-500 mb-2">角色详情</div>
          <h2 className="text-xl font-semibold text-neutral-900">{headerRoleName}</h2>
          <div className="text-sm text-neutral-500 mt-1">
            <span className="font-mono">{headerRoleCode}</span>
            {headerRoleDesc ? <span className="ml-3">{headerRoleDesc}</span> : null}
            {roleDetail?.updatedAt ? <span className="ml-3 text-neutral-400 font-mono">更新于 {formatTime(roleDetail.updatedAt)}</span> : null}
          </div>
        </div>
        <button
          onClick={() => navigate('/system/permission-center/roles')}
          className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
        >
          返回角色列表
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 pt-5 border-b border-neutral-100">
          <div className="flex gap-6">
            <button
              onClick={() => setTab('menu')}
              className={clsx(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                tab === 'menu'
                  ? 'text-neutral-900 border-neutral-900'
                  : 'text-neutral-500 border-transparent hover:text-neutral-900'
              )}
            >
              菜单权限
            </button>
            <button
              onClick={() => setTab('permission')}
              className={clsx(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                tab === 'permission'
                  ? 'text-neutral-900 border-neutral-900'
                  : 'text-neutral-500 border-transparent hover:text-neutral-900'
              )}
            >
              接口权限
            </button>
            <button
              onClick={() => setTab('dataScope')}
              className={clsx(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                tab === 'dataScope'
                  ? 'text-neutral-900 border-neutral-900'
                  : 'text-neutral-500 border-transparent hover:text-neutral-900'
              )}
            >
              数据范围
            </button>
          </div>
        </div>

        <div className="p-6 relative">
          {loadingDetail && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
              <Loader2 className="animate-spin text-brand" size={32} />
            </div>
          )}

          {tab === 'menu' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-medium text-neutral-500">
                  已选择 <span className="font-semibold text-neutral-900">{selectedMenuIds.size}</span> 个菜单
                </div>
                <button
                  type="button"
                  onClick={saveMenus}
                  disabled={savingMenus}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMenus ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  保存菜单权限
                </button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden relative min-h-[220px]">
                {menuLoading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                    <Loader2 className="animate-spin text-brand" size={32} />
                  </div>
                )}
                <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                  <div className="text-sm font-semibold text-neutral-900">菜单资源树</div>
                  <button
                    type="button"
                    onClick={fetchMenuTree}
                    className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    刷新
                  </button>
                </div>
                <div className="p-3 overflow-y-auto max-h-[560px]">
                  {menuTree.length === 0 && !menuLoading ? (
                    <div className="px-3 py-8 text-center text-sm text-neutral-500">暂无数据</div>
                  ) : (
                    <div>{renderMenuTree(menuTree, 0)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'permission' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
                  <div className="w-56 shrink-0">
                    <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">权限码/名称</label>
                    <input
                      type="text"
                      placeholder="请输入关键词检索..."
                      value={permissionKeywordInput}
                      onChange={(e) => setPermissionKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handlePermissionSearch();
                      }}
                      className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
                    />
                  </div>
                  <div className="flex gap-3 ml-auto shrink-0 mt-4 xl:mt-0">
                    <button
                      type="button"
                      onClick={handlePermissionReset}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                    >
                      <RotateCcw size={16} />
                      重置
                    </button>
                    <button
                      type="button"
                      onClick={handlePermissionSearch}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm"
                    >
                      <Search size={16} />
                      搜索
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 px-1">
                <div className="text-[13px] font-medium text-neutral-500">
                  共 <span className="font-semibold text-neutral-900">{permissionTotal}</span> 条权限码，已选{' '}
                  <span className="font-semibold text-neutral-900">{selectedPermissionCodes.size}</span> 条
                </div>
                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={permissionSaving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {permissionSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  保存接口权限
                </button>
              </div>

              <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[240px]">
                {permissionLoading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                    <Loader2 className="animate-spin text-brand" size={32} />
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/50">
                        <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">权限码</th>
                        <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">权限名称</th>
                        <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap">选择</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {pagedPermissions.map((row) => {
                        const checked = selectedPermissionCodes.has(row.code);
                        return (
                          <tr key={row.code} className="group hover:bg-neutral-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-neutral-700 whitespace-nowrap">{row.code}</td>
                            <td className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">{row.name}</td>
                            <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => togglePermission(row.code, e.target.checked)}
                                className="h-4 w-4 rounded border-neutral-300 text-brand focus:ring-brand"
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {!permissionLoading && pagedPermissions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-sm text-neutral-500">
                            暂无数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between gap-4">
                  <span className="text-sm text-neutral-500">共 {permissionTotal} 条记录</span>
                  <div className="flex items-center gap-3">
                    <select
                      value={permissionSize}
                      onChange={(e) => {
                        setPermissionSize(Number(e.target.value));
                        setPermissionPage(1);
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
                        onClick={() => permissionCanPrev && setPermissionPage((p) => Math.max(1, p - 1))}
                        disabled={!permissionCanPrev}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          permissionCanPrev ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        上一页
                      </button>
                      <button type="button" className="px-3 py-1 text-sm bg-neutral-900 text-white rounded">
                        {permissionPage}
                      </button>
                      <button
                        type="button"
                        onClick={() => permissionCanNext && setPermissionPage((p) => Math.min(permissionTotalPages, p + 1))}
                        disabled={!permissionCanNext}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          permissionCanNext ? 'text-neutral-600 hover:bg-neutral-200' : 'text-neutral-400 cursor-not-allowed'
                        }`}
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'dataScope' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[13px] font-medium text-neutral-500">
                  当前数据范围：<span className="font-semibold text-neutral-900">{dataScope}</span>
                  {dataScope === 'CUSTOM' ? (
                    <span className="ml-2 text-neutral-400">· 已选择 {selectedDeptIds.size} 个部门</span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={saveDataScope}
                  disabled={savingDataScope}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingDataScope ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  保存数据范围
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {DATA_SCOPE_OPTIONS.map((opt) => {
                  const checked = dataScope === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDataScope(opt.value)}
                      className={`p-4 rounded-lg border text-left transition-colors ${
                        checked ? 'border-brand bg-brand/5' : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-neutral-900">{opt.label}</div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            checked ? 'border-brand bg-brand' : 'border-neutral-300'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${checked ? 'bg-white' : 'bg-transparent'}`} />
                        </div>
                      </div>
                      <div className="text-sm text-neutral-500 mt-1">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {dataScope === 'CUSTOM' && (
                <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[240px]">
                  {deptLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
                      <Loader2 className="animate-spin text-brand" size={32} />
                    </div>
                  )}
                  <div className="px-5 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                    <div className="text-sm font-semibold text-neutral-900">可访问部门</div>
                    <button
                      type="button"
                      onClick={fetchDeptTree}
                      className="text-[13px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                    >
                      刷新
                    </button>
                  </div>
                  <div className="p-3 overflow-y-auto max-h-[560px]">
                    {deptTree.length === 0 && !deptLoading ? (
                      <div className="px-3 py-8 text-center text-sm text-neutral-500">暂无数据</div>
                    ) : (
                      <div>{renderDeptTree(deptTree, 0)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
