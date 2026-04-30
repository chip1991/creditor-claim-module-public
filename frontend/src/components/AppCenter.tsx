import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Search, Database, BrainCircuit, ClipboardList, BarChart3, MessageSquare, Settings, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AppCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const apps = [
  { id: 'data', name: '数据管理中心', icon: <Database size={24} className="text-neutral-700" />, path: '/data/center', color: 'bg-neutral-100' },
  { id: 'analysis', name: '投诉AI分析', icon: <BrainCircuit size={24} className="text-neutral-700" />, path: '/analysis/list', color: 'bg-neutral-100' },
  { id: 'workorder', name: '工单管理', icon: <ClipboardList size={24} className="text-neutral-700" />, path: '/workorder/list', color: 'bg-neutral-100' },
  { id: 'dashboard', name: '可视化看板', icon: <BarChart3 size={24} className="text-neutral-700" />, path: '/dashboard', color: 'bg-neutral-100' },
  { id: 'qa', name: 'AI智能问答', icon: <MessageSquare size={24} className="text-neutral-700" />, path: '/assistant/qa', color: 'bg-neutral-100' },
  { id: 'settings', name: '系统管理', icon: <Settings size={24} className="text-neutral-700" />, path: '/system/category', color: 'bg-neutral-100' },
];

export default function AppCenter({ isOpen, onClose }: AppCenterProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-900/20 backdrop-blur-sm"
          />

          {/* Modal / Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200/60"
          >
            {/* Header / Search */}
            <div className="flex items-center px-4 py-4 border-b border-neutral-100">
              <Search size={20} className="text-neutral-400 mr-3" />
              <input 
                type="text" 
                placeholder="搜索应用或功能...（快捷键：Ctrl/⌘ + K）" 
                className="flex-1 text-[15px] bg-transparent border-none focus:outline-none text-neutral-900 placeholder:text-neutral-400"
                autoFocus
              />
              <button 
                onClick={onClose}
                className="p-1 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* App Grid */}
            <div className="p-6">
              <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-4">
                常用应用
              </div>
              <div className="grid grid-cols-3 gap-4">
                {apps.map(app => (
                  <button
                    key={app.id}
                    onClick={() => {
                      navigate(app.path);
                      onClose();
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-xl hover:bg-neutral-50 transition-colors group focus:outline-none"
                  >
                    <div className={`w-14 h-14 rounded-xl ${app.color} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200`}>
                      {app.icon}
                    </div>
                    <span className="text-[13px] font-medium text-neutral-700 group-hover:text-neutral-900">
                      {app.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Footer hints */}
            <div className="bg-neutral-50 px-6 py-3 border-t border-neutral-100 flex items-center text-xs text-neutral-500">
              <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200 mr-2 shadow-sm text-[10px]">ESC</span> 
              关闭窗口
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
