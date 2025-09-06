/**
 * Mars3D 材质模块 - 火焰材质类
 * 提供逼真的火焰效果
 */

import BaseMaterial from './BaseMaterial.js';

/**
 * 火焰材质类
 * 继承自BaseMaterial，提供火焰效果
 */
export default class FireMaterial extends BaseMaterial {
    /**
     * 构造函数
     * @param {Object} options - 火焰材质配置选项
     * @param {string} [options.noiseTexture] - 噪声贴图URL
     * @param {Cesium.Color} [options.color] - 火焰颜色
     * @param {number} [options.speed=0.5] - 火焰速度
     * @param {number} [options.intensity=1.0] - 火焰强度
     * @param {number} [options.frequency=2.0] - 火焰频率
     * @param {number} [options.amplitude=0.5] - 火焰振幅
     * @param {number} [options.distortion=0.1] - 扭曲程度
     * @param {number} [options.threshold=0.3] - 阈值
     */
    constructor(options = {}) {
        // 设置默认类型
        options.type = 'fire';
        
        super(options);
        
        // 火焰特有属性
        this.noiseTexture = options.noiseTexture || null;
        this.color = options.color || new Cesium.Color(1.0, 0.3, 0.0, 1.0);
        this.speed = options.speed || 0.5;
        this.intensity = options.intensity || 1.0;
        this.frequency = options.frequency || 2.0;
        this.amplitude = options.amplitude || 0.5;
        this.distortion = options.distortion || 0.1;
        this.threshold = options.threshold || 0.3;
        
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
        this._createFireMaterial();
    }

