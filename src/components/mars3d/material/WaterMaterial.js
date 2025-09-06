/**
 * Mars3D 材质模块 - 水面材质类
 * 提供逼真的水面效果
 */

import BaseMaterial from './BaseMaterial.js';

/**
 * 水面材质类
 * 继承自BaseMaterial，提供水面效果
 */
export default class WaterMaterial extends BaseMaterial {
    /**
     * 构造函数
     * @param {Object} options - 水面材质配置选项
     * @param {string} [options.normalMap] - 法线贴图URL
     * @param {number} [options.frequency=10.0] - 波浪频率
     * @param {number} [options.animationSpeed=0.01] - 动画速度
     * @param {number} [options.amplitude=1.0] - 波浪振幅
     * @param {number} [options.specularIntensity=0.5] - 镜面反射强度
     * @param {Cesium.Color} [options.baseWaterColor] - 基础水色
     * @param {Cesium.Color} [options.blendColor] - 混合颜色
     * @param {number} [options.fadeFactor=1.0] - 淡化因子
     */
    constructor(options = {}) {
        // 设置默认类型
        options.type = 'water';
        
        super(options);
        
        // 水面特有属性
        this.normalMap = options.normalMap || null;
        this.frequency = options.frequency || 10.0;
        this.animationSpeed = options.animationSpeed || 0.01;
        this.amplitude = options.amplitude || 1.0;
        this.specularIntensity = options.specularIntensity || 0.5;
        this.baseWaterColor = options.baseWaterColor || new Cesium.Color(0.2, 0.5, 1.0, 1.0);
        this.blendColor = options.blendColor || new Cesium.Color(0.0, 1.0, 0.7, 1.0);
        this.fadeFactor = options.fadeFactor || 1.0;
        
        // 动画相关
        this._time = 0;
        this._animationFrame = null;
        
        // 设置默认半透明
        this.translucent = true;
    }

    /**
     * 初始化材质
     * @private
     */
    _initialize() {
        this._createWaterMaterial();
    }

    /**
     * 创建水面材质
     * @private
     */
    _createWaterMaterial() {
        const fabric = {
            type: 'Water',
            uniforms: {
                normalMap: this.normalMap,
                frequency: this.frequency,
                animationSpeed: this.animationSpeed,
                amplitude: this.amplitude,
                specularIntensity: this.specularIntensity,
                baseWaterColor: this.baseWaterColor,
                blendColor: this.blendColor,
                fadeFactor: this.fadeFactor,
                time: 0.0
            },
            source: this._getWaterShaderSource()
        };
        
        this.fabric = fabric;
        this.uniforms = fabric.uniforms;
        
        if (typeof Cesium !== 'undefined' && Cesium.Material) {
            this._material = new Cesium.Material({
                fabric: fabric,
                translucent: this.translucent
            });
        }
    }

    /**
     * 获取水面着色器源码
     * @returns {string} 着色器源码
     * @private
     */
    _getWaterShaderSource() {
        return `
            uniform sampler2D normalMap;
            uniform float frequency;
            uniform float animationSpeed;
            uniform float amplitude;
            uniform float specularIntensity;
            uniform vec4 baseWaterColor;
            uniform vec4 blendColor;
            uniform float fadeFactor;
            uniform float time;
            
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                
                vec2 st = materialInput.st;
                
                // 计算波浪偏移
                float wave1 = sin(frequency * st.s + time * animationSpeed) * amplitude;
                float wave2 = cos(frequency * st.t + time * animationSpeed * 0.7) * amplitude;
                
                // 采样法线贴图
                vec2 normalSt = st + vec2(wave1, wave2) * 0.1;
                vec3 normalSample = texture2D(normalMap, normalSt).rgb;
                vec3 normal = normalize(normalSample * 2.0 - 1.0);
                
                // 计算反射
                vec3 viewDirection = normalize(czm_viewerPositionWC - materialInput.positionToEyeEC);
                float fresnel = dot(normal, viewDirection);
                fresnel = 1.0 - fresnel;
                fresnel = pow(fresnel, 2.0);
                
                // 混合颜色
                vec4 waterColor = mix(baseWaterColor, blendColor, fresnel);
                
                // 计算镜面反射
                float specular = pow(max(dot(normal, viewDirection), 0.0), 32.0) * specularIntensity;
                
                material.diffuse = waterColor.rgb;
                material.alpha = waterColor.a * fadeFactor;
                material.specular = specular;
                material.shininess = 64.0;
                
                return material;
            }
        `;
    }

    /**
     * 添加到地图的内部实现
     * @protected
     */
    _addToMap() {
        if (this.enabled) {
            this._startAnimation();
        }
    }

    /**
     * 从地图移除的内部实现
     * @protected
     */
    _removeFromMap() {
        this._stopAnimation();
    }

    /**
     * 启用时的内部处理
     * @protected
     */
    _onEnable() {
        if (this._isAdded) {
            this._startAnimation();
        }
    }

