import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

export default function PermissionCenter() {
  const location = useLocation();
  const showTabs = !location.pathname.includes('/roles/');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">权限中心</h1>
        <p className="text-sm text-neutral-500 mt-1">组织、角色与用户权限管理</p>
      </div>

      {showTabs && (
        <div className="border-b border-neutral-200">
          <div className="flex gap-6">
            <NavLink
              to="/system/permission-center/orgs"
              className={({ isActive }) =>
                clsx(
                  'pb-3 text-sm font-medium transition-colors border-b-2',
                  isActive
                    ? 'text-neutral-900 border-neutral-900'
                    : 'text-neutral-500 border-transparent hover:text-neutral-900'
                )
              }
            >
              组织管理
            </NavLink>
            <NavLink
              to="/system/permission-center/roles"
              className={({ isActive }) =>
                clsx(
                  'pb-3 text-sm font-medium transition-colors border-b-2',
                  isActive
                    ? 'text-neutral-900 border-neutral-900'
                    : 'text-neutral-500 border-transparent hover:text-neutral-900'
                )
              }
            >
              角色管理
            </NavLink>
            <NavLink
              to="/system/permission-center/users"
              className={({ isActive }) =>
                clsx(
                  'pb-3 text-sm font-medium transition-colors border-b-2',
                  isActive
                    ? 'text-neutral-900 border-neutral-900'
                    : 'text-neutral-500 border-transparent hover:text-neutral-900'
                )
              }
            >
              用户管理
            </NavLink>
          </div>
        </div>
      )}

      <Outlet />
    </div>
  );
}

