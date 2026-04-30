import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import api from '../lib/axios';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function AnalysisDetail() {
  const query = useQuery();
  const navigate = useNavigate();
  const id = query.get('id') || '';
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get('/analysis/detail', { params: { id } });
        setDetail(res.data || null);
      } catch {
        setDetail(null);
      }
    };
    fetchDetail();
  }, [id]);

  const handleCreateWorkOrder = async () => {
    if (!detail?.id && !id) return;
    try {
      const res = await api.post('/workorder/create', { analysisId: detail?.id ?? id, workOrderNo: detail?.workOrderNo });
      const nextId = res.data?.id || res.data?.workOrderId;
      if (nextId) {
        navigate(`/workorder/detail?id=${encodeURIComponent(String(nextId))}`);
      } else {
        navigate('/workorder/list');
      }
    } catch {
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
          <ArrowLeft size={16} />
          返回
        </button>
        <button
          onClick={handleCreateWorkOrder}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors"
        >
          <Send size={16} />
          发起整改
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-4">投诉分析详情</div>
        {!id && <div className="text-sm text-neutral-500">缺少分析ID</div>}
        {id && !detail && <div className="text-sm text-neutral-500">暂无数据</div>}
        {detail && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="text-neutral-500">分析ID：<span className="text-neutral-900 font-mono">{detail.id ?? id}</span></div>
            <div className="text-neutral-500">关联工单号：<span className="text-neutral-900 font-mono">{detail.workOrderNo ?? '-'}</span></div>
            <div className="text-neutral-500 md:col-span-2">业主基础信息：<span className="text-neutral-900">{detail.ownerInfo ?? '-'}</span></div>
            <div className="text-neutral-500">投诉时间：<span className="text-neutral-900 font-mono">{detail.complaintTime ?? '-'}</span></div>
            <div className="text-neutral-500">通话坐席：<span className="text-neutral-900">{detail.agent ?? '-'}</span></div>
            <div className="text-neutral-500">一级分类：<span className="text-neutral-900">{detail.categoryLv1 ?? '-'}</span></div>
            <div className="text-neutral-500">二级分类：<span className="text-neutral-900">{detail.categoryLv2 ?? '-'}</span></div>
            <div className="text-neutral-500">三级根因：<span className="text-neutral-900">{detail.rootCauseLv3 ?? '-'}</span></div>
            <div className="text-neutral-500">责任部门：<span className="text-neutral-900">{detail.department ?? '-'}</span></div>
            <div className="text-neutral-500">风险评级：<span className="text-neutral-900">{detail.riskLevel ?? '-'}</span></div>
            <div className="text-neutral-500 md:col-span-2">投诉原始内容：</div>
            <div className="md:col-span-2 whitespace-pre-wrap rounded-md bg-neutral-50 border border-neutral-200 p-4 text-neutral-800">
              {detail.rawContent ?? ''}
            </div>
            <div className="text-neutral-500 md:col-span-2">AI分析结论：</div>
            <div className="md:col-span-2 whitespace-pre-wrap rounded-md bg-neutral-50 border border-neutral-200 p-4 text-neutral-800">
              {detail.analysisResult ?? ''}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

