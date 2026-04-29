import { useState, useEffect } from 'react';
import { Save, BrainCircuit, Key, Globe, Zap, Edit2, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../lib/axios';

export default function LLMConfig() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/settings/llm');
        if (response.data) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch LLM config:', error);
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
          <BrainCircuit size={18} className="text-brand" />
          <h2 className="text-[15px] font-semibold text-neutral-900">大语言模型配置 (LLM Resource Pool)</h2>
          <span className="text-[13px] font-medium text-neutral-500 ml-2">
            共配置了 <span className="font-semibold text-neutral-900">{data.length}</span> 个可用模型
          </span>
        </div>
        <button 
          onClick={() => handleEdit(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={14} />
          添加新模型
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((llm) => (
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
                  llm.provider === 'OpenAI' ? 'bg-emerald-50 text-emerald-600' :
                  llm.provider === 'Anthropic' ? 'bg-amber-50 text-amber-600' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-neutral-900 leading-tight">{llm.name}</h3>
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
                {llm.status === 'success' ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <CheckCircle2 size={14} /> 连接正常
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500 font-medium">
                    <AlertCircle size={14} /> 连接失败
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
              {!llm.isDefault && (
                <>
                  <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-brand hover:text-white transition-colors">
                    设为默认
                  </button>
                  <button className="flex items-center justify-center w-8 h-8 text-neutral-400 bg-neutral-50 rounded hover:bg-red-50 hover:text-red-500 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </>
              )}
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
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">配置名称 <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="例如：生产环境 GPT-4" className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">服务商 (Provider) <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900">
                          <option value="openai">OpenAI (含兼容接口)</option>
                          <option value="anthropic">Anthropic Claude</option>
                          <option value="azure">Azure OpenAI</option>
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">模型标识 (Model ID) <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="如: gpt-4-turbo" className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                      </div>
                    </div>
                  </div>

                  {/* Connection Config */}
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
                          <input type="text" placeholder="https://api.openai.com/v1" className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">API Key <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input type="password" placeholder={editingId ? "保持空白以使用原有密钥" : "sk-..."} className="w-full pl-9 pr-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                        </div>
                      </div>
                      <div>
                        <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[13px] font-medium text-brand bg-brand-light border border-brand-100 rounded-md hover:bg-brand-100 transition-colors">
                          <Zap size={14} />
                          测试连通性
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Config */}
                  <div>
                    <h3 className="text-[13px] font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-neutral-300 rounded-full"></div>
                      高级推理参数 (可选)
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5 p-4 bg-neutral-50 rounded-lg border border-neutral-100">
                      <div className="col-span-1">
                        <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">Temperature</label>
                        <input type="number" step="0.1" defaultValue="0.7" className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:border-brand transition-colors" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">Max Tokens</label>
                        <input type="number" step="1" defaultValue="4096" className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:border-brand transition-colors" />
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
