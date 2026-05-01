import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Timer } from 'lucide-react';
import api from '../lib/axios';

type Overview = {
  totalComplaints?: number;
  repeatRate?: number;
  overdueWorkOrders?: number;
  satisfactionAvg?: number;
};

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview>({});

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get('/dashboard/overview');
        setOverview(res.data || {});
      } catch {
        setOverview({});
      }
    };
    fetchOverview();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 flex items-center gap-2">
            <BarChart3 size={20} />
            数据可视化看板
          </h1>
          <p className="text-sm text-neutral-500 mt-1">投诉数据概览、风险预警与整改闭环进度监控</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">投诉总量</div>
            <TrendingUp size={16} className="text-neutral-400" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">{overview.totalComplaints ?? '-'}</div>
          <div className="mt-2 text-xs text-neutral-500">统计周期：以接口返回为准</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">重复投诉率</div>
            <AlertTriangle size={16} className="text-neutral-400" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">
            {typeof overview.repeatRate === 'number' ? `${(overview.repeatRate * 100).toFixed(2)}%` : '-'}
          </div>
          <div className="mt-2 text-xs text-neutral-500">用于衡量同类问题复发情况</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">超时工单</div>
            <Timer size={16} className="text-neutral-400" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">{overview.overdueWorkOrders ?? '-'}</div>
          <div className="mt-2 text-xs text-neutral-500">用于触发催办与升级处理</div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">满意度均值</div>
            <TrendingUp size={16} className="text-neutral-400" />
          </div>
          <div className="mt-2 text-3xl font-semibold text-neutral-900">{overview.satisfactionAvg ?? '-'}</div>
          <div className="mt-2 text-xs text-neutral-500">来源：外呼满意度回访数据</div>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm p-6">
        <div className="text-[13px] font-semibold text-neutral-900 mb-2">说明</div>
        <div className="text-sm text-neutral-600 leading-relaxed">
          看板指标由后端接口聚合计算后返回，前端不做模拟与造数。若当前环境未接入数据接口，将显示为空或“-”。
        </div>
      </div>
    </div>
  );
}

