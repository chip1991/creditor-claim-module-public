import { NavLink, useLocation } from 'react-router-dom';
import { Database, BellDot, Building2, Gavel, FileCheck, Search, Users, Shield, Settings, Key, MessageSquare, BrainCircuit, Bot, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

const Sidebar = () => {
  const location = useLocation();
  const isSettings = location.pathname.startsWith('/settings') || location.pathname.startsWith('/system');
  const isEnterprise = location.pathname.startsWith('/enterprise');

  const ledgerMenuGroups = [
    {
      groupLabel: '核心台账',
      items: [
        { name: '业务仪表盘', path: '/ledger/dashboard', icon: <BarChart3 size={16} /> },
        { name: '债权申报台账', path: '/ledger/list', icon: <FileCheck size={16} /> },
      ],
    },
    {
      groupLabel: '监控预警',
      items: [
        { name: '破产监控', path: '/monitoring/alert', icon: <BellDot size={16} /> },
        { name: '债务人管理', path: '/monitoring/pool', icon: <Database size={16} /> },
      ],
    },
    {
      groupLabel: '数据采集',
      items: [
        { name: '公开案件', path: '/public-data/case', icon: <Building2 size={16} /> },
        { name: '公开公告', path: '/public-data/notice', icon: <Gavel size={16} /> },
        { name: '采集任务', path: '/public-data/tasks', icon: <Database size={16} /> },
      ],
    },
  ];

  const settingsMenuGroups = [
    {
      groupLabel: '组织与权限',
      items: [
        { name: '用户管理', path: '/settings/user', icon: <Users size={16} /> },
        { name: '角色管理', path: '/settings/role', icon: <Shield size={16} /> },
        { name: '组织管理', path: '/settings/org', icon: <Building2 size={16} /> },
      ],
    },

    {
      groupLabel: '系统集成',
      items: [
        { name: 'OA流程配置', path: '/settings/oa', icon: <Settings size={16} /> },
        { name: 'IAM配置', path: '/settings/iam', icon: <Key size={16} /> },
        { name: '企微配置', path: '/settings/wecom', icon: <MessageSquare size={16} /> },
      ],
    },
    {
      groupLabel: 'AI智能中枢',
      items: [
        { name: '大模型配置', path: '/settings/llm', icon: <BrainCircuit size={16} /> },
        { name: '智能体配置', path: '/settings/agent', icon: <Bot size={16} /> },
      ],
    }
  ];

  const enterpriseMenuGroups = [
    {
      groupLabel: '企业查询',
      items: [
        { name: '企业查询', path: '/enterprise/search', icon: <Search size={16} /> },
        { name: '企业台账', path: '/enterprise/ledger', icon: <FileCheck size={16} /> },
      ],
    }
  ];

  const menuGroups = isSettings ? settingsMenuGroups : (isEnterprise ? enterpriseMenuGroups : ledgerMenuGroups);

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
