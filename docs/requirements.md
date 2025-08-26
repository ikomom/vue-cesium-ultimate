# 数据管理后台系统需求文档

## 项目概述

### 项目名称
Vue Cesium 数据管理后台系统

### 项目描述
基于 NestJS 和 MySQL 构建的数据管理后台服务，用于管理 Vue Cesium 项目中的各类数据，包括目标基础数据、位置数据、状态数据、事件数据、关系数据和舰船轨迹数据。

### 技术栈
- **后端框架**: NestJS
- **数据库**: MySQL
- **ORM**: TypeORM
- **语言**: TypeScript
- **API文档**: Swagger

## 数据结构分析

### 1. 目标基础数据 (targetBaseData.json)
- **用途**: 存储目标的基本信息
- **字段**: id, name, type, description, status, capacity, operator, createdAt
- **特点**: 静态基础信息，变更频率低

### 2. 目标位置数据 (targetLocationData.json)
- **用途**: 存储目标的地理位置信息
- **字段**: id, name, longitude, latitude, height, region, province, city, address, createdAt
- **特点**: 地理坐标数据，与基础数据关联

### 3. 目标状态数据 (targetStatusData.json)
- **用途**: 存储目标的实时状态信息
- **字段**: target_id, target_name, status_type, status_name, startTime, colorCode, iconState, animationEffect, priority, description, metadata, id
- **特点**: 时序数据，变更频率高，支持历史记录

### 4. 事件数据 (eventData.json)
- **用途**: 存储目标间的事件信息
- **字段**: id, source_id, target_id, description, startTime, endTime, alertTime, duration, type
- **特点**: 关联两个目标，支持进行中和已完成状态

### 5. 关系数据 (relationData.json)
- **用途**: 存储目标间的关系连接
- **字段**: id, description, source_id, target_id, type, status, priority, distance, capacity, frequency, createdAt
- **特点**: 定义目标间的静态关系

### 6. 舰船轨迹数据 (shipTrajectoryData.json)
- **用途**: 存储舰船的轨迹路径数据
- **字段**: target_id -> [timestamp, longitude, latitude, altitude, speed, heading, status, location]
- **特点**: 时序轨迹数据，按目标ID分组

## 系统功能需求

### 核心功能模块

#### 1. 目标管理模块
- **功能**: 管理目标基础信息和位置信息
- **接口**:
  - GET /targets - 获取目标列表
  - GET /targets/:id - 获取目标详情
  - POST /targets - 创建目标
  - PUT /targets/:id - 更新目标
  - DELETE /targets/:id - 删除目标
- **实现状态**: ❌ 未实现

#### 2. 状态管理模块
- **功能**: 管理目标状态信息，支持历史记录
- **接口**:
  - GET /status - 获取状态列表
  - GET /status/target/:targetId - 获取目标状态历史
  - POST /status - 创建状态记录
  - PUT /status/:id - 更新状态
  - DELETE /status/:id - 删除状态
- **实现状态**: ❌ 未实现

#### 3. 事件管理模块
- **功能**: 管理目标间事件信息
- **接口**:
  - GET /events - 获取事件列表
  - GET /events/:id - 获取事件详情
  - POST /events - 创建事件
  - PUT /events/:id - 更新事件
  - DELETE /events/:id - 删除事件
  - GET /events/ongoing - 获取进行中事件
- **实现状态**: ❌ 未实现

#### 4. 关系管理模块
- **功能**: 管理目标间关系连接
- **接口**:
  - GET /relations - 获取关系列表
  - GET /relations/:id - 获取关系详情
  - POST /relations - 创建关系
  - PUT /relations/:id - 更新关系
  - DELETE /relations/:id - 删除关系
  - GET /relations/target/:targetId - 获取目标相关关系
- **实现状态**: ❌ 未实现

#### 5. 轨迹管理模块
- **功能**: 管理舰船轨迹数据
- **接口**:
  - GET /trajectories - 获取轨迹列表
  - GET /trajectories/:targetId - 获取目标轨迹
  - POST /trajectories - 创建轨迹点
  - PUT /trajectories/:id - 更新轨迹点
  - DELETE /trajectories/:id - 删除轨迹点
  - GET /trajectories/:targetId/range - 获取时间范围内轨迹
- **实现状态**: ❌ 未实现

