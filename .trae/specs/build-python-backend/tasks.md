# Tasks

- [x] Task 1: 初始化后端工程骨架
  - [x] 创建 backend 项目目录结构（core/db/models/schemas/api/services/tasks/tests）
  - [x] 集成 FastAPI、SQLAlchemy、Alembic、Redis、Celery 的最小可运行配置
  - [x] 提供 healthz/readyz 端点与基础日志/配置加载

- [x] Task 2: 建立认证与权限基础（RBAC + 数据范围）
  - [x] 定义 User/Role/Permission/Department 数据模型与迁移
  - [x] 实现 Token 解析（header: satoken）与统一鉴权依赖
  - [x] 实现角色权限矩阵与部门数据范围过滤工具

- [ ] Task 3: 建立审计与通知基础设施
  - [ ] 定义 audit_log 与 notification 表结构与迁移
  - [ ] 实现审计写入服务（支持 before/after、reason、source）
  - [ ] 实现通知写入与已读接口（/notification/list、/notification/read-all）

- [ ] Task 4: 实现任务中心（长任务 + SSE）
  - [ ] 定义 task 表结构与迁移
  - [ ] 实现任务状态查询接口（GET /task/{id}）
  - [ ] 实现 SSE 推送接口（GET /task/{id}/stream）
  - [ ] 定义 Celery 任务更新进度的统一方法

- [ ] Task 5: 数据管理中心后端（导入/校验/清洗/关联/修复/导出）
  - [ ] 数据模型：data_record、导入任务与行级错误、清洗日志、关联日志
  - [ ] 接口：/data/import（上传）、/data/page、/data/detail、/data/clean、/data/link、/data/export
  - [ ] 导入校验策略：必填/枚举/时间转换/重复工单号冲突处理
  - [ ] 清洗策略：控制符清理、枚举脏值映射、保留原文与清洗后文本
  - [ ] 关联策略：工单号一对一匹配；多次回访取最新；匹配失败可修复重试

- [ ] Task 6: 投诉 AI 分析后端
  - [ ] 数据模型：complaint_analysis（含置信度、证据片段、模型版本、人工修正）
  - [ ] 接口：/analysis/run、/analysis/page、/analysis/detail、/analysis/override、/analysis/rerun
  - [ ] 规则：重复投诉判定、置信度阈值策略、覆盖/不覆盖人工修正策略

- [ ] Task 7: 整改闭环工单后端
  - [ ] 数据模型：work_order、work_order_action_log、satisfaction_record（必要字段）
  - [ ] 接口：/workorder/create、/workorder/page、/workorder/detail、/workorder/submit、/workorder/verify、/workorder/urge、/workorder/force-close
  - [ ] 状态机：整改状态/核验状态/闭环状态/预警状态/满意度校验状态
  - [ ] 满意度校验：阈值映射、校验不通过自动退回、规则命中记录

- [ ] Task 8: 预警与升级（定时任务）
  - [ ] 规则配置：预警阈值、升级阈值、工作日口径（自然日/节假日历）
  - [ ] 定时扫描任务：更新 warning_status，生成通知，触发升级

- [ ] Task 9: 看板与指标服务
  - [ ] 建立统一口径的 metrics/dashboard 聚合服务
  - [ ] 接口：/dashboard/overview + 分模块接口 + 钻取明细接口

- [ ] Task 10: AI 智能问答服务
  - [ ] 实现 /qa/ask（非流式）与可选 /qa/stream（SSE 流式）
  - [ ] 问题解析（Planner）→ 查询执行（Executor）→ 结论生成（LLM）
  - [ ] 历史问答与导出（可分阶段）

- [ ] Task 11: 自动化报告服务
  - [ ] 数据模型：report（类型、周期、状态、内容、文件引用）
  - [ ] 接口：/report/generate、/report/page、/report/detail、/report/export、/report/delete
  - [ ] 自动生成配置与定时任务（可分阶段）

- [ ] Task 12: 系统配置（分类/知识库/权限/规则）
  - [ ] 接口：/system/category|get|save、/system/knowledge|get|save、/system/permission|get|save、/system/rules|get|save
  - [ ] 配置版本化与审计覆盖

- [ ] Task 13: 联调验收与测试
  - [ ] 覆盖需求文档 9.2 场景 A/B/C 的集成测试用例
  - [ ] 核心规则/状态机单元测试
  - [ ] OpenAPI 文档校验与前端接口对齐检查

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 2, Task 3, Task 4
- Task 6 depends on Task 2, Task 3, Task 4, Task 5
- Task 7 depends on Task 2, Task 3, Task 4, Task 5, Task 6
- Task 8 depends on Task 7
- Task 9 depends on Task 5, Task 7
- Task 10 depends on Task 5, Task 9
- Task 11 depends on Task 9
- Task 12 depends on Task 2, Task 3
- Task 13 depends on Task 5, Task 6, Task 7, Task 8, Task 9, Task 10, Task 11, Task 12
