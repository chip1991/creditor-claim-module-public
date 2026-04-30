# Tasks

- [x] Task 1: 固化前后端接口与字段契约（以 /api/ai 为唯一入口）
  - [x] 明确 LLM 列表/创建/更新/启停/默认/测试/删除的请求与响应字段（分页返回 total/records）
  - [x] 明确 Agent 列表/创建/更新/启停与版本相关接口（draft/save、publish、rollback、current、versions list、test-run）
  - [x] 明确前端展示字段映射规则（例如 llmId → LLM 展示名；测试状态字段）

- [x] Task 2: 后端实现 AI 配置的真实存储与接口
  - [x] 新增数据库模型与迁移：LLM、Agent、AgentVersion（含 JSON config、状态、时间戳、默认与启停字段）
  - [x] 实现 /api/ai/llms/page 与 /api/ai/agents/page 的真实分页查询（支持 keyword）
  - [x] 实现 LLM CRUD + toggle + set-default + test（真实 HTTP 测试，返回成功/失败与错误信息）
  - [x] 实现 Agent CRUD + toggle
  - [x] 实现 Agent 版本：draft/save、publish、rollback、current、versions list
  - [x] 权限与审计：新增权限码种子（ai:llm:read/write、ai:agent:read/write/publish），所有写操作写 audit_log

- [x] Task 3: 前端路由与菜单入口改造
  - [x] 增加页面路由：大语言模型配置、系统智能体配置
  - [x] 侧边栏“系统管理”增加入口，并与现有风格保持一致

- [x] Task 4: 前端 LLMConfig 改造为真实可用页面
  - [x] 列表改为调用 /api/ai/llms/page 并适配分页结构（records/total），支持 keyword 查询
  - [x] 抽屉表单改为受控状态，支持创建/编辑并保存（apiKey 更新空值不修改）
  - [x] 实现设为默认、启停、删除、测试连通性按钮的真实行为，并用统一提示组件反馈结果

- [x] Task 5: 前端 AgentConfig 改造为真实可用页面
  - [x] 列表改为调用 /api/ai/agents/page 并适配分页结构（records/total），支持 keyword 查询
  - [x] 抽屉表单改为受控状态：创建/编辑基础信息（name/code/llmId/isEnabled）
  - [x] 实现启停、删除的真实行为
  - [x] 增加“版本配置”基础交互：保存草稿/发布/回滚/查看当前版本（最小可用闭环）
  - [x] 增加“测试运行”入口：调用 /api/ai/agents/{id}/test-run 并展示输出或明确错误

- [x] Task 6: 验证与回归
  - [x] 后端：运行 pytest 覆盖关键接口与权限校验（LLM 默认唯一性、删除依赖校验、版本发布/回滚）
  - [x] 前端：运行 npm run build
  - [x] 重启开发环境服务（前端与后端）
  - [x] 提供可点击预览地址

# Task Dependencies
- Task 2 depends on Task 1
- Task 4 depends on Task 1, Task 2, Task 3
- Task 5 depends on Task 1, Task 2, Task 3
- Task 6 depends on Task 2, Task 4, Task 5
