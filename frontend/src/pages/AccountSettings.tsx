import { User, Shield, Bell, Info, Lock, Smartphone, Monitor, AlertCircle, Check } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export default function AccountSettings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32 pt-2">
      {/* 1. 个人资料 (Profile) */}
            <section id="profile" className="bg-white border border-neutral-200 rounded-lg shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-100">
                <User size={18} className="text-neutral-400" />
                <h2 className="text-[18px] font-semibold text-neutral-900">个人资料</h2>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-1">基本信息</h3>
                  <p className="text-[12px] text-neutral-500 mb-6 flex items-center gap-1.5">
                    <Info size={14} className="text-brand" />
                    以下信息由企业 IAM 统一管理同步，如需修改请联系 HR 或 IT 部门。
                  </p>
                  
                  <div className="flex items-start gap-8 mb-8">
                    <div className="w-20 h-20 rounded-full bg-brand-100 text-brand flex items-center justify-center text-2xl font-bold shrink-0">
                      A
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">姓名 (Name)</label>
                        <div className="text-[14px] font-medium text-neutral-900 bg-neutral-50 px-3 py-2 rounded border border-neutral-100">Admin 用户</div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">工号 (Employee ID)</label>
                        <div className="text-[14px] font-medium text-neutral-900 bg-neutral-50 px-3 py-2 rounded border border-neutral-100">EMP-00001</div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">所属部门 (Department)</label>
                        <div className="text-[14px] font-medium text-neutral-900 bg-neutral-50 px-3 py-2 rounded border border-neutral-100">集团法务部</div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1.5">企业邮箱 (Email)</label>
                        <div className="text-[14px] font-medium text-neutral-900 bg-neutral-50 px-3 py-2 rounded border border-neutral-100">admin@evertro.tech</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-neutral-100">
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-6">外观与个性化 (Appearance)</h3>
                  <div>
                    <label className="block text-[12px] font-medium text-neutral-700 mb-3">系统主题色</label>
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => setTheme('purple')}
                        className={`w-12 h-12 rounded-full relative flex items-center justify-center transition-all duration-200 ${
                          theme === 'purple' ? 'ring-2 ring-offset-2 ring-[#7B52FE]' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: '#7B52FE' }}
                      >
                        {theme === 'purple' && <Check size={20} className="text-white" />}
                        <div className="absolute -bottom-6 whitespace-nowrap text-[11px] text-neutral-500 font-medium">默认主题</div>
                      </button>

                      <button
                        onClick={() => setTheme('orange')}
                        className={`w-12 h-12 rounded-full relative flex items-center justify-center transition-all duration-200 ${
                          theme === 'orange' ? 'ring-2 ring-offset-2 ring-[#FF6900]' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: '#FF6900' }}
                      >
                        {theme === 'orange' && <Check size={20} className="text-white" />}
                        <div className="absolute -bottom-6 whitespace-nowrap text-[11px] text-neutral-500 font-medium">橙色主题</div>
                      </button>

                      <button
                        onClick={() => setTheme('blue')}
                        className={`w-12 h-12 rounded-full relative flex items-center justify-center transition-all duration-200 ${
                          theme === 'blue' ? 'ring-2 ring-offset-2 ring-[#0066FF]' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: '#0066FF' }}
                      >
                        {theme === 'blue' && <Check size={20} className="text-white" />}
                        <div className="absolute -bottom-6 whitespace-nowrap text-[11px] text-neutral-500 font-medium">蓝色主题</div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. 安全设置 (Security) */}
            <section id="security" className="bg-white border border-neutral-200 rounded-lg shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-100">
                <Shield size={18} className="text-neutral-400" />
                <h2 className="text-[18px] font-semibold text-neutral-900">安全设置</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-6">账户安全</h3>
                  <div className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock size={16} className="text-neutral-600" />
                      </div>
                      <div>
                        <div className="text-[14px] font-medium text-neutral-900">登录密码</div>
                        <div className="text-[12px] text-neutral-500 mt-1">
                          安全性高的密码可以使账号更安全。建议您定期更换密码。
                          <br/>
                          <span className="text-amber-600 flex items-center gap-1 mt-1">
                            <AlertCircle size={12} />
                            当前系统已接入 IAM 单点登录，修改密码将跳转至企业统一认证中心。
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-[13px] font-medium text-brand bg-brand-light rounded hover:bg-brand-100 transition-colors shrink-0">
                      前往 IAM 修改
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-neutral-100">
                  <h3 className="text-[15px] font-semibold text-neutral-900 mb-6">最近登录记录 (Login History)</h3>
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50 border-b border-neutral-200">
                          <th className="px-4 py-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">时间</th>
                          <th className="px-4 py-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">设备/浏览器</th>
                          <th className="px-4 py-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">IP 地址</th>
                          <th className="px-4 py-3 text-[11px] font-medium text-neutral-500 uppercase tracking-wider text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        <tr className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3 text-[12px] text-neutral-900">2026-04-25 10:23:45</td>
                          <td className="px-4 py-3 text-[12px] text-neutral-600 flex items-center gap-2">
                            <Monitor size={14} className="text-brand" />
                            Windows 11 · Chrome (当前设备)
                          </td>
                          <td className="px-4 py-3 text-[12px] font-mono text-neutral-500">10.1.200.88</td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-[12px] text-emerald-600 font-medium">在线</span>
                          </td>
                        </tr>
                        <tr className="hover:bg-neutral-50 transition-colors">
                          <td className="px-4 py-3 text-[12px] text-neutral-900">2026-04-24 18:15:22</td>
                          <td className="px-4 py-3 text-[12px] text-neutral-600 flex items-center gap-2">
                            <Smartphone size={14} className="text-neutral-400" />
                            iPhone 15 Pro · Safari
                          </td>
                          <td className="px-4 py-3 text-[12px] font-mono text-neutral-500">117.136.25.101</td>
                          <td className="px-4 py-3 text-right">
                            <button className="text-[12px] text-red-500 hover:text-red-700 font-medium transition-colors">
                              强制下线
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. 消息通知偏好 (Notifications) */}
            <section id="notifications" className="bg-white border border-neutral-200 rounded-lg shadow-sm p-8">
              <div className="flex items-center gap-2 mb-8 pb-4 border-b border-neutral-100">
                <Bell size={18} className="text-neutral-400" />
                <h2 className="text-[18px] font-semibold text-neutral-900">消息通知偏好</h2>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[12px] text-neutral-500 mb-6">
                    配置系统内各类业务事件的通知接收渠道。建议开启重要业务的企业微信通知，以免遗漏待办。
                  </p>
                  
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-neutral-50/50 border-b border-neutral-200">
                          <th className="px-5 py-3 text-[12px] font-semibold text-neutral-900">通知类型</th>
                          <th className="px-5 py-3 text-[12px] font-semibold text-neutral-900 text-center">系统站内信</th>
                          <th className="px-5 py-3 text-[12px] font-semibold text-neutral-900 text-center">企业微信 (推荐)</th>
                          <th className="px-5 py-3 text-[12px] font-semibold text-neutral-900 text-center">电子邮件</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        <tr className="hover:bg-neutral-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="text-[13px] font-medium text-neutral-900">待办审批提醒</div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">债权申报审核、案件立案等流程到达当前节点时</div>
                          </td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked disabled className="accent-brand cursor-not-allowed w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked className="accent-brand cursor-pointer w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" className="accent-brand cursor-pointer w-4 h-4" /></td>
                        </tr>
                        <tr className="hover:bg-neutral-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="text-[13px] font-medium text-neutral-900">风险监控预警</div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">监控池中的企业发生失信被执行、破产重整等高风险事件时</div>
                          </td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked disabled className="accent-brand cursor-not-allowed w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked className="accent-brand cursor-pointer w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked className="accent-brand cursor-pointer w-4 h-4" /></td>
                        </tr>
                        <tr className="hover:bg-neutral-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="text-[13px] font-medium text-neutral-900">系统升级公告</div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">系统版本更新、停机维护等全局广播信息</div>
                          </td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" defaultChecked disabled className="accent-brand cursor-not-allowed w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" className="accent-brand cursor-pointer w-4 h-4" /></td>
                          <td className="px-5 py-4 text-center"><input type="checkbox" className="accent-brand cursor-pointer w-4 h-4" /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button className="px-4 py-2 text-[13px] font-medium text-white bg-brand rounded hover:bg-brand-dark transition-colors shadow-sm">
                      保存通知偏好
                    </button>
                  </div>
                </div>
              </div>
            </section>

    </div>
  );
}