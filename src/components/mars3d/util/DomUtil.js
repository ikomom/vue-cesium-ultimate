/**
 * Mars3D 工具模块 - DOM工具类
 * 提供DOM操作相关的工具方法
 */

/**
 * DOM工具类
 * 提供常用的DOM操作方法
 */
export default class DomUtil {
    /**
     * 创建DOM元素
     * @param {string} tagName - 标签名
     * @param {Object} [options={}] - 选项
     * @param {string} [options.className] - CSS类名
     * @param {string} [options.id] - 元素ID
     * @param {Object} [options.style] - 样式对象
     * @param {Object} [options.attributes] - 属性对象
     * @param {string} [options.innerHTML] - 内部HTML
     * @param {string} [options.textContent] - 文本内容
     * @param {HTMLElement} [options.parent] - 父元素
     * @returns {HTMLElement} 创建的DOM元素
     */
    static create(tagName, options = {}) {
        const element = document.createElement(tagName);
        
        if (options.className) {
            element.className = options.className;
        }
        
        if (options.id) {
            element.id = options.id;
        }
        
        if (options.style) {
            Object.assign(element.style, options.style);
        }
        
        if (options.attributes) {
            Object.keys(options.attributes).forEach(key => {
                element.setAttribute(key, options.attributes[key]);
            });
        }
        
        if (options.innerHTML) {
            element.innerHTML = options.innerHTML;
        } else if (options.textContent) {
            element.textContent = options.textContent;
        }
        
        if (options.parent) {
            options.parent.appendChild(element);
        }
        
        return element;
    }

