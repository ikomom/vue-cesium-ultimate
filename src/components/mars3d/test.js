/**
 * Mars3D 模块化结构测试文件
 * 用于验证所有模块是否能正常工作
 */

// 导入主模块
import Mars3D from './index.js';

// 导入各个子模块
import { EventType, uuid, CesiumUtil } from './core/index.js';
import { GraphicType, GraphicFactory, GraphicManager } from './graphic/index.js';
import { LayerType, LayerFactory, LayerManager } from './layer/index.js';
import { BaseControl, MouseControl, KeyboardControl, ControlManager } from './control/index.js';
import { BaseEffect, ParticleEffect, PostProcessEffect, EffectManager } from './effect/index.js';
import { BaseMaterial, WaterMaterial, FireMaterial, MaterialManager } from './material/index.js';
import { MathUtil, CoordinateUtil, DomUtil, HttpUtil, UtilManager } from './util/index.js';

/**
 * 测试类
 */
class Mars3DTest {
    constructor() {
        this.testResults = [];
        this.viewer = null;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始Mars3D模块化结构测试...');
        
        try {
            // 测试核心模块
            await this.testCoreModule();
            
            // 测试图形模块
            await this.testGraphicModule();
            
            // 测试图层模块
            await this.testLayerModule();
            
            // 测试控制模块
            await this.testControlModule();
            
            // 测试效果模块
            await this.testEffectModule();
            
            // 测试材质模块
            await this.testMaterialModule();
            
            // 测试工具模块
            await this.testUtilModule();
            
            // 测试主模块
            await this.testMainModule();
            
            // 输出测试结果
            this.outputResults();
            
        } catch (error) {
            console.error('❌ 测试过程中发生错误:', error);
            this.addResult('总体测试', false, error.message);
        }
    }

    /**
     * 测试核心模块
     */
    async testCoreModule() {
        console.log('📦 测试核心模块...');
        
        try {
            // 测试EventType
            const hasEventTypes = EventType && typeof EventType === 'object';
            this.addResult('EventType导入', hasEventTypes, hasEventTypes ? '成功' : '失败');
            
            // 测试uuid函数
            const uuidResult = uuid();
            const isValidUuid = typeof uuidResult === 'string' && uuidResult.length > 0;
            this.addResult('uuid函数', isValidUuid, isValidUuid ? `生成UUID: ${uuidResult}` : '失败');
            
            // 测试CesiumUtil
            const hasCesiumUtil = CesiumUtil && typeof CesiumUtil === 'function';
            this.addResult('CesiumUtil类', hasCesiumUtil, hasCesiumUtil ? '成功' : '失败');
            
        } catch (error) {
            this.addResult('核心模块', false, error.message);
        }
    }

