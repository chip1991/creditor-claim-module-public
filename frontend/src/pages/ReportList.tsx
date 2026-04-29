import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search, Eye } from 'lucide-react';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import api from '../lib/axios';

export default function ReportList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);

  const [filters, setFilters] = useState({
    reportType: '',
    keyword: '',
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/report/page', {
        params: {
          page: current,
          size,
          reportType: filters.reportType || undefined,
          keyword: filters.keyword || undefined,
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
    setFilters({ reportType: '', keyword: '' });
    setCurrent(1);
    setTimeout(fetchData, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '报告ID', dataIndex: 'id', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '报告类型', dataIndex: 'reportType', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '标题', dataIndex: 'title', render: (v) => <span className="text-neutral-900 font-medium">{v ?? '-'}</span> },
      { title: '生成时间', dataIndex: 'createTime', render: (v) => <span className="font-mono text-neutral-500">{v ?? '-'}</span> },
      { title: '生成状态', dataIndex: 'status', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">报告类型</label>
            <select
              value={filters.reportType}
              onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="日报">日报</option>
              <option value="周报">周报</option>
              <option value="月报">月报</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关键词</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="标题/结论关键词..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
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
        共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条报告
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
            onClick={() => navigate(`/assistant/report/detail?id=${encodeURIComponent(String(row.id ?? ''))}`)}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Eye size={14} /> 查看
          </button>
        )}
      />
    </div>
  );
}

