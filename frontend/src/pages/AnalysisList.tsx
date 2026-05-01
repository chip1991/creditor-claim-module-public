import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search, Eye, Send } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import DateRangePicker from '../components/DateRangePicker';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import api from '../lib/axios';

export default function AnalysisList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);
  const [timeRange, setTimeRange] = useState<DateRange | undefined>();

  const [filters, setFilters] = useState({
    workOrderNo: '',
    category: '',
    department: '',
    riskLevel: '',
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/analysis/page', {
        params: {
          page: current,
          size,
          workOrderNo: filters.workOrderNo || undefined,
          category: filters.category || undefined,
          department: filters.department || undefined,
          riskLevel: filters.riskLevel || undefined,
          startTime: timeRange?.from ? timeRange.from.toISOString() : undefined,
          endTime: timeRange?.to ? timeRange.to.toISOString() : undefined,
        },
      });
      setData(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {
      setData([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchData();
  }, [current, size]);

  const handleSearch = () => {
    setCurrent(1);
    fetchData();
  };

  const handleReset = () => {
    setFilters({ workOrderNo: '', category: '', department: '', riskLevel: '' });
    setTimeRange(undefined);
    setCurrent(1);
    setTimeout(fetchData, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '分析ID', dataIndex: 'id', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '关联工单号', dataIndex: 'workOrderNo', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '业主基础信息', dataIndex: 'ownerInfo', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '投诉时间', dataIndex: 'complaintTime', render: (v) => <span className="font-mono text-neutral-500">{v ?? '-'}</span> },
      { title: '投诉内容摘要', dataIndex: 'complaintSummary', render: (v) => <span className="text-neutral-700">{v ? String(v).slice(0, 24) : '-'}</span> },
      { title: '一级分类', dataIndex: 'categoryLv1', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '责任部门', dataIndex: 'department', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '风险评级', dataIndex: 'riskLevel', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '分析状态', dataIndex: 'status', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
    ],
    []
  );

  const handleCreateWorkOrder = async (row: any) => {
    try {
      const res = await api.post('/workorder/create', { analysisId: row.id, workOrderNo: row.workOrderNo });
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
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关联工单号</label>
            <input
              type="text"
              value={filters.workOrderNo}
              onChange={(e) => setFilters({ ...filters, workOrderNo: e.target.value })}
              placeholder="请输入工单号..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">一级分类</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              placeholder="请输入分类..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">责任部门</label>
            <input
              type="text"
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
              placeholder="请输入部门..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">风险评级</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">投诉时间范围</label>
            <DateRangePicker value={timeRange} onChange={setTimeRange} />
          </div>
          <div className="flex gap-3 ml-auto shrink-0">
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              <RotateCcw size={16} />
              重置
            </button>
            <button onClick={handleSearch} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm">
              <Search size={16} />
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="text-[13px] font-medium text-neutral-500 px-1">
        共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条分析记录
      </div>

      <DataTable
        columns={columns}
        data={data}
        total={total}
        current={current}
        size={size}
        onPageChange={setCurrent}
        onSizeChange={setSize}
        actions={(row) => (
          <>
            <button
              onClick={() => navigate(`/analysis/detail?id=${encodeURIComponent(String(row.id ?? ''))}`)}
              className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Eye size={14} /> 查看
            </button>
            <button
              onClick={() => handleCreateWorkOrder(row)}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors font-medium"
            >
              <Send size={14} /> 发起整改
            </button>
          </>
        )}
      />
    </div>
  );
}

