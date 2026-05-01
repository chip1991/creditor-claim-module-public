# 权限中心三模块一级菜单化 Spec

## Why
当前“权限中心”下承载“组织管理/角色管理/用户管理”三块能力，需要先进入权限中心再切换模块，入口层级偏深且不利于快速定位。需要将三块能力提升为一级菜单入口，分别进入各自页面。

## What Changes
- 前端左侧导航将“组织管理/角色管理/用户管理”作为一级菜单入口（位于“系统管理”分组下）。
- 每个菜单点击后进入各自页面（独立路由），不再依赖权限中心页内 Tab 切换。
- 保留角色详情页路由（角色管理 → 角色详情），不改变其 URL 结构。
- **BREAKING**：左侧导航不再以单一“权限中心”作为入口；但保留 `/system/permission-center` 路由并重定向到组织管理页以兼容旧书签。
- 后端 RBAC 菜单资源树同步拆分为三条菜单资源（组织管理/角色管理/用户管理），用于角色菜单权限配置；提供迁移策略避免既有角色菜单权限丢失。

## Impact
- Affected specs: 权限中心信息架构与导航、RBAC 菜单资源（menu tree）、角色菜单权限配置与生效（menu_ids 并集）。
- Affected code:
  - 前端：`Sidebar.tsx`、`App.tsx`、`Layout.tsx`、`PermissionCenter.tsx`（如仍作为容器/重定向入口）
  - 后端：`menu`/`role_menu` 迁移与 seed、`GET /api/rbac/menus/tree`

## ADDED Requirements

### Requirement: 一级菜单入口
系统 SHALL 在左侧导航提供以下三个一级入口，并可直接进入各自页面：
1) 组织管理
2) 角色管理
3) 用户管理

#### Scenario: 组织管理入口
- **WHEN** 用户点击“组织管理”
- **THEN** 跳转到组织管理页面并正常渲染组织树/列表

#### Scenario: 角色管理入口与详情页
- **WHEN** 用户点击“角色管理”
- **THEN** 跳转到角色管理列表页
- **AND** 用户可从列表进入角色详情页并返回列表

#### Scenario: 用户管理入口
- **WHEN** 用户点击“用户管理”
- **THEN** 跳转到用户管理页面并正常渲染用户列表与详情抽屉

### Requirement: 菜单资源拆分与迁移
系统 SHALL 在后端菜单资源中新增“组织管理/角色管理/用户管理”三个菜单节点，并提供升级迁移策略：

#### Scenario: 角色菜单权限不丢失
- **WHEN** 系统执行数据库迁移完成升级
- **THEN** 对于原先拥有“权限中心”菜单权限的角色，系统自动补齐三菜单权限（并集迁移）

## MODIFIED Requirements

### Requirement: 权限中心页面导航方式
系统 SHALL 不再依赖权限中心页内 Tab 作为三模块入口；三模块入口由左侧一级菜单提供。

## REMOVED Requirements

### Requirement: 左侧导航“权限中心”单入口
**Reason**：入口层级深，影响可发现性与效率。
**Migration**：保留 `/system/permission-center` 重定向；角色菜单权限从旧菜单迁移到新三菜单。

