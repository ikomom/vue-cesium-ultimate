/**
 * Mars3D 材质模块
 * 提供各种材质效果功能
 */

import BaseMaterial from './BaseMaterial.js';
import WaterMaterial from './WaterMaterial.js';
import FireMaterial from './FireMaterial.js';

/**
 * 材质工厂类
 * 用于创建和反序列化材质实例
 */
export class MaterialFactory {
    /**
     * 材质类型映射
     */
    static materialTypes = {
        'base': BaseMaterial,
        'water': WaterMaterial,
        'fire': FireMaterial
    };

    /**
     * 创建材质实例
     * @param {string} type - 材质类型
     * @param {Object} options - 材质配置选项
     * @returns {BaseMaterial} 材质实例
     */
    static create(type, options = {}) {
        const MaterialClass = this.materialTypes[type];
        if (!MaterialClass) {
            throw new Error(`Unknown material type: ${type}`);
        }
        return new MaterialClass(options);
    }

    /**
     * 从JSON数据反序列化材质
     * @param {Object} json - JSON数据
     * @returns {BaseMaterial} 材质实例
     */
    static fromJSON(json) {
        const { type, ...options } = json;
        return this.create(type, options);
    }

    /**
     * 注册新的材质类型
     * @param {string} type - 材质类型名称
     * @param {Function} MaterialClass - 材质类
     */
    static register(type, MaterialClass) {
        this.materialTypes[type] = MaterialClass;
    }

    /**
     * 获取所有已注册的材质类型
     * @returns {Array<string>} 材质类型列表
     */
    static getTypes() {
        return Object.keys(this.materialTypes);
    }

    /**
     * 创建预设材质
     * @param {string} preset - 预设名称
     * @param {Object} options - 额外选项
     * @returns {BaseMaterial} 材质实例
     */
    static createPreset(preset, options = {}) {
        const presets = {
            // 水面预设
            'ocean': () => this.create('water', {
                baseWaterColor: new Cesium.Color(0.0, 0.3, 0.7, 0.8),
                blendColor: new Cesium.Color(0.0, 0.8, 1.0, 0.6),
                frequency: 8.0,
                animationSpeed: 0.02,
                amplitude: 0.8,
                ...options
            }),
            'lake': () => this.create('water', {
                baseWaterColor: new Cesium.Color(0.1, 0.4, 0.6, 0.9),
                blendColor: new Cesium.Color(0.2, 0.6, 0.8, 0.7),
                frequency: 5.0,
                animationSpeed: 0.01,
                amplitude: 0.3,
                ...options
            }),
            'river': () => this.create('water', {
                baseWaterColor: new Cesium.Color(0.2, 0.5, 0.7, 0.8),
                blendColor: new Cesium.Color(0.3, 0.7, 0.9, 0.6),
                frequency: 12.0,
                animationSpeed: 0.03,
                amplitude: 0.5,
                ...options
            }),
            
            // 火焰预设
            'campfire': () => this.create('fire', {
                color: new Cesium.Color(1.0, 0.4, 0.1, 1.0),
                speed: 0.3,
                intensity: 0.8,
                frequency: 1.5,
                amplitude: 0.4,
                ...options
            }),
            'torch': () => this.create('fire', {
                color: new Cesium.Color(1.0, 0.5, 0.0, 1.0),
                speed: 0.5,
                intensity: 1.0,
                frequency: 2.0,
                amplitude: 0.6,
                ...options
            }),
            'explosion': () => this.create('fire', {
                color: new Cesium.Color(1.0, 0.2, 0.0, 1.0),
                speed: 1.0,
                intensity: 1.5,
                frequency: 3.0,
                amplitude: 0.8,
                ...options
            })
        };
        
        const presetFunction = presets[preset];
        if (!presetFunction) {
            throw new Error(`Unknown material preset: ${preset}`);
        }
        
        return presetFunction();
    }

    /**
     * 获取所有预设名称
     * @returns {Array<string>} 预设名称列表
     */
    static getPresets() {
        return ['ocean', 'lake', 'river', 'campfire', 'torch', 'explosion'];
    }
}

/**
 * 材质管理器类
 * 用于管理多个材质实例
 */
