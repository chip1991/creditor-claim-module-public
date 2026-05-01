import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RotateCcw, Search } from 'lucide-react';
import api from '../../lib/axios';
import DataTable, { type Column } from '../../components/DataTable';
import { useToast } from '../../components/ui/Toast';

export default function RawBatchDetail() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const [batch, setBatch] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);

  const [filters, setFilters] = useState({
    taskBatch: '',
    isConnected: '',
    isValid: '',
    firstRating: '',
    keyword: '',
  });

  const fetchBatch = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/raw/batches/${batchId}`);
      setBatch(res.data || null);
    } catch (e: any) {
      showToast(e?.response?.data?.msg || '批次不存在', 'error');
      navigate('/data/raw');
    }
  };

  const fetchRows = async () => {
    if (!batchId) return;
    try {
      const res = await api.get(`/raw/batches/${batchId}/rows/page`, {
        params: {
          page: current,
          size,
          taskBatch: filters.taskBatch || undefined,
          isConnected: filters.isConnected || undefined,
          isValid: filters.isValid || undefined,
          firstRating: filters.firstRating || undefined,
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
    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    fetchRows();
  }, [batchId, current, size]);

  const handleSearch = () => {
    setCurrent(1);
    fetchRows();
  };

  const handleReset = () => {
    setFilters({ taskBatch: '', isConnected: '', isValid: '', firstRating: '', keyword: '' });
    setCurrent(1);
    setTimeout(fetchRows, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '行号', dataIndex: 'rowNo', render: (v) => <span className="font-mono text-neutral-700">{v}</span> },
      { title: '地区公司', dataIndex: 'regionCompany', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '项目名称', dataIndex: 'projectName', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '楼栋号码', dataIndex: 'buildingNo', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '任务批次', dataIndex: 'taskBatch', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '是否接通', dataIndex: 'isConnected', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '是否有效', dataIndex: 'isValid', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '首轮评价', dataIndex: 'firstRating', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '一般问题', dataIndex: 'generalIssue', render: (v) => <span className="text-neutral-700">{v ? String(v).slice(0, 20) : '-'}</span> },
      { title: '备注问题', dataIndex: 'remarkIssue', render: (v) => <span className="text-neutral-700">{v ? String(v).slice(0, 20) : '-'}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {ToastComponent}

      {batch && (
        <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-neutral-700">
            <div>
              <span className="text-neutral-500">文件名：</span>
              <span className="font-medium">{batch.filename}</span>
            </div>
            <div>
              <span className="text-neutral-500">状态：</span>
              <span className="font-medium">{batch.status}</span>
            </div>
            <div>
              <span className="text-neutral-500">行数：</span>
              <span className="font-mono font-medium">{batch.totalRows ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">任务批次</label>
            <input
              value={filters.taskBatch}
              onChange={(e) => setFilters({ ...filters, taskBatch: e.target.value })}
              placeholder="任务批次..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-40 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">是否接通</label>
            <select
              value={filters.isConnected}
              onChange={(e) => setFilters({ ...filters, isConnected: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div className="w-40 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">是否有效</label>
            <select
              value={filters.isValid}
              onChange={(e) => setFilters({ ...filters, isValid: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="有">有</option>
              <option value="无">无</option>
            </select>
          </div>
          <div className="w-40 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">首轮评价</label>
            <select
              value={filters.firstRating}
              onChange={(e) => setFilters({ ...filters, firstRating: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="满意">满意</option>
              <option value="一般">一般</option>
              <option value="不满意">不满意</option>
              <option value="未评价">未评价</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关键词</label>
            <input
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="姓名/电话/楼栋/问题..."
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
        共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条行数据
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
            onClick={() => navigate(`/data/raw/rows/${row.id}`)}
            className="text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
          >
            查看
          </button>
        )}
      />
    </div>
  );
}

