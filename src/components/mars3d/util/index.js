/**
 * Mars3D 工具模块 - 索引文件
 * 统一导出所有工具类
 */

import MathUtil from './MathUtil.js';
import CoordinateUtil from './CoordinateUtil.js';
import DomUtil from './DomUtil.js';
import HttpUtil from './HttpUtil.js';

// 导出工具类
export {
    MathUtil,
    CoordinateUtil,
    DomUtil,
    HttpUtil
};

/**
 * 工具工厂类
 * 用于创建和管理各种工具实例
 */
export class UtilFactory {
    /**
     * 获取数学工具
     * @returns {MathUtil} 数学工具类
     */
    static getMathUtil() {
        return MathUtil;
    }

    /**
     * 获取坐标工具
     * @returns {CoordinateUtil} 坐标工具类
     */
    static getCoordinateUtil() {
        return CoordinateUtil;
    }

    /**
     * 获取DOM工具
     * @returns {DomUtil} DOM工具类
     */
    static getDomUtil() {
        return DomUtil;
    }

    /**
     * 获取HTTP工具
     * @returns {HttpUtil} HTTP工具类
     */
    static getHttpUtil() {
        return HttpUtil;
    }

    /**
     * 获取所有工具
     * @returns {Object} 所有工具类
     */
    static getAllUtils() {
        return {
            MathUtil,
            CoordinateUtil,
            DomUtil,
            HttpUtil
        };
    }
}

/**
 * 工具管理器类
 * 提供工具的统一管理和配置
 */
export class UtilManager {
    constructor() {
        this.utils = new Map();
        this.config = {
            math: {
                precision: 6,
                angleUnit: 'degrees' // 'degrees' or 'radians'
            },
            coordinate: {
                defaultEllipsoid: 'WGS84',
                precision: 6
            },
            dom: {
                debounceDelay: 300,
                throttleLimit: 100
            },
            http: {
                timeout: 10000,
                retries: 3,
                retryDelay: 1000
            }
        };
    }

    /**
     * 初始化工具管理器
     * @param {Object} [config] - 配置选项
     */
    initialize(config = {}) {
        // 合并配置
        this.config = this.mergeConfig(this.config, config);
        
        // 配置HTTP工具
        if (config.http) {
            HttpUtil.setDefaultConfig(config.http);
        }
        
        console.log('Mars3D UtilManager initialized');
    }

    /**
     * 获取工具实例
     * @param {string} name - 工具名称
     * @returns {*} 工具实例
     */
    getUtil(name) {
        switch (name.toLowerCase()) {
            case 'math':
                return MathUtil;
            case 'coordinate':
                return CoordinateUtil;
            case 'dom':
                return DomUtil;
            case 'http':
                return HttpUtil;
            default:
                console.warn(`Unknown util: ${name}`);
                return null;
        }
    }

    /**
     * 注册自定义工具
     * @param {string} name - 工具名称
     * @param {*} util - 工具类或实例
     */
    registerUtil(name, util) {
        this.utils.set(name, util);
    }

    /**
     * 注销工具
     * @param {string} name - 工具名称
     */
    unregisterUtil(name) {
        this.utils.delete(name);
    }

    /**
     * 获取自定义工具
     * @param {string} name - 工具名称
     * @returns {*} 工具实例
     */
    getCustomUtil(name) {
        return this.utils.get(name);
    }

    /**
     * 获取所有已注册的工具
     * @returns {Array<string>} 工具名称列表
     */
    getRegisteredUtils() {
        return Array.from(this.utils.keys());
    }

    /**
     * 清空所有自定义工具
     */
    clearCustomUtils() {
        this.utils.clear();
    }

    /**
     * 获取配置
     * @param {string} [key] - 配置键
     * @returns {*} 配置值
     */
    getConfig(key) {
        if (key) {
            return this.getNestedValue(this.config, key);
        }
        return this.config;
    }

    /**
     * 设置配置
     * @param {string|Object} key - 配置键或配置对象
     * @param {*} [value] - 配置值
     */
    setConfig(key, value) {
        if (typeof key === 'object') {
            this.config = this.mergeConfig(this.config, key);
        } else {
            this.setNestedValue(this.config, key, value);
        }
    }

