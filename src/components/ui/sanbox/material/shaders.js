/**
 * GLSL着色器源码管理
 * 统一管理所有自定义材质的着色器代码
 */

/**
 * 动态纹理材质着色器
 * 基于掘金文章的实现
 */
export const DynamicTextureShader = `
czm_material czm_getMaterial(czm_materialInput materialInput){
  czm_material material = czm_getDefaultMaterial(materialInput);
  vec2 st = materialInput.st;
  // 计算纹理采样的水平偏移,实现水平滚动效果
  float st_map_s = fract(st.s - speed * czm_frameNumber * 0.001);

  // 使用计算的偏移值对纹理进行采样
  vec4 colorImage = texture(image, vec2(st_map_s, st.t));

  // 创建片段颜色向量
  vec4 fragColor;
  // 设置RGB颜色分量,保持原始颜色不变
  fragColor.rgb = color.rgb / 1.0;

  // 计算最终透明度,将纹理alpha与材质alpha相乘
  material.alpha = colorImage.a * color.a;

  // 设置材质的漫反射颜色
  material.diffuse = fragColor.rgb;

  // 设置材质的自发光颜色,与漫反射颜色相同
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

    // 计算动画时间因子,用于控制动画速度
    float time = czm_frameNumber * speed * 0.005;

    // 创建渐变效果
    // 使用percent参数控制渐变区域的宽度
    // smoothstep(0.0, percent, st.s)创建起始渐变
    // (1.0 - smoothstep(1.0 - percent, 1.0, st.s))创建结束渐变
    // 两者相乘形成双向渐变效果
    float alpha = smoothstep(0.0, percent, st.s) * (1.0 - smoothstep(1.0 - percent, 1.0, st.s));

    // 计算移动位置并创建流动效果
    // fract函数确保值在[0,1]范围内循环
    float movePos = fract(st.s - time);

    // 使用step函数创建锐利的边界过渡
    // gradient参数控制流动效果的宽度
    alpha *= 1.0 - step(gradient, movePos);

    // 设置材质最终颜色和透明度
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

    // 计算时间因子,用于动画控制
    float time = czm_frameNumber * speed * 0.01;

    // 生成脉冲波形,使用正弦函数
    float pulse = abs(sin(st.s * 10.0 - time));

    // 使用两个smoothstep函数相乘来创建脉冲效果
    // 第一个smoothstep(0.0, pulseWidth, pulse)在0到pulseWidth之间平滑过渡，产生上升边缘
    // 第二个smoothstep(pulseWidth * 2.0, pulseWidth, pulse)在pulseWidth到pulseWidth*2.0之间平滑过渡，产生下降边缘
    // 相乘后形成一个受pulseWidth控制宽度的脉冲波形
    float alpha = smoothstep(0.0, pulseWidth, pulse) * smoothstep(pulseWidth * 2.0, pulseWidth, pulse);

    // 设置材质属性
    material.diffuse = color.rgb;  // 漫反射颜色
    material.alpha = alpha * color.a;  // 透明度
    material.emission = color.rgb * alpha;  // 自发光颜色
    return material;
  }
`

export const PolylineTrailLinkShader = `
czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    // 使用repeat参数来控制纹理重复，保持纹理比例不变
    float adjustedS = fract((st.s * repeat) - time);
    vec4 colorImage = texture(image, vec2(adjustedS, st.t));
    material.alpha = colorImage.a * color.a;
    material.diffuse = (colorImage.rgb+color.rgb)/2.0;
    return material;
}
`
