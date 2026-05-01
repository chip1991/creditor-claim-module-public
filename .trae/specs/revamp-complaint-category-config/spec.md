# 投诉分类结构化管理 Spec

## Why
当前“投诉分类配置”仅提供自由文本 textarea，并写入 `system_config(key=category)`；但投诉分析实际使用的是后端内置的分类枚举与关键词规则，形成“双来源”，导致配置不可控、不可用、也无法让业务人员安全维护。

## What Changes
- 将“投诉分类”从自由文本配置升级为结构化数据源（分类表/树表），成为系统唯一生效来源
- 新增后端分类管理接口（分页/查询、创建、编辑、启停、排序、导入、导出）
- 改造前端“投诉分类配置”页面为可视化管理页（一级/二级联动 + 表格编辑 + 批量导入导出）
- 投诉分析链路改为读取“当前启用分类体系”进行分类识别（关键词命中规则由配置提供），并保留兜底策略
- 所有写操作接入权限与审计

## Impact
- Affected specs: 系统管理配置、投诉 AI 分类识别、审计与权限
- Affected code:
  - 前端：`/frontend/src/pages/system/CategoryConfig.tsx`
  - 后端：新增分类模型/迁移/接口；`/backend/app/services/analysis.py`（分类枚举与关键词来源改造）
  - 兼容：`/backend/app/api/system.py` 的 `/system/category/get|save` 可保留但不再作为主数据源

## ADDED Requirements

### Requirement: 投诉分类结构化管理
系统 SHALL 提供投诉分类（至少一级/二级）的结构化管理能力，并支持为二级分类维护“关键词规则”以供分类识别使用。

#### Scenario: 列表与筛选
- **WHEN** 用户进入“投诉分类配置”
- **THEN** 系统展示一级分类列表，并可查看某一级下的二级分类表格
- **AND** 支持按关键字搜索分类名称/关键词
- **AND** 支持按启用状态筛选

#### Scenario: 新增/编辑分类
- **WHEN** 用户新增或编辑一级/二级分类（名称、排序、启用状态）
- **THEN** 系统保存并刷新列表
- **AND** 名称为空或重复时返回可理解的校验错误

#### Scenario: 配置关键词规则
- **WHEN** 用户为二级分类维护关键词（逗号分隔或多行）
- **THEN** 系统保存关键词规则用于后续分类识别

#### Scenario: 启停与排序
- **WHEN** 用户启用/禁用某个分类或调整排序
- **THEN** 分类列表即时反映，且分类识别仅使用启用分类

#### Scenario: 导入与导出
- **WHEN** 用户上传 Excel/CSV 导入分类
- **THEN** 系统创建/更新分类并返回行级错误明细（行号+原因）
- **WHEN** 用户导出
- **THEN** 系统导出当前分类与关键词规则为 Excel

### Requirement: 分类识别链路接入结构化分类
系统 SHALL 使用结构化分类与关键词规则作为分类识别的唯一来源。

#### Scenario: 正常识别
- **WHEN** 分析投诉文本
- **THEN** 系统从启用的二级分类关键词规则中计算命中并选择最匹配分类（输出 lv1/lv2）

#### Scenario: 兜底策略
- **WHEN** 没有任何关键词命中或分类库为空
- **THEN** 系统回退到内置默认分类（或“其他类/其他无法归类问题”）以保证可用性

## MODIFIED Requirements

### Requirement: 投诉分类配置存储方式
系统 SHALL 不再依赖 `system_config(key=category)` 作为投诉分类的主数据源；该配置可保留为兼容入口，但不影响分析结果。

## REMOVED Requirements
无

