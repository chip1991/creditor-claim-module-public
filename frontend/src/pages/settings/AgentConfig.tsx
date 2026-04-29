import { useState, useEffect } from 'react';
import { Bot, Plus, Edit2, Ban, PlayCircle, Settings, BrainCircuit, Save, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../lib/axios';

export default function AgentConfig() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/settings/agent');
        if (response.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch Agent config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleEdit = (id: number | null) => {
    setEditingId(id);
    setIsDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-brand" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-brand" />
          <h2 className="text-[15px] font-semibold text-neutral-900">系统智能体配置 (AI Agents)</h2>
          <span className="text-[13px] font-medium text-neutral-500 ml-2">
            共配置了 <span className="font-semibold text-neutral-900">{data.length}</span> 个工作智能体
          </span>
        </div>
        <button 
          onClick={() => handleEdit(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={14} />
          新建智能体
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((agent) => (
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
                    agent.status === '启用' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-14 shrink-0">大模型:</span>
                <span className="font-medium text-brand flex items-center gap-1 truncate">
                  <BrainCircuit size={12} />
                  {agent.model}
                </span>
              </div>
              <div className="flex items-start gap-2 text-[12px]">
                <span className="text-neutral-400 w-14 shrink-0 mt-0.5">角色设定:</span>
                <span className="text-neutral-600 line-clamp-2" title={agent.role}>{agent.role}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] mt-2 pt-2 border-t border-neutral-100">
                <span className="text-neutral-400 w-14 shrink-0">最新更新:</span>
                <span className="text-neutral-500">
                  {agent.updatedBy} <span className="text-neutral-300 mx-1">|</span> {agent.updatedAt}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => handleEdit(agent.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Edit2 size={13} /> 编辑
              </button>
              {agent.status === '启用' ? (
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Ban size={13} /> 停用
                </button>
              ) : (
                <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-500 bg-neutral-50 rounded hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                  <PlayCircle size={13} /> 启用
                </button>
              )}
              <button className="flex items-center justify-center w-8 h-8 text-neutral-400 bg-neutral-50 rounded hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
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
                  <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm">
                    <Save size={14} />
                    保存配置
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-8">
                  {/* Basic Config */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-brand rounded-full"></div>
                      基础信息
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">智能体名称 <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="例如：破产文书自动摘要" className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">绑定大语言模型 (LLM) <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900">
                          <option value="1">OpenAI GPT-4 Turbo (默认)</option>
                          <option value="2">Anthropic Claude 3</option>
                          <option value="3">本地 Ollama 模型</option>
                        </select>
                        <p className="text-[11px] text-neutral-400 mt-1.5">选择该智能体工作时底层依赖的大模型，可在“大模型配置”中添加</p>
                      </div>
                    </div>
                  </div>

                  {/* Prompt Config */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-brand rounded-full"></div>
                      角色设定 (System Prompt)
                    </h3>
                    <div className="grid grid-cols-1 gap-y-5">
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">系统提示词 (System Prompt) <span className="text-red-500">*</span></label>
                        <textarea 
                          rows={6}
                          placeholder="请输入该智能体的核心人设、工作目标和回复约束..." 
                          className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 resize-none"
                        ></textarea>
                      </div>
                      <div>
                        <button className="flex items-center gap-1.5 text-[13px] font-medium text-brand hover:text-brand-dark transition-colors">
                          <Settings size={14} />
                          配置高级参数 (如 Temperature 等)
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
