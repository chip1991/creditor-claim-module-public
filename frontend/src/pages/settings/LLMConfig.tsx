import { useMemo, useState, useEffect } from 'react';
import { Save, BrainCircuit, Key, Globe, Zap, Edit2, Plus, Trash2, CheckCircle2, AlertCircle, Loader2, Ban, PlayCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

export default function LLMConfig() {
  const { showToast, ToastComponent } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const size = 12;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    provider: 'openai',
    model: '',
    baseUrl: '',
    apiKey: '',
    isEnabled: true,
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / size)), [total]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/ai/llms/page', {
          params: { page, size, keyword: keyword.trim() ? keyword.trim() : undefined },
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
    fetchData();
  }, [page, keyword, showToast]);

  const handleEdit = (id: string | null) => {
    setEditingId(id);
    if (!id) {
      setForm({ provider: 'openai', model: '', baseUrl: '', apiKey: '', isEnabled: true });
    } else {
      const target = records.find((r) => r.id === id);
      setForm({
        provider: target?.provider ?? 'openai',
        model: target?.model ?? '',
        baseUrl: target?.baseUrl ?? '',
        apiKey: '',
        isEnabled: Boolean(target?.isEnabled ?? true),
      });
    }
    setIsDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.provider.trim() || !form.model.trim()) {
      showToast('服务商与模型标识为必填', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/ai/llms/${editingId}`, {
          provider: form.provider.trim(),
          model: form.model.trim(),
          baseUrl: form.baseUrl.trim() || null,
          apiKey: form.apiKey.trim() || null,
          isEnabled: form.isEnabled,
        });
        showToast('已保存', 'success');
      } else {
        await axios.post('/ai/llms', {
          provider: form.provider.trim(),
          model: form.model.trim(),
          baseUrl: form.baseUrl.trim() || null,
          apiKey: form.apiKey.trim() || null,
          isEnabled: form.isEnabled,
        });
        showToast('已创建', 'success');
      }
      setIsDrawerOpen(false);
      setEditingId(null);
      const targetPage = 1;
      setPage(targetPage);
      const res = await axios.get('/ai/llms/page', {
        params: { page: targetPage, size, keyword: keyword.trim() ? keyword.trim() : undefined },
      });
      setRecords(res.data?.records ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/ai/llms/page', {
        params: { page, size, keyword: keyword.trim() ? keyword.trim() : undefined },
      });
      setRecords(res.data?.records ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '刷新失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (llmId: string) => {
    try {
      await axios.post(`/ai/llms/${llmId}/set-default`);
      showToast('已设为默认', 'success');
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '设置默认失败', 'error');
    }
  };

  const handleToggle = async (llmId: string, nextEnabled: boolean) => {
    try {
      await axios.post(`/ai/llms/${llmId}/toggle`, { isEnabled: nextEnabled });
      showToast(nextEnabled ? '已启用' : '已停用', 'success');
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '操作失败', 'error');
    }
  };

  const handleDelete = async (llmId: string) => {
    const ok = window.confirm('确认删除该大模型配置？');
    if (!ok) return;
    try {
      await axios.delete(`/ai/llms/${llmId}`);
      showToast('已删除', 'success');
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '删除失败', 'error');
    }
  };

  const handleTest = async (llmId: string) => {
    setTesting(true);
    try {
      const res = await axios.post(`/ai/llms/${llmId}/test`);
      if (res.data?.success) {
        showToast('连接正常', 'success');
      } else {
        showToast(res.data?.error ?? '连接失败', 'error');
      }
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '测试失败', 'error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        {ToastComponent}
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <BrainCircuit size={18} className="text-brand" />
          <h2 className="text-[15px] font-semibold text-neutral-900">大语言模型配置 (LLM Resource Pool)</h2>
          <span className="text-[13px] font-medium text-neutral-500 ml-2">
            共配置了 <span className="font-semibold text-neutral-900">{total}</span> 个模型
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={keyword}
              onChange={(e) => {
                setPage(1);
                setKeyword(e.target.value);
              }}
              placeholder="搜索 provider / model / URL"
              className="w-[260px] pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
            />
          </div>
          <button
            onClick={() => handleEdit(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            添加新模型
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {records.map((llm) => (
          <motion.div 
            key={llm.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white border rounded-lg p-5 shadow-sm transition-all duration-200 relative group overflow-hidden ${
              llm.isDefault ? 'border-brand ring-1 ring-brand/20' : 'border-neutral-200 hover:border-neutral-300'
            }`}
          >
            {llm.isDefault && (
              <div className="absolute top-0 right-0 bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg flex items-center gap-1 z-10">
                默认使用
              </div>
            )}
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  llm.provider === 'openai' ? 'bg-emerald-50 text-emerald-600' :
                  llm.provider === 'anthropic' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-neutral-900 leading-tight">{llm.model}</h3>
                  <span className="text-[11px] font-medium text-neutral-500 mt-1 inline-block bg-neutral-100 px-1.5 py-0.5 rounded">
                    {llm.provider}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-12 shrink-0">Model:</span>
                <span className="font-mono text-neutral-700 truncate">{llm.model}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-12 shrink-0">URL:</span>
                <span className="font-mono text-neutral-700 truncate">{llm.baseUrl}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] mt-2 pt-2 border-t border-neutral-100">
                <span className="text-neutral-400 w-12 shrink-0">Status:</span>
                {llm.lastTestStatus === 'success' ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 size={14} /> 连接正常
                  </span>
                ) : llm.lastTestStatus === 'failed' ? (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <AlertCircle size={14} /> 连接失败
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-neutral-500 font-medium">
                    <AlertCircle size={14} /> 未测试
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => handleEdit(llm.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Edit2 size={13} /> 编辑
              </button>
              <button
                onClick={() => handleToggle(llm.id, !llm.isEnabled)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                {llm.isEnabled ? <Ban size={13} /> : <PlayCircle size={13} />}
                {llm.isEnabled ? '停用' : '启用'}
              </button>
              {!llm.isDefault && (
                <button
                  onClick={() => handleSetDefault(llm.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-brand hover:text-white transition-colors"
                >
                  设为默认
                </button>
              )}
              <button
                onClick={() => handleDelete(llm.id)}
                className="flex items-center justify-center w-8 h-8 text-neutral-400 bg-neutral-50 rounded hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
        
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => handleEdit(null)}
          className="bg-neutral-50/50 border-2 border-dashed border-neutral-200 rounded-lg p-5 flex flex-col items-center justify-center text-neutral-400 hover:text-brand hover:border-brand/30 hover:bg-brand-light/30 transition-all duration-200 min-h-[220px] group"
        >
          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <span className="text-[14px] font-medium">添加新模型配置</span>
          <span className="text-[12px] mt-1 text-neutral-400 text-center max-w-[200px]">
            支持接入 OpenAI、Anthropic 或任意兼容 OpenAI 格式的本地大模型服务
          </span>
        </motion.button>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        <span className="text-[12px] text-neutral-500">
          第 <span className="font-medium text-neutral-900">{page}</span> / {totalPages} 页
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>

      {/* Drawer Overlay & Content */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-neutral-900/20 z-40 backdrop-blur-sm"
              onClick={() => setIsDrawerOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-neutral-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
                <h2 className="text-[16px] font-semibold text-neutral-900">
                  {editingId ? '编辑模型配置' : '添加新模型'}
                </h2>
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
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? '保存中' : '保存配置'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-brand rounded-full"></div>
                      基础信息
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">服务商 (Provider) <span className="text-red-500">*</span></label>
                        <select
                          value={form.provider}
                          onChange={(e) => setForm((v) => ({ ...v, provider: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900"
                        >
                          <option value="openai">OpenAI (含兼容接口)</option>
                          <option value="anthropic">Anthropic</option>
                          <option value="azure">Azure OpenAI</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">模型标识 (Model ID) <span className="text-red-500">*</span></label>
                        <input
                          value={form.model}
                          onChange={(e) => setForm((v) => ({ ...v, model: e.target.value }))}
                          type="text"
                          placeholder="如: gpt-4o-mini"
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900"
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2">
                        <div className="text-[12px] text-neutral-700 font-medium">启用该模型</div>
                        <button
                          onClick={() => setForm((v) => ({ ...v, isEnabled: !v.isEnabled }))}
                          className={`w-12 h-6 rounded-full relative transition-colors ${form.isEnabled ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-brand rounded-full"></div>
                      连接鉴权
                    </h3>
                    <div className="grid grid-cols-1 gap-y-5">
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">接口地址 (Base URL) <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            value={form.baseUrl}
                            onChange={(e) => setForm((v) => ({ ...v, baseUrl: e.target.value }))}
                            type="text"
                            placeholder="https://api.openai.com/v1"
                            className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">API Key <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            value={form.apiKey}
                            onChange={(e) => setForm((v) => ({ ...v, apiKey: e.target.value }))}
                            type="password"
                            placeholder={editingId ? "保持空白以使用原有密钥" : "sk-..."}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900"
                          />
                        </div>
                      </div>
                      <div>
                        <button
                          disabled={!editingId || testing}
                          onClick={() => editingId && handleTest(editingId)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-brand bg-brand-light border border-brand-100 rounded-md hover:bg-brand-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                          测试连通性
                        </button>
                      </div>
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
