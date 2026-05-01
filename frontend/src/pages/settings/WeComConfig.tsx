import { useState, useEffect } from 'react';
import { Save, MessageSquare, Hash, ShieldCheck, ArrowRightLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../../lib/axios';

export default function WeComConfig() {
  const [config, setConfig] = useState({
    corpId: '',
    agentId: '',
    appSecret: '',
    token: '',
    encodingAesKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/settings/config');
        if (response.data?.wecom) {
          setConfig(response.data.wecom);
        }
      } catch (error) {
        console.error('Failed to fetch WeCom config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post('/settings/config', { wecom: config });
      alert('保存成功');
    } catch (error) {
      console.error('Failed to save WeCom config:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-8">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand" />
            <h2 className="text-[15px] font-semibold text-neutral-900">企业微信集成配置 (WeCom Integration)</h2>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-emerald-600 bg-white border border-emerald-200 rounded hover:bg-emerald-50 transition-colors shadow-sm">
              <MessageSquare size={14} />
              测试推送消息
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              保存配置
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-x-12 gap-y-8">
          <div className="col-span-3 lg:col-span-1">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">企业 ID (CorpId) <span className="text-red-500">*</span></label>
            <div className="relative">
              <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" name="corpId" value={config.corpId} onChange={handleChange} placeholder="wwa1b2c3d4e5f6g7h8" className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">企业微信后台获取的唯一企业标识</p>
          </div>
          
          <div className="col-span-3 lg:col-span-1">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">应用 AgentId <span className="text-red-500">*</span></label>
            <input type="text" name="agentId" value={config.agentId} onChange={handleChange} placeholder="1000002" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            <p className="text-[11px] text-neutral-400 mt-1.5">应用在企业微信中的独立 ID</p>
          </div>

          <div className="col-span-3 lg:col-span-1">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">应用 Secret <span className="text-red-500">*</span></label>
            <input type="password" name="appSecret" value={config.appSecret} onChange={handleChange} placeholder="************************" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            <p className="text-[11px] text-neutral-400 mt-1.5">应用级别的安全凭证，用于调用发消息接口</p>
          </div>

          <div className="col-span-3 lg:col-span-2 border-t border-neutral-100 pt-6">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowRightLeft size={14}/> 接收消息服务器配置 (Webhook)</label>
            <input type="text" disabled value="https://api.ledger.evertro.tech/api/wecom/callback" className="w-full px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-md text-sm text-neutral-500 font-mono cursor-not-allowed" />
            <p className="text-[11px] text-neutral-400 mt-1.5">企微将通过此接口推送通讯录变更、应用消息回复等事件。</p>
          </div>

          <div className="col-span-3 lg:col-span-1 border-t border-neutral-100 pt-6">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">回调验签与加密配置</label>
            <div className="flex flex-col gap-3">
              <input type="text" name="token" value={config.token} onChange={handleChange} placeholder="Token" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
              <input type="text" name="encodingAesKey" value={config.encodingAesKey} onChange={handleChange} placeholder="EncodingAESKey" className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
