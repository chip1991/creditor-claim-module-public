import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RotateCcw, Download, Plus, Upload, Pencil, Trash2, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from '../lib/axios';
import * as XLSX from 'xlsx';
import DateRangePicker from '../components/DateRangePicker';

interface MonitorPool {
  id: number;
  debtorName: string;
  creditCode: string;
  status: number;
  createTime: string;
}

interface ImportResultDTO {
  successCount: number;
  failCount: number;
  failDetails: string[];
}


export default function PoolManager() {
  const [data, setData] = useState<MonitorPool[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ debtorName: '', creditCode: '', status: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AutoComplete states
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  // Import result states
  const [importResult, setImportResult] = useState<ImportResultDTO | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const res = await axios.get('/monitor/list', {
        params: { page, size: 10, keyword }
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
  }, [page, keyword]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleReset = () => {
    setKeyword('');
    setPage(1);
    setTimeout(fetchData, 0);
  };

  const handleDelete = async (id: number) => {
    if (confirm('确认删除此企业吗？')) {
      await axios.delete(`/monitor/${id}`);
      fetchData();
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await axios.put(`/monitor/${editingId}`, formData);
      } else {
        await axios.post('/monitor/pool', formData);
      }
      setIsModalOpen(false);
      fetchData();
      alert('保存成功');
    } catch (error: any) {
      console.error('保存失败:', error);
      const errorMsg = error.response?.data?.message || error.response?.data || error.message;
      alert(`保存失败: ${errorMsg}`);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ debtorName: '', creditCode: '', status: 1 });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MonitorPool) => {
    setEditingId(item.id);
    setFormData({ debtorName: item.debtorName, creditCode: item.creditCode, status: item.status });
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(d => ({
      '债务人名称': d.debtorName,
      '统一社会信用代码': d.creditCode,
      '状态': d.status === 1 ? '监控中' : '未知',
      '创建时间': d.createTime
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "监控池");
    XLSX.writeFile(wb, "债务人监控池.xlsx");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post('/monitor/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Try to parse the backend response as ImportResultDTO
      if (res.data && typeof res.data === 'object' && ('successCount' in res.data || 'failCount' in res.data)) {
        setImportResult(res.data);
      } else {
        // Fallback for unstructured response or string response
        setImportResult({
          successCount: -1,
          failCount: -1,
          failDetails: [typeof res.data === 'string' ? res.data : JSON.stringify(res.data)]
        });
      }
      setIsResultModalOpen(true);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.response?.data || err.message;
      setImportResult({
        successCount: 0,
        failCount: -1,
        failDetails: [typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)]
      });
      setIsResultModalOpen(true);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDebtorNameChange = (val: string) => {
    setFormData({ ...formData, debtorName: val });
    if (!val) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (searchTimeout) clearTimeout(searchTimeout);
    
    setSearchTimeout(setTimeout(async () => {
      try {
        const res = await axios.get('/v1/enterprises', { params: { keyword: val, pageSize: 10 } });
        if (res.data && res.data.records) {
          setSuggestions(res.data.records);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300));
  };

  const handleSelectSuggestion = (item: any) => {
    setFormData({
      ...formData,
      debtorName: item.name,
      creditCode: item.creditCode
    });
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债务人名称</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="请输入企业全称..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">创建时间</label>
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

      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共监控 <span className="font-semibold text-neutral-900">{total}</span> 家企业
        </div>
        <div className="flex gap-2">
          <button onClick={openAddModal} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm">
            <Plus size={14} />
            添加债务人
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Upload size={14} />
            批量导入债务人
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Download size={14} />
            导出债务人
          </button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">债务人名称</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">统一社会信用代码</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">创建时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {data.map((row, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={row.id} 
                  className="group hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-neutral-900 whitespace-nowrap">{row.debtorName}</td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.creditCode}</td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${row.status === 1 ? 'bg-emerald-500' : 'bg-neutral-300'}`}></span>
                      <span className="text-neutral-600 text-xs font-medium">{row.status === 1 ? '监控中' : '未知'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.createTime}</td>
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10">
                    <div className="flex justify-end gap-4">
                      <button onClick={() => openEditModal(row)} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
                        <Pencil size={14} /> 编辑
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="flex items-center gap-1 text-neutral-500 hover:text-red-600 transition-colors">
                        <Trash2 size={14} /> 删除
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-neutral-500">暂无数据</td>
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
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <h3 className="text-base font-semibold text-neutral-900">{editingId ? '编辑企业' : '添加企业'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">企业名称</label>
                  <input 
                    type="text" 
                    value={formData.debtorName} 
                    onChange={e => handleDebtorNameChange(e.target.value)} 
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900" 
                    placeholder="请输入企业名称" 
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {suggestions.map(item => (
                        <div 
                          key={item.id} 
                          onClick={() => handleSelectSuggestion(item)}
                          className="px-3 py-2 text-sm cursor-pointer hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                        >
                          <div className="font-medium text-neutral-900">{item.name}</div>
                          <div className="text-xs text-neutral-500 font-mono mt-0.5">{item.creditCode}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">统一社会信用代码</label>
                  <input type="text" value={formData.creditCode} onChange={e => setFormData({...formData, creditCode: e.target.value})} className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900" placeholder="请输入18位信用代码" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">状态</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: Number(e.target.value)})} className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900">
                    <option value={1}>监控中</option>
                    <option value={0}>未知</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50">取消</button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800">保存</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResultModalOpen && importResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResultModalOpen(false)} className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-neutral-200">
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <h3 className="text-base font-semibold text-neutral-900">导入结果</h3>
                <button onClick={() => setIsResultModalOpen(false)} className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex gap-4">
                  <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-emerald-900 mb-1">导入成功</div>
                      <div className="text-2xl font-semibold text-emerald-700">{importResult.successCount >= 0 ? importResult.successCount : '-'} <span className="text-sm font-normal">条</span></div>
                    </div>
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-100 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-red-900 mb-1">导入失败</div>
                      <div className="text-2xl font-semibold text-red-700">{importResult.failCount >= 0 ? importResult.failCount : '-'} <span className="text-sm font-normal">条</span></div>
                    </div>
                  </div>
                </div>
                
                {importResult.failDetails && importResult.failDetails.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-neutral-900 mb-3">失败详情</h4>
                    <div className="bg-neutral-50 border border-neutral-200 rounded-md p-3 max-h-48 overflow-y-auto text-sm text-neutral-600 space-y-2">
                      {importResult.failDetails.map((detail, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-neutral-400 shrink-0">{idx + 1}.</span>
                          <span className="break-all">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end">
                <button onClick={() => setIsResultModalOpen(false)} className="px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 shadow-sm">
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
