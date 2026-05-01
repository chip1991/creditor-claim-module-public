
import { useState, useEffect } from 'react';
import { Search, RotateCcw, Download, SlidersHorizontal, Eye, ShieldAlert, RefreshCw } from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import axios from '../lib/axios';

export default function NoticeList() {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const [syncing, setSyncing] = useState(false);

  const [filters, setFilters] = useState({
    noticeTitle: '',
    debtorName: '',
    noticeType: ''
  });

  const fetchData = async () => {
    try {
      const res = await axios.get('/public-data/notice/page', {
        params: {
          page: current,
          size: size,
          noticeTitle: filters.noticeTitle,
          debtorName: filters.debtorName,
          noticeType: filters.noticeType
        }
      });
      setData(res.data.records || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
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
    setFilters({ noticeTitle: '', debtorName: '', noticeType: '' });
    setCurrent(1);
    setTimeout(fetchData, 0);
  };

  const handleMonitor = async (row: any) => {
    try {
      await axios.post('/monitor/pool', {
        debtorName: row.debtorName,
        creditCode: row.creditCode || '',
        source: '公告大厅',
        caseNo: row.caseNo || ''
      });
      alert('已加入监控池');
    } catch (error) {
      console.error('Failed to add to monitor pool:', error);
      alert('加入监控池失败');
    }
  };

  const [collecting, setCollecting] = useState(false);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await axios.post('/public-data/sync');
      if (res.data.success) {
        alert('同步成功！\n' + res.data.output);
        fetchData();
      } else {
        alert('同步失败：' + (res.data.error || res.data.output));
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      alert('同步失败');
    } finally {
      setSyncing(false);
    }
  };

  const handleCollectAndSync = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const res = await axios.post('/public-data/collect-and-sync');
      if (res.data.success) {
        alert('采集并同步成功！\n' + res.data.output);
        fetchData();
      } else {
        alert('操作失败：' + (res.data.error || res.data.output));
      }
    } catch (error) {
      console.error('Failed to collect and sync:', error);
      alert('操作失败');
    } finally {
      setCollecting(false);
    }
  };

  const columns: Column[] = [
    { title: '债务人名称', dataIndex: 'debtorName', render: (v) => <span className="font-medium text-neutral-900">{v}</span> },
    { title: '公告标题', dataIndex: 'noticeTitle', render: (v) => <span className="text-neutral-700">{v}</span> },
    { 
      title: '公告类型', 
      dataIndex: 'noticeType', 
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600">
          {v}
        </span>
      )
    },
    { title: '发布机构', dataIndex: 'courtName', render: (v, row) => <span className="text-neutral-600">{row.publisher || v}</span> },
    { title: '公布时间', dataIndex: 'publishDate', render: (v) => <span className="font-mono text-neutral-500">{v}</span> }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">公告标题</label>
            <input 
              type="text" 
              placeholder="请输入公告标题检索..." 
              value={filters.noticeTitle}
              onChange={e => setFilters({...filters, noticeTitle: e.target.value})}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债务人</label>
            <input 
              type="text" 
              placeholder="请输入企业全称..." 
              value={filters.debtorName}
              onChange={e => setFilters({...filters, debtorName: e.target.value})}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">案件类型</label>
            <select 
              value={filters.noticeType}
              onChange={e => setFilters({...filters, noticeType: e.target.value})}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部</option>
              <option value="破产审查案件">破产审查案件</option>
              <option value="破产案件">破产案件</option>
              <option value="强制清算申请审查案件">强制清算申请审查案件</option>
              <option value="强制清算案件">强制清算案件</option>
              <option value="强制清算上诉案件">强制清算上诉案件</option>
              <option value="破产上诉案件">破产上诉案件</option>
              <option value="破产监督案件">破产监督案件</option>
              <option value="强制清算监督案件">强制清算监督案件</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">公开日期</label>
            <DateRangePicker />
          </div>
          <div className="flex gap-3 ml-auto shrink-0">
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              <RotateCcw size={16} />
              重置
            </button>
            <button onClick={handleSearch} className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm">
              <Search size={16} />
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Global Actions (Cardless) */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条公告记录
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleCollectAndSync}
            disabled={collecting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-green-600 border border-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={collecting ? 'animate-spin' : ''} />
            {collecting ? '采集中...' : '采集并同步'}
          </button>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '同步中...' : '同步数据'}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <SlidersHorizontal size={14} />
            字段配置
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Download size={14} />
            导出公告
          </button>
        </div>
      </div>

      {/* Table Section */}
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
            <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <Eye size={14} /> 查看全文
            </button>
            <button onClick={() => handleMonitor(row)} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <ShieldAlert size={14} /> 加入监控
            </button>
          </>
        )}
      />
    </div>
  );
}

