/**
 * GLSL着色器源码管理
 * 统一管理所有自定义材质的着色器代码
 */

/**
 * 飞线材质着色器
 */
export const FlyLineShader = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // 时间因子
    float time = czm_frameNumber * speed * 0.01;

    // 创建流动效果
    float flow = fract(st.s - time);

    // 渐变透明度
    float alpha = smoothstep(0.0, 0.3, flow) * smoothstep(1.0, 0.7, flow);

    // 颜色混合
    vec3 finalColor = color.rgb * alpha;

    material.diffuse = finalColor;
    material.alpha = alpha * color.a;
    material.emission = finalColor * 0.5;

    return material;
  }
`

/**
 * 脉冲线材质着色器
 */
export const PulseLineShader = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    // 时间因子
    float time = czm_frameNumber * speed * 0.005;

    // 脉冲效果
    float pulse = abs(sin(time + st.s * 10.0));

    // 颜色和透明度
    vec3 finalColor = color.rgb * pulse;
    float alpha = pulse * color.a;

    material.diffuse = finalColor;
    material.alpha = alpha;
    material.emission = finalColor * 0.3;

    return material;
  }
`

/**
 * 动态纹理材质着色器
 * 基于掘金文章的实现
 */
export const DynamicTextureShader = `
 czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    float st_map_s = fract(st.s - speed * czm_frameNumber * 0.001);
    vec4 colorImage = texture(image, vec2(st_map_s, st.t));
    vec4 fragColor;
    fragColor.rgb = color.rgb;
    material.alpha = colorImage.a * color.a;
    material.diffuse = fragColor.rgb;
    material.emission = fragColor.rgb;
    return material;
}
`

/**
 * 抛物线飞线材质着色器
 * 用于MaterialProperty系统
 */
export const ParabolaFlyLineShader = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float time = czm_frameNumber * speed * 0.005;
    float alpha = smoothstep(0.0, percent, st.s) * (1.0 - smoothstep(1.0 - percent, 1.0, st.s));

    float movePos = fract(st.s - time);
    alpha *= 1.0 - step(gradient, movePos);

    material.diffuse = color.rgb;
    material.alpha = alpha * color.a;

    return material;
  }
`

/**
 * 高级脉冲线材质着色器
 * 用于MaterialProperty系统，支持脉冲宽度控制
 */
export const AdvancedPulseLineShader = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;

    float time = czm_frameNumber * speed * 0.01;
    float pulse = abs(sin(st.s * 10.0 - time));

    float alpha = smoothstep(0.0, pulseWidth, pulse) * smoothstep(pulseWidth * 2.0, pulseWidth, pulse);

    material.diffuse = color.rgb;
    material.alpha = alpha * color.a;
    material.emission = color.rgb * alpha;

    return material;
  }
`