export class MaterialManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.materials = new Map();
        this._enabled = true;
    }

    /**
     * 添加材质
     * @param {BaseMaterial} material - 材质实例
     * @returns {MaterialManager} 返回自身以支持链式调用
     */
    add(material) {
        if (!(material instanceof BaseMaterial)) {
            throw new Error('Material must be an instance of BaseMaterial');
        }
        
        this.materials.set(material.id, material);
        material.addTo(this.viewer);
        return this;
    }

    /**
     * 移除材质
     * @param {string|BaseMaterial} material - 材质ID或材质实例
     * @returns {boolean} 是否成功移除
     */
    remove(material) {
        const id = typeof material === 'string' ? material : material.id;
        const materialInstance = this.materials.get(id);
        
        if (materialInstance) {
            materialInstance.remove();
            this.materials.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 根据ID获取材质
     * @param {string} id - 材质ID
     * @returns {BaseMaterial|undefined} 材质实例
     */
    getById(id) {
        return this.materials.get(id);
    }

    /**
     * 根据类型获取材质列表
     * @param {string} type - 材质类型
     * @returns {Array<BaseMaterial>} 材质实例列表
     */
    getByType(type) {
        return Array.from(this.materials.values()).filter(material => material.type === type);
    }

    /**
     * 根据名称获取材质
     * @param {string} name - 材质名称
     * @returns {BaseMaterial|undefined} 材质实例
     */
    getByName(name) {
        return Array.from(this.materials.values()).find(material => material.name === name);
    }

    /**
     * 获取所有材质
     * @returns {Array<BaseMaterial>} 所有材质实例
     */
    getAll() {
        return Array.from(this.materials.values());
    }

    /**
     * 显示材质
     * @param {string|BaseMaterial} material - 材质ID或材质实例
     * @returns {boolean} 是否成功显示
     */
    show(material) {
        const id = typeof material === 'string' ? material : material.id;
        const materialInstance = this.materials.get(id);
        
        if (materialInstance) {
            materialInstance.enable();
            return true;
        }
        return false;
    }

    /**
     * 隐藏材质
     * @param {string|BaseMaterial} material - 材质ID或材质实例
     * @returns {boolean} 是否成功隐藏
     */
    hide(material) {
        const id = typeof material === 'string' ? material : material.id;
        const materialInstance = this.materials.get(id);
        
        if (materialInstance) {
            materialInstance.disable();
            return true;
        }
        return false;
    }

    /**
     * 显示所有材质
     */
    showAll() {
        this.materials.forEach(material => material.enable());
    }

    /**
     * 隐藏所有材质
     */
    hideAll() {
        this.materials.forEach(material => material.disable());
    }

    /**
     * 清空所有材质
     */
    clear() {
        this.materials.forEach(material => material.destroy());
        this.materials.clear();
    }

    /**
     * 启用材质管理器
     */
    enable() {
        this._enabled = true;
        this.showAll();
    }

    /**
     * 禁用材质管理器
     */
    disable() {
        this._enabled = false;
        this.hideAll();
    }

    /**
     * 检查材质管理器是否启用
     * @returns {boolean} 是否启用
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * 获取材质数量
     * @returns {number} 材质数量
     */
    get count() {
        return this.materials.size;
    }

    /**
     * 检查是否为空
     * @returns {boolean} 是否为空
     */
    get isEmpty() {
        return this.materials.size === 0;
    }

    /**
     * 应用材质到实体
     * @param {Cesium.Entity} entity - Cesium实体
     * @param {string|BaseMaterial} material - 材质ID或材质实例
     * @param {string} [property='material'] - 材质属性名
     * @returns {boolean} 是否成功应用
     */
    applyToEntity(entity, material, property = 'material') {
        const materialInstance = typeof material === 'string' ? this.materials.get(material) : material;
        
        if (!materialInstance) {
            return false;
        }
        
        const cesiumMaterial = materialInstance.getCesiumMaterial();
        if (!cesiumMaterial) {
            return false;
        }
        
        // 根据实体类型应用材质
        if (entity.polygon && property === 'material') {
            entity.polygon.material = cesiumMaterial;
        } else if (entity.rectangle && property === 'material') {
            entity.rectangle.material = cesiumMaterial;
        } else if (entity.ellipse && property === 'material') {
            entity.ellipse.material = cesiumMaterial;
        } else if (entity.wall && property === 'material') {
            entity.wall.material = cesiumMaterial;
        } else if (entity.corridor && property === 'material') {
            entity.corridor.material = cesiumMaterial;
        } else {
            return false;
        }
        
        return true;
    }

    /**
     * 导出所有材质为JSON
     * @returns {Array<Object>} JSON数据数组
     */
    toJSON() {
        return Array.from(this.materials.values()).map(material => material.toJSON());
    }

    /**
     * 从JSON数据导入材质
     * @param {Array<Object>} jsonArray - JSON数据数组
     */
    fromJSON(jsonArray) {
        this.clear();
        jsonArray.forEach(json => {
            const material = MaterialFactory.fromJSON(json);
            this.add(material);
        });
    }

    /**
     * 批量操作材质
     * @param {Array<string>} ids - 材质ID数组
     * @param {string} operation - 操作类型 ('show', 'hide', 'enable', 'disable', 'remove')
     */
    batch(ids, operation) {
        const validOperations = ['show', 'hide', 'enable', 'disable', 'remove'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}`);
        }

        ids.forEach(id => {
            const material = this.materials.get(id);
            if (material) {
                switch (operation) {
                    case 'show':
                    case 'enable':
                        material.enable();
                        break;
                    case 'hide':
                    case 'disable':
                        material.disable();
                        break;
                    case 'remove':
                        this.remove(material);
                        break;
                }
            }
        });
    }

    /**
     * 销毁材质管理器
     */
    destroy() {
        this.clear();
        this.viewer = null;
    }
}

// 导出所有材质类
export {
    BaseMaterial,
    WaterMaterial,
    FireMaterial
};

// 默认导出
export default {
    BaseMaterial,
    WaterMaterial,
    FireMaterial,
    MaterialFactory,
    MaterialManager
};