import { useMemo, useState, useEffect } from 'react';
import { Bot, Plus, Edit2, Ban, PlayCircle, Settings, BrainCircuit, Save, Trash2, Loader2, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

export default function AgentConfig() {
  const { showToast, ToastComponent } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const size = 12;

  const [llms, setLlms] = useState<any[]>([]);
  const llmMap = useMemo(() => new Map(llms.map((x) => [x.id, `${x.provider}/${x.model}`])), [llms]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [lastDraftId, setLastDraftId] = useState<string | null>(null);

  const [versions, setVersions] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState<any | null>(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    llmId: '',
    isEnabled: true,
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / size)), [total]);

  useEffect(() => {
    const fetchLlms = async () => {
      try {
        const res = await axios.get('/ai/llms/page', { params: { page: 1, size: 200 } });
        setLlms(res.data?.records ?? []);
      } catch (e: any) {
        setLlms([]);
        showToast(e?.response?.data?.msg ?? '加载大模型列表失败', 'error');
      }
    };
    fetchLlms();
  }, [showToast]);

  useEffect(() => {
    const fetchAgents = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/ai/agents/page', {
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
    fetchAgents();
  }, [page, keyword, showToast]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/ai/agents/page', {
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

  const loadVersionInfo = async (agentId: string) => {
    try {
      const [cur, list] = await Promise.all([
        axios.get(`/ai/agents/${agentId}/versions/current`),
        axios.get(`/ai/agents/${agentId}/versions`),
      ]);
      setCurrentVersion(cur.data?.version ?? null);
      setVersions(list.data?.records ?? []);

      const cfg = cur.data?.version?.config;
      setForm((v) => ({
        ...v,
        systemPrompt: cfg?.systemPrompt ?? '',
        temperature: Number(cfg?.params?.temperature ?? 0.7),
        maxTokens: Number(cfg?.params?.maxTokens ?? 4096),
      }));
    } catch (e: any) {
      setCurrentVersion(null);
      setVersions([]);
      showToast(e?.response?.data?.msg ?? '加载版本信息失败', 'error');
    }
  };

  const handleEdit = async (id: string | null) => {
    setTestInput('');
    setTestOutput(null);
    setLastDraftId(null);
    setVersions([]);
    setCurrentVersion(null);

    if (!id) {
      setEditingId(null);
      setForm({
        name: '',
        code: '',
        llmId: '',
        isEnabled: true,
        systemPrompt: '',
        temperature: 0.7,
        maxTokens: 4096,
      });
      setIsDrawerOpen(true);
      return;
    }

    const target = records.find((r) => r.id === id);
    setEditingId(id);
    setForm({
      name: target?.name ?? '',
      code: target?.code ?? '',
      llmId: target?.llmId ?? '',
      isEnabled: Boolean(target?.isEnabled ?? true),
      systemPrompt: '',
      temperature: 0.7,
      maxTokens: 4096,
    });
    setIsDrawerOpen(true);
    await loadVersionInfo(id);
  };

  const handleSaveBase = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      showToast('智能体名称与标识为必填', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/ai/agents/${editingId}`, {
          name: form.name.trim(),
          code: form.code.trim(),
          llmId: form.llmId || null,
          isEnabled: form.isEnabled,
        });
        showToast('已保存', 'success');
        await refresh();
      } else {
        const res = await axios.post('/ai/agents', {
          name: form.name.trim(),
          code: form.code.trim(),
          llmId: form.llmId || null,
          isEnabled: form.isEnabled,
        });
        const id = res.data?.id;
        if (id) {
          setEditingId(id);
          showToast('已创建', 'success');
          await refresh();
        } else {
          showToast('创建失败', 'error');
        }
      }
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (agentId: string, nextEnabled: boolean) => {
    try {
      await axios.post(`/ai/agents/${agentId}/toggle`, { isEnabled: nextEnabled });
      showToast(nextEnabled ? '已启用' : '已停用', 'success');
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '操作失败', 'error');
    }
  };

  const handleDelete = async (agentId: string) => {
    const ok = window.confirm('确认删除该智能体？');
    if (!ok) return;
    try {
      await axios.delete(`/ai/agents/${agentId}`);
      showToast('已删除', 'success');
      setIsDrawerOpen(false);
      setEditingId(null);
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '删除失败', 'error');
    }
  };

  const handleSaveDraft = async () => {
    if (!editingId) {
      showToast('请先保存智能体基础信息', 'error');
      return;
    }
    if (!form.systemPrompt.trim()) {
      showToast('系统提示词为必填', 'error');
      return;
    }
    setDraftSaving(true);
    try {
      const res = await axios.post(`/ai/agents/${editingId}/versions/draft/save`, {
        config: {
          systemPrompt: form.systemPrompt,
          params: { temperature: form.temperature, maxTokens: form.maxTokens },
        },
      });
      showToast('草稿已保存', 'success');
      const versionId = res.data?.versionId;
      setLastDraftId(versionId ?? null);
      await loadVersionInfo(editingId);
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '保存草稿失败', 'error');
    } finally {
      setDraftSaving(false);
    }
  };

  const handlePublish = async (versionId: string) => {
    if (!editingId) return;
    setPublishing(true);
    try {
      await axios.post(`/ai/agents/${editingId}/versions/publish`, { versionId });
      showToast('已发布', 'success');
      await loadVersionInfo(editingId);
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '发布失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!editingId) return;
    setPublishing(true);
    try {
      await axios.post(`/ai/agents/${editingId}/versions/${versionId}/rollback`);
      showToast('已回滚', 'success');
      await loadVersionInfo(editingId);
      await refresh();
    } catch (e: any) {
      showToast(e?.response?.data?.msg ?? '回滚失败', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const handleTestRun = async () => {
    if (!editingId) {
      showToast('请先保存智能体基础信息', 'error');
      return;
    }
    if (!testInput.trim()) {
      showToast('请输入测试内容', 'error');
      return;
    }
    try {
      setTestOutput(null);
      const res = await axios.post(`/ai/agents/${editingId}/test-run`, { input: testInput });
      setTestOutput(res.data?.output ?? '');
    } catch (e: any) {
      setTestOutput(null);
      showToast(e?.response?.data?.msg ?? '测试运行失败', 'error');
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
          <Bot size={18} className="text-brand" />
          <h2 className="text-[15px] font-semibold text-neutral-900">系统智能体配置 (AI Agents)</h2>
          <span className="text-[13px] font-medium text-neutral-500 ml-2">
            共配置了 <span className="font-semibold text-neutral-900">{total}</span> 个智能体
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
              placeholder="搜索名称 / 标识"
              className="w-[260px] pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-[13px] focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow text-neutral-900"
            />
          </div>
          <button
            onClick={() => handleEdit(null)}
            className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            新建智能体
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {records.map((agent) => (
          <motion.div 
            key={agent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm hover:border-neutral-300 transition-all duration-200 relative group overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-neutral-900 leading-tight">{agent.name}</h3>
                  <span className={`text-[11px] font-medium mt-1 inline-flex items-center px-1.5 py-0.5 rounded ${
                    agent.isEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {agent.isEnabled ? '启用' : '停用'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-14 shrink-0">大模型:</span>
                <span className="font-medium text-brand flex items-center gap-1 truncate">
                  <BrainCircuit size={12} />
                  {agent.llmId ? (llmMap.get(agent.llmId) ?? agent.llmId) : '未绑定'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-14 shrink-0">标识:</span>
                <span className="font-mono text-neutral-700 truncate">{agent.code}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] mt-2 pt-2 border-t border-neutral-100">
                <span className="text-neutral-400 w-14 shrink-0">当前版本:</span>
                <span className="text-neutral-500 font-mono truncate">{agent.currentVersionId ?? '未发布'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => handleEdit(agent.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Edit2 size={13} /> 编辑
              </button>
              <button
                onClick={() => handleToggle(agent.id, !agent.isEnabled)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                {agent.isEnabled ? <Ban size={13} /> : <PlayCircle size={13} />}
                {agent.isEnabled ? '停用' : '启用'}
              </button>
              <button
                onClick={() => handleDelete(agent.id)}
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
          <span className="text-[14px] font-medium">添加新智能体</span>
          <span className="text-[12px] mt-1 text-neutral-400 text-center max-w-[200px]">
            创建新的 AI Agent，配置角色设定并绑定底层大模型
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
                  {editingId ? '编辑智能体' : '添加新智能体'}
                </h2>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="px-4 py-2 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveBase}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? '保存中' : '保存基础信息'}
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
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">智能体名称 <span className="text-red-500">*</span></label>
                        <input
                          value={form.name}
                          onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))}
                          type="text"
                          placeholder="例如：破产文书自动摘要"
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">智能体标识 (Code) <span className="text-red-500">*</span></label>
                        <input
                          value={form.code}
                          onChange={(e) => setForm((v) => ({ ...v, code: e.target.value }))}
                          type="text"
                          placeholder="例如：workorder_summary"
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">绑定大语言模型 (LLM)</label>
                        <select
                          value={form.llmId}
                          onChange={(e) => setForm((v) => ({ ...v, llmId: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900"
                        >
                          <option value="">不绑定</option>
                          {llms.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.provider}/{x.model}{x.isDefault ? ' (默认)' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-neutral-400 mt-1.5">LLM 可在“大语言模型配置”中维护</p>
                      </div>
                      <div className="col-span-2 flex items-center justify-between bg-neutral-50 border border-neutral-100 rounded-md px-3 py-2">
                        <div className="text-[12px] text-neutral-700 font-medium">启用该智能体</div>
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
                      版本配置
                    </h3>
                    <div className="grid grid-cols-1 gap-y-5">
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">系统提示词 (System Prompt) <span className="text-red-500">*</span></label>
                        <textarea 
                          rows={6}
                          value={form.systemPrompt}
                          onChange={(e) => setForm((v) => ({ ...v, systemPrompt: e.target.value }))}
                          placeholder="请输入该智能体的核心人设、工作目标和回复约束..." 
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 resize-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">Temperature</label>
                          <input
                            value={form.temperature}
                            onChange={(e) => setForm((v) => ({ ...v, temperature: Number(e.target.value) }))}
                            type="number"
                            step="0.1"
                            className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">Max Tokens</label>
                          <input
                            value={form.maxTokens}
                            onChange={(e) => setForm((v) => ({ ...v, maxTokens: Number(e.target.value) }))}
                            type="number"
                            step="1"
                            className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:border-brand transition-colors"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleSaveDraft}
                          disabled={draftSaving}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {draftSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          {draftSaving ? '保存中' : '保存草稿'}
                        </button>
                        <button
                          onClick={() => lastDraftId && handlePublish(lastDraftId)}
                          disabled={!lastDraftId || publishing}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium text-brand bg-brand-light border border-brand-100 rounded-md hover:bg-brand-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {publishing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                          发布最新草稿
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-neutral-300 rounded-full"></div>
                      版本列表
                    </h3>
                    {currentVersion?.id && (
                      <div className="text-[12px] text-neutral-500 mb-3">
                        当前生效：<span className="font-mono text-neutral-700">{currentVersion.id}</span>
                      </div>
                    )}
                    {versions.length <= 0 ? (
                      <div className="text-[13px] text-neutral-500">暂无版本</div>
                    ) : (
                      <div className="space-y-2">
                        {versions.map((v) => (
                          <div key={v.id} className="flex items-center justify-between px-3 py-2 bg-white border border-neutral-200 rounded-md">
                            <div className="min-w-0">
                              <div className="text-[12px] font-mono text-neutral-900 truncate">{v.id}</div>
                              <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded ${v.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'}`}>
                                  {v.status === 'published' ? '已发布' : '草稿'}
                                </span>
                                {v.publishedAt ? <span>发布于 {String(v.publishedAt)}</span> : <span>创建于 {String(v.createdAt)}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {v.status !== 'published' && (
                                <button
                                  onClick={() => handlePublish(v.id)}
                                  disabled={publishing}
                                  className="px-3 py-1.5 text-[12px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  发布
                                </button>
                              )}
                              <button
                                onClick={() => handleRollback(v.id)}
                                disabled={publishing}
                                className="px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                回滚
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-neutral-300 rounded-full"></div>
                      测试运行
                    </h3>
                    <div className="space-y-3">
                      <textarea
                        rows={4}
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="输入测试内容..."
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 resize-none"
                      />
                      <button
                        onClick={handleTestRun}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium text-brand bg-brand-light border border-brand-100 rounded-md hover:bg-brand-100 transition-colors"
                      >
                        <Settings size={14} />
                        发起测试运行
                      </button>
                      {testOutput !== null && (
                        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-md">
                          <div className="text-[12px] font-semibold text-neutral-700 mb-2 flex items-center gap-2">
                            {testOutput ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-neutral-500" />}
                            输出
                          </div>
                          <pre className="text-[12px] text-neutral-700 whitespace-pre-wrap break-words">{testOutput}</pre>
                        </div>
                      )}
                    </div>
                  </div>

                  {editingId && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleDelete(editingId)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[13px] font-medium text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={14} />
                        删除智能体
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
