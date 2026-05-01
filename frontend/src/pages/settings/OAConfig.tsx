import { useState, useEffect } from 'react';
import { Save, Settings, FileCheck, ArrowRightLeft, Plus, Edit2, Ban, PlayCircle, Trash2, Braces, Link, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../lib/axios';

export default function OAConfig() {
  const [data, setData] = useState<any[]>([]);
  const [config, setConfig] = useState({
    oaEndpoint: '',
    oaAppKey: '',
    oaAppSecret: '',
    oaSignMethod: 'hmac-sha256'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, mappingRes] = await Promise.all([
          axios.get('/settings/config'),
          axios.get('/settings/oa/mapping')
        ]);
        if (configRes.data?.oa) {
          setConfig(configRes.data.oa);
        }
        if (mappingRes.data) {
          setData(mappingRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch OA config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      await axios.post('/settings/config', { oa: config });
      alert('保存成功');
      setIsGatewayOpen(false);
    } catch (error) {
      console.error('Failed to save OA config:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

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
      {/* Part 1: Global Gateway Config */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm">
        <div className={`flex items-center justify-between ${isGatewayOpen ? 'border-b border-neutral-200 pb-4 mb-8' : ''}`}>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-brand" />
            <h2 className="text-[15px] font-semibold text-neutral-900">全局通信网关配置 (Global Gateway)</h2>
          </div>
          <div className="flex gap-3">
            {isGatewayOpen ? (
              <>
                <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-emerald-600 bg-white border border-emerald-200 rounded hover:bg-emerald-50 transition-colors shadow-sm">
                  <FileCheck size={14} />
                  测试网关连通性
                </button>
                <button 
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  保存全局配置
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsGatewayOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <Edit2 size={14} />
                编辑网关配置
              </button>
            )}
          </div>
        </div>
        
        <AnimatePresence>
          {isGatewayOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-x-12 gap-y-8">
                <div className="col-span-3 lg:col-span-1">
                  <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">OA 系统接口地址 (Endpoint) <span className="text-red-500">*</span></label>
                  <input type="text" name="oaEndpoint" value={config.oaEndpoint} onChange={handleChange} placeholder="https://oa.evertro.tech/api/workflow/create" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
                  <p className="text-[11px] text-neutral-400 mt-1.5">用于创建所有审批流程实例的统一 API 地址</p>
                </div>
                
                <div className="col-span-3 lg:col-span-1">
                  <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">系统标识 (AppKey) <span className="text-red-500">*</span></label>
                  <input type="text" name="oaAppKey" value={config.oaAppKey} onChange={handleChange} placeholder="evertro-ledger" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
                  <p className="text-[11px] text-neutral-400 mt-1.5">本系统在 OA 中注册的唯一身份标识</p>
                </div>

                <div className="col-span-3 lg:col-span-1">
                  <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">通信秘钥 (AppSecret) <span className="text-red-500">*</span></label>
                  <input type="password" name="oaAppSecret" value={config.oaAppSecret} onChange={handleChange} placeholder="****************" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
                  <p className="text-[11px] text-neutral-400 mt-1.5">网关鉴权秘钥，请妥善保管</p>
                </div>

                <div className="col-span-3 lg:col-span-2 border-t border-neutral-100 pt-6">
                  <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowRightLeft size={14}/> 统一回调接收地址 (Webhook)</label>
                  <input type="text" disabled value="https://api.ledger.evertro.tech/api/oa/callback" className="w-full px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-md text-sm text-neutral-500 font-mono cursor-not-allowed" />
                  <p className="text-[11px] text-neutral-400 mt-1.5">所有 OA 流程的状态变更均推送到此接口，系统会根据 InstanceID 自动路由到具体的业务模块进行处理。</p>
                </div>

                <div className="col-span-3 lg:col-span-1 border-t border-neutral-100 pt-6">
                  <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">回调验签机制</label>
                  <select name="oaSignMethod" value={config.oaSignMethod} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900">
                    <option value="hmac-sha256">HMAC-SHA256 (推荐)</option>
                    <option value="md5">MD5 签名</option>
                    <option value="none">不验签 (不安全)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Part 2: Mapping Grid */}
      <div className="flex items-center justify-between px-1 mt-2">
        <div className="flex items-center gap-2">
          <Link size={18} className="text-brand" />
          <h2 className="text-[15px] font-semibold text-neutral-900">业务流程映射 (Process Mapping)</h2>
          <span className="text-[13px] font-medium text-neutral-500 ml-2">
            共配置了 <span className="font-semibold text-neutral-900">{data.length}</span> 个流程映射
          </span>
        </div>
        <button 
          onClick={() => handleEdit(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
        >
          <Plus size={14} />
          新建映射规则
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((mapping) => (
          <motion.div 
            key={mapping.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-neutral-200 rounded-lg p-5 shadow-sm hover:border-neutral-300 transition-all duration-200 relative group overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0">
                  <Link size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-neutral-900 leading-tight">{mapping.module}</h3>
                  <span className={`text-[11px] font-medium mt-1 inline-flex items-center px-1.5 py-0.5 rounded ${
                    mapping.status === '启用' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-500'
                  }`}>
                    {mapping.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-16 shrink-0">流程代码:</span>
                <span className="font-mono font-medium text-brand truncate">{mapping.templateCode}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-neutral-400 w-16 shrink-0">字段映射:</span>
                <span className="text-neutral-600 flex items-center gap-1">
                  <Braces size={12} className="text-neutral-400" />
                  已配置 {mapping.fieldCount} 个字段
                </span>
              </div>
              <div className="flex items-center gap-2 text-[12px] mt-2 pt-2 border-t border-neutral-100">
                <span className="text-neutral-400 w-16 shrink-0">最新更新:</span>
                <span className="text-neutral-500">
                  {mapping.updatedBy} <span className="text-neutral-300 mx-1">|</span> {mapping.updatedAt}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4 border-t border-neutral-100">
              <button 
                onClick={() => handleEdit(mapping.id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neutral-600 bg-neutral-50 rounded hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              >
                <Edit2 size={13} /> 编辑
              </button>
              {mapping.status === '启用' ? (
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
          <span className="text-[14px] font-medium">新建流程映射</span>
          <span className="text-[12px] mt-1 text-neutral-400 text-center max-w-[200px]">
            将系统内的业务模块绑定至 OA 系统中特定的审批流程模板
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
                  {editingId ? '编辑流程映射' : '新建流程映射'}
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
                      映射关系
                    </h3>
                    <div className="grid grid-cols-1 gap-y-5">
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">系统业务场景 (Module) <span className="text-red-500">*</span></label>
                        <select className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900">
                          <option value="credit">债权申报审批</option>
                          <option value="case">案件立案审批</option>
                          <option value="waiver">风险豁免审批</option>
                          <option value="other">其他业务流程</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-neutral-700 mb-1.5">OA 流程模板代码 (Template Code) <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="例如：WF_CREDIT_DECLARE_01" className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900" />
                        <p className="text-[11px] text-neutral-400 mt-1.5">OA 系统中预先定义好的流程模板唯一标识符</p>
                      </div>
                    </div>
                  </div>

                  {/* Field Mapping Config */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[13px] font-semibold text-neutral-900 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-brand rounded-full"></div>
                        表单字段映射 (Field Mapping)
                      </h3>
                      <button className="text-[12px] font-medium text-brand hover:text-brand-dark transition-colors flex items-center gap-1">
                        <Plus size={14} /> 添加字段
                      </button>
                    </div>
                    
                    <div className="border border-neutral-200 rounded-lg overflow-hidden">
                      <div className="bg-neutral-50/50 px-4 py-2 border-b border-neutral-200 grid grid-cols-12 gap-4">
                        <div className="col-span-5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">系统字段</div>
                        <div className="col-span-6 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">OA 表单字段</div>
                        <div className="col-span-1"></div>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {/* Real Fields Placeholder (Waiting for backend integration) */}
                        <div className="px-4 py-8 text-center text-sm text-neutral-500">
                          暂未配置任何字段映射规则
                        </div>
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
