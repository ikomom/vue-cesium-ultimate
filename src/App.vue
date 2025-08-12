<script setup>
const options2 = {
  position: [117.257124, 31.809777],
  radius: 150000,
  interval: 1000,
  color: [255, 0, 0, 255]
}

function onViewerReady({ viewer, Cesium }) {
  console.log('onViewerReady', viewer);

  window.viewer = viewer
  // viewer.scene.globe.depthTestAgainstTerrain = true

}
</script>

<template>
  <vc-viewer @ready="onViewerReady">
    <vc-layer-imagery>
      <vc-imagery-provider-osm />
    </vc-layer-imagery>
    <!-- <vc-navigation :other-opts="false" /> -->

  </vc-viewer>
</template>

<style scoped></style>
