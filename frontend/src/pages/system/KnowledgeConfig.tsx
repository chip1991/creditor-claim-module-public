import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import api from '../../lib/axios';

export default function KnowledgeConfig() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await api.get('/system/knowledge/get');
        setValue(res.data?.value ?? res.data?.content ?? '');
      } catch {
        setValue('');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/system/knowledge/save', { value });
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">根因知识库配置</h1>
        <p className="text-sm text-neutral-500 mt-1">维护投诉根因知识库、案例与规则，用于AI分析与建议生成</p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-2">配置内容</div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Loader2 size={16} className="animate-spin" /> 加载中...
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={14}
            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow font-mono"
            placeholder="建议使用 JSON/YAML 或按约定格式维护根因知识库..."
          />
        )}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

