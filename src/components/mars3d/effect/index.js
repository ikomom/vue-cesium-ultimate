/**
 * Mars3D 效果模块
 * 提供各种视觉效果功能
 */

import BaseEffect from './BaseEffect.js';
import ParticleEffect from './ParticleEffect.js';
import PostProcessEffect from './PostProcessEffect.js';

/**
 * 效果工厂类
 * 用于创建和反序列化效果实例
 */
export class EffectFactory {
    /**
     * 效果类型映射
     */
    static effectTypes = {
        'base': BaseEffect,
        'particle': ParticleEffect,
        'postprocess': PostProcessEffect
    };

    /**
     * 创建效果实例
     * @param {string} type - 效果类型
     * @param {Object} options - 效果配置选项
     * @returns {BaseEffect} 效果实例
     */
    static create(type, options = {}) {
        const EffectClass = this.effectTypes[type];
        if (!EffectClass) {
            throw new Error(`Unknown effect type: ${type}`);
        }
        return new EffectClass(options);
    }

    /**
     * 从JSON数据反序列化效果
     * @param {Object} json - JSON数据
     * @returns {BaseEffect} 效果实例
     */
    static fromJSON(json) {
        const { type, ...options } = json;
        return this.create(type, options);
    }

    /**
     * 注册新的效果类型
     * @param {string} type - 效果类型名称
     * @param {Function} EffectClass - 效果类
     */
    static register(type, EffectClass) {
        this.effectTypes[type] = EffectClass;
    }

    /**
     * 获取所有已注册的效果类型
     * @returns {Array<string>} 效果类型列表
     */
    static getTypes() {
        return Object.keys(this.effectTypes);
    }
}

/**
 * 效果管理器类
 * 用于管理多个效果实例
 */
export class EffectManager {
    constructor(viewer) {
        this.viewer = viewer;
        this.effects = new Map();
        this._enabled = true;
    }

    /**
     * 添加效果
     * @param {BaseEffect} effect - 效果实例
     * @returns {EffectManager} 返回自身以支持链式调用
     */
    add(effect) {
        if (!(effect instanceof BaseEffect)) {
            throw new Error('Effect must be an instance of BaseEffect');
        }
        
        this.effects.set(effect.id, effect);
        effect.addTo(this.viewer);
        return this;
    }

    /**
     * 移除效果
     * @param {string|BaseEffect} effect - 效果ID或效果实例
     * @returns {boolean} 是否成功移除
     */
    remove(effect) {
        const id = typeof effect === 'string' ? effect : effect.id;
        const effectInstance = this.effects.get(id);
        
        if (effectInstance) {
            effectInstance.remove();
            this.effects.delete(id);
            return true;
        }
        return false;
    }

    /**
     * 根据ID获取效果
     * @param {string} id - 效果ID
     * @returns {BaseEffect|undefined} 效果实例
     */
    getById(id) {
        return this.effects.get(id);
    }

    /**
     * 根据类型获取效果列表
     * @param {string} type - 效果类型
     * @returns {Array<BaseEffect>} 效果实例列表
     */
    getByType(type) {
        return Array.from(this.effects.values()).filter(effect => effect.type === type);
    }

    /**
     * 根据名称获取效果
     * @param {string} name - 效果名称
     * @returns {BaseEffect|undefined} 效果实例
     */
    getByName(name) {
        return Array.from(this.effects.values()).find(effect => effect.name === name);
    }

    /**
     * 获取所有效果
     * @returns {Array<BaseEffect>} 所有效果实例
     */
    getAll() {
        return Array.from(this.effects.values());
    }

    /**
     * 显示效果
     * @param {string|BaseEffect} effect - 效果ID或效果实例
     * @returns {boolean} 是否成功显示
     */
    show(effect) {
        const id = typeof effect === 'string' ? effect : effect.id;
        const effectInstance = this.effects.get(id);
        
        if (effectInstance) {
            effectInstance.enable();
            return true;
        }
        return false;
    }

