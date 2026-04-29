import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Search, RotateCcw, Eye, Pencil, Trash2, Send, CornerUpLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DateRangePicker from '../components/DateRangePicker';
import axios from '../lib/axios';

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  '待提交': { label: '待提交', color: 'bg-neutral-100 text-neutral-600 border-neutral-200', dot: 'bg-neutral-400' },
  '审核中': { label: '审核中', color: 'bg-brand-light text-brand-dark border-brand-100', dot: 'bg-brand-light0' },
  '驳回': { label: '驳回', color: 'bg-orange-50 text-orange-600 border-orange-100', dot: 'bg-orange-500' },
  '审核通过': { label: '审核通过', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
  '审核不通过': { label: '审核不通过', color: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
  '废弃': { label: '废弃', color: 'bg-neutral-100 text-neutral-400 border-neutral-200', dot: 'bg-neutral-300' },
};

const TABS = ['全部', '一阶段', '二阶段', '三阶段', '四阶段'];

export default function LedgerList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('全部');
  const [data, setData] = useState<any[]>([]);

  const fetchLedgers = async () => {
    try {
      // 调用真实的台账接口获取数据
      const res = await axios.get('/ledger/page');
      const mappedData = res.data.records?.map((record: any) => ({
        id: record.id,
        caseNo: record.ledgerNo || '-',
        debtorName: record.debtorName || '-',
        court: '-',
        deadline: record.deadlineDate || '-',
        stage: '一阶段',
        status: record.status === 'DRAFT' ? '待提交' : 
                record.status === 'APPROVING' ? '审核中' :
                record.status === 'CONFIRMED' ? '审核通过' : '待提交',
        unit: record.declareSubject || '-',
        amount: record.totalAmount || 0.00,
        nature: record.claimNature || '-',
        agent: '-',
        contact: '-',
        createdAt: record.createTime || '-',
        updatedAt: record.updateTime || '-'
      })) || [];
      setData(mappedData);
    } catch (error) {
      console.error('获取台账列表失败', error);
      setData([]);
    }
  };

  useEffect(() => {
    fetchLedgers();
  }, []);

  const filteredData = activeTab === '全部' ? data : data.filter(item => item.stage === activeTab);

  const renderRowActions = (status: string, stage: string) => {
    switch (status) {
      case '待提交':
        return (
          <>
            <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <Pencil size={14} /> 编辑
            </button>
            <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
              <Send size={14} /> 提交审核
            </button>
            <button className="flex items-center gap-1 text-neutral-400 hover:text-red-600 transition-colors">
              <Trash2 size={14} /> 删除
            </button>
          </>
        );
      case '审核中':
        return (
          <>
            <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <Eye size={14} /> 查看
            </button>
            <button className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors">
              <CornerUpLeft size={14} /> 撤回
            </button>
          </>
        );
      case '驳回':
      case '审核不通过':
        return (
          <>
            <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <Eye size={14} /> 查看
            </button>
            <button className="flex items-center gap-1 text-brand-dark hover:text-brand-dark transition-colors font-medium">
              <Pencil size={14} /> 重新编辑
            </button>
          </>
        );
      case '审核通过':
        return (
          <>
            <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
              <Eye size={14} /> 查看
            </button>
            {stage !== '四阶段' && (
              <button className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 transition-colors font-medium">
                <ArrowRight size={14} /> 进入下一阶段
              </button>
            )}
          </>
        );
      case '废弃':
        return (
          <button className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors">
            <Eye size={14} /> 查看
          </button>
        );
      default:
        return null;
    }
  };

  const getTabCount = (tab: string) => {
    if (tab === '全部') return data.length;
    return data.filter(item => item.stage === tab).length;
  };

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Tabs */}
      <div className="flex gap-6 border-b border-neutral-200 px-1">
        {TABS.map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[13px] font-medium transition-colors relative ${
              activeTab === tab 
                ? 'text-neutral-900' 
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab} <span className="ml-1 opacity-60">({getTabCount(tab)})</span>
            {activeTab === tab && (
              <motion.div 
                layoutId="ledger-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-neutral-900"
              />
            )}
          </button>
        ))}
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">案号</label>
            <input 
              type="text" 
              placeholder="请输入案号..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-56 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债务人名称</label>
            <input 
              type="text" 
              placeholder="请输入债务人全称..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报阶段</label>
            <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700">
              <option value="">全部阶段</option>
              <option value="一阶段">一阶段</option>
              <option value="二阶段">二阶段</option>
              <option value="三阶段">三阶段</option>
              <option value="四阶段">四阶段</option>
            </select>
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">审批状态</label>
            <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700">
              <option value="">全部状态</option>
              <option value="待提交">待提交</option>
              <option value="审核中">审核中</option>
              <option value="驳回">驳回</option>
              <option value="审核通过">审核通过</option>
              <option value="审核不通过">审核不通过</option>
              <option value="废弃">废弃</option>
            </select>
          </div>
          <div className="w-48 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报单位</label>
            <input 
              type="text" 
              placeholder="请输入申报单位..." 
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">创建时间</label>
            <DateRangePicker />
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
          共检索到 <span className="font-semibold text-neutral-900">{filteredData.length}</span> 条申报记录
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/ledger/form')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            新增申报
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Download size={14} />
            导出台账
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50">
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">案号</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">债务人名称</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">受理法院</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">申报截止日期</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">申报阶段</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">流程审批状态</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">申报单位</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap text-right">申报金额(元)</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">债权性质</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">代理人</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">代理人联系方式</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">创建时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider whitespace-nowrap">更新时间</th>
                <th className="px-6 py-4 text-xs font-medium text-neutral-500 uppercase tracking-wider text-right whitespace-nowrap sticky right-0 bg-neutral-50/50 z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-neutral-50/50">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.map((row, idx) => {
                const statusConfig = STATUS_MAP[row.status];
                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={row.id} 
                    className="group hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-neutral-700 whitespace-nowrap">{row.caseNo}</td>
                    <td className="px-6 py-4 text-sm font-medium text-neutral-900 whitespace-nowrap">{row.debtorName}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{row.court}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.deadline}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs font-medium">{row.stage}</span>
                    </td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${statusConfig.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{row.unit}</td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-neutral-900 text-right whitespace-nowrap">
                      {row.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{row.nature}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600 whitespace-nowrap">{row.agent}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.contact}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-500 whitespace-nowrap">{row.createdAt}</td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-400 whitespace-nowrap">{row.updatedAt}</td>
                    <td className="px-6 py-4 text-sm text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-neutral-50 transition-colors z-10 before:absolute before:inset-y-0 before:-left-4 before:w-4 before:bg-gradient-to-r before:from-transparent before:to-white group-hover:before:to-neutral-50">
                      <div className="flex justify-end gap-3">
                        {renderRowActions(row.status, row.stage)}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <span className="text-sm text-neutral-500">共 {filteredData.length} 条记录</span>
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