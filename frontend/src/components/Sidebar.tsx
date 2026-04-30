import { NavLink } from 'react-router-dom';
import { Database, BrainCircuit, ClipboardList, BarChart3, MessageSquare, FileText, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const menuGroups = [
    {
      groupLabel: '数据中心',
      items: [
        { name: '数据管理中心', path: '/data/center', icon: <Database size={16} /> },
      ],
    },
    {
      groupLabel: 'AI分析',
      items: [
        { name: '投诉AI分析', path: '/analysis/list', icon: <BrainCircuit size={16} /> },
      ],
    },
    {
      groupLabel: '整改闭环',
      items: [
        { name: '工单管理', path: '/workorder/list', icon: <ClipboardList size={16} /> },
      ],
    },
    {
      groupLabel: '数据看板',
      items: [
        { name: '可视化看板', path: '/dashboard', icon: <BarChart3 size={16} /> },
      ],
    },
    {
      groupLabel: '智能助手',
      items: [
        { name: 'AI智能问答', path: '/assistant/qa', icon: <MessageSquare size={16} /> },
        { name: '自动化报告', path: '/assistant/report', icon: <FileText size={16} /> },
      ],
    },
    {
      groupLabel: '系统管理',
      items: [
        { name: '投诉分类配置', path: '/system/category', icon: <Settings size={16} /> },
        { name: '根因知识库配置', path: '/system/knowledge', icon: <Settings size={16} /> },
        { name: '大语言模型配置', path: '/system/ai/llms', icon: <Settings size={16} /> },
        { name: '系统智能体配置', path: '/system/ai/agents', icon: <Settings size={16} /> },
        { name: '权限中心', path: '/system/permission-center', icon: <Settings size={16} /> },
        { name: '智能体规则配置', path: '/system/rules', icon: <Settings size={16} /> },
      ],
    },
  ];

  return (
    <nav className="py-6 space-y-8">
      {menuGroups.map((group) => (
        <div key={group.groupLabel}>
          <div className="px-5 text-[10px] font-bold text-neutral-400 mb-3">
            {group.groupLabel}
          </div>
          <ul className="space-y-0.5 relative">
            {group.items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'relative flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition-colors duration-200 group',
                      isActive
                        ? 'text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-900'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Active Indicator Line with Shared Layout Transition */}
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active-indicator"
                          className="absolute left-0 top-0 bottom-0 w-[3px] bg-neutral-900 rounded-r-full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 400, 
                            damping: 40,
                            mass: 1
                          }}
                        />
                      )}
                      
                      <span className={clsx(
                        "transition-colors duration-200 flex items-center justify-center",
                        isActive ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-600"
                      )}>
                        {item.icon}
                      </span>
                      <span className="truncate whitespace-nowrap leading-none mt-0.5">{item.name}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default Sidebar;