    /**
     * 隐藏效果
     * @param {string|BaseEffect} effect - 效果ID或效果实例
     * @returns {boolean} 是否成功隐藏
     */
    hide(effect) {
        const id = typeof effect === 'string' ? effect : effect.id;
        const effectInstance = this.effects.get(id);
        
        if (effectInstance) {
            effectInstance.disable();
            return true;
        }
        return false;
    }

    /**
     * 显示所有效果
     */
    showAll() {
        this.effects.forEach(effect => effect.enable());
    }

    /**
     * 隐藏所有效果
     */
    hideAll() {
        this.effects.forEach(effect => effect.disable());
    }

    /**
     * 清空所有效果
     */
    clear() {
        this.effects.forEach(effect => effect.destroy());
        this.effects.clear();
    }

    /**
     * 启动所有效果
     */
    startAll() {
        this.effects.forEach(effect => effect.start());
    }

    /**
     * 停止所有效果
     */
    stopAll() {
        this.effects.forEach(effect => effect.stop());
    }

    /**
     * 暂停所有效果
     */
    pauseAll() {
        this.effects.forEach(effect => effect.pause());
    }

    /**
     * 恢复所有效果
     */
    resumeAll() {
        this.effects.forEach(effect => effect.resume());
    }

    /**
     * 重置所有效果
     */
    resetAll() {
        this.effects.forEach(effect => effect.reset());
    }

    /**
     * 启用效果管理器
     */
    enable() {
        this._enabled = true;
        this.showAll();
    }

    /**
     * 禁用效果管理器
     */
    disable() {
        this._enabled = false;
        this.hideAll();
    }

    /**
     * 检查效果管理器是否启用
     * @returns {boolean} 是否启用
     */
    get enabled() {
        return this._enabled;
    }

    /**
     * 获取效果数量
     * @returns {number} 效果数量
     */
    get count() {
        return this.effects.size;
    }

    /**
     * 检查是否为空
     * @returns {boolean} 是否为空
     */
    get isEmpty() {
        return this.effects.size === 0;
    }

    /**
     * 导出所有效果为JSON
     * @returns {Array<Object>} JSON数据数组
     */
    toJSON() {
        return Array.from(this.effects.values()).map(effect => effect.toJSON());
    }

    /**
     * 从JSON数据导入效果
     * @param {Array<Object>} jsonArray - JSON数据数组
     */
    fromJSON(jsonArray) {
        this.clear();
        jsonArray.forEach(json => {
            const effect = EffectFactory.fromJSON(json);
            this.add(effect);
        });
    }

    /**
     * 批量操作效果
     * @param {Array<string>} ids - 效果ID数组
     * @param {string} operation - 操作类型 ('show', 'hide', 'start', 'stop', 'pause', 'resume', 'reset', 'remove')
     */
    batch(ids, operation) {
        const validOperations = ['show', 'hide', 'start', 'stop', 'pause', 'resume', 'reset', 'remove'];
        if (!validOperations.includes(operation)) {
            throw new Error(`Invalid operation: ${operation}`);
        }

        ids.forEach(id => {
            const effect = this.effects.get(id);
            if (effect) {
                switch (operation) {
                    case 'show':
                        effect.enable();
                        break;
                    case 'hide':
                        effect.disable();
                        break;
                    case 'start':
                        effect.start();
                        break;
                    case 'stop':
                        effect.stop();
                        break;
                    case 'pause':
                        effect.pause();
                        break;
                    case 'resume':
                        effect.resume();
                        break;
                    case 'reset':
                        effect.reset();
                        break;
                    case 'remove':
                        this.remove(effect);
                        break;
                }
            }
        });
    }

    /**
     * 销毁效果管理器
     */
    destroy() {
        this.clear();
        this.viewer = null;
    }
}

// 导出所有效果类
export {
    BaseEffect,
    ParticleEffect,
    PostProcessEffect
};

// 默认导出
export default {
    BaseEffect,
    ParticleEffect,
    PostProcessEffect,
    EffectFactory,
    EffectManager
};