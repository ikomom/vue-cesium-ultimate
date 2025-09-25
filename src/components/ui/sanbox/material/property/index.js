export * from './DynamicTextureMaterialProperty'
export * from './ParabolaFlyLineMaterialProperty'
export * from './PulseLineMaterialProperty'
export * from './PolylineTrailLinkMaterialProperty'
export * from './ConditionalOpacityLineMaterialProperty'
import { initDynamicTextureMaterialProperty } from './DynamicTextureMaterialProperty'
import { initParabolaFlyLineMaterialProperty } from './ParabolaFlyLineMaterialProperty'
import { initPulseLineMaterialProperty } from './PulseLineMaterialProperty'
import { initPolylineTrailLinkMaterialProperty } from './PolylineTrailLinkMaterialProperty'
import { initConditionalOpacityLineMaterialProperty } from './ConditionalOpacityLineMaterialProperty'

export function initMaterialProperty() {
  try {
    initDynamicTextureMaterialProperty()
    initParabolaFlyLineMaterialProperty()
    initPulseLineMaterialProperty()
    initPolylineTrailLinkMaterialProperty()
    initConditionalOpacityLineMaterialProperty()
  } catch (e) {
    console.error('初始化材质属性失败', e)
  }
}
