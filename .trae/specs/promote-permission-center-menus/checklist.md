- [ ] 左侧导航存在三个一级菜单入口：组织管理 / 角色管理 / 用户管理
- [ ] 点击三个菜单分别进入独立页面：`/system/permission-center/orgs|roles|users`
- [ ] 角色详情页路由不受影响，可从“角色管理”进入并可返回列表
- [ ] `/system/permission-center` 旧入口仍可访问并重定向到组织管理页
- [ ] 后端菜单树接口返回包含三菜单节点，旧“权限中心”节点对新配置隐藏
- [ ] 迁移后：原本拥有“权限中心”菜单权限的角色自动拥有三菜单权限
- [ ] `alembic upgrade head` 通过
- [ ] 后端 pytest 通过
- [ ] 前端 `npm run build` 通过

