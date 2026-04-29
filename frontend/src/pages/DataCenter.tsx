import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCcw, Search, Download, Plus, Wand2, Link2, Eye } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import DateRangePicker from '../components/DateRangePicker';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import api from '../lib/axios';

export default function DataCenter() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(20);
  const [timeRange, setTimeRange] = useState<DateRange | undefined>();

  const [filters, setFilters] = useState({
    dataType: '',
    status: '',
    workOrderNo: '',
    buildingRoom: '',
    ownerKeyword: '',
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/data/page', {
        params: {
          page: current,
          size,
          dataType: filters.dataType || undefined,
          status: filters.status || undefined,
          workOrderNo: filters.workOrderNo || undefined,
          buildingRoom: filters.buildingRoom || undefined,
          ownerKeyword: filters.ownerKeyword || undefined,
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
    setFilters({
      dataType: '',
      status: '',
      workOrderNo: '',
      buildingRoom: '',
      ownerKeyword: '',
    });
    setTimeRange(undefined);
    setCurrent(1);
    setTimeout(fetchData, 0);
  };

  const columns = useMemo<Column[]>(
    () => [
      { title: '数据ID', dataIndex: 'id', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '数据类型', dataIndex: 'dataType', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '关联工单号', dataIndex: 'workOrderNo', render: (v) => <span className="font-mono text-neutral-700">{v ?? '-'}</span> },
      { title: '业主基础信息', dataIndex: 'ownerInfo', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '400通话核心信息', dataIndex: 'callInfo', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '原始数据内容', dataIndex: 'rawContent', render: (v) => <span className="text-neutral-700">{v ? String(v).slice(0, 30) : '-'}</span> },
      { title: '数据处理状态', dataIndex: 'status', render: (v) => <span className="text-neutral-700">{v ?? '-'}</span> },
      { title: '上传时间', dataIndex: 'uploadTime', render: (v) => <span className="font-mono text-neutral-500">{v ?? '-'}</span> },
      { title: '操作人', dataIndex: 'operator', render: (v) => <span className="text-neutral-600">{v ?? '-'}</span> },
    ],
    []
  );

  const handleImport = async () => {
    try {
      await api.post('/data/import');
      fetchData();
    } catch {
    }
  };

  const handleClean = async () => {
    try {
      await api.post('/data/clean');
      fetchData();
    } catch {
    }
  };

  const handleLink = async () => {
    try {
      await api.post('/data/link');
      fetchData();
    } catch {
    }
  };

  const handleExport = async () => {
    try {
      await api.get('/data/export', { params: { ...filters } });
    } catch {
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">数据类型</label>
            <select
              value={filters.dataType}
              onChange={(e) => setFilters({ ...filters, dataType: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="业主进线投诉数据">业主进线投诉数据</option>
              <option value="400外呼满意度数据">400外呼满意度数据</option>
              <option value="外呼回访考核数据">外呼回访考核数据</option>
            </select>
          </div>
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">数据处理状态</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="待清洗">待清洗</option>
              <option value="已清洗">已清洗</option>
              <option value="已分析">已分析</option>
              <option value="已关联">已关联</option>
              <option value="匹配失败">匹配失败</option>
            </select>
          </div>
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
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">楼栋房号</label>
            <input
              type="text"
              value={filters.buildingRoom}
              onChange={(e) => setFilters({ ...filters, buildingRoom: e.target.value })}
              placeholder="请输入楼栋房号..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">业主信息</label>
            <input
              type="text"
              value={filters.ownerKeyword}
              onChange={(e) => setFilters({ ...filters, ownerKeyword: e.target.value })}
              placeholder="业主姓名/联系电话..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">上传时间范围</label>
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

      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条数据
        </div>
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm">
            <Plus size={14} />
            新增/导入
          </button>
          <button onClick={handleClean} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm">
            <Wand2 size={14} />
            一键清洗
          </button>
          <button onClick={handleLink} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm">
            <Link2 size={14} />
            自动关联
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-700 bg-white border border-neutral-200 rounded hover:bg-neutral-50 transition-colors shadow-sm">
            <Download size={14} />
            导出
          </button>
        </div>
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
            onClick={() => navigate(`/data/detail?id=${encodeURIComponent(String(row.id ?? ''))}`)}
            className="flex items-center gap-1 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Eye size={14} /> 查看详情
          </button>
        )}
      />
    </div>
  );
}

