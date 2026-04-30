# 智能体与大模型配置改造 Spec

## Why
当前前端“智能体配置/大模型配置”页面仅有 UI 骨架且与后端真实接口契约不一致，导致功能不可用、无法形成可维护的配置闭环。

## What Changes
- 统一“智能体配置/大模型配置”能力边界：拆分为「LLM 资源池管理」与「Agent 定义与版本管理」
- 前端页面改造为基于后端 `/api/ai/*` 契约的真实读写与交互闭环（列表、创建、编辑、启停、默认、测试、删除）
- 后端补齐 AI 配置的真实存储（数据库模型+迁移）与接口实现（替换当前空数据骨架）
- 补齐 RBAC 权限码与审计日志覆盖，确保关键配置变更可追溯

## Impact
- Affected specs: 系统管理配置、RBAC 权限字典、审计日志、前端路由与菜单
- Affected code:
  - 前端：`/frontend/src/pages/settings/LLMConfig.tsx`、`/frontend/src/pages/settings/AgentConfig.tsx`、`/frontend/src/App.tsx`、`/frontend/src/components/Sidebar.tsx`
  - 后端：`/backend/app/api/ai.py`、新增 models/schemas/services/迁移、权限种子迁移

## ADDED Requirements

### Requirement: LLM 资源池管理
系统 SHALL 提供 LLM 资源池的可视化管理能力，基于后端接口 `/api/ai/llms/*` 实现真实读写。

#### Scenario: 查看列表
- **WHEN** 用户进入“大语言模型配置”
- **THEN** 系统展示分页列表（total/records），支持 keyword 查询，展示 provider/model/baseUrl/isDefault/isEnabled/最近测试状态

#### Scenario: 新建与编辑
- **WHEN** 用户在抽屉中填写 provider、model、baseUrl、apiKey、isEnabled 并保存
- **THEN** 系统调用创建/更新接口并刷新列表
- **AND** 更新时 apiKey 为空表示“不修改原密钥”

#### Scenario: 设置默认
- **WHEN** 用户对某个 LLM 执行“设为默认”
- **THEN** 系统保证同一时刻只有一个默认 LLM

#### Scenario: 启停
- **WHEN** 用户切换 LLM 启用状态
- **THEN** 该 LLM 在列表中即时反映 isEnabled

#### Scenario: 测试连通性
- **WHEN** 用户点击“测试连通性”
- **THEN** 后端执行真实 HTTP 测试并返回成功/失败与错误信息，前端展示测试结果

#### Scenario: 删除
- **WHEN** 用户删除某个 LLM
- **THEN** 后端执行真实删除；若存在依赖该 LLM 的 Agent，后端 SHALL 返回可理解的错误提示并拒绝删除

### Requirement: Agent 定义与版本管理
系统 SHALL 提供 Agent 的基础定义管理与版本配置管理，基于后端接口 `/api/ai/agents/*` 实现真实读写。

#### Scenario: Agent 列表
- **WHEN** 用户进入“系统智能体配置”
- **THEN** 系统展示分页列表（total/records），支持 keyword 查询，展示 name/code、绑定 llmId（或映射到 LLM 展示名）、isEnabled、当前版本信息

#### Scenario: 新建与编辑 Agent 基础信息
- **WHEN** 用户创建/编辑 Agent（name、code、llmId、isEnabled）
- **THEN** 系统调用创建/更新接口并刷新列表

#### Scenario: 启停 Agent
- **WHEN** 用户切换 Agent 启用状态
- **THEN** 后端更新 isEnabled 并返回成功

#### Scenario: 保存草稿配置
- **WHEN** 用户编辑 Agent 的“角色设定（System Prompt）”与推理参数并点击“保存草稿”
- **THEN** 后端将配置保存为一个草稿版本（config 为 JSON），并返回 versionId

#### Scenario: 发布版本
- **WHEN** 用户对某个草稿版本点击“发布”
- **THEN** 该版本变为当前生效版本，原当前版本保持可回滚

#### Scenario: 回滚版本
- **WHEN** 用户选择历史版本执行回滚
- **THEN** 当前版本切换为目标版本，并记录审计日志

#### Scenario: 测试运行
- **WHEN** 用户输入一段测试文本并点击“测试运行”
- **THEN** 后端使用当前版本配置与绑定 LLM 执行真实推理调用并返回输出（如后端暂未接入推理执行器，可先返回清晰的“不支持”错误，不得伪造输出）

## MODIFIED Requirements

### Requirement: 系统管理菜单与路由
系统 SHALL 在“系统管理”中提供入口与路由，使用户可访问 LLM 与 Agent 配置页面。

## REMOVED Requirements
无

