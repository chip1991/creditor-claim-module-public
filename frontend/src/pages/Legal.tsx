import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Scale } from 'lucide-react';

const Legal: React.FC = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.querySelector(hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-900 selection:bg-neutral-200">
      {/* Main Content Area */}
      <main className="pt-24 pb-24 px-6 md:px-12 relative z-10">
        <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row gap-16">
          
          {/* Sticky Sidebar Navigation */}
          <aside className="hidden md:block w-48 shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="sticky top-32 space-y-6"
            >
              <nav className="flex flex-col gap-3 text-[13px] font-medium">
                <a href="#terms" className="text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-2 group">
                  <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-neutral-900 transition-colors"></div>
                  <Scale size={14} />
                  服务条款
                </a>
                <a href="#privacy" className="text-neutral-400 hover:text-neutral-900 transition-colors flex items-center gap-2 group">
                  <div className="w-1 h-1 rounded-full bg-transparent group-hover:bg-neutral-900 transition-colors"></div>
                  <ShieldCheck size={14} />
                  隐私政策
                </a>
              </nav>
              <div className="pt-6 border-t border-neutral-100">
                <p className="text-[11px] text-neutral-400 leading-relaxed font-mono">
                  更新日期<br />2026.04.26
                </p>
              </div>
            </motion.div>
          </aside>

          {/* Document Content */}
          <motion.article 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 max-w-2xl"
          >
            <div className="mb-20">
              <h1 className="text-4xl md:text-5xl font-light tracking-tight mb-6 text-neutral-900">法律声明与隐私协议</h1>
              <p className="text-neutral-500 text-[16px] leading-relaxed max-w-lg">
                欢迎使用投诉闭环智能体。本协议是您与平台之间关于使用本系统所订立的契约。请您在登录前仔细阅读并充分理解相关条款。
              </p>
            </div>

            {/* Terms of Service */}
            <section id="terms" className="scroll-mt-32 mb-24 group">
              <h2 className="text-2xl font-medium mb-10 pb-4 border-b border-neutral-200 text-neutral-900 flex items-baseline gap-3">
                服务条款
              </h2>
              
              <div className="space-y-12 text-[15px] leading-relaxed text-neutral-600">
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">01</span>
                    服务范围与数据说明
                  </h3>
                  <p className="pl-7">
                    投诉闭环智能体用于物业业主投诉数据的导入、清洗、关联、AI分析与闭环治理流程管理。系统中展示的统计结果、分析结论与报告仅用于内部管理决策参考，平台尽最大努力保障数据处理的准确性与可追溯性，但不对外部业务结果作任何保证。
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">02</span>
                    账号安全与合规使用
                  </h3>
                  <p className="pl-7">
                    您需对账号下的所有活动负责，妥善保管凭据。您承诺不在系统内上传、存储或传播任何违反国家法律法规、侵犯他人合法权益的内容。严禁利用本平台数据从事未经授权的对外传播、商业转售或恶意爬取等行为。
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">03</span>
                    知识产权与系统所有权
                  </h3>
                  <p className="pl-7">
                    平台的软件代码、UI 设计、架构模型及相关算法的知识产权归平台或其权利人所有。未经明确书面授权，您不得对系统进行反向工程、反向编译或试图提取系统源代码。
                  </p>
                </motion.div>
              </div>
            </section>

            {/* Privacy Policy */}
            <section id="privacy" className="scroll-mt-32 group">
              <h2 className="text-2xl font-medium mb-10 pb-4 border-b border-neutral-200 text-neutral-900 flex items-baseline gap-3">
                隐私政策
              </h2>
              
              <div className="space-y-12 text-[15px] leading-relaxed text-neutral-600">
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">01</span>
                    信息收集与使用
                  </h3>
                  <p className="pl-7">
                    为了保障系统的安全运行与审计合规，在您使用本系统期间，我们会自动收集并记录您的登录日志（包括但不限于 IP 地址、设备信息、浏览器类型、操作时间等）。这些基础信息仅用于身份验证、异常登录风控预警及系统安全审计，绝不用于任何营销目的。
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">02</span>
                    企业数据隔离与保护
                  </h3>
                  <p className="pl-7">
                    我们深刻理解业主投诉数据、满意度回访数据及整改工单数据的敏感性。平台对数据进行访问控制与加密存储，并通过权限体系保障不同角色仅能查看其授权范围内的数据。未经授权，不会向任何第三方共享您的业务数据。
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                >
                  <h3 className="text-[15px] text-neutral-900 font-semibold mb-3 flex items-center gap-3">
                    <span className="text-neutral-300 font-mono text-[13px]">03</span>
                    用户权利与联系方式
                  </h3>
                  <p className="pl-7">
                    您有权通过系统设置查看您的个人配置和安全记录。如需更正基础信息或对本协议内容、数据安全有任何疑问，请联系系统管理员。
                  </p>
                </motion.div>
              </div>
            </section>

          </motion.article>
        </div>
      </main>
    </div>
  );
};

export default Legal;
