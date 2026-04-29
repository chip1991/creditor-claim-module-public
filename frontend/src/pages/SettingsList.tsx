import React from 'react';
import { useLocation } from 'react-router-dom';

const SettingsList: React.FC = () => {
  const location = useLocation();

  const tableData = [
    { id: 1, name: '系统配置', value: 'Enabled', updated: '2026-04-25' },
    { id: 2, name: '用户权限', value: 'Admin Only', updated: '2026-04-24' },
    { id: 3, name: '通知设置', value: 'Email, SMS', updated: '2026-04-23' },
    { id: 4, name: '安全策略', value: 'High', updated: '2026-04-22' },
    { id: 5, name: '数据备份', value: 'Daily', updated: '2026-04-21' },
  ];

  return (
    <div className="p-6 w-full h-full bg-gray-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          设置列表
          <span className="text-sm font-normal text-gray-500 bg-gray-200 px-2 py-1 rounded">
            当前路径: {location.pathname}
          </span>
        </h1>
        <button className="bg-brand-dark hover:bg-brand-dark text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
          新增设置
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">设置名称</th>
                <th className="px-6 py-4">当前值</th>
                <th className="px-6 py-4">最后更新</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tableData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.value}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.updated}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <button className="text-brand-dark hover:text-blue-900 mr-4">编辑</button>
                    <button className="text-red-600 hover:text-red-900">删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <span className="text-sm text-gray-500">共 {tableData.length} 条记录</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 bg-white" disabled>上一页</button>
            <button className="px-3 py-1 border border-brand-dark rounded-md text-sm bg-brand-light text-brand-dark">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 bg-white" disabled>下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsList;