    /**
     * 测试图形模块
     */
    async testGraphicModule() {
        console.log('🎨 测试图形模块...');
        
        try {
            // 测试GraphicType
            const hasGraphicType = GraphicType && typeof GraphicType === 'object';
            this.addResult('GraphicType导入', hasGraphicType, hasGraphicType ? '成功' : '失败');
            
            // 测试GraphicFactory
            const hasGraphicFactory = GraphicFactory && typeof GraphicFactory === 'object';
            this.addResult('GraphicFactory类', hasGraphicFactory, hasGraphicFactory ? '成功' : '失败');
            
            // 测试GraphicManager
            const manager = new GraphicManager();
            const hasManager = manager && typeof manager.add === 'function';
            this.addResult('GraphicManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('图形模块', false, error.message);
        }
    }

    /**
     * 测试图层模块
     */
    async testLayerModule() {
        console.log('🗺️ 测试图层模块...');
        
        try {
            // 测试LayerType
            const hasLayerType = LayerType && typeof LayerType === 'object';
            this.addResult('LayerType导入', hasLayerType, hasLayerType ? '成功' : '失败');
            
            // 测试LayerFactory
            const hasLayerFactory = LayerFactory && typeof LayerFactory === 'object';
            this.addResult('LayerFactory类', hasLayerFactory, hasLayerFactory ? '成功' : '失败');
            
            // 测试LayerManager
            const manager = new LayerManager();
            const hasManager = manager && typeof manager.add === 'function';
            this.addResult('LayerManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('图层模块', false, error.message);
        }
    }

    /**
     * 测试控制模块
     */
    async testControlModule() {
        console.log('🎮 测试控制模块...');
        
        try {
            // 测试BaseControl
            const hasBaseControl = BaseControl && typeof BaseControl === 'function';
            this.addResult('BaseControl类', hasBaseControl, hasBaseControl ? '成功' : '失败');
            
            // 测试MouseControl
            const hasMouseControl = MouseControl && typeof MouseControl === 'function';
            this.addResult('MouseControl类', hasMouseControl, hasMouseControl ? '成功' : '失败');
            
            // 测试KeyboardControl
            const hasKeyboardControl = KeyboardControl && typeof KeyboardControl === 'function';
            this.addResult('KeyboardControl类', hasKeyboardControl, hasKeyboardControl ? '成功' : '失败');
            
            // 测试ControlManager
            const manager = new ControlManager();
            const hasManager = manager && typeof manager.add === 'function';
            this.addResult('ControlManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('控制模块', false, error.message);
        }
    }

    /**
     * 测试效果模块
     */
    async testEffectModule() {
        console.log('✨ 测试效果模块...');
        
        try {
            // 测试BaseEffect
            const hasBaseEffect = BaseEffect && typeof BaseEffect === 'function';
            this.addResult('BaseEffect类', hasBaseEffect, hasBaseEffect ? '成功' : '失败');
            
            // 测试ParticleEffect
            const hasParticleEffect = ParticleEffect && typeof ParticleEffect === 'function';
            this.addResult('ParticleEffect类', hasParticleEffect, hasParticleEffect ? '成功' : '失败');
            
            // 测试PostProcessEffect
            const hasPostProcessEffect = PostProcessEffect && typeof PostProcessEffect === 'function';
            this.addResult('PostProcessEffect类', hasPostProcessEffect, hasPostProcessEffect ? '成功' : '失败');
            
            // 测试EffectManager
            const manager = new EffectManager();
            const hasManager = manager && typeof manager.add === 'function';
            this.addResult('EffectManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('效果模块', false, error.message);
        }
    }

    /**
     * 测试材质模块
     */
    async testMaterialModule() {
        console.log('🎭 测试材质模块...');
        
        try {
            // 测试BaseMaterial
            const hasBaseMaterial = BaseMaterial && typeof BaseMaterial === 'function';
            this.addResult('BaseMaterial类', hasBaseMaterial, hasBaseMaterial ? '成功' : '失败');
            
            // 测试WaterMaterial
            const hasWaterMaterial = WaterMaterial && typeof WaterMaterial === 'function';
            this.addResult('WaterMaterial类', hasWaterMaterial, hasWaterMaterial ? '成功' : '失败');
            
            // 测试FireMaterial
            const hasFireMaterial = FireMaterial && typeof FireMaterial === 'function';
            this.addResult('FireMaterial类', hasFireMaterial, hasFireMaterial ? '成功' : '失败');
            
            // 测试MaterialManager
            const manager = new MaterialManager();
            const hasManager = manager && typeof manager.add === 'function';
            this.addResult('MaterialManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('材质模块', false, error.message);
        }
    }

    /**
     * 测试工具模块
     */
    async testUtilModule() {
        console.log('🔧 测试工具模块...');
        
        try {
            // 测试MathUtil
            const hasMathUtil = MathUtil && typeof MathUtil.toRadians === 'function';
            this.addResult('MathUtil类', hasMathUtil, hasMathUtil ? '成功' : '失败');
            
            if (hasMathUtil) {
                const radians = MathUtil.toRadians(90);
                const isCorrect = Math.abs(radians - Math.PI / 2) < 0.0001;
                this.addResult('MathUtil.toRadians', isCorrect, isCorrect ? `90度 = ${radians}弧度` : '计算错误');
            }
            
            // 测试CoordinateUtil
            const hasCoordinateUtil = CoordinateUtil && typeof CoordinateUtil.isValidCoordinate === 'function';
            this.addResult('CoordinateUtil类', hasCoordinateUtil, hasCoordinateUtil ? '成功' : '失败');
            
            if (hasCoordinateUtil) {
                const isValid = CoordinateUtil.isValidCoordinate(116.4, 39.9);
                this.addResult('CoordinateUtil.isValidCoordinate', isValid, isValid ? '坐标验证正确' : '坐标验证失败');
            }
            
            // 测试DomUtil
            const hasDomUtil = DomUtil && typeof DomUtil.create === 'function';
            this.addResult('DomUtil类', hasDomUtil, hasDomUtil ? '成功' : '失败');
            
            // 测试HttpUtil
            const hasHttpUtil = HttpUtil && typeof HttpUtil.get === 'function';
            this.addResult('HttpUtil类', hasHttpUtil, hasHttpUtil ? '成功' : '失败');
            
            // 测试UtilManager
            const manager = new UtilManager();
            const hasManager = manager && typeof manager.getUtil === 'function';
            this.addResult('UtilManager实例', hasManager, hasManager ? '成功创建' : '失败');
            
        } catch (error) {
            this.addResult('工具模块', false, error.message);
        }
    }

    /**
     * 测试主模块
     */
    async testMainModule() {
        console.log('🏠 测试主模块...');
        
        try {
            // 测试Mars3D主类
            const hasMars3D = Mars3D && typeof Mars3D === 'function';
            this.addResult('Mars3D主类', hasMars3D, hasMars3D ? '成功' : '失败');
            
            // 测试静态属性
            if (hasMars3D) {
                const hasVersion = typeof Mars3D.version === 'string';
                this.addResult('Mars3D.version', hasVersion, hasVersion ? `版本: ${Mars3D.version}` : '版本信息缺失');
                
                const hasEventType = Mars3D.EventType && typeof Mars3D.EventType === 'object';
                this.addResult('Mars3D.EventType', hasEventType, hasEventType ? '事件类型可用' : '事件类型缺失');
                
                const hasGraphicType = Mars3D.GraphicType && typeof Mars3D.GraphicType === 'object';
                this.addResult('Mars3D.GraphicType', hasGraphicType, hasGraphicType ? '图形类型可用' : '图形类型缺失');
                
                const hasLayerType = Mars3D.LayerType && typeof Mars3D.LayerType === 'object';
                this.addResult('Mars3D.LayerType', hasLayerType, hasLayerType ? '图层类型可用' : '图层类型缺失');
            }
            
        } catch (error) {
            this.addResult('主模块', false, error.message);
        }
    }

    /**
     * 添加测试结果
     * @param {string} name - 测试名称
     * @param {boolean} success - 是否成功
     * @param {string} message - 消息
     */
    addResult(name, success, message) {
        this.testResults.push({
            name,
            success,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 输出测试结果
     */
    outputResults() {
        console.log('\n📊 测试结果汇总:');
        console.log('=' .repeat(60));
        
        let successCount = 0;
        let totalCount = this.testResults.length;
        
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const message = result.message || (result.success ? '成功' : '失败');
            
            console.log(`${index + 1}. ${status} ${result.name}: ${message}`);
            
            if (result.success) {
                successCount++;
            }
        });
        
        console.log('=' .repeat(60));
        console.log(`📈 总计: ${successCount}/${totalCount} 项测试通过`);
        console.log(`📊 成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
        
        if (successCount === totalCount) {
            console.log('🎉 所有测试都通过了！Mars3D模块化结构工作正常。');
        } else {
            console.log('⚠️ 部分测试失败，请检查相关模块。');
        }
        
        return {
            total: totalCount,
            success: successCount,
            failed: totalCount - successCount,
            rate: (successCount / totalCount) * 100,
            results: this.testResults
        };
    }

    /**
     * 获取测试结果
     * @returns {Object} 测试结果
     */
    getResults() {
        return {
            total: this.testResults.length,
            success: this.testResults.filter(r => r.success).length,
            failed: this.testResults.filter(r => !r.success).length,
            results: this.testResults
        };
    }

    /**
     * 清空测试结果
     */
    clearResults() {
        this.testResults = [];
    }

    /**
     * 导出测试报告
     * @returns {string} JSON格式的测试报告
     */
    exportReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.getResults(),
            details: this.testResults,
            environment: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        };
        
        return JSON.stringify(report, null, 2);
    }
}

// 创建测试实例
const test = new Mars3DTest();

// 导出测试类和实例
export { Mars3DTest, test };

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
    // 等待DOM加载完成后运行测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            test.runAllTests();
        });
    } else {
        // DOM已经加载完成，直接运行测试
        setTimeout(() => {
            test.runAllTests();
        }, 100);
    }
}

// 默认导出
export default test;