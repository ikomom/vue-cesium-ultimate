/**
 * Mars3D 材质模块 - 基础材质类
 * 作为所有材质的基类，提供通用的材质功能
 */

import { EventType, uuid } from '../core/index.js';

/**
 * 基础材质类
 * 所有材质类的基类
 */
export default class BaseMaterial {
    /**
     * 构造函数
     * @param {Object} options - 材质配置选项
     * @param {string} [options.id] - 材质ID
     * @param {string} [options.type] - 材质类型
     * @param {string} [options.name] - 材质名称
     * @param {boolean} [options.enabled=true] - 是否启用
     * @param {Object} [options.uniforms={}] - 着色器uniform变量
     * @param {string} [options.vertexShaderSource] - 顶点着色器源码
     * @param {string} [options.fragmentShaderSource] - 片段着色器源码
     * @param {boolean} [options.translucent=false] - 是否半透明
     * @param {Object} [options.fabric] - Cesium Fabric材质定义
     */
    constructor(options = {}) {
        this.id = options.id || uuid();
        this.type = options.type || 'base';
        this.name = options.name || `Material_${this.id.substring(0, 8)}`;
        this.enabled = options.enabled !== false;
        
        // 材质属性
        this.uniforms = options.uniforms || {};
        this.vertexShaderSource = options.vertexShaderSource || null;
        this.fragmentShaderSource = options.fragmentShaderSource || null;
        this.translucent = options.translucent || false;
        this.fabric = options.fabric || null;
        
        // Cesium材质实例
        this._material = null;
        this._viewer = null;
        
        // 事件系统
        this._events = {};
        
        // 内部状态
        this._isDestroyed = false;
        this._isAdded = false;
        
        // 配置选项
        this.options = { ...options };
        
        // 初始化材质
        this._initialize();
    }

    /**
     * 初始化材质
     * @private
     */
    _initialize() {
        // 子类可以重写此方法
    }

    /**
     * 添加到地图
     * @param {Cesium.Viewer} viewer - Cesium视图器
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    addTo(viewer) {
        if (this._isDestroyed) {
            throw new Error('Material has been destroyed');
        }
        
        this._viewer = viewer;
        this._addToMap();
        this._isAdded = true;
        
        this.fire(EventType.ADD, { material: this });
        return this;
    }

    /**
     * 从地图移除
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    remove() {
        if (!this._isAdded) {
            return this;
        }
        
        this._removeFromMap();
        this._isAdded = false;
        this._viewer = null;
        
        this.fire(EventType.REMOVE, { material: this });
        return this;
    }

    /**
     * 销毁材质
     */
    destroy() {
        if (this._isDestroyed) {
            return;
        }
        
        this.remove();
        this._cleanup();
        this._isDestroyed = true;
        
        this.fire(EventType.DESTROY, { material: this });
        this._events = {};
    }

    /**
     * 启用材质
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    enable() {
        if (this.enabled) {
            return this;
        }
        
        this.enabled = true;
        this._onEnable();
        
        this.fire(EventType.ENABLE, { material: this });
        return this;
    }

    /**
     * 禁用材质
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    disable() {
        if (!this.enabled) {
            return this;
        }
        
        this.enabled = false;
        this._onDisable();
        
        this.fire(EventType.DISABLE, { material: this });
        return this;
    }

    /**
     * 切换启用状态
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    toggle() {
        return this.enabled ? this.disable() : this.enable();
    }

    /**
     * 设置uniform变量
     * @param {string} name - 变量名
     * @param {*} value - 变量值
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    setUniform(name, value) {
        this.uniforms[name] = value;
        this._updateUniform(name, value);
        
        this.fire(EventType.UNIFORM_CHANGE, { 
            material: this, 
            name, 
            value 
        });
        return this;
    }

    /**
     * 获取uniform变量
     * @param {string} name - 变量名
     * @returns {*} 变量值
     */
    getUniform(name) {
        return this.uniforms[name];
    }

