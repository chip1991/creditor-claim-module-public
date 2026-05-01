import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, Play, Clock, CheckCircle2, XCircle, X, Loader2 } from 'lucide-react';
import DateRangePicker from '../components/DateRangePicker';
import axios from '../lib/axios';

interface MonitorAlert {
  id: number;
  alertType: string;
  debtorName: string;
  creditCode?: string;
  relationId: number;
  alertContent: string;
  isRead: number;
  createTime: string;
}

export default function AlertList() {
  const navigate = useNavigate();
  const [data, setData] = useState<MonitorAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isAutoScanModalOpen, setIsAutoScanModalOpen] = useState(false);
  const [scheduleFreq, setScheduleFreq] = useState('daily');
  const [debtorName, setDebtorName] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const fetchData = async () => {
    try {
      const res = await axios.get('/alert/list', {
        params: { page, size: 10, debtorName, status: statusFilter, hitType: typeFilter }
      });
      if (res.data && res.data.records) {
        setData(res.data.records);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setDebtorName('');
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
    setTimeout(fetchData, 0);
  };

  const handleStatusChange = async (row: MonitorAlert, isRead: number) => {
    try {
      await axios.put(`/alert/${row.id}/status`, null, { params: { isRead } });
      fetchData();
      if (isRead === 1) {
        navigate('/ledger/form', { state: { name: row.debtorName, creditCode: row.creditCode } });
      }
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * 执行扫描操作
   */
  const handleScan = async () => {
    try {
      setIsScanning(true);
      setScanMessage('扫描中...');
      await axios.post('/alert/scan');
      setScanMessage('扫描已启动，后台运行中');
      setTimeout(() => {
        setIsScanning(false);
        setScanMessage('');
        fetchData();
      }, 3000);
    } catch (err) {
      console.error(err);
      setScanMessage('启动扫描失败');
      setIsScanning(false);
    }
  };

  /**
   * 保存定时扫描计划
   */
  const handleSaveSchedule = async () => {
    try {
      await axios.post('/monitor/schedule', { frequency: scheduleFreq });
      alert('计划已保存');
      setIsAutoScanModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('保存计划失败');
    }
  };

  /**
   * 获取状态标签
   * @param isRead - 状态值
   */
  const getStatusBadge = (isRead: number) => {
    switch (isRead) {
      case 0:
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-red-50 text-red-600 border border-red-100">待处理</span>;
      case 1:
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">已上报</span>;
      case 2:
        return <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">已忽略</span>;
      default:
        return <span>{isRead}</span>;
    }
  };

  /**
   * 获取类型标签
   * @param type - 类型值
   */
  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, string> = {
      'Case': '案件',
      'Notice': '公告'
    };
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-brand-light text-brand-dark border border-brand-100">
        {typeMap[type] || type}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债务人名称</label>
            <input 
              type="text" 
              value={debtorName}
              onChange={(e) => setDebtorName(e.target.value)}
              placeholder="请输入公司名称..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">状态</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700">
              <option value="">全部</option>
              <option value="Pending">待处理</option>
              <option value="Reported">已上报</option>
              <option value="Ignored">已忽略</option>
            </select>
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">类型</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700">
              <option value="">全部</option>
              <option value="Case">案件</option>
              <option value="Notice">公告</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">时间</label>
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

      {scanMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          {isScanning && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
          <div className="text-sm font-medium text-blue-900">{scanMessage}</div>
          {!isScanning && (
            <button onClick={() => setScanMessage('')} className="text-neutral-400 hover:text-neutral-600 ml-auto">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共 <span className="font-semibold text-neutral-900">{total}</span> 条预警
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleScan} 
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            {isScanning ? '扫描中...' : '立即扫描'}
          </button>
          <button 
            onClick={() => setIsAutoScanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm"
          >
            <Clock size={14} />
            自动扫描
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">关系ID</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">债务人名称</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">类型</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">标题</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((row, idx) => (
                <motion.tr 
                  key={row.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-mono text-neutral-700 whitespace-nowrap">{row.relationId}</td>
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900 whitespace-nowrap">{row.debtorName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(row.isRead)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(row.alertType)}</td>
                  <td className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">{row.alertContent}</td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.createTime}</td>
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10">
                    <div className="flex justify-end gap-4">
                      {row.isRead === 0 && (
                        <>
                          <button onClick={() => handleStatusChange(row, 1)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                            <CheckCircle2 size={14} /> 标记为已上报
                          </button>
                          <button onClick={() => handleStatusChange(row, 2)} className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors">
                            <XCircle size={14} /> 忽略
                          </button>
                        </>
                      )}
                      {row.isRead === 1 && (
                        <button onClick={() => handleStatusChange(row, 0)} className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors">
                          <RotateCcw size={14} /> 取消标记
                        </button>
                      )}
                      {row.isRead === 2 && (
                        <button onClick={() => handleStatusChange(row, 0)} className="flex items-center gap-1 text-neutral-400 hover:text-neutral-600 transition-colors">
                          <RotateCcw size={14} /> 取消忽略
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-neutral-500">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-sm text-neutral-500">共 {total} 条记录</span>
          <div className="flex gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm text-neutral-600 disabled:text-neutral-400 hover:bg-neutral-200 rounded transition-colors disabled:hover:bg-transparent"
            >
              上一页
            </button>
            <button className="px-3 py-1 text-sm bg-neutral-900 text-white rounded">{page}</button>
            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={data.length < 10}
              className="px-3 py-1 text-sm text-neutral-600 disabled:text-neutral-400 hover:bg-neutral-200 rounded transition-colors disabled:hover:bg-transparent"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isAutoScanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAutoScanModalOpen(false)} className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <h3 className="text-base font-semibold text-neutral-900">自动扫描</h3>
                <button onClick={() => setIsAutoScanModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-medium text-neutral-700 mb-2">频率</label>
                  <select 
                    value={scheduleFreq}
                    onChange={(e) => setScheduleFreq(e.target.value)}
                    className="w-full px-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 appearance-none text-neutral-900"
                  >
                    <option value="daily">每日</option>
                    <option value="weekly">每周</option>
                    <option value="monthly">每月</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <button onClick={() => setIsAutoScanModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors">取消</button>
                <button onClick={handleSaveSchedule} className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm">保存</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
