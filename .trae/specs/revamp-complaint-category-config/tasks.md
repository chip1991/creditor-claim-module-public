# Tasks

- [ ] Task 1: 固化分类数据模型与导入导出模板
  - [ ] 定义分类表结构（一级/二级、排序、启停、关键词规则）
  - [ ] 定义导入/导出 Excel/CSV 字段与校验规则（重复、空值、层级绑定）
  - [ ] 权限策略：复用 `system:config` 或新增 `category:read/write`

- [ ] Task 2: 后端实现投诉分类管理接口（真实读写 + 审计）
  - [ ] 数据库迁移：新增分类表（一级/二级）
  - [ ] 接口：一级列表、二级分页/筛选、创建、更新、启停、排序、删除
  - [ ] 导入：支持 Excel/CSV，返回行级错误明细
  - [ ] 导出：导出为 Excel
  - [ ] 所有写操作写 audit_log

- [ ] Task 3: 投诉分析链路改为读取结构化分类
  - [ ] 将内置 `_CATEGORY_LV2_BY_LV1/_CATEGORY_KEYWORDS` 替换为 DB 中启用分类与关键词规则
  - [ ] 保留兜底：无命中/空库时回退到默认分类
  - [ ] 增加最小单测覆盖：命中、无命中兜底、启停影响

- [ ] Task 4: 前端改造“投诉分类配置”为可视化管理页
  - [ ] 页面结构：左侧一级分类列表，右侧二级分类表格（含关键词、启停、排序、操作）
  - [ ] 支持搜索、启停、排序调整、抽屉新增/编辑
  - [ ] 支持导入/导出与导入错误明细展示

- [ ] Task 5: 验证与回归
  - [ ] 后端：pytest 通过（新增分类管理与分类识别相关测试）
  - [ ] 前端：npm run build 通过
  - [ ] 重启开发环境服务并提供预览地址（定位到 /system/category）

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1, Task 2
- Task 4 depends on Task 1, Task 2
- Task 5 depends on Task 2, Task 3, Task 4

