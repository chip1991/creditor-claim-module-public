import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Plus, Search, RotateCcw, Download, Upload, Edit2, Trash2, Ban, PlayCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../lib/axios';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/ui/Toast';

export default function CategoryConfig() {
  const { showToast, ToastComponent } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loadingLv1, setLoadingLv1] = useState(true);
  const [loadingLv2, setLoadingLv2] = useState(true);
  const [importing, setImporting] = useState(false);

  const [lv1List, setLv1List] = useState<any[]>([]);
  const [selectedLv1Id, setSelectedLv1Id] = useState<string>('');

  const [lv2Records, setLv2Records] = useState<any[]>([]);
  const [lv2Total, setLv2Total] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  const [filters, setFilters] = useState({ keyword: '', enabled: '' });
  const [query, setQuery] = useState({ keyword: '', enabled: '' });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<'lv1' | 'lv2'>('lv2');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formLv1, setFormLv1] = useState({ name: '', orderNo: 0, isEnabled: true });
  const [formLv2, setFormLv2] = useState({ lv1Id: '', name: '', orderNo: 0, isEnabled: true, keywords: '' });

  useEffect(() => {
    const fetchLv1 = async () => {
      setLoadingLv1(true);
      try {
        const res = await api.get('/kb/categories/lv1/list');
        const records = res.data?.records ?? [];
        setLv1List(records);
        if (!selectedLv1Id && records.length > 0) {
          setSelectedLv1Id(records[0].id);
        }
      } catch (e: any) {
        setLv1List([]);
        showToast(e?.response?.data?.msg ?? '加载一级分类失败', 'error');
      } finally {
        setLoadingLv1(false);
      }
    };
    fetchLv1();
  }, []);

  const fetchLv2 = async (nextPage: number) => {
    if (!selectedLv1Id) {
      setLv2Records([]);
      setLv2Total(0);
      return;
    }
    setLoadingLv2(true);
    try {
      const res = await api.get('/kb/categories/lv2/page', {
        params: {
          page: nextPage,
          size,
          lv1Id: selectedLv1Id,
          keyword: query.keyword.trim() ? query.keyword.trim() : undefined,
          enabled: query.enabled === '' ? undefined : query.enabled === '1',
        },
      });
      setLv2Records(res.data?.records ?? []);
      setLv2Total(res.data?.total ?? 0);
    } catch (e: any) {
      setLv2Records([]);
      setLv2Total(0);
      showToast(e?.response?.data?.msg ?? '加载二级分类失败', 'error');
    } finally {
      setLoadingLv2(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setTimeout(() => fetchLv2(1), 0);
  }, [selectedLv1Id]);

  useEffect(() => {
    fetchLv2(page);
  }, [page, size, query]);

  const handleSearch = () => {
    setQuery(filters);
    setPage(1);
    setTimeout(() => fetchLv2(1), 0);
  };

  const handleReset = () => {
    const init = { keyword: '', enabled: '' };
    setFilters(init);
    setQuery(init);
    setPage(1);
    setTimeout(() => fetchLv2(1), 0);
  };

  const openCreateLv1 = () => {
    setDrawerType('lv1');
    setEditingId(null);
    setFormLv1({ name: '', orderNo: 0, isEnabled: true });
    setDrawerOpen(true);
  };

  const openEditLv1 = (id: string) => {
    const t = lv1List.find((x) => x.id === id);
    setDrawerType('lv1');
    setEditingId(id);
    setFormLv1({ name: t?.name ?? '', orderNo: Number(t?.orderNo ?? 0), isEnabled: Boolean(t?.isEnabled ?? true) });
    setDrawerOpen(true);
  };

  const openCreateLv2 = () => {
    if (!selectedLv1Id) {
      showToast('请先选择一级分类', 'error');
      return;
    }
    setDrawerType('lv2');
    setEditingId(null);
    setFormLv2({ lv1Id: selectedLv1Id, name: '', orderNo: 0, isEnabled: true, keywords: '' });
    setDrawerOpen(true);
  };

  const openEditLv2 = (id: string) => {
    const t = lv2Records.find((x) => x.id === id);
    setDrawerType('lv2');
    setEditingId(id);
    setFormLv2({
      lv1Id: t?.lv1Id ?? selectedLv1Id,
      name: t?.name ?? '',
      orderNo: Number(t?.orderNo ?? 0),
      isEnabled: Boolean(t?.isEnabled ?? true),
      keywords: t?.keywords ?? '',
    });
    setDrawerOpen(true);
  };

  const saveLv1 = async () => {
    if (!formLv1.name.trim()) {
      showToast('一级分类名称不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/kb/categories/lv1/${editingId}`, { ...formLv1, name: formLv1.name.trim() });
        showToast('已保存', 'success');
      } else {
        await api.post('/kb/categories/lv1', { ...formLv1, name: formLv1.name.trim() });
        showToast('已创建', 'success');
      }
      setDrawerOpen(false);
      const res = await api.get('/kb/categories/lv1/list');
      const records = res.data?.records ?? [];
      setLv1List(records);
      if (!selectedLv1Id && records.length > 0) setSelectedLv1Id(records[0].id);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveLv2 = async () => {
    if (!formLv2.lv1Id || !formLv2.name.trim()) {
      showToast('二级分类名称不能为空', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...formLv2, name: formLv2.name.trim(), keywords: formLv2.keywords.trim() || null };
      if (editingId) {
        await api.put(`/kb/categories/lv2/${editingId}`, payload);
        showToast('已保存', 'success');
      } else {
        await api.post('/kb/categories/lv2', payload);
        showToast('已创建', 'success');
      }
      setDrawerOpen(false);
      await fetchLv2(page);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLv1 = async (id: string, next: boolean) => {
    try {
      await api.post(`/kb/categories/lv1/${id}/toggle`, { isEnabled: next });
      const res = await api.get('/kb/categories/lv1/list');
      setLv1List(res.data?.records ?? []);
      showToast(next ? '已启用' : '已禁用', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '操作失败', 'error');
    }
  };

  const handleDeleteLv1 = async (id: string) => {
    const ok = window.confirm('确认删除该一级分类及其二级分类？');
    if (!ok) return;
    try {
      await api.delete(`/kb/categories/lv1/${id}`);
      const res = await api.get('/kb/categories/lv1/list');
      const records = res.data?.records ?? [];
      setLv1List(records);
      if (selectedLv1Id === id) {
        setSelectedLv1Id(records[0]?.id ?? '');
      }
      showToast('已删除', 'success');
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '删除失败', 'error');
    }
  };

  const handleToggleLv2 = async (id: string, next: boolean) => {
    try {
      await api.post(`/kb/categories/lv2/${id}/toggle`, { isEnabled: next });
      showToast(next ? '已启用' : '已禁用', 'success');
      await fetchLv2(page);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '操作失败', 'error');
    }
  };

  const handleDeleteLv2 = async (id: string) => {
    const ok = window.confirm('确认删除该二级分类？');
    if (!ok) return;
    try {
      await api.delete(`/kb/categories/lv2/${id}`);
      showToast('已删除', 'success');
      await fetchLv2(page);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '删除失败', 'error');
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/kb/categories/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(`导入完成：成功 ${res.data?.success ?? 0} 条，失败 ${res.data?.failed ?? 0} 条`, res.data?.failed ? 'info' : 'success');
      const lv1Res = await api.get('/kb/categories/lv1/list');
      const records = lv1Res.data?.records ?? [];
      setLv1List(records);
      if (!selectedLv1Id && records.length > 0) setSelectedLv1Id(records[0].id);
      await fetchLv2(1);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '导入失败', 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExport = () => {
    window.open('/api/kb/categories/export', '_blank');
  };

  const columns = useMemo(
    () => [
      { title: '二级分类', dataIndex: 'name', render: (v: any) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '关键词', dataIndex: 'keywords', render: (v: any) => <span className="text-neutral-600">{v ?? '-'}</span> },
      { title: '状态', dataIndex: 'isEnabled', render: (v: any) => <span className="text-neutral-700">{v ? '启用' : '禁用'}</span> },
      { title: '排序', dataIndex: 'orderNo', render: (v: any) => <span className="font-mono text-neutral-500">{v ?? 0}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">投诉分类配置</h1>
        <p className="text-sm text-neutral-500 mt-1">以结构化方式维护一级/二级分类与关键词规则，用于投诉分类识别</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold text-neutral-900">一级分类</div>
              <button
                onClick={openCreateLv1}
                className="flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors"
              >
                <Plus size={14} />
                新增
              </button>
            </div>
            {loadingLv1 ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 size={16} className="animate-spin" /> 加载中...
              </div>
            ) : (
              <div className="space-y-1">
                {lv1List.length <= 0 && <div className="text-[13px] text-neutral-500 py-3">暂无一级分类</div>}
                {lv1List.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-md border transition-colors cursor-pointer ${
                      selectedLv1Id === c.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                    onClick={() => setSelectedLv1Id(c.id)}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-neutral-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{c.isEnabled ? '启用' : '禁用'}</div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditLv1(c.id);
                        }}
                        className="text-neutral-500 hover:text-neutral-900"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleLv1(c.id, !c.isEnabled);
                        }}
                        className="text-neutral-500 hover:text-neutral-900"
                      >
                        {c.isEnabled ? <Ban size={14} /> : <PlayCircle size={14} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLv1(c.id);
                        }}
                        className="text-neutral-500 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-9">
          <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
              <div className="w-72 shrink-0">
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关键字</label>
                <input
                  type="text"
                  value={filters.keyword}
                  onChange={(e) => setFilters((v) => ({ ...v, keyword: e.target.value }))}
                  placeholder="二级分类名称/关键词..."
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                />
              </div>
              <div className="w-56 shrink-0">
                <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">启用状态</label>
                <select
                  value={filters.enabled}
                  onChange={(e) => setFilters((v) => ({ ...v, enabled: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
                >
                  <option value="">全部</option>
                  <option value="1">启用</option>
                  <option value="0">禁用</option>
                </select>
              </div>

              <div className="flex gap-3 ml-auto shrink-0">
                <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                  <RotateCcw size={16} />
                  重置
                </button>
                <button onClick={handleSearch} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm">
                  <Search size={16} />
                  查询
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 mt-6">
            <div className="text-[13px] font-medium text-neutral-500">
              共检索到 <span className="font-semibold text-neutral-900">{lv2Total}</span> 条二级分类
            </div>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                导入
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <Download size={14} />
                导出
              </button>
              <button
                onClick={openCreateLv2}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
              >
                <Plus size={14} />
                新增二级分类
              </button>
            </div>
          </div>

          {loadingLv2 ? (
            <div className="flex items-center gap-2 text-sm text-neutral-500 mt-3">
              <Loader2 size={16} className="animate-spin" /> 加载中...
            </div>
          ) : (
            <DataTable
              columns={columns as any}
              data={lv2Records}
              total={lv2Total}
              current={page}
              size={size}
              onPageChange={setPage}
              onSizeChange={setSize}
              actions={(row) => (
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditLv2(row.id)} className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors">
                    <Edit2 size={14} /> 编辑
                  </button>
                  <button onClick={() => handleToggleLv2(row.id, !row.isEnabled)} className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors">
                    {row.isEnabled ? <Ban size={14} /> : <PlayCircle size={14} />}
                    {row.isEnabled ? '禁用' : '启用'}
                  </button>
                  <button onClick={() => handleDeleteLv2(row.id)} className="flex items-center gap-1 text-neutral-600 hover:text-red-600 transition-colors">
                    <Trash2 size={14} /> 删除
                  </button>
                </div>
              )}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-[560px] bg-white shadow-xl z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
                <h2 className="text-[16px] font-semibold text-neutral-900">
                  {drawerType === 'lv1' ? (editingId ? '编辑一级分类' : '新增一级分类') : editingId ? '编辑二级分类' : '新增二级分类'}
                </h2>
                <div className="flex gap-3">
                  <button onClick={() => setDrawerOpen(false)} className="px-4 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                    取消
                  </button>
                  <button
                    onClick={() => (drawerType === 'lv1' ? saveLv1() : saveLv2())}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving ? '保存中' : '保存'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {drawerType === 'lv1' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">名称 <span className="text-red-500">*</span></label>
                      <input
                        value={formLv1.name}
                        onChange={(e) => setFormLv1((v) => ({ ...v, name: e.target.value }))}
                        type="text"
                        placeholder="例如：设施设备类"
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">排序</label>
                        <input
                          value={formLv1.orderNo}
                          onChange={(e) => setFormLv1((v) => ({ ...v, orderNo: Number(e.target.value) }))}
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2">
                        <div className="text-[12px] text-neutral-700 font-medium">启用</div>
                        <button
                          onClick={() => setFormLv1((v) => ({ ...v, isEnabled: !v.isEnabled }))}
                          className={`w-12 h-6 rounded-full relative transition-colors ${formLv1.isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formLv1.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">所属一级分类 <span className="text-red-500">*</span></label>
                      <select
                        value={formLv2.lv1Id}
                        onChange={(e) => setFormLv2((v) => ({ ...v, lv1Id: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
                      >
                        <option value="">请选择</option>
                        {lv1List.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">名称 <span className="text-red-500">*</span></label>
                      <input
                        value={formLv2.name}
                        onChange={(e) => setFormLv2((v) => ({ ...v, name: e.target.value }))}
                        type="text"
                        placeholder="例如：电梯故障"
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">关键词（逗号分隔）</label>
                      <input
                        value={formLv2.keywords}
                        onChange={(e) => setFormLv2((v) => ({ ...v, keywords: e.target.value }))}
                        type="text"
                        placeholder="例如：电梯,困,停梯"
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">排序</label>
                        <input
                          value={formLv2.orderNo}
                          onChange={(e) => setFormLv2((v) => ({ ...v, orderNo: Number(e.target.value) }))}
                          type="number"
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2">
                        <div className="text-[12px] text-neutral-700 font-medium">启用</div>
                        <button
                          onClick={() => setFormLv2((v) => ({ ...v, isEnabled: !v.isEnabled }))}
                          className={`w-12 h-6 rounded-full relative transition-colors ${formLv2.isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${formLv2.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
