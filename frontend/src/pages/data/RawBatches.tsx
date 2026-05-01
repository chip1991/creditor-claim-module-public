import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import api from '../../lib/axios';
import DataTable, { type Column } from '../../components/DataTable';
import { useToast } from '../../components/ui/Toast';

const getBackendErrorMessage = (error: any) => {
  const data = error?.response?.data;
  if (typeof data?.msg === 'string' && data.msg.trim()) return data.msg.trim();
  if (typeof data?.message === 'string' && data.message.trim()) return data.message.trim();
  if (typeof data?.detail === 'string' && data.detail.trim()) return data.detail.trim();
  if (Array.isArray(data?.detail) && data.detail.length > 0) {
    const firstDetail = data.detail[0];
    if (typeof firstDetail?.msg === 'string' && firstDetail.msg.trim()) return firstDetail.msg.trim();
  }
  if (typeof error?.message === 'string' && error.message.trim()) return error.message.trim();
  return '';
};

export default function RawBatches() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { showToast, ToastComponent } = useToast();

  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({
    keyword: '',
    status: '',
  });

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/raw/batches/page', {
        params: {
          page: current,
          size,
          keyword: filters.keyword ? filters.keyword.trim() : undefined,
          status: filters.status || undefined,
        },
      });
      setRecords(res.data?.records || []);
      setTotal(res.data?.total || 0);
    } catch {
      setRecords([]);
      setTotal(0);
      showToast('批次列表加载失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [current, size]);

  const handleSearch = () => {
    setCurrent(1);
    fetchBatches();
  };

  const handleReset = () => {
    setFilters({ keyword: '', status: '' });
    setCurrent(1);
    setTimeout(fetchBatches, 0);
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('sheetName', '考核项目');
    try {
      const res = await api.post('/raw/batches/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const batchId = res.data?.batchId;
      showToast(`已创建导入任务${batchId ? `，批次：${batchId}` : ''}`, 'success');
      fetchBatches();
    } catch (e: any) {
      const backendError = getBackendErrorMessage(e);
      showToast(backendError ? `上传失败：${backendError}，请重试` : '上传失败，请重试', 'error');
    }
  };

  const handleDelete = async (row: any) => {
    if (row?.status === 'RUNNING') {
      showToast('导入中不可删除', 'info');
      return;
    }
    const ok = window.confirm(`确认删除该批次？\n\n文件：${row?.filename || '-'}\n批次：${row?.id}`);
    if (!ok) return;
    try {
      await api.delete(`/raw/batches/${row.id}`);
      showToast('已删除', 'success');
      fetchBatches();
    } catch (e: any) {
      showToast(e?.response?.data?.msg || '删除失败', 'error');
    }
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '批次ID', dataIndex: 'id', render: (v) => <span className="font-mono text-neutral-700">{v}</span> },
      { title: '文件名', dataIndex: 'filename', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '状态', dataIndex: 'status', render: (v) => <span className="text-neutral-700">{v || '-'}</span> },
      { title: '行数', dataIndex: 'totalRows', render: (v) => <span className="font-mono text-neutral-700">{v ?? 0}</span> },
      { title: '上传时间', dataIndex: 'createdAt', render: (v) => <span className="font-mono text-neutral-500">{v ? String(v).replace('T', ' ').replace('Z', '') : '-'}</span> },
      { title: '操作人', dataIndex: 'operator', render: (v) => <span className="text-neutral-600">{v || '-'}</span> },
    ],
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {ToastComponent}

      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关键词</label>
            <input
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="文件名..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="RUNNING">导入中</option>
              <option value="SUCCESS">成功</option>
              <option value="FAILURE">失败</option>
            </select>
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

      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 个批次
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.currentTarget.value = '';
            }}
          />
          <button
            onClick={handleChooseFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
            disabled={loading}
          >
            <Plus size={14} />
            上传Excel
          </button>
        </div>
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/data/raw/${row.id}`)}
              className="text-[13px] font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              查看
            </button>
            <button
              onClick={() => handleDelete(row)}
              className={`flex items-center gap-1 text-[13px] font-medium transition-colors ${
                row?.status === 'RUNNING' ? 'text-neutral-400 cursor-not-allowed' : 'text-red-600 hover:text-red-700'
              }`}
              disabled={row?.status === 'RUNNING'}
            >
              <Trash2 size={14} />
              删除
            </button>
          </div>
        )}
      />
    </div>
  );
}
