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
                  UPDATED<br />2026.04.26
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
                欢迎使用盈绰服务云。本协议是您与平台之间关于使用本系统所订立的契约。请您在登录前仔细阅读并充分理解相关条款。
              </p>
            </div>

            {/* Terms of Service */}
            <section id="terms" className="scroll-mt-32 mb-24 group">
              <h2 className="text-2xl font-medium mb-10 pb-4 border-b border-neutral-200 text-neutral-900 flex items-baseline gap-3">
                服务条款
                <span className="text-[13px] font-mono text-neutral-400 font-normal tracking-wider uppercase">Terms of Service</span>
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
                    盈绰服务云为企业级用户提供破产监控与台账管理服务。系统内呈现的“公开案件”与“公开公告”数据，来源于合法的公共数据源（如全国企业破产重整案件信息网）的机器采集与自动化处理。平台尽最大努力保证数据的时效性，但不对原始数据的绝对准确性承担法律责任。相关数据仅供内部决策参考，不构成任何直接的法律建议。
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
                    您的账号通过企业级身份认证网关（IAM）进行管理。您需对账号下的所有活动负责，妥善保管凭据。您承诺不在系统内上传、存储或传播任何违反国家法律法规、侵犯他人知识产权的内容。严禁利用本平台数据从事未经授权的商业转售或恶意数据爬取。
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
                    盈绰服务云平台的所有软件代码、UI 设计、架构模型及相关算法的知识产权均归本平台所有。未经明确的书面授权，您不得对系统进行反向工程、反向编译或试图提取系统源代码。
                  </p>
                </motion.div>
              </div>
            </section>

            {/* Privacy Policy */}
            <section id="privacy" className="scroll-mt-32 group">
              <h2 className="text-2xl font-medium mb-10 pb-4 border-b border-neutral-200 text-neutral-900 flex items-baseline gap-3">
                隐私政策
                <span className="text-[13px] font-mono text-neutral-400 font-normal tracking-wider uppercase">Privacy Policy</span>
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
                    我们深刻理解企业主数据及债权申报台账的机密性。盈绰服务云采用租户隔离技术与自建库存储，您的内部数据将被加密存储。我们承诺不会在未获得您企业授权的情况下，查看、分析或向任何第三方（包括其他租户）共享您的内部业务数据。
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
                    您有权随时通过系统设置查看您的个人配置和安全记录。如需更正基础信息，请遵循企业的 IAM 统一管理流程进行修改。如果您对本协议内容或平台数据安全有任何疑问，请联系您的系统管理员或发送邮件至 <a href="mailto:legal@evertro.tech" className="text-neutral-900 underline underline-offset-4 decoration-neutral-200 hover:decoration-neutral-900 transition-colors">legal@evertro.tech</a>。
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