#### 6. 数据导入模块
- **功能**: 从JSON文件导入数据到数据库
- **接口**:
  - POST /import/targets - 导入目标数据
  - POST /import/status - 导入状态数据
  - POST /import/events - 导入事件数据
  - POST /import/relations - 导入关系数据
  - POST /import/trajectories - 导入轨迹数据
  - POST /import/all - 导入所有数据
- **实现状态**: ❌ 未实现

### 非功能性需求

#### 1. 性能要求
- 支持并发访问
- 响应时间 < 200ms
- 支持分页查询
- 数据库连接池管理

#### 2. 安全要求
- 输入数据验证
- SQL注入防护
- 错误信息安全处理

#### 3. 可维护性
- 代码结构清晰
- 完整的错误处理
- 详细的API文档
- 单元测试覆盖

## 数据库设计

### 表结构设计

#### 1. targets 表 (目标表)
```sql
CREATE TABLE targets (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100),
  description TEXT,
  status VARCHAR(50),
  capacity VARCHAR(100),
  operator VARCHAR(255),
  longitude DECIMAL(10, 7),
  latitude DECIMAL(10, 7),
  height DECIMAL(8, 2),
  region VARCHAR(50),
  province VARCHAR(100),
  city VARCHAR(100),
  address VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 2. target_status 表 (目标状态表)
```sql
CREATE TABLE target_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_id VARCHAR(50) NOT NULL,
  target_name VARCHAR(255),
  status_type VARCHAR(50),
  status_name VARCHAR(100),
  start_time TIMESTAMP,
  color_code VARCHAR(10),
  icon_state VARCHAR(100),
  animation_effect VARCHAR(100),
  priority VARCHAR(20),
  description TEXT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_id) REFERENCES targets(id)
);
```

#### 3. events 表 (事件表)
```sql
CREATE TABLE events (
  id VARCHAR(50) PRIMARY KEY,
  source_id VARCHAR(50),
  target_id VARCHAR(50),
  description TEXT,
  start_time TIMESTAMP,
  end_time TIMESTAMP NULL,
  alert_time TIMESTAMP,
  duration INT,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES targets(id),
  FOREIGN KEY (target_id) REFERENCES targets(id)
);
```

#### 4. relations 表 (关系表)
```sql
CREATE TABLE relations (
  id VARCHAR(50) PRIMARY KEY,
  description TEXT,
  source_id VARCHAR(50),
  target_id VARCHAR(50),
  type VARCHAR(100),
  status VARCHAR(50),
  priority VARCHAR(20),
  distance DECIMAL(10, 2),
  capacity VARCHAR(100),
  frequency VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES targets(id),
  FOREIGN KEY (target_id) REFERENCES targets(id)
);
```

#### 5. trajectories 表 (轨迹表)
```sql
CREATE TABLE trajectories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  target_id VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP,
  longitude DECIMAL(10, 7),
  latitude DECIMAL(10, 7),
  altitude DECIMAL(8, 2),
  speed DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  status VARCHAR(50),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (target_id) REFERENCES targets(id),
  INDEX idx_target_timestamp (target_id, timestamp)
);
```

## 项目结构

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/
│   │   └── database.config.ts
│   ├── entities/
│   │   ├── target.entity.ts
│   │   ├── target-status.entity.ts
│   │   ├── event.entity.ts
│   │   ├── relation.entity.ts
│   │   └── trajectory.entity.ts
│   ├── modules/
│   │   ├── targets/
│   │   ├── status/
│   │   ├── events/
│   │   ├── relations/
│   │   ├── trajectories/
│   │   └── import/
│   ├── common/
│   │   ├── dto/
│   │   ├── filters/
│   │   └── pipes/
│   └── utils/
├── docs/
├── package.json
└── README.md
```

## 开发计划

### 第一阶段 (基础搭建)
- [x] 需求分析和文档编写
- [ ] 项目初始化
- [ ] 数据库配置
- [ ] 实体模型创建

### 第二阶段 (核心功能)
- [ ] 目标管理模块
- [ ] 状态管理模块
- [ ] 数据导入功能

### 第三阶段 (扩展功能)
- [ ] 事件管理模块
- [ ] 关系管理模块
- [ ] 轨迹管理模块

### 第四阶段 (完善优化)
- [ ] API文档
- [ ] 错误处理
- [ ] 性能优化
- [ ] 测试编写

---

**文档版本**: v1.0  
**创建时间**: 2024-01-26  
**最后更新**: 2024-01-26  
**状态**: 初始版本