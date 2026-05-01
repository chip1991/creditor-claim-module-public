import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search, Eye } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import DateRangePicker from '../components/DateRangePicker';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import api from '../lib/axios';

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);
  const [timeRange, setTimeRange] = useState<DateRange | undefined>();

  const [filters, setFilters] = useState({
    workOrderNo: '',
    status: '',
    department: '',
    assignee: '',
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/workorder/page', {
        params: {
          page: current,
          size,
          workOrderNo: filters.workOrderNo || undefined,
          status: filters.status || undefined,
          department: filters.department || undefined,
          assignee: filters.assignee || undefined,
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
    setFilters({ workOrderNo: '', status: '', department: '', assignee: '' });
    setTimeRange(undefined);
    setCurrent(1);
    setTimeout(fetchData, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '工单ID', dataIndex: 'id', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '工单号', dataIndex: 'workOrderNo', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '业主信息', dataIndex: 'ownerInfo', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '责任部门', dataIndex: 'department', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '处理人', dataIndex: 'assignee', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '状态', dataIndex: 'status', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '整改时限', dataIndex: 'deadline', render: (v) => <span className="font-mono text-neutral-500">{v ?? '-'}</span> },
      { title: '创建时间', dataIndex: 'createTime', render: (v) => <span className="font-mono text-neutral-500">{v ?? '-'}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">工单号</label>
            <input
              type="text"
              value={filters.workOrderNo}
              onChange={(e) => setFilters({ ...filters, workOrderNo: e.target.value })}
              placeholder="请输入工单号..."
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
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">处理人</label>
            <input
              type="text"
              value={filters.assignee}
              onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
              placeholder="请输入处理人..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="待整改">待整改</option>
              <option value="整改中">整改中</option>
              <option value="待核验">待核验</option>
              <option value="已完成">已完成</option>
              <option value="已退回">已退回</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">创建时间范围</label>
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
        共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条工单
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
          <button
            onClick={() => navigate(`/workorder/detail?id=${encodeURIComponent(String(row.id ?? ''))}`)}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Eye size={14} /> 查看
          </button>
        )}
      />
    </div>
  );
}

