import React, { useState, useEffect } from 'react';
import { Search, Download, Plus, Eye, Upload, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DateRangePicker from '../components/DateRangePicker';
import DataTable from '../components/DataTable';
import type { Column } from '../components/DataTable';
import axios from '../lib/axios';

const STATUS_MAP: Record<string, { color: string; dot: string }> = {
  '存续': { color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-500' },
  '注销': { color: 'bg-neutral-100 text-neutral-500 border-neutral-200', dot: 'bg-neutral-400' },
  '吊销': { color: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-500' },
};

const EnterpriseLedger: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(1);
  const [size, setSize] = useState(10);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState({
    keyword: searchParams.get('q') || '',
    type: '',
    status: ''
  });

  const fetchEnterprises = async () => {
    try {
      const response = await axios.get('/v1/enterprises', {
        params: {
          keyword: filters.keyword,
          type: filters.type,
          status: filters.status,
          page: current,
          pageSize: size
        }
      });
      setData(response.data.records || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch enterprises:', error);
    }
  };

  useEffect(() => {
    fetchEnterprises();
  }, [current, size]);

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条台账记录吗？')) return;
    try {
      await axios.delete(`/v1/enterprises/${id}`);
      fetchEnterprises();
    } catch (e) {
      console.error(e);
    }
  };

  const columns: Column[] = [
    {
      title: '企业名称',
      dataIndex: 'name',
      render: (value, record) => (
        <span className="text-sm font-medium text-brand whitespace-nowrap cursor-pointer hover:underline" onClick={() => navigate(`/enterprise/detail?id=${record.id}`)}>
          {value}
        </span>
      ),
    },
    {
      title: '统一社会信用代码',
      dataIndex: 'creditCode',
      render: (value) => <span className="text-sm font-mono text-neutral-500 whitespace-nowrap">{value}</span>,
    },
    {
      title: '法定代表人',
      dataIndex: 'legalPerson',
      render: (value) => <span className="text-sm text-neutral-700 whitespace-nowrap">{value}</span>,
    },
    {
      title: '注册资本',
      dataIndex: 'registeredCapital',
      render: (value) => <span className="text-sm font-mono text-neutral-700 whitespace-nowrap">{value}</span>,
    },
    {
      title: '成立日期',
      dataIndex: 'establishmentDate',
      render: (value) => <span className="text-sm font-mono text-neutral-500 whitespace-nowrap">{value ? value.split('T')[0] : ''}</span>,
    },
    {
      title: '企业状态',
      dataIndex: 'status',
      render: (value) => {
        const statusConfig = STATUS_MAP[value] || STATUS_MAP['注销'];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${statusConfig.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {value || '存续'}
          </span>
        );
      },
    },
    {
      title: '业务标签',
      dataIndex: 'tags',
      render: (value) => (
        <div className="flex gap-1">
          {(value ? value.split(',') : []).map((tag: string) => (
            tag ? <span key={tag} className="px-2 py-1 bg-brand-light text-brand-dark rounded text-[11px] font-medium border border-brand-100">{tag}</span> : null
          ))}
        </div>
      ),
    },
    {
      title: '关联业务数',
      dataIndex: 'relatedCount',
      render: () => (
        <>
          <span className="text-neutral-500">案件 <span className="font-semibold text-neutral-700">0</span></span>
          <span className="mx-2 text-neutral-300">|</span>
          <span className="text-neutral-500">公告 <span className="font-semibold text-neutral-700">0</span></span>
        </>
      ),
    },
    {
      title: '监控状态',
      dataIndex: 'monitoringStatus',
      render: (value) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
          value === '监控中' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
        }`}>
          {value || '未监控'}
        </span>
      ),
    },
    {
      title: '内部负责人',
      dataIndex: 'owner',
      render: (value) => <span className="text-sm text-neutral-700 whitespace-nowrap">{value || 'Admin'}</span>,
    },
    {
      title: '最新更新时间',
      dataIndex: 'updatedAt',
      render: (value) => <span className="text-sm font-mono text-neutral-500 whitespace-nowrap">{value ? value.replace('T', ' ').split('.')[0] : ''}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Filter Section */}
      <div className="bg-white p-5 rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex flex-wrap gap-x-6 gap-y-4 items-end">
          <div className="w-64 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">企业名称/信用代码</label>
            <input 
              type="text" 
              placeholder="请输入关键词搜索..." 
              value={filters.keyword}
              onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
            />
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">企业状态</label>
            <select 
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700"
            >
              <option value="">全部状态</option>
              <option value="存续">存续</option>
              <option value="注销">注销</option>
              <option value="吊销">吊销</option>
            </select>
          </div>
          <div className="w-32 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">监控状态</label>
            <select className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow appearance-none text-neutral-700">
              <option value="">全部状态</option>
              <option value="监控中">监控中</option>
              <option value="未监控">未监控</option>
            </select>
          </div>
          <div className="w-72 shrink-0">
            <label className="block text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">更新时间</label>
            <DateRangePicker />
          </div>
          
          <div className="flex gap-3 ml-auto shrink-0 mt-4 xl:mt-0">
            <button 
              onClick={() => { setFilters({ keyword: '', type: '', status: '' }); setTimeout(fetchEnterprises, 0); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <RotateCcw size={16} />
              重置
            </button>
            <button 
              onClick={fetchEnterprises}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm"
            >
              <Search size={16} />
              搜索
            </button>
          </div>
        </div>
      </div>

      {/* Global Actions (Cardless) */}
      <div className="flex items-center justify-between px-1">
        <div className="text-[13px] font-medium text-neutral-500">
          共检索到 <span className="font-semibold text-neutral-900">{total}</span> 条企业数据
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Upload size={14} />
            批量导入
          </button>
          <button 
            onClick={() => navigate('/enterprise/form')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors shadow-sm"
          >
            <Plus size={14} />
            新增企业
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm">
            <Download size={14} />
            导出台账
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
            <button onClick={() => navigate(`/enterprise/detail?id=${row.id}`)} className="flex items-center gap-1 text-neutral-500 hover:text-brand transition-colors" title="查看企业详情">
              <Eye size={14} /> 查看
            </button>
            <button onClick={() => navigate(`/enterprise/form?id=${row.id}`)} className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors" title="编辑台账信息">
              <Pencil size={14} /> 编辑
            </button>
            <button onClick={() => handleDelete(row.id)} className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors" title="删除记录">
              <Trash2 size={14} /> 删除
            </button>
          </>
        )}
      />
    </div>
  );
};

export default EnterpriseLedger;