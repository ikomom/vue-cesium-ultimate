# Mars3D 数据可视化功能说明

## 概述

本项目基于 Mars3D 库重新实现了 `DataVisualization.vue` 的所有功能，提供了一个完整的三维数据可视化解决方案。新的实现采用了模块化架构，具有更好的性能和扩展性。

## 功能特性

### 1. 目标点位渲染 ✅
- **动态图标显示**：支持多种类型的图标（军事、通信、雷达等）
- **状态颜色编码**：根据目标状态显示不同颜色（活跃、待机、维护、离线）
- **自适应标签**：根据相机距离自动调整标签显示
- **高亮效果**：鼠标悬停时的高亮显示
- **虚拟节点支持**：双击目标可显示/隐藏虚拟节点和圆环

### 2. 关系连线 ✅
- **动态材质**：支持流动线、闪烁线等多种材质效果
- **曲线连接**：支持直线和曲线两种连接方式
- **标签显示**：连线中点显示关系名称和描述
- **性能优化**：基于距离的显示控制

### 3. 轨迹显示 ✅
- **时间插值**：基于时间戳的平滑轨迹插值
- **路径渲染**：支持轨迹路径的可视化显示
- **移动目标**：3D模型沿轨迹移动，自动朝向运动方向
- **多种材质**：轨迹线支持拖尾、流动等效果

### 4. 事件显示 ✅
- **时间控制**：基于开始时间、结束时间或持续时间的显示控制
- **严重程度**：根据事件严重程度调整闪烁速度和颜色
- **动态材质**：闪烁线材质突出显示异常事件
- **标签信息**：显示事件名称和相关信息

### 5. 融合线 ✅
- **置信度显示**：根据数据融合置信度调整透明度
- **渐变材质**：起始和结束颜色的渐变效果
- **多类型支持**：数据融合、信息融合等不同类型
- **动态标签**：显示融合类型和置信度百分比

### 6. 虚拟节点和圆环 ✅
- **动态圆环**：双击目标点位显示动态波纹圆环
- **虚拟节点**：在圆环周围生成虚拟通信节点
- **节点连线**：虚拟节点与其他目标的连接关系
- **交互控制**：再次双击可隐藏虚拟元素

## 技术架构

### 核心组件

1. **Mars3DDataVisualization.vue** - 主页面组件
   - 地图容器和UI控制面板
   - 事件处理和数据管理
   - 用户交互界面

2. **DataVisualizationManager.js** - 数据可视化管理器
   - 图层管理和数据存储
   - 实体创建和样式配置
   - 事件处理和交互逻辑

### 技术特点

- **模块化设计**：清晰的职责分离，易于维护和扩展
- **性能优化**：基于距离的LOD控制，减少渲染负担
- **事件驱动**：统一的事件处理机制
- **类型安全**：完整的数据类型定义和验证
- **响应式UI**：Vue 3 Composition API 实现的响应式界面

## 使用方法

### 1. 访问页面
```
http://localhost:5173/mars3d-data-visualization
```

### 2. 基本操作
- **加载数据**：点击"加载示例数据"按钮
- **显示控制**：使用复选框控制各类数据的显示/隐藏
- **实体交互**：
  - 单击：查看实体详细信息
  - 双击：显示/隐藏虚拟节点（仅限目标点位）
  - 悬停：高亮显示

### 3. 控制面板功能
- **显示控制**：独立控制各类数据的可见性
- **数据操作**：加载示例数据、清空所有数据
- **统计信息**：实时显示各类数据的数量统计
- **信息面板**：显示选中实体的详细属性

## API 接口

### DataVisualizationManager 主要方法

```javascript
// 添加目标点位
addPoint(pointData)

// 添加关系连线
addRelation(relationData)

// 添加轨迹
addTrajectory(trajectoryData)

// 添加事件
addEvent(eventData)

// 添加融合线
addFusionLine(fusionLineData)

// 创建虚拟节点和圆环
createVirtualNodesAndRing(pointId)

// 设置图层显示状态
setLayerShow(layerName, show)

// 清空所有数据
clearAll()

// 获取统计信息
getStats()
```

### 数据格式示例

#### 目标点位数据
```javascript
{
  id: 'point_001',
  name: '目标点1',
  longitude: 117.077,
  latitude: 31.686,
  height: 0,
  type: 'military',
  status: 'active',
  ringRadius: 50000,
  ringColor: '#ff6b35',
  virtualNodes: [
    { id: 'vn1', name: '通信节点1' },
    // ...
  ]
}
```

#### 关系连线数据
```javascript
{
  id: 'relation_001',
  name: '通信链路1',
  sourceId: 'point_001',
  targetId: 'point_002',
  type: 'communication',
  width: 3,
  color: '#00ff00',
  materialType: 'LineFlow',
  curve: true,
  curveHeight: 150000
}
```

## 性能优化

### 1. 距离显示控制
- 根据相机距离自动调整实体显示
- 标签和图标的分级显示策略
- 减少远距离时的渲染负担

### 2. 材质优化
- 使用 Mars3D 内置材质类型
- 避免重复创建相同材质
- 动态材质的性能优化

### 3. 事件处理优化
- 防抖处理避免频繁事件触发
- 统一的事件管理机制
- 内存泄漏防护

## 扩展功能

### 1. 自定义材质
可以通过扩展 `DataVisualizationManager` 添加自定义材质：

```javascript
// 添加自定义材质类型
const customMaterial = mars3d.MaterialUtil.createMaterialProperty(mars3d.MaterialType.Custom, {
  // 材质参数
})
```

### 2. 新的实体类型
可以通过添加新的方法支持更多实体类型：

```javascript
// 在 DataVisualizationManager 中添加新方法
addCustomEntity(entityData) {
  // 实现自定义实体创建逻辑
}
```

### 3. 高级交互
可以扩展事件处理机制支持更复杂的交互：

```javascript
// 添加自定义事件处理
handleCustomInteraction(event) {
  // 实现自定义交互逻辑
}
```

## 故障排除

### 常见问题

1. **Mars3D 库未加载**
   - 确保 `mars3d` 库正确引入
   - 检查网络连接和CDN可用性

2. **图标不显示**
   - 检查图标文件路径是否正确
   - 确保图标文件存在于 `public/icons/` 目录

3. **轨迹不动**
   - 检查时间轴是否启用
   - 确保轨迹数据包含有效的时间戳

4. **性能问题**
   - 减少同时显示的实体数量
   - 调整距离显示条件参数
   - 使用简化的材质类型

### 调试技巧

1. **开启控制台日志**
   ```javascript
   // 在浏览器控制台中启用详细日志
   localStorage.setItem('mars3d-debug', 'true')
   ```

2. **检查实体状态**
   ```javascript
   // 获取管理器实例
   const manager = visualizationManager.value
   
   // 查看统计信息
   console.log(manager.getStats())
   
   // 查看图层状态
   manager.layers.forEach((layer, name) => {
     console.log(`${name}: ${layer.show ? '显示' : '隐藏'}`)
   })
   ```

## 版本历史

### v1.0.0 (2024-01-15)
- ✅ 完成所有核心功能实现
- ✅ 基于 Mars3D 的完整重构
- ✅ 模块化架构设计
- ✅ 性能优化和用户体验改进
- ✅ 完整的文档和示例

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目。在提交代码前，请确保：

1. 代码符合项目的编码规范
2. 添加必要的注释和文档
3. 测试新功能的兼容性
4. 更新相关文档

## 许可证

本项目基于 MIT 许可证开源。详见 LICENSE 文件。