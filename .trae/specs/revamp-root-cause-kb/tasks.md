# Tasks

- [x] Task 1: 固化根因知识库数据模型与权限策略
  - [x] 定义 RootCauseKB 表结构（分类绑定、层级、内容、启停、时间戳、可选关键词/建议字段）
  - [x] 定义导入/导出模板字段与校验规则
  - [x] 确定权限策略：复用 system:config 或新增 rootcause:kb:read/write（并补齐权限种子）

- [x] Task 2: 后端实现根因知识库管理接口（真实读写 + 审计）
  - [x] 数据库迁移：新增 root_cause_kb（或等价命名）表
  - [x] 接口：分页查询（keyword/category/level/enabled）、创建、更新、启停、删除
  - [x] 导入：支持 Excel/CSV，返回成功/失败行明细
  - [x] 导出：按筛选条件导出 Excel
  - [x] 所有写操作写 audit_log

- [x] Task 3: 投诉分析链路接入根因知识库
  - [x] 在分析服务中按分类与层级检索启用条目，并实现可解释的匹配/排序（关键词命中优先，未命中回退模板）
  - [x] 通过最小单元测试覆盖：命中/未命中回退、启停影响、筛选逻辑

- [x] Task 4: 前端将“根因知识库配置”改造为结构化管理页
  - [x] 列表页：筛选（分类/层级/启停/关键字）+ 表格分页（total/records）
  - [x] 抽屉：新增/编辑表单（必填校验）
  - [x] 行内操作：启停、删除、编辑
  - [x] 批量导入/导出：上传文件并展示结果摘要/错误明细

- [x] Task 5: 验证与回归
  - [x] 后端：pytest 通过（新增 root cause kb 与分析接入相关测试）
  - [x] 前端：npm run build 通过
  - [x] 重启开发环境前后端服务
  - [x] 提供可点击预览地址（定位到 /system/knowledge）

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 1, Task 2
- Task 5 depends on Task 2, Task 3, Task 4