    /**
     * 重置配置
     */
    resetConfig() {
        this.config = {
            math: {
                precision: 6,
                angleUnit: 'degrees'
            },
            coordinate: {
                defaultEllipsoid: 'WGS84',
                precision: 6
            },
            dom: {
                debounceDelay: 300,
                throttleLimit: 100
            },
            http: {
                timeout: 10000,
                retries: 3,
                retryDelay: 1000
            }
        };
    }

    /**
     * 执行工具方法
     * @param {string} utilName - 工具名称
     * @param {string} methodName - 方法名称
     * @param {...*} args - 方法参数
     * @returns {*} 执行结果
     */
    execute(utilName, methodName, ...args) {
        const util = this.getUtil(utilName) || this.getCustomUtil(utilName);
        
        if (!util) {
            throw new Error(`Util '${utilName}' not found`);
        }
        
        if (typeof util[methodName] !== 'function') {
            throw new Error(`Method '${methodName}' not found in util '${utilName}'`);
        }
        
        return util[methodName](...args);
    }

    /**
     * 批量执行工具方法
     * @param {Array<Object>} operations - 操作数组 [{util, method, args}, ...]
     * @returns {Array<*>} 执行结果数组
     */
    batchExecute(operations) {
        const results = [];
        
        for (const operation of operations) {
            try {
                const result = this.execute(operation.util, operation.method, ...operation.args);
                results.push({ success: true, result });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    /**
     * 获取工具信息
     * @param {string} [utilName] - 工具名称
     * @returns {Object} 工具信息
     */
    getUtilInfo(utilName) {
        if (utilName) {
            const util = this.getUtil(utilName) || this.getCustomUtil(utilName);
            if (!util) {
                return null;
            }
            
            return {
                name: utilName,
                methods: Object.getOwnPropertyNames(util)
                    .filter(name => typeof util[name] === 'function'),
                isCustom: this.utils.has(utilName)
            };
        }
        
        // 返回所有工具信息
        const builtinUtils = ['math', 'coordinate', 'dom', 'http'];
        const customUtils = this.getRegisteredUtils();
        
        return {
            builtin: builtinUtils.map(name => this.getUtilInfo(name)),
            custom: customUtils.map(name => this.getUtilInfo(name)),
            total: builtinUtils.length + customUtils.length
        };
    }

    /**
     * 验证工具方法
     * @param {string} utilName - 工具名称
     * @param {string} methodName - 方法名称
     * @returns {boolean} 是否存在
     */
    hasMethod(utilName, methodName) {
        const util = this.getUtil(utilName) || this.getCustomUtil(utilName);
        return util && typeof util[methodName] === 'function';
    }

    /**
     * 销毁工具管理器
     */
    destroy() {
        this.clearCustomUtils();
        this.resetConfig();
        console.log('Mars3D UtilManager destroyed');
    }

    /**
     * 导出配置
     * @returns {Object} 配置对象
     */
    exportConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * 导入配置
     * @param {Object} config - 配置对象
     */
    importConfig(config) {
        try {
            this.config = this.mergeConfig(this.config, config);
            return true;
        } catch (error) {
            console.error('Failed to import config:', error);
            return false;
        }
    }

    /**
     * 合并配置
     * @param {Object} target - 目标配置
     * @param {Object} source - 源配置
     * @returns {Object} 合并后的配置
     */
    mergeConfig(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                    result[key] = this.mergeConfig(target[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * 获取嵌套值
     * @param {Object} obj - 对象
     * @param {string} path - 路径
     * @returns {*} 值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * 设置嵌套值
     * @param {Object} obj - 对象
     * @param {string} path - 路径
     * @param {*} value - 值
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }
}

// 创建默认实例
export const utilManager = new UtilManager();

// 默认导出
export default {
    MathUtil,
    CoordinateUtil,
    DomUtil,
    HttpUtil,
    UtilFactory,
    UtilManager,
    utilManager
};