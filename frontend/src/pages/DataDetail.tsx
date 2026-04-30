import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/axios';

function useQuery() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export default function DataDetail() {
  const query = useQuery();
  const id = query.get('id') || '';
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      try {
        const res = await api.get('/data/detail', { params: { id } });
        setDetail(res.data || null);
      } catch {
        setDetail(null);
      }
    };
    fetchDetail();
  }, [id]);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
      <div className="text-[13px] font-semibold text-neutral-900 mb-4">数据详情</div>
      {!id && <div className="text-sm text-neutral-500">缺少数据ID</div>}
      {id && !detail && <div className="text-sm text-neutral-500">暂无数据</div>}
      {detail && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="text-neutral-500">数据ID：<span className="text-neutral-900 font-mono">{detail.id ?? id}</span></div>
          <div className="text-neutral-500">数据类型：<span className="text-neutral-900">{detail.dataType ?? '-'}</span></div>
          <div className="text-neutral-500">关联工单号：<span className="text-neutral-900 font-mono">{detail.workOrderNo ?? '-'}</span></div>
          <div className="text-neutral-500">数据处理状态：<span className="text-neutral-900">{detail.status ?? '-'}</span></div>
          <div className="text-neutral-500 md:col-span-2">业主基础信息：<span className="text-neutral-900">{detail.ownerInfo ?? '-'}</span></div>
          <div className="text-neutral-500 md:col-span-2">400通话核心信息：<span className="text-neutral-900">{detail.callInfo ?? '-'}</span></div>
          <div className="text-neutral-500 md:col-span-2">原始数据内容：</div>
          <div className="md:col-span-2 whitespace-pre-wrap rounded-md bg-neutral-50 border border-neutral-200 p-4 text-neutral-800">
            {detail.rawContent ?? ''}
          </div>
        </div>
      )}
    </div>
  );
}

