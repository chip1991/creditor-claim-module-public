import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search } from 'lucide-react';
import api from '../../lib/axios';
import DataTable, { type Column } from '../../components/DataTable';

export default function IssueList() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);

  const [filters, setFilters] = useState({
    batchId: '',
    sourceField: '一般问题',
    keyword: '',
  });

  const fetchBatches = async () => {
    try {
      const res = await api.get('/raw/batches/page', { params: { page: 1, size: 100 } });
      setBatches(res.data?.records || []);
    } catch {
      setBatches([]);
    }
  };

  const fetchIssues = async () => {
    try {
      const res = await api.get('/raw/issues/page', {
        params: {
          page: current,
          size,
          batchId: filters.batchId || undefined,
          sourceField: filters.sourceField || undefined,
          keyword: filters.keyword ? filters.keyword.trim() : undefined,
        },
      });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {
      setRecords([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [current, size]);

  const handleSearch = () => {
    setCurrent(1);
    fetchIssues();
  };

  const handleReset = () => {
    setFilters({ batchId: '', sourceField: '一般问题', keyword: '' });
    setCurrent(1);
    setTimeout(fetchIssues, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '问题', dataIndex: 'issueText', render: (v) => <span className="text-neutral-700">{v ? String(v).slice(0, 40) : '-'}</span> },
      { title: '来源字段', dataIndex: 'sourceField', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '地区公司', dataIndex: 'regionCompany', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '项目名称', dataIndex: 'projectName', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '任务批次', dataIndex: 'taskBatch', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '拨打时间', dataIndex: 'dialedAt', render: (v) => <span className="font-mono text-neutral-500">{v ? String(v).replace('T', ' ').replace('Z', '') : '-'}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-96 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">批次</label>
            <select
              value={filters.batchId}
              onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部批次</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.filename}（{b.id}）
                </option>
              ))}
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关键词</label>
            <input
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="问题关键词..."
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
        共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条问题
      </div>

      <DataTable
        columns={columns}
        data={records}
        total={total}
        current={current}
        size={size}
        onPageChange={setCurrent}
        onSizeChange={setSize}
        actions={(row) => (
          <button
            onClick={() => navigate(`/data/raw/rows/${row.rowId}`)}
            className="text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            查看原始行
          </button>
        )}
      />
    </div>
  );
}
