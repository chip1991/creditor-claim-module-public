import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import api from '../lib/axios';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function WorkOrderDetail() {
  const query = useQuery();
  const navigate = useNavigate();
  const id = query.get('id') || '';
  const [detail, setDetail] = useState<any>(null);
  const [result, setResult] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get('/workorder/detail', { params: { id } });
        setDetail(res.data || null);
        setResult(res.data?.result || '');
      } catch {
        setDetail(null);
      }
    };
    fetchDetail();
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post('/workorder/submit', { id, result });
      const res = await api.get('/workorder/detail', { params: { id } });
      setDetail(res.data || null);
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          <ArrowLeft size={16} />
          返回
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-4">工单详情</div>
        {!id && <div className="text-sm text-neutral-500">缺少工单ID</div>}
        {id && !detail && <div className="text-sm text-neutral-500">暂无数据</div>}
        {detail && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-neutral-500">工单ID：<span className="text-neutral-900 font-mono">{detail.id ?? id}</span></div>
            <div className="text-neutral-500">工单号：<span className="text-neutral-900 font-mono">{detail.workOrderNo ?? '-'}</span></div>
            <div className="text-neutral-500 md:col-span-2">业主信息：<span className="text-neutral-900">{detail.ownerInfo ?? '-'}</span></div>
            <div className="text-neutral-500">责任部门：<span className="text-neutral-900">{detail.department ?? '-'}</span></div>
            <div className="text-neutral-500">处理人：<span className="text-neutral-900">{detail.assignee ?? '-'}</span></div>
            <div className="text-neutral-500">状态：<span className="text-neutral-900">{detail.status ?? '-'}</span></div>
            <div className="text-neutral-500">整改时限：<span className="text-neutral-900 font-mono">{detail.deadline ?? '-'}</span></div>
            <div className="text-neutral-500 md:col-span-2">整改要求：<span className="text-neutral-900">{detail.requirement ?? '-'}</span></div>
            <div className="text-neutral-500 md:col-span-2">整改结果</div>
            <div className="md:col-span-2">
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                placeholder="请输入整改结果..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                {submitting ? '提交中...' : '提交整改结果'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

