# Tasks

- [x] Task 1: 梳理现有前端权限中心页面与路由入口
  - [x] 盘点 OrgManagement/RoleManagement/UserManagement 当前交互、数据结构与接口调用点
  - [x] 明确新“权限中心”信息架构与页面跳转方式（列表页/抽屉/详情页/页签）

## Task 1 输出（现状盘点与规划结论）

### 现有路由与入口现状
- OrgManagement/RoleManagement/UserManagement 页面已存在，但未被路由与菜单引用，用户无法从界面进入：
  - [OrgManagement.tsx](file:///workspace/frontend/src/pages/settings/OrgManagement.tsx)
  - [RoleManagement.tsx](file:///workspace/frontend/src/pages/settings/RoleManagement.tsx)
  - [UserManagement.tsx](file:///workspace/frontend/src/pages/settings/UserManagement.tsx)
- 现有“部门与权限配置”是一个配置文本编辑页，与权限中心三页闭环不匹配：
  - [PermissionConfig.tsx](file:///workspace/frontend/src/pages/system/PermissionConfig.tsx)

### OrgManagement 现状（接口/字段/交互）
- 接口调用点
  - GET `/api/v1/orgs`
  - POST `/api/v1/orgs/sync`
- 前端字段（列表渲染）
  - `id`、`name`、`code`、`parent`、`level`、`syncTime`
- 交互缺口
  - 搜索框/重置/搜索按钮仅有 UI，无状态与请求参数传递
  - 分页为静态占位（上一页/下一页无逻辑）
  - 缺少组织树能力与树/表联动（后续数据范围配置依赖）

### RoleManagement 现状（接口/字段/交互）
- 接口调用点
  - GET `/api/v1/roles`
  - POST `/api/v1/roles/sync`
- 前端字段（列表渲染）
  - `id`、`name`、`code`、`desc`、`users`、`syncTime`
- 交互缺口
  - 搜索/分页仅 UI 占位
  - “菜单权限配置”按钮无跳转与配置闭环
  - 缺少角色详情页（承载菜单权限/接口权限/数据范围三件套）

### UserManagement 现状（接口/字段/交互）
- 接口调用点
  - GET `/api/v1/users`
  - POST `/api/v1/users/sync`
  - PUT `/api/v1/users/{id}/status`，请求体 `{ status: '启用' | '禁用' }`
- 前端字段（列表渲染）
  - `id`、`name`、`empId`、`phone`、`org`、`status`、`syncTime`
- 交互缺口
  - 搜索/分页仅 UI 占位，组织筛选下拉为硬编码选项
  - “查看”按钮未实现详情承载（用户分配角色应在此入口）
  - 缺少“用户分配角色”接口与角色列表联动

### 新“权限中心”信息架构与跳转方式（结论）
- 导航与入口
  - 菜单：系统管理 → 权限中心
  - 权限中心页内采用页签切换：组织管理 / 角色管理 / 用户管理
  - 路由统一收敛到 `/system/permission-center/*`
- 页面跳转方式（按模块）
  - 组织管理：列表页（后续扩展为“组织树/列表”同页联动）
  - 角色管理：列表页 → 详情页；详情页内使用页签承载“三件套”（菜单权限/接口权限/数据范围）
  - 用户管理：列表页 + 抽屉；抽屉承载用户详情与“分配角色”（后续接入接口后启用保存）

### 已在实现中固化的路由与交互
- 新增权限中心路由骨架与页签入口：
  - [App.tsx](file:///workspace/frontend/src/App.tsx)
  - [PermissionCenter.tsx](file:///workspace/frontend/src/pages/system/PermissionCenter.tsx)
  - [Sidebar.tsx](file:///workspace/frontend/src/components/Sidebar.tsx)
- 角色列表跳转到角色详情页（详情页已预留页签结构）：
  - [RoleManagement.tsx](file:///workspace/frontend/src/pages/settings/RoleManagement.tsx)
  - [RoleDetail.tsx](file:///workspace/frontend/src/pages/settings/RoleDetail.tsx)
- 用户列表“查看”改为抽屉打开（详情承载位已落地）：
  - [UserManagement.tsx](file:///workspace/frontend/src/pages/settings/UserManagement.tsx)

- [x] Task 2: 设计并固化后端接口契约（/api/iam 与 /api/rbac）
  - [x] 定义组织树/组织列表分页查询参数与响应结构
  - [x] 定义角色列表分页、角色详情、角色三件套保存接口（menus/permissions/data-scope）
  - [x] 定义用户列表分页、启停、用户分配角色接口
  - [x] 定义权限字典（permission codes）与菜单资源树（menu tree）查询接口
  - [x] 明确权限合并与数据范围合并策略

- [x] Task 3: 后端实现 IAM 主数据接口（如需要）
  - [x] 组织同步与组织树/列表接口
  - [x] 角色同步与角色列表接口
  - [x] 用户同步与用户列表接口、用户启停接口
  - [x] 关键操作写审计（sync、status change）

- [x] Task 4: 后端实现 RBAC 配置接口
  - [x] 角色：读取/保存菜单权限、接口权限码、数据范围
  - [x] 用户：读取/保存用户角色分配
  - [x] 权限字典/菜单资源树查询
  - [x] 审计覆盖：角色权限变更、用户角色变更

- [x] Task 5: 前端 OrgManagement 改造为“组织树/列表 + 同步 + 搜索/分页”
  - [x] 接入 /api 接口并落地搜索/分页
  - [x] 同步动作展示进度/结果（可选接入任务中心）

- [x] Task 6: 前端 RoleManagement 改造为“角色列表 + 角色详情配置（页签）”
  - [x] 角色列表接入 /api 并落地搜索/分页
  - [x] 角色详情：菜单权限树、接口权限码列表、数据范围配置（含 CUSTOM 部门选择）
  - [x] 保存后提示成功并刷新，权限变更写审计（后端保证）

- [x] Task 7: 前端 UserManagement 改造为“用户列表 + 分配角色 + 启停”
  - [x] 用户列表接入 /api 并落地搜索/分页
  - [x] 用户详情抽屉：多选分配角色并保存
  - [x] 启停接口迁移到 /api

- [x] Task 8: 兼容与迁移策略落地
  - [x] 前端移除对 /v1 的主依赖（如需保留 fallback，需明确规则）
  - [x] 后端保留 /v1 只读兼容或迁移提示（可选）

- [x] Task 9: 验收与回归
  - [x] 覆盖三页核心流程手工验收脚本（同步、搜索、配置、分配、启停）
  - [x] 补充前后端契约校验与最小自动化测试（后端接口测试/权限校验测试）

## Task 9 手工验收脚本

### 组织管理页（组织树/列表）
1. 使用具备权限的账号登录，进入：系统管理 → 权限中心 → 组织管理
2. 点击“同步”，等待提示成功；刷新页面后确认列表/组织树仍可正常加载
3. 在搜索框输入“工程”（或任意存在的部门关键字），点击搜索
4. 预期：列表仅展示命中关键字的部门；清空关键字并点击搜索后恢复全量
5. 切换分页（如第 2 页），预期：列表数据发生变化且总数展示正确
6. 在组织树中切换节点（如有树/列表联动），预期：列表按选中节点过滤

### 角色管理页（列表 + 角色详情三件套）
1. 进入：系统管理 → 权限中心 → 角色管理
2. 点击“同步”，等待提示成功；刷新页面后角色列表仍可正常加载
3. 使用搜索框按角色名称/标识搜索，预期：列表按关键字过滤并可分页
4. 点击任意角色“配置/详情”进入角色详情页
5. 页签“菜单权限”：勾选/取消勾选若干菜单节点，点击保存
6. 预期：提示保存成功；刷新后勾选状态与保存结果一致
7. 页签“接口权限”：勾选/取消勾选若干权限码，点击保存
8. 预期：提示保存成功；刷新后权限码列表与保存结果一致
9. 页签“数据范围”：选择 ALL/DEPT/DEPT_AND_CHILD/SELF/CUSTOM 中任意项并保存
10. 若选择 CUSTOM：选择若干部门后保存；预期：刷新后部门选择与保存结果一致

### 用户管理页（列表 + 抽屉分配角色 + 启停）
1. 进入：系统管理 → 权限中心 → 用户管理
2. 点击“同步”，等待提示成功；刷新页面后用户列表仍可正常加载
3. 使用搜索框按用户名/部门名关键字搜索，预期：列表按关键字过滤并可分页
4. 点击任意用户“查看”打开详情抽屉
5. 在“分配角色”区域选择/取消选择多个角色，点击保存
6. 预期：提示保存成功；关闭并重新打开抽屉后角色选择保持一致
7. 在列表中对任意用户执行“启用/禁用”（或开关）操作
8. 预期：提示成功；列表状态列立即更新，刷新后状态保持一致

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 2, Task 3
- Task 6 depends on Task 2, Task 4
- Task 7 depends on Task 2, Task 3, Task 4
- Task 8 depends on Task 5, Task 6, Task 7
- Task 9 depends on Task 5, Task 6, Task 7, Task 8