    /**
     * 创建火焰材质
     * @private
     */
    _createFireMaterial() {
        const fabric = {
            type: 'Fire',
            uniforms: {
                noiseTexture: this.noiseTexture,
                color: this.color,
                speed: this.speed,
                intensity: this.intensity,
                frequency: this.frequency,
                amplitude: this.amplitude,
                distortion: this.distortion,
                threshold: this.threshold,
                time: 0.0
            },
            source: this._getFireShaderSource()
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
     * 获取火焰着色器源码
     * @returns {string} 着色器源码
     * @private
     */
    _getFireShaderSource() {
        return `
            uniform sampler2D noiseTexture;
            uniform vec4 color;
            uniform float speed;
            uniform float intensity;
            uniform float frequency;
            uniform float amplitude;
            uniform float distortion;
            uniform float threshold;
            uniform float time;
            
            // 简单噪声函数
            float noise(vec2 st) {
                return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
            }
            
            // 分形噪声
            float fbm(vec2 st) {
                float value = 0.0;
                float amplitude = 0.5;
                float frequency = 0.0;
                
                for (int i = 0; i < 4; i++) {
                    value += amplitude * noise(st);
                    st *= 2.0;
                    amplitude *= 0.5;
                }
                return value;
            }
            
            czm_material czm_getMaterial(czm_materialInput materialInput) {
                czm_material material = czm_getDefaultMaterial(materialInput);
                
                vec2 st = materialInput.st;
                
                // 垂直方向的火焰效果
                float fireHeight = 1.0 - st.t;
                
                // 添加时间动画
                vec2 animatedSt = st + vec2(0.0, time * speed);
                
                // 使用噪声创建火焰形状
                float noise1 = fbm(animatedSt * frequency);
                float noise2 = fbm(animatedSt * frequency * 2.0 + vec2(100.0));
                
                // 创建火焰扭曲
                vec2 distortedSt = st + vec2(
                    (noise1 - 0.5) * distortion,
                    (noise2 - 0.5) * distortion * 0.5
                );
                
                // 重新计算噪声
                float finalNoise = fbm(distortedSt * frequency + vec2(0.0, time * speed));
                
                // 创建火焰形状
                float fireShape = fireHeight * finalNoise;
                fireShape = smoothstep(threshold, threshold + 0.2, fireShape);
                
                // 火焰颜色渐变
                vec3 fireColor1 = vec3(1.0, 0.1, 0.0); // 红色
                vec3 fireColor2 = vec3(1.0, 0.5, 0.0); // 橙色
                vec3 fireColor3 = vec3(1.0, 1.0, 0.0); // 黄色
                
                vec3 finalColor;
                if (fireShape > 0.7) {
                    finalColor = mix(fireColor2, fireColor3, (fireShape - 0.7) / 0.3);
                } else if (fireShape > 0.3) {
                    finalColor = mix(fireColor1, fireColor2, (fireShape - 0.3) / 0.4);
                } else {
                    finalColor = fireColor1;
                }
                
                // 应用用户定义的颜色
                finalColor *= color.rgb;
                
                // 计算透明度
                float alpha = fireShape * intensity * color.a;
                
                material.diffuse = finalColor;
                material.alpha = alpha;
                material.emission = finalColor * intensity;
                
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
     * 设置噪声贴图
     * @param {string} noiseTexture - 噪声贴图URL
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setNoiseTexture(noiseTexture) {
        this.noiseTexture = noiseTexture;
        this.setUniform('noiseTexture', noiseTexture);
        return this;
    }

    /**
     * 设置火焰颜色
     * @param {Cesium.Color} color - 火焰颜色
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setColor(color) {
        this.color = color;
        this.setUniform('color', color);
        return this;
    }

    /**
     * 设置火焰速度
     * @param {number} speed - 火焰速度
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setSpeed(speed) {
        this.speed = speed;
        this.setUniform('speed', speed);
        return this;
    }

    /**
     * 设置火焰强度
     * @param {number} intensity - 火焰强度
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setIntensity(intensity) {
        this.intensity = intensity;
        this.setUniform('intensity', intensity);
        return this;
    }

    /**
     * 设置火焰频率
     * @param {number} frequency - 火焰频率
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setFrequency(frequency) {
        this.frequency = frequency;
        this.setUniform('frequency', frequency);
        return this;
    }

    /**
     * 设置火焰振幅
     * @param {number} amplitude - 火焰振幅
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setAmplitude(amplitude) {
        this.amplitude = amplitude;
        this.setUniform('amplitude', amplitude);
        return this;
    }

    /**
     * 设置扭曲程度
     * @param {number} distortion - 扭曲程度
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setDistortion(distortion) {
        this.distortion = distortion;
        this.setUniform('distortion', distortion);
        return this;
    }

    /**
     * 设置阈值
     * @param {number} threshold - 阈值
     * @returns {FireMaterial} 返回自身以支持链式调用
     */
    setThreshold(threshold) {
        this.threshold = threshold;
        this.setUniform('threshold', threshold);
        return this;
    }

    /**
     * 重置动画时间
     * @returns {FireMaterial} 返回自身以支持链式调用
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
            noiseTexture: this.noiseTexture,
            color: {
                red: this.color.red,
                green: this.color.green,
                blue: this.color.blue,
                alpha: this.color.alpha
            },
            speed: this.speed,
            intensity: this.intensity,
            frequency: this.frequency,
            amplitude: this.amplitude,
            distortion: this.distortion,
            threshold: this.threshold
        };
    }

    /**
     * 从JSON反序列化时的内部处理
     * @param {Object} json - JSON对象
     * @protected
     */
    _onFromJSON(json) {
        if (json.noiseTexture !== undefined) {
            this.setNoiseTexture(json.noiseTexture);
        }
        if (json.color) {
            const color = json.color;
            this.setColor(new Cesium.Color(color.red, color.green, color.blue, color.alpha));
        }
        if (json.speed !== undefined) {
            this.setSpeed(json.speed);
        }
        if (json.intensity !== undefined) {
            this.setIntensity(json.intensity);
        }
        if (json.frequency !== undefined) {
            this.setFrequency(json.frequency);
        }
        if (json.amplitude !== undefined) {
            this.setAmplitude(json.amplitude);
        }
        if (json.distortion !== undefined) {
            this.setDistortion(json.distortion);
        }
        if (json.threshold !== undefined) {
            this.setThreshold(json.threshold);
        }
    }
}