    /**
     * 查找DOM元素
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} [parent=document] - 父元素
     * @returns {HTMLElement|null} 找到的元素
     */
    static find(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * 查找所有匹配的DOM元素
     * @param {string} selector - CSS选择器
     * @param {HTMLElement} [parent=document] - 父元素
     * @returns {NodeList} 找到的元素列表
     */
    static findAll(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }

    /**
     * 添加CSS类
     * @param {HTMLElement} element - DOM元素
     * @param {string|Array<string>} className - 类名或类名数组
     */
    static addClass(element, className) {
        if (!element) return;
        
        if (Array.isArray(className)) {
            className.forEach(cls => element.classList.add(cls));
        } else {
            element.classList.add(className);
        }
    }

    /**
     * 移除CSS类
     * @param {HTMLElement} element - DOM元素
     * @param {string|Array<string>} className - 类名或类名数组
     */
    static removeClass(element, className) {
        if (!element) return;
        
        if (Array.isArray(className)) {
            className.forEach(cls => element.classList.remove(cls));
        } else {
            element.classList.remove(className);
        }
    }

    /**
     * 切换CSS类
     * @param {HTMLElement} element - DOM元素
     * @param {string} className - 类名
     * @returns {boolean} 切换后是否包含该类
     */
    static toggleClass(element, className) {
        if (!element) return false;
        return element.classList.toggle(className);
    }

    /**
     * 检查是否包含CSS类
     * @param {HTMLElement} element - DOM元素
     * @param {string} className - 类名
     * @returns {boolean} 是否包含该类
     */
    static hasClass(element, className) {
        if (!element) return false;
        return element.classList.contains(className);
    }

    /**
     * 设置元素样式
     * @param {HTMLElement} element - DOM元素
     * @param {Object|string} styles - 样式对象或样式属性名
     * @param {string} [value] - 样式值（当styles为字符串时使用）
     */
    static setStyle(element, styles, value) {
        if (!element) return;
        
        if (typeof styles === 'string') {
            element.style[styles] = value;
        } else if (typeof styles === 'object') {
            Object.assign(element.style, styles);
        }
    }

    /**
     * 获取元素样式
     * @param {HTMLElement} element - DOM元素
     * @param {string} property - 样式属性名
     * @returns {string} 样式值
     */
    static getStyle(element, property) {
        if (!element) return '';
        return window.getComputedStyle(element)[property];
    }

    /**
     * 显示元素
     * @param {HTMLElement} element - DOM元素
     * @param {string} [display='block'] - 显示方式
     */
    static show(element, display = 'block') {
        if (!element) return;
        element.style.display = display;
    }

    /**
     * 隐藏元素
     * @param {HTMLElement} element - DOM元素
     */
    static hide(element) {
        if (!element) return;
        element.style.display = 'none';
    }

    /**
     * 切换元素显示/隐藏
     * @param {HTMLElement} element - DOM元素
     * @param {string} [display='block'] - 显示方式
     * @returns {boolean} 切换后是否可见
     */
    static toggle(element, display = 'block') {
        if (!element) return false;
        
        const isVisible = this.isVisible(element);
        if (isVisible) {
            this.hide(element);
            return false;
        } else {
            this.show(element, display);
            return true;
        }
    }

    /**
     * 检查元素是否可见
     * @param {HTMLElement} element - DOM元素
     * @returns {boolean} 是否可见
     */
    static isVisible(element) {
        if (!element) return false;
        return element.offsetWidth > 0 && element.offsetHeight > 0;
    }

    /**
     * 获取元素位置信息
     * @param {HTMLElement} element - DOM元素
     * @returns {Object} 位置信息 {left, top, right, bottom, width, height}
     */
    static getPosition(element) {
        if (!element) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * 设置元素位置
     * @param {HTMLElement} element - DOM元素
     * @param {Object} position - 位置信息 {left?, top?, right?, bottom?}
     */
    static setPosition(element, position) {
        if (!element) return;
        
        if (position.left !== undefined) {
            element.style.left = typeof position.left === 'number' ? position.left + 'px' : position.left;
        }
        
        if (position.top !== undefined) {
            element.style.top = typeof position.top === 'number' ? position.top + 'px' : position.top;
        }
        
        if (position.right !== undefined) {
            element.style.right = typeof position.right === 'number' ? position.right + 'px' : position.right;
        }
        
        if (position.bottom !== undefined) {
            element.style.bottom = typeof position.bottom === 'number' ? position.bottom + 'px' : position.bottom;
        }
    }

    /**
     * 获取元素尺寸
     * @param {HTMLElement} element - DOM元素
     * @returns {Object} 尺寸信息 {width, height, clientWidth, clientHeight, scrollWidth, scrollHeight}
     */
    static getSize(element) {
        if (!element) return { width: 0, height: 0, clientWidth: 0, clientHeight: 0, scrollWidth: 0, scrollHeight: 0 };
        
        return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            clientWidth: element.clientWidth,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            scrollHeight: element.scrollHeight
        };
    }

    /**
     * 设置元素尺寸
     * @param {HTMLElement} element - DOM元素
     * @param {Object} size - 尺寸信息 {width?, height?}
     */
    static setSize(element, size) {
        if (!element) return;
        
        if (size.width !== undefined) {
            element.style.width = typeof size.width === 'number' ? size.width + 'px' : size.width;
        }
        
        if (size.height !== undefined) {
            element.style.height = typeof size.height === 'number' ? size.height + 'px' : size.height;
        }
    }

    /**
     * 添加事件监听器
     * @param {HTMLElement} element - DOM元素
     * @param {string} event - 事件名
     * @param {Function} handler - 事件处理函数
     * @param {Object|boolean} [options] - 事件选项
     */
    static on(element, event, handler, options) {
        if (!element || !event || !handler) return;
        element.addEventListener(event, handler, options);
    }

    /**
     * 移除事件监听器
     * @param {HTMLElement} element - DOM元素
     * @param {string} event - 事件名
     * @param {Function} handler - 事件处理函数
     * @param {Object|boolean} [options] - 事件选项
     */
    static off(element, event, handler, options) {
        if (!element || !event || !handler) return;
        element.removeEventListener(event, handler, options);
    }

    /**
     * 触发事件
     * @param {HTMLElement} element - DOM元素
     * @param {string} event - 事件名
     * @param {Object} [detail] - 事件详情
     */
    static trigger(element, event, detail) {
        if (!element || !event) return;
        
        const customEvent = new CustomEvent(event, {
            detail: detail,
            bubbles: true,
            cancelable: true
        });
        
        element.dispatchEvent(customEvent);
    }

    /**
     * 获取元素属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} name - 属性名
     * @returns {string|null} 属性值
     */
    static getAttribute(element, name) {
        if (!element) return null;
        return element.getAttribute(name);
    }

    /**
     * 设置元素属性
     * @param {HTMLElement} element - DOM元素
     * @param {string|Object} name - 属性名或属性对象
     * @param {string} [value] - 属性值（当name为字符串时使用）
     */
    static setAttribute(element, name, value) {
        if (!element) return;
        
        if (typeof name === 'string') {
            element.setAttribute(name, value);
        } else if (typeof name === 'object') {
            Object.keys(name).forEach(key => {
                element.setAttribute(key, name[key]);
            });
        }
    }

    /**
     * 移除元素属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} name - 属性名
     */
    static removeAttribute(element, name) {
        if (!element) return;
        element.removeAttribute(name);
    }

    /**
     * 获取或设置元素数据属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} key - 数据键
     * @param {*} [value] - 数据值（如果提供则设置，否则获取）
     * @returns {*} 数据值（获取时）
     */
    static data(element, key, value) {
        if (!element) return;
        
        if (value !== undefined) {
            // 设置数据
            if (!element._mars3dData) {
                element._mars3dData = {};
            }
            element._mars3dData[key] = value;
        } else {
            // 获取数据
            return element._mars3dData ? element._mars3dData[key] : undefined;
        }
    }

    /**
     * 移除元素数据属性
     * @param {HTMLElement} element - DOM元素
     * @param {string} key - 数据键
     */
    static removeData(element, key) {
        if (!element || !element._mars3dData) return;
        delete element._mars3dData[key];
    }

    /**
     * 清空元素内容
     * @param {HTMLElement} element - DOM元素
     */
    static empty(element) {
        if (!element) return;
        element.innerHTML = '';
    }

    /**
     * 移除元素
     * @param {HTMLElement} element - DOM元素
     */
    static remove(element) {
        if (!element || !element.parentNode) return;
        element.parentNode.removeChild(element);
    }

    /**
     * 克隆元素
     * @param {HTMLElement} element - DOM元素
     * @param {boolean} [deep=true] - 是否深度克隆
     * @returns {HTMLElement} 克隆的元素
     */
    static clone(element, deep = true) {
        if (!element) return null;
        return element.cloneNode(deep);
    }

    /**
     * 获取元素的父元素
     * @param {HTMLElement} element - DOM元素
     * @param {string} [selector] - 父元素选择器
     * @returns {HTMLElement|null} 父元素
     */
    static parent(element, selector) {
        if (!element) return null;
        
        let parent = element.parentElement;
        
        if (selector) {
            while (parent && !parent.matches(selector)) {
                parent = parent.parentElement;
            }
        }
        
        return parent;
    }

    /**
     * 获取元素的子元素
     * @param {HTMLElement} element - DOM元素
     * @param {string} [selector] - 子元素选择器
     * @returns {Array<HTMLElement>} 子元素数组
     */
    static children(element, selector) {
        if (!element) return [];
        
        const children = Array.from(element.children);
        
        if (selector) {
            return children.filter(child => child.matches(selector));
        }
        
        return children;
    }

    /**
     * 获取元素的兄弟元素
     * @param {HTMLElement} element - DOM元素
     * @param {string} [selector] - 兄弟元素选择器
     * @returns {Array<HTMLElement>} 兄弟元素数组
     */
    static siblings(element, selector) {
        if (!element || !element.parentElement) return [];
        
        const siblings = Array.from(element.parentElement.children)
            .filter(child => child !== element);
        
        if (selector) {
            return siblings.filter(sibling => sibling.matches(selector));
        }
        
        return siblings;
    }

    /**
     * 检查元素是否匹配选择器
     * @param {HTMLElement} element - DOM元素
     * @param {string} selector - CSS选择器
     * @returns {boolean} 是否匹配
     */
    static matches(element, selector) {
        if (!element) return false;
        return element.matches(selector);
    }

    /**
     * 获取元素在父元素中的索引
     * @param {HTMLElement} element - DOM元素
     * @returns {number} 索引值
     */
    static index(element) {
        if (!element || !element.parentElement) return -1;
        return Array.from(element.parentElement.children).indexOf(element);
    }

    /**
     * 滚动到元素位置
     * @param {HTMLElement} element - DOM元素
     * @param {Object} [options] - 滚动选项
     * @param {string} [options.behavior='smooth'] - 滚动行为
     * @param {string} [options.block='start'] - 垂直对齐
     * @param {string} [options.inline='nearest'] - 水平对齐
     */
    static scrollIntoView(element, options = {}) {
        if (!element) return;
        
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    /**
     * 检查元素是否在视口中
     * @param {HTMLElement} element - DOM元素
     * @param {number} [threshold=0] - 阈值（0-1）
     * @returns {boolean} 是否在视口中
     */
    static isInViewport(element, threshold = 0) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        const vertInView = (rect.top <= windowHeight * (1 - threshold)) && ((rect.top + rect.height) >= windowHeight * threshold);
        const horInView = (rect.left <= windowWidth * (1 - threshold)) && ((rect.left + rect.width) >= windowWidth * threshold);
        
        return vertInView && horInView;
    }

    /**
     * 创建样式表
     * @param {string} css - CSS内容
     * @param {string} [id] - 样式表ID
     * @returns {HTMLStyleElement} 样式元素
     */
    static createStyleSheet(css, id) {
        const style = document.createElement('style');
        style.type = 'text/css';
        
        if (id) {
            style.id = id;
        }
        
        if (style.styleSheet) {
            // IE
            style.styleSheet.cssText = css;
        } else {
            style.appendChild(document.createTextNode(css));
        }
        
        document.head.appendChild(style);
        return style;
    }

    /**
     * 防抖函数
     * @param {Function} func - 要防抖的函数
     * @param {number} wait - 等待时间（毫秒）
     * @param {boolean} [immediate=false] - 是否立即执行
     * @returns {Function} 防抖后的函数
     */
    static debounce(func, wait, immediate = false) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要节流的函数
     * @param {number} limit - 限制时间（毫秒）
     * @returns {Function} 节流后的函数
     */
    static throttle(func, limit) {
        let inThrottle;
        
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}