    /**
     * 批量设置uniform变量
     * @param {Object} uniforms - uniform变量对象
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    setUniforms(uniforms) {
        Object.keys(uniforms).forEach(name => {
            this.setUniform(name, uniforms[name]);
        });
        return this;
    }

    /**
     * 设置半透明状态
     * @param {boolean} translucent - 是否半透明
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    setTranslucent(translucent) {
        this.translucent = translucent;
        this._updateTranslucent();
        
        this.fire(EventType.TRANSLUCENT_CHANGE, { 
            material: this, 
            translucent 
        });
        return this;
    }

    /**
     * 获取Cesium材质实例
     * @returns {Cesium.Material} Cesium材质实例
     */
    getCesiumMaterial() {
        return this._material;
    }

    /**
     * 检查材质是否已添加到地图
     * @returns {boolean} 是否已添加
     */
    get isAdded() {
        return this._isAdded;
    }

    /**
     * 检查材质是否已销毁
     * @returns {boolean} 是否已销毁
     */
    get isDestroyed() {
        return this._isDestroyed;
    }

    /**
     * 获取配置选项
     * @param {string} key - 选项键名
     * @returns {*} 选项值
     */
    getOption(key) {
        return this.options[key];
    }

    /**
     * 设置配置选项
     * @param {string} key - 选项键名
     * @param {*} value - 选项值
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    setOption(key, value) {
        this.options[key] = value;
        this._onOptionChange(key, value);
        return this;
    }

    /**
     * 序列化为JSON
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            enabled: this.enabled,
            uniforms: this.uniforms,
            translucent: this.translucent,
            options: this.options
        };
    }

    /**
     * 从JSON反序列化
     * @param {Object} json - JSON对象
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    fromJSON(json) {
        this.id = json.id || this.id;
        this.type = json.type || this.type;
        this.name = json.name || this.name;
        this.enabled = json.enabled !== false;
        this.uniforms = json.uniforms || {};
        this.translucent = json.translucent || false;
        this.options = { ...this.options, ...json.options };
        
        this._onFromJSON(json);
        return this;
    }

    // 事件系统方法
    /**
     * 绑定事件
     * @param {string} type - 事件类型
     * @param {Function} listener - 事件监听器
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    on(type, listener) {
        if (!this._events[type]) {
            this._events[type] = [];
        }
        this._events[type].push(listener);
        return this;
    }

    /**
     * 解绑事件
     * @param {string} type - 事件类型
     * @param {Function} [listener] - 事件监听器，不传则解绑所有
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    off(type, listener) {
        if (!this._events[type]) {
            return this;
        }
        
        if (!listener) {
            delete this._events[type];
        } else {
            const index = this._events[type].indexOf(listener);
            if (index > -1) {
                this._events[type].splice(index, 1);
            }
        }
        return this;
    }

    /**
     * 触发事件
     * @param {string} type - 事件类型
     * @param {Object} [data] - 事件数据
     * @returns {BaseMaterial} 返回自身以支持链式调用
     */
    fire(type, data = {}) {
        if (!this._events[type]) {
            return this;
        }
        
        this._events[type].forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in material event listener:', error);
            }
        });
        return this;
    }

    // 内部方法，供子类重写
    /**
     * 添加到地图的内部实现
     * @protected
     */
    _addToMap() {
        // 子类重写
    }

    /**
     * 从地图移除的内部实现
     * @protected
     */
    _removeFromMap() {
        // 子类重写
    }

    /**
     * 清理资源的内部实现
     * @protected
     */
    _cleanup() {
        if (this._material && !this._material.isDestroyed()) {
            this._material.destroy();
        }
        this._material = null;
    }

    /**
     * 启用时的内部处理
     * @protected
     */
    _onEnable() {
        // 子类重写
    }

    /**
     * 禁用时的内部处理
     * @protected
     */
    _onDisable() {
        // 子类重写
    }

    /**
     * 更新uniform变量的内部实现
     * @param {string} name - 变量名
     * @param {*} value - 变量值
     * @protected
     */
    _updateUniform(name, value) {
        if (this._material && this._material.uniforms) {
            this._material.uniforms[name] = value;
        }
    }

    /**
     * 更新半透明状态的内部实现
     * @protected
     */
    _updateTranslucent() {
        // 子类重写
    }

    /**
     * 配置选项变化时的内部处理
     * @param {string} key - 选项键名
     * @param {*} value - 选项值
     * @protected
     */
    _onOptionChange(key, value) {
        // 子类重写
    }

    /**
     * 从JSON反序列化时的内部处理
     * @param {Object} json - JSON对象
     * @protected
     */
    _onFromJSON(json) {
        // 子类重写
    }
}