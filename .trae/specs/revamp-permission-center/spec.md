# 部门与权限配置改造 Spec

## Why
当前“组织/角色/用户”三页虽然已经具备基础查询与部分配置能力，但页面主流程仍偏向“同步后查看”，缺少独立的新增、编辑、删除闭环，无法满足后台日常维护场景。权限中心需要从“同步型管理台”升级为“可直接维护主数据的后台管理模块”。

## What Changes
- 新增“权限中心”信息架构：组织管理、角色管理（菜单权限/接口权限/数据范围）、用户管理（分配角色/启停）。
- 后端接口统一迁移到 `/api` 前缀，并按域拆分为 `/api/iam/*`（同步与主数据）与 `/api/rbac/*`（权限配置），前端同步调整调用路径。**BREAKING**：前端不再依赖 `/v1/*` 作为主路径。
- 补齐搜索/筛选/分页的真实交互与接口参数对齐，移除静态分页占位。
- 引入“角色三件套”配置模型：菜单权限 + 接口权限码 + 数据范围（SELF/DEPT/DEPT_AND_CHILD/CUSTOM/ALL）。
- 所有配置变更与敏感操作写入审计日志（audit_log），满足可追溯要求。
- 将组织管理、角色管理、用户管理从“同步驱动”改为“独立增删改驱动”，页面主操作改为新增、编辑、删除、启停/分配等业务动作。
- 移除三个页面中的主“同步”按钮与依赖同步结果的交互文案；如后端仍保留同步能力，仅作为内部维护接口，不再作为页面主流程。 **BREAKING**：页面操作入口与接口职责发生调整。
- 修复原始数据上传权限链路：补齐 `data:import`、`data:read` 等必要权限种子，并为 admin 角色执行幂等补授权，消除“登录后上传无反应/403”的权限断层。
- 统一开发态 `dev-bypass` 的用户映射策略，避免按“第一个启用用户”导致的权限漂移。
- 改善原始数据页面错误可见性：列表/上传失败时提供明确中文提示，避免用户误判为“按钮无反应”。

## Impact
- Affected specs: RBAC 权限管理、组织主数据维护、角色主数据维护、用户主数据维护、用户启停、角色授权（菜单/接口/数据范围）、原始数据导入权限治理、审计与可追溯、前后端接口契约迁移。
- Affected code:
  - 前端：OrgManagement、RoleManagement、UserManagement 与系统设置路由/菜单入口
  - 前端：RawBatches 上传与列表错误提示逻辑
  - 后端：IAM/RBAC 相关 API、组织/角色/用户数据模型与校验逻辑、审计记录、权限种子迁移、认证开发态逻辑

## ADDED Requirements

### Requirement: 权限中心信息架构
系统 SHALL 在“系统管理/权限中心”中提供组织管理、角色管理、用户管理三类入口，并形成可操作闭环。

#### Scenario: 管理员完成权限配置闭环
- **WHEN** 管理员进入角色管理并配置菜单权限、接口权限与数据范围
- **THEN** 配置被保存并立即生效，且产生审计记录

### Requirement: 组织管理（Org/Department）
系统 SHALL 支持组织数据的新增、编辑、删除、查询，并提供树形结构能力用于数据范围配置与筛选。

#### Scenario: 新增下级组织
- **WHEN** 管理员在某个组织下创建新的下级组织并保存
- **THEN** 新组织出现在组织树和列表中，父子关系正确，且写入审计

#### Scenario: 删除组织
- **WHEN** 管理员删除一个没有下级组织且没有关联用户的组织
- **THEN** 系统删除该组织并从树与列表中移除，且写入审计

#### Scenario: 删除受引用组织被拦截
- **WHEN** 管理员尝试删除仍有下级组织或仍有关联用户的组织
- **THEN** 系统拒绝删除并返回中文提示，说明需先清理关联关系

### Requirement: 角色管理（Role）
系统 SHALL 支持角色列表查询、角色新增、角色编辑、角色删除，以及角色三件套配置：
1) 菜单权限（menu resources）
2) 接口权限码（permission codes）
3) 数据范围（data scope）

#### Scenario: 新增角色
- **WHEN** 管理员创建角色并填写角色名称、角色编码、描述等信息
- **THEN** 角色出现在角色列表中，并可立即进入详情页配置菜单权限、接口权限和数据范围

#### Scenario: 删除角色
- **WHEN** 管理员删除一个未分配给任何用户的角色
- **THEN** 系统删除该角色并从列表中移除，且写入审计

#### Scenario: 删除已分配角色被拦截
- **WHEN** 管理员尝试删除仍分配给用户的角色
- **THEN** 系统拒绝删除并返回中文提示，说明需先解除用户关联

