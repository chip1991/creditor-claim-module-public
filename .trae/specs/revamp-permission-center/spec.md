# 部门与权限配置改造 Spec

## Why
当前“组织/角色/用户”三页以同步与列表展示为主，搜索/分页未落地，且缺少“角色权限配置”“用户分配角色”“数据范围控制”等闭环能力，无法支撑完整的 RBAC 管理与审计。

## What Changes
- 新增“权限中心”信息架构：组织管理、角色管理（菜单权限/接口权限/数据范围）、用户管理（分配角色/启停）。
- 后端接口统一迁移到 `/api` 前缀，并按域拆分为 `/api/iam/*`（同步与主数据）与 `/api/rbac/*`（权限配置），前端同步调整调用路径。**BREAKING**：前端不再依赖 `/v1/*` 作为主路径。
- 补齐搜索/筛选/分页的真实交互与接口参数对齐，移除静态分页占位。
- 引入“角色三件套”配置模型：菜单权限 + 接口权限码 + 数据范围（SELF/DEPT/DEPT_AND_CHILD/CUSTOM/ALL）。
- 所有配置变更与敏感操作写入审计日志（audit_log），满足可追溯要求。

## Impact
- Affected specs: RBAC 权限管理、组织树同步、用户同步与启停、角色授权（菜单/接口/数据范围）、审计与可追溯、前后端接口契约迁移。
- Affected code:
  - 前端：OrgManagement、RoleManagement、UserManagement 与系统设置路由/菜单入口
  - 后端：新增 IAM/RBAC 相关 API（或在现有 RBAC 基础上扩展），兼容前端调用方式

## ADDED Requirements

### Requirement: 权限中心信息架构
系统 SHALL 在“系统管理/权限中心”中提供组织管理、角色管理、用户管理三类入口，并形成可操作闭环。

#### Scenario: 管理员完成权限配置闭环
- **WHEN** 管理员进入角色管理并配置菜单权限、接口权限与数据范围
- **THEN** 配置被保存并立即生效，且产生审计记录

### Requirement: 组织管理（Org/Department）
系统 SHALL 支持组织数据的查询与同步，并提供树形结构能力用于数据范围配置与筛选。

#### Scenario: 同步组织树
- **WHEN** 管理员触发组织同步
- **THEN** 系统更新组织树并返回同步结果（成功/失败/更新时间），写入审计

### Requirement: 角色管理（Role）
系统 SHALL 支持角色列表查询、同步 IAM 岗位（可选）、以及角色三件套配置：
1) 菜单权限（menu resources）
2) 接口权限码（permission codes）
3) 数据范围（data scope）

#### Scenario: 配置角色数据范围
- **WHEN** 管理员将角色数据范围设置为 CUSTOM 并选择部门集合
- **THEN** 保存成功，后续该角色用户仅能访问所选部门范围数据

### Requirement: 用户管理（User）
系统 SHALL 支持用户列表查询、同步 IAM 用户（可选）、启用/禁用，并支持为用户分配角色（多选）。

#### Scenario: 分配角色
- **WHEN** 管理员为用户勾选多个角色并保存
- **THEN** 用户权限集合与数据范围按角色合并策略生效，且写入审计

### Requirement: 接口契约迁移到 /api
系统 SHALL 将权限中心相关接口统一至 `/api` 前缀，并提供 IAM 主数据与 RBAC 配置两类接口。

#### Scenario: 前端切换到 /api
- **WHEN** 前端调用组织/角色/用户列表接口
- **THEN** 使用 `/api/...` 成功返回数据，且响应结构稳定（列表含 records/total）

### Requirement: /api/iam 与 /api/rbac 接口契约
系统 SHALL 固化以下接口契约，允许在早期阶段返回空数据，但必须保持字段结构稳定。

#### IAM 主数据（/api/iam）
- `GET /api/iam/org/tree`：组织树
  - Query：`includeInactive?: boolean`
  - Response：`{ tree: OrgTreeNode[] }`
- `GET /api/iam/org/page`：组织分页列表
  - Query：`page, size, keyword?, parentId?, isActive?`
  - Response：`{ total: number, records: OrgListItem[] }`
