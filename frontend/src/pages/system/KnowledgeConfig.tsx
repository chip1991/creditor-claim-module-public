import { useMemo, useRef, useState, useEffect } from 'react';
import { Loader2, Plus, Search, Edit2, Trash2, Upload, Download, Ban, PlayCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../../lib/axios';
import DataTable from '../../components/DataTable';
import { useToast } from '../../components/ui/Toast';

export default function KnowledgeConfig() {
  const { showToast, ToastComponent } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const size = 20;

  const [keyword, setKeyword] = useState('');
  const [filterLv1, setFilterLv1] = useState('');
  const [filterLv2, setFilterLv2] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('');

  const [categories, setCategories] = useState<Array<{ categoryLv1: string; categoryLv2List: string[] }>>([]);
  const lv2Options = useMemo(
    () => categories.find((c) => c.categoryLv1 === filterLv1)?.categoryLv2List ?? [],
    [categories, filterLv1]
  );

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    categoryLv1: '',
    categoryLv2: '',
    level: 'surface',
    content: '',
    keywords: '',
    isEnabled: true,
  });

  const levelName = (code: string) => {
    if (code === 'surface') return '表层问题';
    if (code === 'direct') return '直接原因';
    if (code === 'deep') return '深层管理根因';
    return code;
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/kb/root-causes/categories');
        setCategories(res.data?.records ?? []);
      } catch (e: any) {
        setCategories([]);
        showToast(e?.response?.data?.msg ?? '加载分类失败', 'error');
      }
    };
    fetchCategories();
  }, [showToast]);

  const fetchPage = async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await api.get('/kb/root-causes/page', {
        params: {
          page: nextPage,
          size,
          keyword: keyword.trim() ? keyword.trim() : undefined,
          categoryLv1: filterLv1 || undefined,
          categoryLv2: filterLv2 || undefined,
          level: filterLevel || undefined,
          enabled: filterEnabled === '' ? undefined : filterEnabled === '1',
        },
      });
      setRecords(res.data?.records ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e: any) {
      setRecords([]);
      setTotal(0);
      showToast(e?.response?.data?.msg ?? '加载失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage(page);
  }, [page]);

  useEffect(() => {
    setPage(1);
    fetchPage(1);
  }, [keyword, filterLv1, filterLv2, filterLevel, filterEnabled]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      categoryLv1: '',
      categoryLv2: '',
      level: 'surface',
      content: '',
      keywords: '',
      isEnabled: true,
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (id: string) => {
    const target = records.find((r) => r.id === id);
    setEditingId(id);
    setForm({
      categoryLv1: target?.categoryLv1 ?? '',
      categoryLv2: target?.categoryLv2 ?? '',
      level: target?.level ?? 'surface',
      content: target?.content ?? '',
      keywords: target?.keywords ?? '',
      isEnabled: Boolean(target?.isEnabled ?? true),
    });
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.categoryLv1 || !form.categoryLv2 || !form.level || !form.content.trim()) {
      showToast('一级分类、二级分类、层级、根因内容为必填', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, content: form.content.trim(), keywords: form.keywords.trim() || null };
      if (editingId) {
        await api.put(`/kb/root-causes/${editingId}`, payload);
        showToast('已保存', 'success');
      } else {
        await api.post('/kb/root-causes', payload);
        showToast('已创建', 'success');
      }
      setIsDrawerOpen(false);
      setEditingId(null);
      setPage(1);
      await fetchPage(1);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, nextEnabled: boolean) => {
    try {
      await api.post(`/kb/root-causes/${id}/toggle`, { isEnabled: nextEnabled });
      showToast(nextEnabled ? '已启用' : '已禁用', 'success');
      await fetchPage(page);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '操作失败', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = window.confirm('确认删除该根因条目？');
    if (!ok) return;
    try {
      await api.delete(`/kb/root-causes/${id}`);
      showToast('已删除', 'success');
      await fetchPage(page);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '删除失败', 'error');
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/kb/root-causes/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast(
        `导入完成：成功 ${res.data?.success ?? 0} 条，失败 ${res.data?.failed ?? 0} 条`,
        res.data?.failed ? 'info' : 'success'
      );
      setPage(1);
      await fetchPage(1);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '导入失败', 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (filterLv1) params.set('categoryLv1', filterLv1);
    if (filterLv2) params.set('categoryLv2', filterLv2);
    if (filterLevel) params.set('level', filterLevel);
    if (filterEnabled !== '') params.set('enabled', filterEnabled === '1' ? 'true' : 'false');
    window.open(`/api/kb/root-causes/export?${params.toString()}`, '_blank');
  };

  const columns = [
    { title: '一级分类', dataIndex: 'categoryLv1' },
    { title: '二级分类', dataIndex: 'categoryLv2' },
    { title: '层级', dataIndex: 'level', render: (v: any) => levelName(String(v)) },
    { title: '根因内容', dataIndex: 'content', render: (v: any) => <div className="max-w-[520px] truncate">{String(v ?? '')}</div> },
    { title: '关键词', dataIndex: 'keywords', render: (v: any) => <div className="max-w-[260px] truncate">{String(v ?? '')}</div> },
    { title: '状态', dataIndex: 'isEnabled', render: (v: any) => (v ? '启用' : '禁用') },
  ];

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">根因知识库配置</h1>
        <p className="text-sm text-neutral-500 mt-1">以结构化条目维护根因，用于投诉 AI 分析输出的根因选择</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索根因内容 / 关键词"
                className="w-[260px] pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
              />
            </div>
            <select
              value={filterLv1}
              onChange={(e) => {
                setFilterLv1(e.target.value);
                setFilterLv2('');
              }}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
            >
              <option value="">全部一级分类</option>
              {categories.map((c) => (
                <option key={c.categoryLv1} value={c.categoryLv1}>
                  {c.categoryLv1}
                </option>
              ))}
            </select>
            <select
              value={filterLv2}
              onChange={(e) => setFilterLv2(e.target.value)}
              disabled={!filterLv1}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">全部二级分类</option>
              {lv2Options.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
            >
              <option value="">全部层级</option>
              <option value="surface">表层问题</option>
              <option value="direct">直接原因</option>
              <option value="deep">深层管理根因</option>
            </select>
            <select
              value={filterEnabled}
              onChange={(e) => setFilterEnabled(e.target.value)}
              className="px-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
            >
              <option value="">全部状态</option>
              <option value="1">启用</option>
              <option value="0">禁用</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              导入
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors"
            >
              <Download size={14} />
              导出
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Plus size={14} />
              新增条目
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" /> 加载中...
          </div>
        ) : (
          <DataTable
            columns={columns as any}
            data={records}
            total={total}
            current={page}
            size={size}
            onPageChange={(p) => setPage(p)}
            actions={(row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(row.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <Edit2 size={13} />
                  编辑
                </button>
                <button
                  onClick={() => handleToggle(row.id, !row.isEnabled)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  {row.isEnabled ? <Ban size={13} /> : <PlayCircle size={13} />}
                  {row.isEnabled ? '禁用' : '启用'}
                </button>
                <button
                  onClick={() => handleDelete(row.id)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={13} />
                  删除
                </button>
              </div>
            )}
          />
        )}
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
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
                <h2 className="text-[16px] font-semibold text-neutral-900">{editingId ? '编辑根因条目' : '新增根因条目'}</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                    {saving ? '保存中' : '保存'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-1">
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">一级分类 <span className="text-red-500">*</span></label>
                      <select
                        value={form.categoryLv1}
                        onChange={(e) => setForm((v) => ({ ...v, categoryLv1: e.target.value, categoryLv2: '' }))}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-900"
                      >
                        <option value="">请选择</option>
                        {categories.map((c) => (
                          <option key={c.categoryLv1} value={c.categoryLv1}>
                            {c.categoryLv1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">二级分类 <span className="text-red-500">*</span></label>
                      <select
                        value={form.categoryLv2}
                        onChange={(e) => setForm((v) => ({ ...v, categoryLv2: e.target.value }))}
                        disabled={!form.categoryLv1}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">请选择</option>
                        {(categories.find((c) => c.categoryLv1 === form.categoryLv1)?.categoryLv2List ?? []).map((x) => (
                          <option key={x} value={x}>
                            {x}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">根因层级 <span className="text-red-500">*</span></label>
                      <select
                        value={form.level}
                        onChange={(e) => setForm((v) => ({ ...v, level: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-900"
                      >
                        <option value="surface">表层问题</option>
                        <option value="direct">直接原因</option>
                        <option value="deep">深层管理根因</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">根因内容 <span className="text-red-500">*</span></label>
                      <textarea
                        rows={5}
                        value={form.content}
                        onChange={(e) => setForm((v) => ({ ...v, content: e.target.value }))}
                        placeholder="请输入标准化根因表述"
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900 resize-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">关键词（逗号分隔）</label>
                      <input
                        value={form.keywords}
                        onChange={(e) => setForm((v) => ({ ...v, keywords: e.target.value }))}
                        type="text"
                        placeholder="例如：电梯,停梯,困人"
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
                      />
                      <p className="text-[11px] text-neutral-400 mt-1.5">分析时用于匹配命中，命中越多优先级越高</p>
                    </div>
                    <div className="col-span-2 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2">
                      <div className="text-[12px] text-neutral-700 font-medium">启用该条目</div>
                      <button
                        onClick={() => setForm((v) => ({ ...v, isEnabled: !v.isEnabled }))}
                        className={`w-12 h-6 rounded-full relative transition-colors ${form.isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
