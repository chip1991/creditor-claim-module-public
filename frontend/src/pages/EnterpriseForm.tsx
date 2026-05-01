import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Building2, User } from 'lucide-react';
import axios from '../lib/axios';

const EnterpriseForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    creditCode: '',
    legalPerson: '',
    registeredCapital: '',
    establishmentDate: '',
    status: '存续',
    owner: '',
    tags: '',
    monitoringStatus: '未监控',
    remarks: ''
  });

  useEffect(() => {
    if (isEdit) {
      axios.get(`/v1/enterprises/${id}`)
        .then(res => {
          if (res.data) {
            const data = res.data;
            setFormData({
              name: data.name || '',
              creditCode: data.creditCode || '',
              legalPerson: data.legalPerson || '',
              registeredCapital: data.registeredCapital || '',
              establishmentDate: data.establishmentDate ? data.establishmentDate.split('T')[0] : '',
              status: data.status || '存续',
              owner: data.owner || '',
              tags: data.tags || '',
              monitoringStatus: data.monitoringStatus || '未监控',
              remarks: data.remarks || ''
            });
          }
        });
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name || !formData.creditCode) {
      alert('企业名称和信用代码必填');
      return;
    }

    try {
      if (isEdit) {
        await axios.put(`/v1/enterprises/${id}`, formData);
      } else {
        await axios.post('/v1/enterprises', formData);
      }
      navigate('/enterprise/ledger');
    } catch (e) {
      console.error(e);
      alert('保存失败');
    }
  };

  return (
    <div className="flex flex-col relative bg-white pb-20 -m-8">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500 hover:text-neutral-900"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
              {isEdit ? '编辑企业信息' : '新增企业'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-brand rounded-md hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-2">
            <Save size={16} />
            保存台账
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-10 max-w-4xl mx-auto w-full space-y-10">
        {/* Section 1: 工商基础信息 */}
        <section>
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-6">
            <Building2 size={18} className="text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-900">工商基础信息</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">企业名称 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900" 
                placeholder="请输入企业全称" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">统一社会信用代码 <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                name="creditCode"
                value={formData.creditCode}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900" 
                placeholder="18位信用代码" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">法定代表人</label>
              <input 
                type="text" 
                name="legalPerson"
                value={formData.legalPerson}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900" 
                placeholder="请输入法定代表人姓名" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">注册资本</label>
              <input 
                type="text" 
                name="registeredCapital"
                value={formData.registeredCapital}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900" 
                placeholder="如: 100万人民币" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">成立日期</label>
              <input 
                type="date" 
                name="establishmentDate"
                value={formData.establishmentDate}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">企业状态</label>
              <select 
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow appearance-none text-neutral-900">
                <option value="存续">存续</option>
                <option value="注销">注销</option>
                <option value="吊销">吊销</option>
                <option value="迁出">迁出</option>
              </select>
            </div>
          </div>
        </section>

        {/* Section 2: 内部业务信息 */}
        <section>
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3 mb-6 mt-10">
            <User size={18} className="text-neutral-400" />
            <h2 className="text-sm font-semibold text-neutral-900">内部业务属性</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">内部负责人</label>
              <select 
                name="owner"
                value={formData.owner}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow appearance-none text-neutral-900">
                <option value="">请选择负责人</option>
                <option value="zhangsan">张三</option>
                <option value="lisi">李四</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">业务标签 (多选)</label>
              <input 
                type="text" 
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" 
                placeholder="用逗号分隔，如: 战略客户, 核心供应商" 
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">是否加入监控池</label>
              <div className="flex items-center gap-6 mt-3">
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="monitoringStatus" 
                    value="监控中"
                    checked={formData.monitoringStatus === '监控中'}
                    onChange={handleChange}
                    className="w-4 h-4 text-brand border-neutral-300 focus:ring-brand" 
                  />
                  <span>是 (自动推入监控池进行风险预警)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input 
                    type="radio" 
                    name="monitoringStatus" 
                    value="未监控"
                    checked={formData.monitoringStatus === '未监控'}
                    onChange={handleChange}
                    className="w-4 h-4 text-brand border-neutral-300 focus:ring-brand" 
                  />
                  <span>否</span>
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">内部备注</label>
              <textarea 
                rows={4} 
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                className="w-full px-3 py-3 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400 leading-relaxed" 
                placeholder="可填写关于该企业的合作背景、注意事项等信息..." 
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EnterpriseForm;