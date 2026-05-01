import { useState, useEffect } from 'react';
import { FileCheck, Database, AlertTriangle, TrendingUp, DollarSign, RefreshCw, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import axios from '../lib/axios';

export default function LedgerDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (error) {
      console.error('获取仪表盘数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        <RefreshCw className="animate-spin mr-2" size={20} />
        加载仪表盘数据中...
      </div>
    );
  }

  const { ledger, crawler, alert, risk } = metrics;

  // 格式化金额
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 }).format(amount || 0);
  };

  // 状态颜色映射
  const statusColors: Record<string, string> = {
    'DRAFT': 'bg-neutral-200',
    'APPROVING': 'bg-blue-300',
    'PENDING_DECLARE': 'bg-orange-300',
    'DECLARED': 'bg-emerald-300',
    'CONFIRMED': 'bg-emerald-500',
  };

  const statusLabels: Record<string, string> = {
    'DRAFT': '草稿',
    'APPROVING': '审批中',
    'PENDING_DECLARE': '待申报',
    'DECLARED': '已申报',
    'CONFIRMED': '已确认',
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">债权申报仪表盘</h1>
          <p className="text-sm text-neutral-500 mt-1">全局债权申报规模、风险预警与数据采集概览</p>
        </div>
        <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors">
          <RefreshCw size={16} /> 刷新数据
        </button>
      </div>

      {/* 核心财务指标 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">申报总金额</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-1">{formatMoney(ledger.totalAmount)}</h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">管理人确认金额</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-1">{formatMoney(ledger.confirmedAmount)}</h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">确认差额</p>
              <h3 className="text-2xl font-bold text-orange-600 mt-1">{formatMoney((ledger.totalAmount || 0) - (ledger.confirmedAmount || 0))}</h3>
            </div>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><TrendingUp size={20} /></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">台账总笔数</p>
              <h3 className="text-2xl font-bold text-neutral-900 mt-1">{ledger.totalCount} <span className="text-sm font-normal text-neutral-500">笔</span></h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileCheck size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 漏斗：采集 -> 预警 -> 台账 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Database className="text-neutral-500" size={18} />
            <h3 className="font-semibold text-neutral-900">数据采集转化漏斗</h3>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-4 px-4">
            <div className="flex flex-col items-center">
              <div className="w-full bg-blue-50 border border-blue-100 rounded-lg py-3 text-center relative z-10">
                <span className="text-xs text-blue-600 font-medium block mb-1">全网公开案件/公告总计</span>
                <span className="text-xl font-bold text-blue-700">{crawler.caseCount + crawler.noticeCount}</span>
              </div>
              <div className="h-6 border-l-2 border-dashed border-neutral-300 -my-1 z-0"></div>
              
              <div className="w-10/12 bg-orange-50 border border-orange-100 rounded-lg py-3 text-center relative z-10">
                <span className="text-xs text-orange-600 font-medium block mb-1">命中监控池预警数</span>
                <span className="text-xl font-bold text-orange-700">{alert.totalAlerts}</span>
                {alert.pendingAlerts > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{alert.pendingAlerts} 待处理</span>}
              </div>
              <div className="h-6 border-l-2 border-dashed border-neutral-300 -my-1 z-0"></div>
              
              <div className="w-8/12 bg-emerald-50 border border-emerald-100 rounded-lg py-3 text-center relative z-10">
                <span className="text-xs text-emerald-600 font-medium block mb-1">已转化台账数</span>
                <span className="text-xl font-bold text-emerald-700">{alert.convertedLedgers}</span>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span>最新采集任务状态:</span>
              <span className={`px-2 py-1 rounded font-medium ${crawler.latestTaskStatus === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' : crawler.latestTaskStatus === 'RUNNING' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                {crawler.latestTaskStatus || '无记录'}
              </span>
            </div>
          </div>
        </div>

        {/* 状态分布 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="text-neutral-500" size={18} />
            <h3 className="font-semibold text-neutral-900">台账状态分布</h3>
          </div>
          <div className="space-y-4">
            {ledger.statusDistribution.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-10">暂无台账数据</p>
            ) : (
              ledger.statusDistribution.map((item: any) => {
                const percentage = Math.round((item.count / ledger.totalCount) * 100) || 0;
                const statusName = item.status || '未知';
                const label = statusLabels[statusName] || statusName;
                const colorClass = statusColors[statusName] || 'bg-neutral-300';
                
                return (
                  <div key={statusName}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-neutral-700">{label}</span>
                      <span className="font-medium text-neutral-900">{item.count} 笔 ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 逾期风险预警 */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="text-neutral-500" size={18} />
            <h3 className="font-semibold text-neutral-900">申报期限与逾期风险</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-red-600 font-medium mb-1">已超期未完成申报</span>
              <span className="text-3xl font-bold text-red-700">{risk.overdueCount}</span>
              <span className="text-[10px] text-red-500 mt-1">笔</span>
            </div>
            
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-orange-600 font-medium mb-1">7天内即将到期</span>
              <span className="text-3xl font-bold text-orange-700">{risk.upcomingCount}</span>
              <span className="text-[10px] text-orange-500 mt-1">笔</span>
            </div>
          </div>

          <div className="bg-neutral-50 rounded-lg p-4 mt-auto">
            <div className="flex items-center gap-2 text-sm text-neutral-700 mb-2">
              <Clock size={16} className="text-neutral-500" />
              <span>超期申报金额风险敞口</span>
            </div>
            <div className="text-xl font-bold text-red-600">
              {formatMoney(risk.overdueAmount)}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              * 包含草稿、审批中、待申报状态下，截止日早于今日的台账总额
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
