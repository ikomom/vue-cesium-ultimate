# Mars3D 模块化结构

## 📖 概述

本项目是基于 Mars3D 的模块化重构版本，将原有的单体结构拆分为多个独立的功能模块，提供更好的代码组织、维护性和扩展性。

## 🏗️ 项目结构

```
src/components/mars3d/
├── index.js                 # 主入口文件
├── core/                    # 核心模块
│   ├── index.js            # 核心模块导出
│   ├── EventType.js        # 事件类型定义
│   ├── BaseClass.js        # 基础类定义
│   └── CesiumUtil.js       # Cesium工具类
├── graphic/                 # 图形模块
│   ├── index.js            # 图形模块导出
│   ├── GraphicType.js      # 图形类型定义
│   ├── GraphicClass.js     # 图形基础类
│   └── GraphicManager.js   # 图形管理器
├── layer/                   # 图层模块
│   ├── index.js            # 图层模块导出
│   ├── LayerType.js        # 图层类型定义
│   ├── LayerUtil.js        # 图层工具类
│   └── LayerManager.js     # 图层管理器
├── control/                 # 控制模块
│   ├── index.js            # 控制模块导出
│   ├── BaseControl.js      # 基础控制类
│   ├── MouseControl.js     # 鼠标控制
│   ├── KeyboardControl.js  # 键盘控制
│   └── ControlManager.js   # 控制管理器
├── effect/                  # 效果模块
│   ├── index.js            # 效果模块导出
│   ├── BaseEffect.js       # 基础效果类
│   ├── ParticleEffect.js   # 粒子效果
│   ├── PostProcessEffect.js # 后处理效果
│   └── EffectManager.js    # 效果管理器
├── material/                # 材质模块
│   ├── index.js            # 材质模块导出
│   ├── BaseMaterial.js     # 基础材质类
│   ├── WaterMaterial.js    # 水面材质
│   ├── FireMaterial.js     # 火焰材质
│   └── MaterialManager.js  # 材质管理器
├── util/                    # 工具模块
│   ├── index.js            # 工具模块导出
│   ├── MathUtil.js         # 数学工具
│   ├── CoordinateUtil.js   # 坐标工具
│   ├── DomUtil.js          # DOM工具
│   ├── HttpUtil.js         # HTTP工具
│   └── UtilManager.js      # 工具管理器
├── test.js                  # 测试文件
├── test.html               # 测试页面
└── README.md               # 说明文档
```

## 🚀 快速开始

### 基本使用

```javascript
// 导入主模块
import Mars3D from './mars3d/index.js';

// 创建Mars3D实例
const mars3d = new Mars3D({
    container: 'cesiumContainer',
    scene3DOnly: true
});

// 获取viewer实例
const viewer = mars3d.viewer;
```

### 模块化使用

```javascript
// 按需导入特定模块
import { GraphicManager, GraphicType } from './mars3d/graphic/index.js';
import { LayerManager, LayerType } from './mars3d/layer/index.js';
import { MathUtil, CoordinateUtil } from './mars3d/util/index.js';

// 使用图形管理器
const graphicManager = new GraphicManager();
const point = graphicManager.create(GraphicType.POINT, {
    position: [116.4, 39.9, 0],
    style: {
        color: '#ff0000',
        pixelSize: 10
    }
});

// 使用工具类
const distance = MathUtil.distance2D([116.4, 39.9], [116.5, 40.0]);
const cartesian = CoordinateUtil.lonLatToCartesian(116.4, 39.9, 0);
```

## 📦 模块说明

### 核心模块 (Core)

提供基础的类型定义、事件系统和Cesium扩展功能。

- **EventType**: 定义所有事件类型常量
- **BaseClass**: 提供基础类功能，包括事件系统
- **CesiumUtil**: Cesium相关的工具函数

### 图形模块 (Graphic)

处理各种图形对象的创建、管理和操作。

- **GraphicType**: 图形类型定义（点、线、面等）
- **GraphicClass**: 图形基础类，所有图形的父类
- **GraphicManager**: 图形管理器，负责图形的增删改查

### 图层模块 (Layer)

管理各种数据图层的加载、显示和控制。

- **LayerType**: 图层类型定义（瓦片、矢量、模型等）
- **LayerUtil**: 图层相关工具函数
- **LayerManager**: 图层管理器，负责图层的管理

### 控制模块 (Control)

处理用户交互控制，包括鼠标、键盘等输入。

- **BaseControl**: 控制基础类
- **MouseControl**: 鼠标交互控制
- **KeyboardControl**: 键盘交互控制
- **ControlManager**: 控制管理器

### 效果模块 (Effect)

提供各种视觉效果，如粒子系统、后处理等。

- **BaseEffect**: 效果基础类
- **ParticleEffect**: 粒子效果系统
- **PostProcessEffect**: 屏幕后处理效果
- **EffectManager**: 效果管理器

### 材质模块 (Material)

管理各种材质效果，如水面、火焰等。

- **BaseMaterial**: 材质基础类
- **WaterMaterial**: 水面材质效果
- **FireMaterial**: 火焰材质效果
- **MaterialManager**: 材质管理器

### 工具模块 (Util)

提供各种工具函数，包括数学计算、坐标转换等。

