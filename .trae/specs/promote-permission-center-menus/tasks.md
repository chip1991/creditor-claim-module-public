# Tasks

- [ ] Task 1: 前端侧边栏新增三个一级菜单入口
  - [ ] 在“系统管理”分组下新增：组织管理/角色管理/用户管理
  - [ ] 移除或替换原“权限中心”单入口
  - [ ] 每个菜单分别跳转到 `/system/permission-center/orgs|roles|users`
  - [ ] 调整 Layout 标题/面包屑映射，确保三页面标题正确

- [ ] Task 2: 路由与页面容器调整
  - [ ] 保留 `/system/permission-center` 路由并重定向到 `/system/permission-center/orgs`
  - [ ] 权限中心容器页内不再承担 Tab 切换入口（如存在 Tab 则移除）
  - [ ] 确认 `roles/:roleId` 路由仍可从角色管理入口访问

- [ ] Task 3: 后端菜单资源拆分与迁移
  - [ ] 菜单资源：新增 3 个菜单节点（组织管理/角色管理/用户管理），并设置 parent/order/path
  - [ ] 旧“权限中心”菜单：标记为不可用或从菜单树隐藏（不影响历史审计）
  - [ ] 数据迁移：将原先拥有旧“权限中心”菜单的角色，补齐新三菜单的 role_menu 记录

- [ ] Task 4: 回归与验证
  - [ ] 后端 `alembic upgrade head` 通过
  - [ ] 后端 pytest 通过（新增/更新用例：菜单树包含三菜单、迁移后角色菜单权限不丢失）
  - [ ] 前端 `npm run build` 通过
  - [ ] 手工验收：三个一级菜单可达；角色详情页可进入/返回；旧 `/system/permission-center` 可重定向

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1, Task 2, Task 3

