import { useState, useEffect } from 'react';
import { Save, Key, Globe, Lock, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../../lib/axios';

export default function IAMConfig() {
  const [config, setConfig] = useState({
    iamServerUrl: '',
    clientId: '',
    clientSecret: '',
    syncMode: 'webhook'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get('/settings/config');
        // Extract IAM specific config
        if (response.data?.iam) {
          setConfig(response.data.iam);
        }
      } catch (error) {
        console.error('Failed to fetch IAM config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post('/settings/config', { iam: config });
      alert('保存成功');
    } catch (error) {
      console.error('Failed to save IAM config:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            <Globe size={18} className="text-brand" />
            <h2 className="text-[15px] font-semibold text-neutral-900">IAM 身份认证与同步配置 (SSO & Sync)</h2>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-emerald-600 bg-white border border-emerald-200 rounded hover:bg-emerald-50 transition-colors shadow-sm">
              <RefreshCw size={14} />
              手动拉取同步
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
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">IAM Server URL <span className="text-red-500">*</span></label>
            <input type="text" name="iamServerUrl" value={config.iamServerUrl} onChange={handleChange} placeholder="https://iam.evertro.tech" className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            <p className="text-[11px] text-neutral-400 mt-1.5">企业统一身份认证中心的服务地址</p>
          </div>

          <div className="col-span-3 lg:col-span-1">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Client ID <span className="text-red-500">*</span></label>
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" name="clientId" value={config.clientId} onChange={handleChange} placeholder="evertro_ledger_app" className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">本系统在 IAM 中注册的客户端 ID</p>
          </div>
          
          <div className="col-span-3 lg:col-span-1">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Client Secret <span className="text-red-500">*</span></label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="password" name="clientSecret" value={config.clientSecret} onChange={handleChange} placeholder="**********" className="w-full pl-10 pr-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow text-neutral-900 font-mono" />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1.5">客户端鉴权秘钥，用于 Token 换取</p>
          </div>

          <div className="col-span-3 lg:col-span-2 border-t border-neutral-100 pt-6">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5"><RefreshCw size={14}/> 接收数据同步 Webhook</label>
            <input type="text" disabled value="https://api.ledger.evertro.tech/api/iam/webhook" className="w-full px-4 py-2.5 bg-neutral-100 border border-neutral-200 rounded-md text-sm text-neutral-500 font-mono cursor-not-allowed" />
            <p className="text-[11px] text-neutral-400 mt-1.5">IAM 将通过此接口实时推送组织架构、用户和岗位数据的变更事件。</p>
          </div>

          <div className="col-span-3 lg:col-span-1 border-t border-neutral-100 pt-6">
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">同步模式设置</label>
            <select name="syncMode" value={config.syncMode} onChange={handleChange} className="w-full px-4 py-2.5 bg-white border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-900">
              <option value="webhook">Webhook 实时增量同步 (推荐)</option>
              <option value="cron">定时全量拉取 (备用)</option>
            </select>
            <p className="text-[11px] text-neutral-400 mt-1.5">选择 IAM 与本系统数据同步的方式</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