    /**
     * 禁用时的内部处理
     * @protected
     */
    _onDisable() {
        this._stopAnimation();
    }

    /**
     * 开始动画
     * @private
     */
    _startAnimation() {
        if (this._animationFrame) {
            return;
        }
        
        const animate = () => {
            if (!this.enabled || !this._isAdded) {
                this._animationFrame = null;
                return;
            }
            
            this._time += 0.016; // 约60fps
            this.setUniform('time', this._time);
            
            this._animationFrame = requestAnimationFrame(animate);
        };
        
        this._animationFrame = requestAnimationFrame(animate);
    }

    /**
     * 停止动画
     * @private
     */
    _stopAnimation() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    /**
     * 设置法线贴图
     * @param {string} normalMap - 法线贴图URL
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setNormalMap(normalMap) {
        this.normalMap = normalMap;
        this.setUniform('normalMap', normalMap);
        return this;
    }

    /**
     * 设置波浪频率
     * @param {number} frequency - 波浪频率
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setFrequency(frequency) {
        this.frequency = frequency;
        this.setUniform('frequency', frequency);
        return this;
    }

    /**
     * 设置动画速度
     * @param {number} speed - 动画速度
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
        this.setUniform('animationSpeed', speed);
        return this;
    }

    /**
     * 设置波浪振幅
     * @param {number} amplitude - 波浪振幅
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setAmplitude(amplitude) {
        this.amplitude = amplitude;
        this.setUniform('amplitude', amplitude);
        return this;
    }

    /**
     * 设置镜面反射强度
     * @param {number} intensity - 镜面反射强度
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setSpecularIntensity(intensity) {
        this.specularIntensity = intensity;
        this.setUniform('specularIntensity', intensity);
        return this;
    }

    /**
     * 设置基础水色
     * @param {Cesium.Color} color - 基础水色
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setBaseWaterColor(color) {
        this.baseWaterColor = color;
        this.setUniform('baseWaterColor', color);
        return this;
    }

    /**
     * 设置混合颜色
     * @param {Cesium.Color} color - 混合颜色
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setBlendColor(color) {
        this.blendColor = color;
        this.setUniform('blendColor', color);
        return this;
    }

    /**
     * 设置淡化因子
     * @param {number} factor - 淡化因子
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    setFadeFactor(factor) {
        this.fadeFactor = factor;
        this.setUniform('fadeFactor', factor);
        return this;
    }

    /**
     * 重置动画时间
     * @returns {WaterMaterial} 返回自身以支持链式调用
     */
    resetTime() {
        this._time = 0;
        this.setUniform('time', 0);
        return this;
    }

    /**
     * 获取当前动画时间
     * @returns {number} 当前时间
     */
    getTime() {
        return this._time;
    }

    /**
     * 检查动画是否正在运行
     * @returns {boolean} 是否正在运行
     */
    get isAnimating() {
        return this._animationFrame !== null;
    }

    /**
     * 清理资源的内部实现
     * @protected
     */
    _cleanup() {
        this._stopAnimation();
        super._cleanup();
    }

    /**
     * 序列化为JSON
     * @returns {Object} JSON对象
     */
    toJSON() {
        const json = super.toJSON();
        return {
            ...json,
            normalMap: this.normalMap,
            frequency: this.frequency,
            animationSpeed: this.animationSpeed,
            amplitude: this.amplitude,
            specularIntensity: this.specularIntensity,
            baseWaterColor: {
                red: this.baseWaterColor.red,
                green: this.baseWaterColor.green,
                blue: this.baseWaterColor.blue,
                alpha: this.baseWaterColor.alpha
            },
            blendColor: {
                red: this.blendColor.red,
                green: this.blendColor.green,
                blue: this.blendColor.blue,
                alpha: this.blendColor.alpha
            },
            fadeFactor: this.fadeFactor
        };
    }

    /**
     * 从JSON反序列化时的内部处理
     * @param {Object} json - JSON对象
     * @protected
     */
    _onFromJSON(json) {
        if (json.normalMap !== undefined) {
            this.setNormalMap(json.normalMap);
        }
        if (json.frequency !== undefined) {
            this.setFrequency(json.frequency);
        }
        if (json.animationSpeed !== undefined) {
            this.setAnimationSpeed(json.animationSpeed);
        }
        if (json.amplitude !== undefined) {
            this.setAmplitude(json.amplitude);
        }
        if (json.specularIntensity !== undefined) {
            this.setSpecularIntensity(json.specularIntensity);
        }
        if (json.baseWaterColor) {
            const color = json.baseWaterColor;
            this.setBaseWaterColor(new Cesium.Color(color.red, color.green, color.blue, color.alpha));
        }
        if (json.blendColor) {
            const color = json.blendColor;
            this.setBlendColor(new Cesium.Color(color.red, color.green, color.blue, color.alpha));
        }
        if (json.fadeFactor !== undefined) {
            this.setFadeFactor(json.fadeFactor);
        }
    }
}