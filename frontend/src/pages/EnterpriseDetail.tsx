import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, ShieldAlert, Building2, Gavel } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from '../lib/axios';

const EnterpriseDetail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('工商信息');
  const [data, setData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (id) {
      axios.get(`/v1/enterprises/${id}`)
        .then(res => setData(res.data));
        
      axios.get(`/v1/enterprises/${id}/detail-stats`)
        .then(res => setStats(res.data));
    }
  }, [id]);

  const tabs = ['工商信息', '风险信息', '关联业务'];

  if (!data) return <div className="p-8 text-neutral-500">Loading...</div>;

  return (
    <div className="flex flex-col relative bg-neutral-50 min-h-full -m-8">
      {/* Top Nav */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="text-sm font-medium text-neutral-500">返回台账列表</span>
        </div>
          <div className="flex gap-3">
          <button 
            onClick={() => navigate(`/enterprise/form?id=${id}`)}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Edit size={14} />
            编辑台账
          </button>
        </div>
      </div>

      {/* Enterprise Header Profile */}
      <div className="bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-8 py-10 flex gap-6">
          {/* Logo */}
          <div className="w-24 h-24 rounded-xl bg-brand-light border border-brand-100 flex items-center justify-center shrink-0">
            <span className="text-brand text-3xl font-bold">{data.name?.charAt(0) || '企'}</span>
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-neutral-900">{data.name}</h1>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-xs font-medium">{data.status || '存续'}</span>
              {data.enterpriseType && <span className="px-2 py-0.5 bg-brand-light text-brand-dark border border-brand-100 rounded text-xs font-medium">{data.enterpriseType}</span>}
            </div>
            <div className="flex items-center gap-6 text-[13px] text-neutral-600 mb-6">
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">法定代表人：</span>
                <span className="text-brand font-medium cursor-pointer hover:underline">{data.legalPerson || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">注册资本：</span>
                <span className="font-mono">{data.registeredCapital || '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">成立日期：</span>
                <span className="font-mono">{data.establishmentDate ? data.establishmentDate.split('T')[0] : '-'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">统一社会信用代码：</span>
                <span className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-600">{data.creditCode}</span>
              </div>
            </div>

            {/* Internal Tags */}
            <div className="flex gap-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mr-2 self-center">内部标签</span>
              {(data.tags ? data.tags.split(',') : []).map((tag: string) => (
                tag ? <span key={tag} className="px-2 py-1 bg-neutral-100 text-neutral-600 rounded text-xs font-medium border border-neutral-200">{tag}</span> : null
              ))}
              {stats?.isMonitoring && (
                <span className="px-2 py-1 bg-orange-50 text-orange-600 rounded text-xs font-medium border border-orange-100 flex items-center gap-1">
                  <ShieldAlert size={12} /> 监控中
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="max-w-5xl mx-auto px-8 flex gap-8">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-medium transition-colors relative ${
                activeTab === tab ? 'text-brand' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div 
                  layoutId="detailTab"
                  className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand rounded-t-md"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-5xl mx-auto px-8 py-8 w-full">
        {activeTab === '工商信息' && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-neutral-100 pb-4 mb-6">
              <Building2 size={18} className="text-neutral-400" />
              <h2 className="text-[15px] font-semibold text-neutral-900">基本信息</h2>
            </div>
            <div className="grid grid-cols-2 gap-y-6">
              <div className="col-span-1 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">企业名称</span>
                <span className="text-neutral-900 font-medium">{data.name}</span>
              </div>
              <div className="col-span-1 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">统一社会信用代码</span>
                <span className="text-neutral-900 font-mono">{data.creditCode}</span>
              </div>
              <div className="col-span-1 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">法定代表人</span>
                <span className="text-brand font-medium cursor-pointer hover:underline">{data.legalPerson || '-'}</span>
              </div>
              <div className="col-span-1 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">企业类型</span>
                <span className="text-neutral-900">{data.enterpriseType || '-'}</span>
              </div>
              <div className="col-span-2 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">注册地址</span>
                <span className="text-neutral-900 leading-relaxed">{data.address || '-'}</span>
              </div>
              <div className="col-span-2 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">经营范围</span>
                <span className="text-neutral-900 leading-relaxed">{data.businessScope || '-'}</span>
              </div>
              <div className="col-span-2 flex text-[13px]">
                <span className="text-neutral-400 w-28 shrink-0">内部备注</span>
                <span className="text-neutral-900 leading-relaxed">{data.remarks || '暂无备注'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === '风险信息' && (
          <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm flex flex-col items-center justify-center py-20">
            <ShieldAlert size={48} className="text-neutral-200 mb-4" />
            <h3 className="text-neutral-600 font-medium">暂无重大风险信息</h3>
            <p className="text-sm text-neutral-400 mt-1">该企业近期未发现被执行人、失信或限制高消费等记录</p>
          </div>
        )}

        {activeTab === '关联业务' && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Gavel size={18} className="text-neutral-400" />
                  <h2 className="text-[15px] font-semibold text-neutral-900">关联数据 <span className="text-neutral-400 text-xs font-normal ml-1">案件 {stats?.caseCount || 0} 笔 | 公告 {stats?.noticeCount || 0} 笔</span></h2>
                </div>
                <button onClick={() => navigate('/public-data/case')} className="text-[13px] text-brand hover:underline">查看全部</button>
              </div>
              <div className="divide-y divide-neutral-50">
                <div className="py-3 flex justify-between items-center group cursor-pointer">
                  <span className="text-[13px] text-neutral-800 font-mono group-hover:text-brand transition-colors">(2023)粤03破1号</span>
                  <span className="text-xs text-neutral-400">深圳市中级人民法院</span>
                </div>
                <div className="py-3 flex justify-between items-center group cursor-pointer">
                  <span className="text-[13px] text-neutral-800 font-mono group-hover:text-brand transition-colors">(2023)粤03破申152号</span>
                  <span className="text-xs text-neutral-400">深圳市中级人民法院</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterpriseDetail;