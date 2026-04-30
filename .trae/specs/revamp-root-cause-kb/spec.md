# 根因知识库结构化管理 Spec

## Why
当前“根因知识库配置”采用自由文本（textarea）方式存储，缺少结构化增删改查与业务联动，导致配置难维护、不可复用且无法真正影响 AI 分析结果。

## What Changes
- 将“根因知识库”从 system_config 的自由文本升级为结构化条目（RootCauseKB）持久化存储
- 新增后端根因条目管理接口（分页查询、创建、编辑、启停、删除、导入、导出）
- 改造前端“根因知识库配置”页面为结构化管理页（筛选 + 表格 + 抽屉编辑 + 批量导入导出）
- 将根因知识库接入投诉分析链路：分析时优先从知识库选择表层/直接/深层根因，未命中再回退现有模板逻辑
- 全部写操作接入权限与审计

## Impact
- Affected specs: 系统管理配置、投诉 AI 分析、报告与问答输出一致性、审计与权限
- Affected code:
  - 前端：`/frontend/src/pages/system/KnowledgeConfig.tsx`
  - 后端：新增根因知识库模型/迁移/接口；`/backend/app/services/analysis.py`（根因生成逻辑接入 KB）
  - 权限种子：新增 root-cause-kb 管理权限（或复用 system:config，见任务）

## ADDED Requirements

### Requirement: 根因条目管理（RootCauseKB）
系统 SHALL 提供根因条目的结构化管理能力，每条根因记录至少包含分类绑定、根因层级、根因内容与启用状态。

#### Scenario: 列表分页与筛选
- **WHEN** 用户进入“根因知识库配置”
- **THEN** 系统展示根因条目分页列表（total/records）
- **AND** 支持按关键字、投诉分类（一级/二级）、根因层级、启用状态筛选

#### Scenario: 新增/编辑条目
- **WHEN** 用户在抽屉中填写分类、层级、根因内容并保存
- **THEN** 系统创建/更新根因条目并刷新列表
- **AND** 必填字段缺失时给出中文校验提示

#### Scenario: 启停条目
- **WHEN** 用户对某条根因执行启用/禁用
- **THEN** 该条目在列表中即时反映状态，且后续分析仅使用启用条目

#### Scenario: 删除条目
- **WHEN** 用户删除某条根因
- **THEN** 系统删除该条目并写审计日志

#### Scenario: 批量导入/导出
- **WHEN** 用户上传 Excel/CSV 进行导入
- **THEN** 系统创建/更新条目并返回成功/失败条数与错误明细（包含行号与原因）
- **WHEN** 用户导出
- **THEN** 系统导出当前筛选条件下的数据为 Excel

### Requirement: 投诉分析接入根因知识库
系统 SHALL 在投诉分析时优先从根因知识库选择根因条目，以提高输出一致性与可控性。

#### Scenario: 命中知识库
- **WHEN** 分析投诉记录并已识别分类（lv1/lv2）
- **THEN** 系统按分类与层级检索启用的根因条目
- **AND** 分别选取表层/直接/深层根因各一个作为输出（可基于关键词命中/权重/排序规则）

#### Scenario: 未命中回退
- **WHEN** 某层级未检索到可用条目或匹配得分低于阈值
- **THEN** 系统回退到现有模板/规则生成逻辑，保证分析可用性

## MODIFIED Requirements

### Requirement: 系统配置存储方式
系统 SHALL 不再依赖 `system_config(key=knowledge)` 作为根因知识库的主要数据源；该配置可保留为兼容占位但不作为业务主数据。

## REMOVED Requirements
无

