import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../lib/axios';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function ReportDetail() {
  const query = useQuery();
  const navigate = useNavigate();
  const id = query.get('id') || '';
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get('/report/detail', { params: { id } });
        setDetail(res.data || null);
      } catch {
        setDetail(null);
      }
    };
    fetchDetail();
  }, [id]);

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
        <ArrowLeft size={16} />
        返回
      </button>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-4">报告详情</div>
        {!id && <div className="text-sm text-neutral-500">缺少报告ID</div>}
        {id && !detail && <div className="text-sm text-neutral-500">暂无数据</div>}
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="text-sm text-neutral-500">报告ID：<span className="text-neutral-900 font-mono">{detail.id ?? id}</span></div>
            <div className="text-sm text-neutral-500">报告类型：<span className="text-neutral-900">{detail.reportType ?? '-'}</span></div>
            <div className="text-sm text-neutral-500">标题：<span className="text-neutral-900 font-medium">{detail.title ?? '-'}</span></div>
            <div className="text-sm text-neutral-500">生成时间：<span className="text-neutral-900 font-mono">{detail.createTime ?? '-'}</span></div>
            <div className="text-sm text-neutral-500">内容</div>
            <div className="whitespace-pre-wrap rounded-md bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-800 leading-relaxed">
              {detail.content ?? ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

