import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import api from '../../lib/axios';
import DataTable, { type Column } from '../../components/DataTable';

export default function ScoreStats() {
  const [batches, setBatches] = useState<any[]>([]);
  const [batchId, setBatchId] = useState('');
  const [groupBy, setGroupBy] = useState<'regionCompany' | 'projectName' | 'taskBatch'>('regionCompany');
  const [onlyValidConnected, setOnlyValidConnected] = useState(true);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/raw/batches/page', { params: { page: 1, size: 100 } });
      setBatches(res.data?.records || []);
    } catch {
      setBatches([]);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get('/raw/score/summary', {
        params: {
          batchId: batchId || undefined,
          groupBy,
          onlyValidConnected,
        },
      });
      const list = res.data?.records || [];
      setTotal(list.length);
      const start = (current - 1) * size;
      setRecords(list.slice(start, start + size));
    } catch {
      setRecords([]);
      setTotal(0);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [current, size]);

  const handleSearch = () => {
    setCurrent(1);
    fetchSummary();
  };

  const handleReset = () => {
    setBatchId('');
    setGroupBy('regionCompany');
    setOnlyValidConnected(true);
    setCurrent(1);
    setTimeout(fetchSummary, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '维度', dataIndex: 'key', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '样本数', dataIndex: 'sampleCount', render: (v) => <span className="font-mono text-neutral-700">{v ?? 0}</span> },
      { title: '首轮均分', dataIndex: 'avgFirst', render: (v) => <span className="font-mono text-neutral-700">{v == null ? '-' : Number(v).toFixed(1)}</span> },
      { title: '管家均分', dataIndex: 'avgButler', render: (v) => <span className="font-mono text-neutral-700">{v == null ? '-' : Number(v).toFixed(1)}</span> },
      { title: '安保均分', dataIndex: 'avgSecurity', render: (v) => <span className="font-mono text-neutral-700">{v == null ? '-' : Number(v).toFixed(1)}</span> },
      { title: '环境均分', dataIndex: 'avgEnv', render: (v) => <span className="font-mono text-neutral-700">{v == null ? '-' : Number(v).toFixed(1)}</span> },
      { title: '公区维修均分', dataIndex: 'avgPublicRepair', render: (v) => <span className="font-mono text-neutral-700">{v == null ? '-' : Number(v).toFixed(1)}</span> },
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
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
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
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">聚合维度</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="regionCompany">地区公司</option>
              <option value="projectName">项目名称</option>
              <option value="taskBatch">任务批次</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyValidConnected}
              onChange={(e) => setOnlyValidConnected(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-neutral-700">仅统计有效且接通</span>
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
        共 <span className="font-semibold text-neutral-900">{total}</span> 条统计结果
      </div>

      <DataTable
        columns={columns}
        data={records}
        total={total}
        current={current}
        size={size}
        onPageChange={setCurrent}
        onSizeChange={setSize}
      />
    </div>
  );
}

