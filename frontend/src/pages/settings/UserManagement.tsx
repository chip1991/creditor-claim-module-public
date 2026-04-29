import { useState, useEffect } from 'react';
import { Search, RotateCcw, Eye, Ban, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from '../../lib/axios';
import { useToast } from '../../components/ui/Toast';

interface User {
  id: number;
  name: string;
  empId: string;
  phone: string;
  org: string;
  status: string;
  syncTime: string;
}

export default function UserManagement() {
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { showToast, ToastComponent } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/v1/users');
      setData(response.data.data || response.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('获取用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await axios.post('/v1/users/sync');
      showToast('同步成功', 'success');
      fetchUsers();
    } catch (error) {
      console.error('Failed to sync users:', error);
      showToast('同步失败', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === '启用' ? '禁用' : '启用';
    try {
      await axios.put(`/v1/users/${id}/status`, { status: newStatus });
      showToast(`已${newStatus}该用户`, 'success');
      fetchUsers();
    } catch (error) {
      console.error('Failed to update status:', error);
      showToast('状态更新失败', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {ToastComponent}
      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">员工姓名/工号/手机号</label>
            <input 
              type="text" 
              placeholder="请输入关键词检索..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow"
            />
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">所属组织</label>
            <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand transition-shadow appearance-none text-neutral-700">
              <option value="">全部组织</option>
              <option value="hq">集团总部</option>
              <option value="south">华南地区公司本部</option>
            </select>
          </div>
          <div className="flex gap-3 ml-auto shrink-0 mt-4 xl:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
              <RotateCcw size={16} />
              重置
            </button>
            <button className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm">
              <Search size={16} />
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Global Actions (Cardless) */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{data.length}</span> 条员工记录
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-brand border border-brand rounded hover:bg-brand-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            全量同步 IAM 用户
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col relative min-h-[200px]">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20 flex items-center justify-center">
            <Loader2 className="animate-spin text-brand" size={32} />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">姓名</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">工号</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">手机号</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">所属组织</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">最新同步时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-neutral-50/50">操作</th>
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
                  <td className="px-6 py-4 text-sm font-medium text-brand whitespace-nowrap cursor-pointer hover:underline">{row.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.empId}</td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.phone}</td>
                  <td className="px-6 py-4 text-sm text-neutral-700 whitespace-nowrap">{row.org}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${row.status === '启用' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-neutral-400 whitespace-nowrap">{row.syncTime}</td>
                  <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                    <div className="flex justify-end gap-3">
                      <button className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors"><Eye size={14} /> 查看</button>
                      <button 
                        onClick={() => handleToggleStatus(row.id, row.status)}
                        className={`flex items-center gap-1 transition-colors ${row.status === '启用' ? 'text-neutral-400 hover:text-red-500' : 'text-emerald-500 hover:text-emerald-600'}`}
                      >
                        <Ban size={14} /> {row.status === '启用' ? '禁用' : '启用'}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-neutral-500">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-sm text-neutral-500">共 {data.length} 条记录</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 text-sm text-neutral-400 cursor-not-allowed">上一页</button>
            <button className="px-3 py-1 text-sm bg-neutral-900 text-white rounded">1</button>
            <button className="px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-200 rounded transition-colors">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
