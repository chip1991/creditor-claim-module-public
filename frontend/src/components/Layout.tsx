import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Bell, Grid, Menu, User, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFloating, offset, flip, shift, autoUpdate, useClick, useDismiss, useInteractions, FloatingPortal } from '@floating-ui/react';
import AppCenter from './AppCenter';
import api from '../lib/axios';

type NotificationItem = {
  id: string | number;
  type: 'alert' | 'system';
  title: string;
  desc: string;
  time: string;
  read: boolean;
};

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [appCenterOpen, setAppCenterOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setAppCenterOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setAppCenterOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notification/list');
        const list = Array.isArray(res.data) ? res.data : (res.data?.records || res.data?.list || []);
        const mapped = (Array.isArray(list) ? list : []).map((n: any) => ({
          id: n.id ?? `${n.title ?? 'msg'}-${Math.random()}`,
          type: n.type === 'alert' ? 'alert' : 'system',
          title: n.title ?? '系统消息',
          desc: n.desc ?? n.content ?? '',
          time: n.time ?? n.createTime ?? '',
          read: Boolean(n.read),
        })) as NotificationItem[];
        setNotifications(mapped);
      } catch {
        setNotifications([]);
      }
    };

    if (localStorage.getItem('satoken')) {
      fetchNotifications();
    }
  }, []);

  const { refs: profileRefs, floatingStyles: profileFloatingStyles, context: profileContext } = useFloating({
    open: profileOpen,
    onOpenChange: setProfileOpen,
    placement: 'right-end',
    whileElementsMounted: autoUpdate,
    middleware: [offset(16), flip(), shift()],
  });

  const { refs: notifRefs, floatingStyles: notifFloatingStyles, context: notifContext } = useFloating({
    open: notificationOpen,
    onOpenChange: setNotificationOpen,
    placement: 'right-end',
    whileElementsMounted: autoUpdate,
    middleware: [offset(16), flip(), shift()],
  });

  const profileClick = useClick(profileContext);
  const profileDismiss = useDismiss(profileContext);
  const { getReferenceProps: getProfileRefProps, getFloatingProps: getProfileFloatProps } = useInteractions([profileClick, profileDismiss]);

  const notifClick = useClick(notifContext);
  const notifDismiss = useDismiss(notifContext);
  const { getReferenceProps: getNotifRefProps, getFloatingProps: getNotifFloatProps } = useInteractions([notifClick, notifDismiss]);

  const getPageTitle = (path: string) => {
    if (path.startsWith('/data/center')) return '数据管理中心';
    if (path.startsWith('/data/detail')) return '数据详情';
    if (path.startsWith('/analysis/list')) return '投诉AI分析';
    if (path.startsWith('/analysis/detail')) return '投诉分析详情';
    if (path.startsWith('/workorder/list')) return '整改闭环智能管控';
    if (path.startsWith('/workorder/detail')) return '工单详情';
    if (path.startsWith('/dashboard')) return '数据可视化看板';
    if (path.startsWith('/assistant/qa')) return 'AI智能问答';
    if (path.startsWith('/assistant/report/detail')) return '报告详情';
    if (path.startsWith('/assistant/report')) return '自动化报告管理';
    if (path.startsWith('/system/category')) return '投诉分类配置';
    if (path.startsWith('/system/knowledge')) return '根因知识库配置';
    if (path.startsWith('/system/permission')) return '部门与权限配置';
    if (path.startsWith('/system/rules')) return '智能体规则配置';
    if (path.startsWith('/account/settings')) return '账号设置';
    return '首页';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-neutral-50 text-neutral-900 font-sans">
      {/* Sidebar with Framer Motion for smooth collapse */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full flex-shrink-0 flex flex-col bg-neutral-50/50"
            style={{ overflow: 'hidden' }}
          >
            <div className="h-16 flex items-center px-4 shrink-0">
              <div className="w-7 h-7 bg-neutral-900 rounded-md flex items-center justify-center text-white mr-2.5 shrink-0">
                <span className="font-bold text-sm">AI</span>
              </div>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="font-semibold text-neutral-900 text-[14px] whitespace-nowrap"
              >
                投诉闭环智能体
              </motion.span>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <Sidebar />
            </div>

            {/* Bottom Actions Area */}
            <div className="shrink-0 px-4 py-5 mt-auto flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-neutral-200/50 pb-4">
                <button 
                  onClick={() => setAppCenterOpen(true)}
                  className="flex items-center gap-3 w-full p-2 -mx-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/80 transition-colors focus:outline-none group relative"
                >
                  <Grid size={16} className="shrink-0 group-hover:text-neutral-900 transition-colors" />
                  <span className="text-[13px] font-medium leading-none mt-0.5 flex-1 text-left">应用中心</span>
                  <div className="flex items-center gap-0.5 text-[9px] text-neutral-400 font-mono absolute right-2">
                    <span className="bg-neutral-200/50 px-1 rounded border border-neutral-200">⌘</span>
                    <span className="bg-neutral-200/50 px-1 rounded border border-neutral-200">K</span>
                  </div>
                </button>
                <div className="relative">
                  <button 
                    ref={notifRefs.setReference}
                    {...getNotifRefProps()}
                    className="flex items-center gap-3 w-full p-2 -mx-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100/80 transition-colors focus:outline-none group"
                  >
                    <Bell size={16} className="group-hover:text-neutral-900 transition-colors shrink-0" />
                    <span className="text-[13px] font-medium leading-none mt-0.5">消息通知</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto w-5 h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full mr-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <FloatingPortal>
                    <AnimatePresence>
                      {notificationOpen && (
                        <>
                          <div className="fixed inset-0 z-[90]" onClick={() => setNotificationOpen(false)}></div>
                          <div
                            ref={notifRefs.setFloating}
                            style={{ ...notifFloatingStyles, zIndex: 100 }}
                            {...getNotifFloatProps()}
                          >
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, x: -10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: -10 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="w-[320px] bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 overflow-hidden flex flex-col max-h-[400px]"
                            >
                              <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                                <span className="text-[13px] font-semibold text-neutral-900">消息通知</span>
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.post('/notification/read-all');
                                    } catch {
                                    }
                                    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                                  }}
                                  className="text-[11px] text-neutral-500 hover:text-neutral-900 transition-colors"
                                >
                                  全部已读
                                </button>
                              </div>
                              <div className="flex-1 overflow-y-auto">
                                {notifications.map((msg) => (
                                  <div 
                                    key={msg.id} 
                                    className={`px-4 py-3 border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors cursor-pointer group ${!msg.read ? 'bg-red-50/10' : ''}`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`mt-0.5 shrink-0 ${msg.type === 'alert' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {msg.type === 'alert' ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                          <h3 className={`text-[13px] font-medium truncate ${!msg.read ? 'text-neutral-900' : 'text-neutral-700'}`}>
                                            {msg.title}
                                          </h3>
                                          <span className="text-[10px] text-neutral-400 whitespace-nowrap ml-2">
                                            {msg.time}
                                          </span>
                                        </div>
                                        <p className="text-[12px] text-neutral-500 leading-snug line-clamp-2">
                                          {msg.desc}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {notifications.length === 0 && (
                                  <div className="px-4 py-12 text-center text-sm text-neutral-500">
                                    暂无消息
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        </>
                      )}
                    </AnimatePresence>
                  </FloatingPortal>
                </div>
              </div>

              <div className="relative">
                <button 
                  ref={profileRefs.setReference}
                  {...getProfileRefProps()}
                  className="flex items-center gap-3 w-full p-2 -mx-2 rounded-lg hover:bg-neutral-100/80 transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-neutral-200/50 flex items-center justify-center overflow-hidden shrink-0">
                    <User size={15} className="text-neutral-600" />
                  </div>
                  <div className="flex flex-col items-start truncate">
                    <span className="text-sm font-medium text-neutral-900 leading-none mb-1">
                      {localStorage.getItem('username') || '当前账号'}
                    </span>
                    <span className="text-[11px] text-neutral-500 leading-none">已登录</span>
                  </div>
                </button>

                <FloatingPortal>
                  <AnimatePresence>
                    {profileOpen && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setProfileOpen(false)}></div>
                        <div
                          ref={profileRefs.setFloating}
                          style={{
                            ...profileFloatingStyles,
                            zIndex: 100,
                          }}
                          {...getProfileFloatProps()}
                        >
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, x: -10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: -10 }}
                              transition={{ duration: 0.15, ease: "easeOut" }}
                              className="w-56 bg-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-neutral-100 py-1.5"
                            >
                              <button 
                                onClick={async () => {
                                  try {
                                    await api.post('/logout');
                                  } catch {
                                  }
                                  localStorage.removeItem('satoken');
                                  localStorage.removeItem('username');
                                  setProfileOpen(false);
                                  navigate('/login');
                                }}
                                className="w-full text-left px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2.5"
                              >
                                <LogOut size={14} /> 退出登录
                              </button>
                            </motion.div>
                        </div>
                      </>
                    )}
                  </AnimatePresence>
                </FloatingPortal>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white shadow-[-8px_0_24px_-12px_rgba(0,0,0,0.05)] rounded-2xl border border-neutral-100 mt-2 mb-2 mr-2 ml-1 relative z-10">
        {/* Header */}
        <header className="h-16 shrink-0 bg-transparent flex items-center px-8 border-b border-neutral-100">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-neutral-400 hover:text-neutral-900 transition-colors mr-5"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center text-sm font-medium">
              <span className="text-neutral-400">首页</span>
              <span className="mx-2.5 text-neutral-300">/</span>
              <span className="text-neutral-900">{getPageTitle(location.pathname)}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-white">
          <Outlet />
        </main>
      </div>

      {/* Global Modals */}
      <AppCenter isOpen={appCenterOpen} onClose={() => setAppCenterOpen(false)} />
    </div>
  );
};

export default Layout;