- **MathUtil**: 数学计算工具
- **CoordinateUtil**: 坐标转换工具
- **DomUtil**: DOM操作工具
- **HttpUtil**: HTTP请求工具
- **UtilManager**: 工具管理器

## 🧪 测试

### 运行测试

1. **JavaScript测试**:
   ```javascript
   import { test } from './mars3d/test.js';
   
   // 运行所有测试
   test.runAllTests().then(results => {
       console.log('测试结果:', results);
   });
   ```

2. **HTML测试页面**:
   直接在浏览器中打开 `test.html` 文件，点击"开始测试"按钮。

### 测试内容

- ✅ 模块导入测试
- ✅ 类实例化测试
- ✅ 基础功能测试
- ✅ 工具函数测试
- ✅ 管理器功能测试

## 🔧 配置选项

### Mars3D 主类配置

```javascript
const mars3d = new Mars3D({
    // Cesium Viewer 配置
    container: 'cesiumContainer',
    scene3DOnly: true,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    
    // Mars3D 扩展配置
    control: {
        mouseControl: true,
        keyboardControl: true
    },
    
    // 图层配置
    layers: [
        {
            type: 'xyz',
            url: 'https://...',
            show: true
        }
    ],
    
    // 效果配置
    effects: {
        bloom: false,
        fxaa: true
    }
});
```

## 📚 API 文档

### 主要类和方法

#### Mars3D 主类

```javascript
class Mars3D {
    constructor(options)          // 构造函数
    get viewer()                  // 获取Cesium Viewer
    addLayer(layer)              // 添加图层
    removeLayer(layer)           // 移除图层
    addGraphic(graphic)          // 添加图形
    removeGraphic(graphic)       // 移除图形
    destroy()                    // 销毁实例
}
```

#### 管理器类通用方法

```javascript
class Manager {
    add(item)                    // 添加项目
    remove(item)                 // 移除项目
    getById(id)                  // 根据ID获取
    getAll()                     // 获取所有项目
    clear()                      // 清空所有
    show(item)                   // 显示项目
    hide(item)                   // 隐藏项目
}
```

## 🎯 使用示例

### 创建点图形

```javascript
import { GraphicManager, GraphicType } from './mars3d/graphic/index.js';

const graphicManager = new GraphicManager();

const point = graphicManager.create(GraphicType.POINT, {
    position: [116.4, 39.9, 0],
    style: {
        color: '#ff0000',
        pixelSize: 10,
        outlineColor: '#ffffff',
        outlineWidth: 2
    },
    attr: {
        name: '北京',
        type: '首都'
    }
});

// 添加到地图
graphicManager.add(point);
```

### 添加图层

```javascript
import { LayerManager, LayerType } from './mars3d/layer/index.js';

const layerManager = new LayerManager();

const tileLayer = layerManager.create(LayerType.XYZ, {
    url: 'https://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
    name: '高德地图',
    show: true
});

layerManager.add(tileLayer);
```

### 使用工具函数

```javascript
import { MathUtil, CoordinateUtil } from './mars3d/util/index.js';

// 计算两点距离
const distance = MathUtil.distance2D([116.4, 39.9], [116.5, 40.0]);
console.log('距离:', distance, '米');

// 坐标转换
const cartesian = CoordinateUtil.lonLatToCartesian(116.4, 39.9, 0);
console.log('笛卡尔坐标:', cartesian);

// 角度转弧度
const radians = MathUtil.toRadians(90);
console.log('90度 =', radians, '弧度');
```

### 添加效果

```javascript
import { EffectManager, ParticleEffect } from './mars3d/effect/index.js';

const effectManager = new EffectManager();

// 创建粒子效果
const particleEffect = new ParticleEffect({
    position: [116.4, 39.9, 100],
    particleCount: 1000,
    particleSize: 5,
    color: '#ff6600',
    speed: 10,
    life: 5
});

effectManager.add(particleEffect);
```

### 应用材质

```javascript
import { MaterialManager, WaterMaterial } from './mars3d/material/index.js';

const materialManager = new MaterialManager();

// 创建水面材质
const waterMaterial = new WaterMaterial({
    normalMap: './assets/textures/waterNormals.jpg',
    frequency: 1000.0,
    animationSpeed: 0.01,
    amplitude: 10.0,
    specularIntensity: 0.5,
    baseWaterColor: '#006ab4',
    blendColor: '#006ab4'
});

// 应用到实体
const entity = viewer.entities.add({
    polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
            116.3, 39.8,
            116.5, 39.8,
            116.5, 40.0,
            116.3, 40.0
        ]),
        material: waterMaterial.getMaterial()
    }
});
```

## 🔄 版本历史

### v1.0.0 (2024-01-15)
- ✨ 初始版本发布
- 🏗️ 完成模块化重构
- 📦 实现核心、图形、图层、控制、效果、材质、工具七大模块
- 🧪 添加完整的测试套件
- 📚 提供详细的文档和示例

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Mars3D](http://mars3d.cn/) - 原始Mars3D库
- [Cesium](https://cesium.com/) - 3D地球和地图引擎
- 所有贡献者和用户的支持

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 📧 邮箱: [your-email@example.com]
- 🐛 问题反馈: [GitHub Issues]
- 💬 讨论: [GitHub Discussions]

---

**Happy Coding! 🎉**