#### Scenario: 配置角色数据范围
- **WHEN** 管理员将角色数据范围设置为 CUSTOM 并选择部门集合
- **THEN** 保存成功，后续该角色用户仅能访问所选部门范围数据

### Requirement: 用户管理（User）
系统 SHALL 支持用户列表查询、用户新增、用户编辑、用户删除、启用/禁用，并支持为用户分配角色（多选）。

#### Scenario: 新增用户
- **WHEN** 管理员创建用户并填写姓名、工号、手机号、所属组织等必填信息
- **THEN** 新用户出现在列表中，并可继续分配角色

#### Scenario: 编辑用户
- **WHEN** 管理员修改用户的基础信息并保存
- **THEN** 列表与详情展示最新信息，且写入审计

#### Scenario: 删除用户
- **WHEN** 管理员删除用户
- **THEN** 系统删除该用户并从列表中移除，且写入审计

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
- `POST /api/iam/org`
  - Body：`{ name: string, parentId?: number | null, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `PUT /api/iam/org/{orgId}`
  - Body：`{ name?: string, parentId?: number | null, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `DELETE /api/iam/org/{orgId}`
  - Response：`{ id: number, deleted: true }`
- `GET /api/iam/roles/page`：角色分页列表（主数据）
  - Query：`page, size, keyword?, isActive?`
  - Response：`{ total: number, records: RoleListItem[] }`
- `POST /api/iam/roles`
  - Body：`{ name: string, code: string, desc?: string, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `PUT /api/iam/roles/{roleId}`
  - Body：`{ name?: string, code?: string, desc?: string, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `DELETE /api/iam/roles/{roleId}`
  - Response：`{ id: number, deleted: true }`
- `GET /api/iam/users/page`：用户分页列表
  - Query：`page, size, keyword?, deptId?, isActive?`
  - Response：`{ total: number, records: UserListItem[] }`
- `POST /api/iam/users`
  - Body：`{ name: string, empId: string, phone?: string, orgId?: number | null, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `PUT /api/iam/users/{userId}`
  - Body：`{ name?: string, empId?: string, phone?: string, orgId?: number | null, isActive?: boolean }`
  - Response：`{ id: number, ... }`
- `DELETE /api/iam/users/{userId}`
  - Response：`{ id: number, deleted: true }`
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
系统 SHALL 对组织新增/编辑/删除、角色新增/编辑/删除、角色权限配置、用户新增/编辑/删除、用户角色分配、用户启停等关键操作写入审计日志，包含 before/after、操作者、原因（若需要）、来源。

### Requirement: 原始数据导入权限完整性
系统 SHALL 保证原始数据中心最小可用权限集合在生产库和开发库都可被稳定补齐，至少包括 `data:import` 与 `data:read`，并确保 admin 角色自动拥有这些权限。

#### Scenario: 迁移后权限可用
- **WHEN** 系统执行数据库迁移或权限补齐脚本
- **THEN** `permission` 表包含 `data:import` 与 `data:read`，且 admin 角色具备对应 `role_permission` 关联

### Requirement: 开发态登录映射稳定性
系统 SHALL 在 `dev-bypass` 开发态下使用稳定、可预测的用户选择策略（优先 admin 角色用户），避免因用户排序变化导致权限漂移。

#### Scenario: 开发态登录
- **WHEN** 使用 `satoken=dev-bypass` 访问受保护接口
- **THEN** 系统命中具备 admin 角色的可用用户；若不存在则返回明确中文错误

### Requirement: 上传失败可观测性
系统 SHALL 在原始数据列表加载或 Excel 上传失败时向前端展示明确中文错误原因（例如权限不足），不能仅表现为空列表或“无反应”。

#### Scenario: 无上传权限
- **WHEN** 当前用户缺少 `data:import` 权限并执行上传
- **THEN** 页面给出“无权限访问/当前账号无导入权限”等中文提示，并保留重试入口

## MODIFIED Requirements

### Requirement: 兼容旧 /v1 接口（过渡期）
**Reason**：降低一次性切换风险。
系统 SHOULD 在过渡期保留 `/v1/orgs`、`/v1/roles`、`/v1/users` 的只读兼容（或返回迁移提示），并在文档中明确废弃策略。

## REMOVED Requirements
### Requirement: 同步作为页面主操作
**Reason**：组织、角色、用户页面需要转为后台直接维护模式，不能再依赖“同步后查看”的主流程。
**Migration**：页面移除主同步按钮与相关提示文案；原同步接口如继续保留，仅作为内部维护能力，不再出现在三页主操作区。
