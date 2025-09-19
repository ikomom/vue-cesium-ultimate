# 版本管理文档

## 版本 1.0.0 - 初始版本 (2024-01-16)

### 🎉 新增功能

#### 后端系统架构

- **NestJS 框架集成**: 完整的企业级后端架构
- **MySQL 数据库**: 完整的数据持久化解决方案
- **TypeORM**: 对象关系映射，简化数据库操作
- **数据验证**: 完整的输入验证和错误处理机制

#### 数据库设计

- **targets 表**: 目标实体管理（56条记录）
  - 支持机场、港口、雷达站、通信基站、高铁站、军事基地等多种目标类型
  - 完整的地理位置信息（经纬度、高度、地址）
  - 目标状态和运营商信息

- **target_status 表**: 目标状态管理（39条记录）
  - 实时状态监控
  - 颜色编码和图标状态
  - 动画效果和优先级管理

- **events 表**: 事件管理系统（15条记录）
  - 事件生命周期管理（开始时间、结束时间、告警时间）
  - 事件类型分类（已完成、进行中）
  - 源目标和目标目标关联

- **relations 表**: 关系网络管理（16条记录）
  - 多种关系类型（航线连接、雷达覆盖、海运航线、高铁线路、通信链路、军事协防、数据传输）
  - 关系属性（距离、容量、频率、优先级）

- **trajectories 表**: 轨迹数据管理（60条记录）
  - 实时位置追踪（经纬度、高度、速度、航向）
  - 状态监控和位置描述
  - 时间序列数据支持

- **import_logs 表**: 数据导入日志（17条记录）
  - 完整的导入过程追踪
  - 成功/失败统计
  - 错误信息记录

#### API 接口系统

- **RESTful API**: 完整的 CRUD 操作接口
- **目标管理 API**: `/api/targets`
  - GET /api/targets - 获取所有目标
  - GET /api/targets/:id - 获取特定目标
  - POST /api/targets - 创建新目标
  - PUT /api/targets/:id - 更新目标
  - DELETE /api/targets/:id - 删除目标

- **事件管理 API**: `/api/events`
  - 完整的事件生命周期管理
  - 事件查询和过滤功能

- **关系管理 API**: `/api/relations`
  - 关系网络查询
  - 关系类型过滤

- **轨迹管理 API**: `/api/trajectories`
  - 轨迹数据查询
  - 时间范围过滤

- **状态管理 API**: `/api/target-status`
  - 实时状态查询
  - 状态更新接口

#### 数据导入系统

- **自动化数据导入**: 支持 JSON 格式数据批量导入
- **数据验证**: 导入过程中的数据完整性检查
- **错误处理**: 完善的错误记录和恢复机制
- **导入日志**: 详细的导入过程记录

#### 数据源集成

- **targetBaseData.json**: 目标基础信息（56条记录）
- **targetLocationData.json**: 目标位置信息（50条记录）
- **targetStatusData.json**: 目标状态信息（39条记录）
- **eventData.json**: 事件数据（15条记录）
- **relationData.json**: 关系数据（16条记录）
- **shipTrajectoryData.json**: 轨迹数据（30条轨迹，60个数据点）

### 🔧 技术栈

- **后端框架**: NestJS 10.x
- **数据库**: MySQL 8.0
- **ORM**: TypeORM
- **语言**: TypeScript
- **包管理**: yarn
- **数据验证**: class-validator, class-transformer

### 📊 数据统计

- 总目标数量: 56个
- 目标状态记录: 39条
- 事件记录: 15条
- 关系记录: 16条
- 轨迹数据点: 60个
- 导入日志: 17条

### 🛠️ 部署说明

1. 安装依赖: `yarn install`
2. 配置数据库连接
3. 运行数据库迁移
4. 执行数据导入脚本
5. 启动服务: `yarn start:dev`

### 📝 文档

- 需求管理文档: `/docs/requirements.md`
- API 文档: Swagger UI 集成
- 数据库设计文档: 包含在需求文档中

---

## 版本 1.1.0 - 组件化重构 (2024-01-17)

### 🔄 重构优化

#### TestMap 组件化重构

- **逻辑分离**: 将 TestMap.vue 中的地图逻辑抽取到独立的 composable 函数中
- **可组合函数创建**:
  - `useBasicTest.js`: 基础测试功能（添加随机点/线、清除测试实体）
  - `useShipTrajectory.js`: 舰船轨迹功能（轨迹生成、动画控制、时间轴管理）
  - `useViewControl.js`: 视角控制功能（飞往指定城市）
  - `useMapInfo.js`: 地图信息功能（实时地图状态监听）

#### 组件架构优化

- **面板组件独立化**: 每个面板组件现在拥有独立的地图逻辑
  - `BasicTestPanel.vue`: 使用 `useBasicTest` composable
  - `ShipTrajectoryPanel.vue`: 使用 `useShipTrajectory` composable
  - `ViewControlPanel.vue`: 使用 `useViewControl` composable
  - `MapInfoPanel.vue`: 使用 `useMapInfo` composable

- **Props 和 Events 简化**: 移除了复杂的 props 传递和事件监听
- **生命周期管理**: 各组件独立管理自己的生命周期和资源

#### 代码质量提升

- **关注点分离**: 地图逻辑与 UI 逻辑完全分离
- **可复用性**: composable 函数可在其他组件中复用
- **可维护性**: 每个功能模块独立，便于维护和测试
- **类型安全**: 保持 TypeScript 类型安全

### 📁 新增文件

- `src/composables/useBasicTest.js`: 基础测试功能 composable
- `src/composables/useShipTrajectory.js`: 舰船轨迹功能 composable
- `src/composables/useViewControl.js`: 视角控制功能 composable
- `src/composables/useMapInfo.js`: 地图信息功能 composable
- `docs/test-components-refactor.md`: 组件化重构详细文档

### 🔧 修改文件

- `src/views/TestMap.vue`: 移除地图逻辑，简化为容器组件
- `src/components/test-components/TestControlPanel.vue`: 简化 props 和事件处理
- `src/components/test-components/BasicTestPanel.vue`: 集成 useBasicTest
- `src/components/test-components/ShipTrajectoryPanel.vue`: 集成 useShipTrajectory
- `src/components/test-components/ViewControlPanel.vue`: 集成 useViewControl
- `src/components/test-components/MapInfoPanel.vue`: 集成 useMapInfo

### 🎯 优势

- **更好的代码组织**: 功能模块化，职责清晰
- **提高可复用性**: composable 函数可在多个组件中使用
- **简化组件通信**: 减少 props 和 events 的复杂性
- **便于测试**: 独立的功能模块更容易进行单元测试
- **易于扩展**: 新功能可以独立开发和集成

---

## 版本历史

### 版本 1.1.0 (2024-01-17)

- TestMap 组件化重构
- 创建 composable 函数
- 优化组件架构
- 提升代码质量

### 版本 1.0.0 (2024-01-16)

- 初始版本发布
- 完整的后端系统架构
- 数据库设计和数据导入
- RESTful API 接口
- 文档和测试