- `GET /api/iam/roles/page`：角色分页列表（主数据）
  - Query：`page, size, keyword?, isActive?`
  - Response：`{ total: number, records: RoleListItem[] }`
- `GET /api/iam/users/page`：用户分页列表
  - Query：`page, size, keyword?, deptId?, isActive?`
  - Response：`{ total: number, records: UserListItem[] }`
- `PUT /api/iam/users/{userId}/status`：用户启停
  - Body：`{ isActive: boolean }`
  - Response：`{ id: number, isActive: boolean }`

#### RBAC 配置（/api/rbac）
- `GET /api/rbac/roles/page`：角色分页列表（配置入口）
  - Query：`page, size, keyword?, isActive?`
  - Response：`{ total: number, records: RoleListItem[] }`
- `GET /api/rbac/roles/{roleId}`：角色详情（菜单/权限码/数据范围）
  - Response：`{ role: RoleDetail, menuIds: string[], permissionCodes: string[], dataScope: { scope: DataScope, deptIds: number[] } }`
- `POST /api/rbac/roles/{roleId}/menus`：保存角色菜单权限
  - Body：`{ menuIds: string[] }`
  - Response：`{ roleId: number, menuIds: string[] }`
- `POST /api/rbac/roles/{roleId}/permissions`：保存角色接口权限码
  - Body：`{ permissionCodes: string[] }`
  - Response：`{ roleId: number, permissionCodes: string[] }`
- `POST /api/rbac/roles/{roleId}/data-scope`：保存角色数据范围
  - Body：`{ scope: DataScope, deptIds: number[] }`
  - Response：`{ roleId: number, dataScope: { scope: DataScope, deptIds: number[] } }`
- `GET /api/rbac/permissions/dict`：权限字典（permission codes）
  - Query：`includeInactive?: boolean`
  - Response：`{ permissions: { code: string, name: string, isActive: boolean }[] }`
- `GET /api/rbac/menus/tree`：菜单资源树
  - Response：`{ tree: MenuNode[] }`
- `GET /api/rbac/users/{userId}/roles`：读取用户角色
  - Response：`{ userId: number, roleIds: number[] }`
- `POST /api/rbac/users/{userId}/roles`：保存用户分配角色
  - Body：`{ roleIds: number[] }`
  - Response：`{ userId: number, roleIds: number[] }`

#### 权限与数据范围合并策略
- 权限码：用户拥有多个角色时，权限码取并集（Union）。
- 菜单资源：用户拥有多个角色时，菜单资源取并集（Union）。
- 数据范围：采用“最宽范围优先”策略：`ALL > CUSTOM > DEPT_AND_CHILD > DEPT > SELF`；当最终为 `CUSTOM` 时，可见部门集合取所有 `CUSTOM` 角色配置部门的并集。

### Requirement: 权限配置粒度（角色三件套）
系统 SHALL 以角色为权限配置的唯一入口（菜单/接口/数据范围均挂在角色上）；用户仅支持分配角色，不支持用户级覆盖权限与数据范围。

#### Scenario: 权限合并
- **WHEN** 用户拥有多个角色
- **THEN** 权限码与菜单资源采用并集策略；数据范围采用“最宽范围优先”策略（ALL > CUSTOM > DEPT_AND_CHILD > DEPT > SELF）

### Requirement: 搜索/筛选/分页落地
系统 SHALL 为组织/角色/用户列表提供可用的搜索与分页能力，并由前端将筛选条件传递给后端。

#### Scenario: 关键字搜索
- **WHEN** 用户输入关键词并点击搜索
- **THEN** 仅返回匹配名称/编码/工号/手机号的记录，并返回 total 与分页结果

### Requirement: 审计覆盖
系统 SHALL 对组织同步、角色权限配置、用户角色分配、用户启停等关键操作写入审计日志，包含 before/after、操作者、原因（若需要）、来源。

## MODIFIED Requirements

### Requirement: 兼容旧 /v1 接口（过渡期）
**Reason**：降低一次性切换风险。
系统 SHOULD 在过渡期保留 `/v1/orgs`、`/v1/roles`、`/v1/users` 的只读兼容（或返回迁移提示），并在文档中明确废弃策略。

## REMOVED Requirements
无
