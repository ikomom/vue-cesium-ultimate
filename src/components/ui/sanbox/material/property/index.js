export * from './DynamicTextureMaterialProperty'
export * from './ParabolaFlyLineMaterialProperty'
export * from './PulseLineMaterialProperty'
import { initDynamicTextureMaterialProperty } from './DynamicTextureMaterialProperty'
import { initParabolaFlyLineMaterialProperty } from './ParabolaFlyLineMaterialProperty'
import { initPulseLineMaterialProperty } from './PulseLineMaterialProperty'

export function initMaterialProperty() {
  try {
    initDynamicTextureMaterialProperty()
    initParabolaFlyLineMaterialProperty()
    initPulseLineMaterialProperty()
  } catch (e) {
    console.error('初始化材质属性失败', e)
  }
}
