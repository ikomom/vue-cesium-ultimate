export * from './DynamicTextureMaterialProperty'
export * from './ParabolaFlyLineMaterialProperty'
export * from './PulseLineMaterialProperty'
export * from './PolylineTrailLinkMaterialProperty'
import { initDynamicTextureMaterialProperty } from './DynamicTextureMaterialProperty'
import { initParabolaFlyLineMaterialProperty } from './ParabolaFlyLineMaterialProperty'
import { initPulseLineMaterialProperty } from './PulseLineMaterialProperty'
import { initPolylineTrailLinkMaterialProperty } from './PolylineTrailLinkMaterialProperty'

export function initMaterialProperty() {
  try {
    initDynamicTextureMaterialProperty()
    initParabolaFlyLineMaterialProperty()
    initPulseLineMaterialProperty()
    initPolylineTrailLinkMaterialProperty()
  } catch (e) {
    console.error('初始化材质属性失败', e)
  }
}
