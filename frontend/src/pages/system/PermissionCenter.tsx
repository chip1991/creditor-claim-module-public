import { Outlet } from 'react-router-dom';

export default function PermissionCenter() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">权限中心</h1>
        <p className="text-sm text-neutral-500 mt-1">组织、角色与用户权限管理</p>
      </div>

      <Outlet />
    </div>
  );
}
