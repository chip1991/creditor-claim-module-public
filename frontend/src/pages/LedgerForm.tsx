import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LedgerForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryDebtorName = searchParams.get('debtorName') || '';

  const [formData, setFormData] = useState({
    debtorName: queryDebtorName,
    creditCode: '',
    caseNo: ''
  });

  useEffect(() => {
    if (location.state) {
      setFormData(prev => ({
        ...prev,
        debtorName: location.state.name || prev.debtorName,
        creditCode: location.state.creditCode || prev.creditCode,
        caseNo: location.state.caseNo || prev.caseNo
      }));
    }
  }, [location.state]);

  const [principalDetails, setPrincipalDetails] = useState([
    { id: 1, name: '前期服务费', amount: '', remark: '' },
    { id: 2, name: '案场清洁', amount: '', remark: '' },
    { id: 3, name: '开荒保洁', amount: '', remark: '' },
    { id: 4, name: '车位服务费', amount: '', remark: '' },
    { id: 5, name: '维保修服务费', amount: '', remark: '' },
  ]);

  const addDetail = () => {
    setPrincipalDetails([...principalDetails, { id: Date.now(), name: '', amount: '', remark: '' }]);
  };

  const removeDetail = (id: number) => {
    setPrincipalDetails(principalDetails.filter(d => d.id !== id));
  };

  const handleDetailChange = (id: number, field: string, value: string) => {
    setPrincipalDetails(principalDetails.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const totalAmount = principalDetails.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
            <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">新增债权申报</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="px-5 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm"
          >
            取消
          </button>
          <button className="px-5 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors shadow-sm">
            保存草稿
          </button>
          <button 
            onClick={() => navigate('/ledger/list')}
            className="px-6 py-2 text-sm font-medium text-white bg-neutral-900 rounded-md hover:bg-neutral-800 transition-colors shadow-sm"
          >
            提交审批
          </button>
        </div>
      </div>

      <div className="flex-1 px-8 py-10 max-w-5xl mx-auto w-full space-y-12">
        
        {/* Section 1: 基础信息 */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-3 mb-6">基础信息</h2>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6">
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">所属项目</label>
              <select className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow appearance-none text-neutral-900">
                <option value="">选项目，或者“XX地区公司本部”或者“集团总部”</option>
                <option value="p1">华南地区公司本部</option>
                <option value="p2">华东地区公司本部</option>
                <option value="p3">集团总部</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">关联破产公告</label>
              <div className="relative">
                <input type="text" className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="(点击关联) 或者直接带过来" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-1">
                  <Paperclip size={16} />
                </button>
              </div>
            </div>

            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">破产主体</label>
              <input 
                type="text" 
                value={formData.debtorName} 
                onChange={e => setFormData({...formData, debtorName: e.target.value})}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400 bg-neutral-50/50" 
                placeholder="下拉选择 (需要将监控信息带过来)" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报主体</label>
              <select className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow appearance-none text-neutral-900">
                <option value="">选择我方主体 (每个主体一个流程)</option>
                <option value="s1">深圳总公司</option>
                <option value="s2">北京分公司</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">统一社会信用代码</label>
              <input 
                type="text" 
                value={formData.creditCode}
                onChange={e => setFormData({...formData, creditCode: e.target.value})}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400 bg-neutral-50/50" 
                placeholder="信用代码" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">是否关联方 (标注解读)</label>
              <div className="flex items-center gap-6 mt-3">
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input type="radio" name="isRelated" className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900" />
                  <span>是</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input type="radio" name="isRelated" defaultChecked className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900" />
                  <span>否</span>
                </label>
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">破产类型</label>
              <select className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow appearance-none text-neutral-900">
                <option value="">下拉选择：预重整/重整/清算</option>
                <option value="预重整">预重整</option>
                <option value="重整">重整</option>
                <option value="清算">清算</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">破产案件</label>
              <input 
                type="text" 
                value={formData.caseNo}
                onChange={e => setFormData({...formData, caseNo: e.target.value})}
                className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" 
                placeholder="请输入案件编号" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">受理法院</label>
              <input type="text" className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="请输入经办法院名称" />
            </div>

            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">裁定受理日期</label>
              <input type="date" className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" />
              <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">抓取格式（本院于XXXX年X月XX日裁定受理XXXX公司破产清算一案）</p>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">管理人名称</label>
              <input type="text" className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="从破产公告抓取，如果多个就用，可手动改" />
            </div>

            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报截止日期</label>
              <div className="flex gap-4 items-center">
                <input type="date" className="w-64 px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" />
                <span className="text-sm text-neutral-400">抓取过来，可以修改 (监控功能需要联动工作日历的提醒功能)</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: 第一阶段：债权申报 */}
        <section>
          <div className="bg-amber-50/60 border-l-4 border-amber-400 px-4 py-2.5 mb-6 rounded-r-md">
            <h2 className="text-sm font-semibold text-amber-900">第一阶段：债权申报</h2>
          </div>
          
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报本金</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">¥</span>
                <input type="number" className="w-full pl-7 pr-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900" placeholder="0.00" />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">利息/违约金 (填金额)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">¥</span>
                <input type="number" className="w-full pl-7 pr-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900" placeholder="0.00" />
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">计算方式</label>
              <select className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow appearance-none text-neutral-900">
                <option value="">下拉：lpr、lpr四倍</option>
                <option value="lpr">LPR</option>
                <option value="lpr4">LPR 四倍</option>
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">申报总额</label>
              <div className="w-full px-3 py-2.5 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-md text-neutral-500 flex items-center">
                ¥ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="ml-auto text-[11px] text-neutral-400 font-sans">自动计算</span>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider">本金明细</label>
            </div>
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-1">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 border-b border-neutral-200/60 bg-neutral-100/50 rounded-t-md text-xs font-medium text-neutral-500">
                <div className="col-span-3">服务项目</div>
                <div className="col-span-3 text-right">金额</div>
                <div className="col-span-5">备注</div>
                <div className="col-span-1 text-center">操作</div>
              </div>
              <div className="p-2 space-y-2">
                <AnimatePresence>
                  {principalDetails.map((detail) => (
                    <motion.div 
                      key={detail.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-12 gap-4 items-center"
                    >
                      <div className="col-span-3">
                        <input 
                          type="text" 
                          value={detail.name}
                          onChange={(e) => handleDetailChange(detail.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow"
                          placeholder="项目名称"
                        />
                      </div>
                      <div className="col-span-3 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">¥</span>
                        <input 
                          type="number" 
                          value={detail.amount}
                          onChange={(e) => handleDetailChange(detail.id, 'amount', e.target.value)}
                          className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-white border border-neutral-200 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-right"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="col-span-5">
                        <input 
                          type="text" 
                          value={detail.remark}
                          onChange={(e) => handleDetailChange(detail.id, 'remark', e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow"
                          placeholder="请填写备注"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => removeDetail(detail.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="pt-2 px-1">
                  <button 
                    onClick={addDetail}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-dark bg-brand-light border border-brand-100 rounded hover:bg-brand-100 transition-colors"
                  >
                    <Plus size={14} /> 增加项目
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mb-8">
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债权性质</label>
              <div className="flex items-center gap-6 mt-3">
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input type="radio" name="nature" defaultChecked className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900" />
                  <span>普通债权</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                  <input type="radio" name="nature" className="w-4 h-4 text-neutral-900 border-neutral-300 focus:ring-neutral-900" />
                  <span>有限债权</span>
                </label>
              </div>
            </div>
            <div className="col-span-1">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">应付债权</label>
              <div className="w-full px-3 py-2.5 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-md text-neutral-500">
                ¥ 0.00
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-3 gap-6">
              <div className="col-span-3">
                <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">管理人联系人</label>
              </div>
              <div className="col-span-1 -mt-4">
                <input type="text" className="w-full px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="姓名：实例：张三" />
              </div>
              <div className="col-span-1 -mt-4">
                <input type="text" className="w-full px-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="电话：" />
              </div>
              <div className="col-span-1 -mt-4">
                <input type="text" className="w-full px-3 py-2.5 text-sm font-mono bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="邮箱：" />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">代理人</label>
              <input type="text" className="w-1/2 px-3 py-2.5 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" placeholder="带出员工" />
            </div>

            <div className="col-span-2">
              <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">债权申报情况及申报说明</label>
              <textarea 
                rows={4} 
                className="w-full px-3 py-3 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400 leading-relaxed" 
                placeholder="主要填写什么内容，模版化，要求：&#10;(精简一点)&#10;(每个阶段模版化不一样)" 
              />
            </div>
          </div>
        </section>

        {/* Section 3: 申报材料及附件 */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-900 border-b border-neutral-200 pb-3 mb-6">申报材料及附件</h2>
          
          <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white mb-6">
            {/* Row 1: 用印文件 */}
            <div className="grid grid-cols-12 border-b border-neutral-200">
              <div className="col-span-2 bg-neutral-50 flex items-center justify-center border-r border-neutral-200 p-4">
                <span className="text-sm font-medium text-neutral-700">用印文件</span>
              </div>
              <div className="col-span-10 divide-y divide-neutral-100">
                {['申报文件', '授权文件', '证据清单及材料'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-colors">
                    <span className="text-sm text-neutral-600">{item}</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-dark bg-brand-light border border-brand-100 rounded hover:bg-brand-100 transition-colors">
                      <Upload size={14} /> 上传附件
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Row 2: 其他附件 */}
            <div className="grid grid-cols-12">
              <div className="col-span-2 bg-neutral-50 flex items-center justify-center border-r border-neutral-200 p-4">
                <span className="text-sm font-medium text-neutral-700">其他附件</span>
              </div>
              <div className="col-span-10 divide-y divide-neutral-100">
                {['破产债权公告', '债权申报指引', '其他附件'].map((item) => (
                  <div key={item} className="flex items-center justify-between p-4 hover:bg-neutral-50/50 transition-colors">
                    <span className="text-sm text-neutral-600">{item}</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-dark bg-brand-light border border-brand-100 rounded hover:bg-brand-100 transition-colors">
                      <Upload size={14} /> 上传附件
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">备注</label>
            <textarea 
              rows={3} 
              className="w-full px-3 py-3 text-sm bg-transparent border border-neutral-200 rounded-md focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none transition-shadow text-neutral-900 placeholder:text-neutral-400" 
              placeholder="选填" 
            />
          </div>
        </section>
      </div>
    </div>
  );
}