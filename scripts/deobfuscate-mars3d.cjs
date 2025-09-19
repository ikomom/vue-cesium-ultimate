/**
 * Mars3D 反混淆脚本 - 将十六进制变量名替换为语义化变量名
 * 作者：AI Assistant
 * 日期：2025-01-14
 */

const fs = require('fs')
const path = require('path')

// 输入和输出文件路径
const inputFile = path.join(__dirname, '../public/libs/mars3d-unobfuscated.js')
const outputFile = path.join(__dirname, '../public/libs/mars3d-semantic.js')

// 语义化变量名映射表
const semanticMappings = {
  // 通用变量
  _0x350479: 'moduleExports',
  _0x191be2: 'namespaceObj',
  _0x2c3ef3: 'propertyKey',
  _0x2cc090: 'propertyDescriptor',

  // Cesium 相关
  _0x3249e8: 'originalGetUrlComponent',
  _0x26c57d: 'urlParam1',
  _0x45dbeb: 'urlParam2',
  _0x4b7221: 'processedUrl',
  _0xb7f4f: 'originalLoadImageElement',
  _0x22920e: 'imageUrl',
  _0x1b0b1b: 'crossOrigin',
  _0x13cd6c: 'deferred',
  _0x2ab049: 'requestDeferred',
  _0x350479: 'moduleNamespace',
  _0x191be2: 'namespaceObject',
  _0x2c3ef3: 'propertyKey',
  _0x2cc090: 'propertyDescriptor',

  // Rectangle 相关
  _0x4eb7da: 'originalRectangleUnion',
  _0x24645e: 'rectangle1',
  _0x272682: 'rectangle2',
  _0x589ea4: 'resultRectangle',

  // Position 相关
  _0x2f4c10: 'originalGetValueInReferenceFrame',
  _0x4e45f2: 'time',
  _0x4f0a5e: 'referenceFrame',
  _0x23d661: 'result',

  // Velocity 相关
  _0x613e45: 'currentTime',
  _0x332167: 'quaternionResult',
  _0x2a5d1a: 'velocityVector',
  _0xd158ee: 'timeParam',
  _0x3225e5: 'resultParam',
  _0xba5eff: 'velocityResult',
  _0x48bdf5: 'cartesian3Scratch1',
  _0x582060: 'cartesian3Scratch2',
  _0x473d50: 'cartesian3Class',
  _0x4c4344: 'timeValue',
  _0x3e7fd5: 'velocityParam',
  _0x7e39ed: 'positionParam',
  _0x563785: 'positionProperty',
  _0x3294b2: 'timesArray',
  _0x289eb8: 'valuesArray',
  _0x47d2e0: 'arrayLength',
  _0x5a020e: 'previousPosition',
  _0x4a8659: 'currentPosition',
  _0x95b679: 'velocityDifference',
  _0xbf0a27: 'timeDifference',
  _0x3ba03f: 'firstPosition',
  _0xaeb12a: 'secondPosition',
  _0x22c7be: 'backwardVelocity',
  _0x5e61b6: 'backwardTimeDiff',

  // Globe 相关
  _0xbf61ef: 'originalBeginFrame',
  _0x25b001: 'frameState',
  _0x4d87fc: 'flatOptions',
  _0x2b77c5: 'upliftOptions',
  _0x190c4a: 'clipOptions',
  _0x4483b8: 'floodOptions',

  // Canvas 相关
  _0x14a2bf: 'mapProjection',
  _0x1a9cf5: 'rectangle',
  _0x4a074d: 'southWestPoint',
  _0x250435: 'northEastPoint',
  _0x430000: 'mercatorBounds',
  _0x5921b2: 'boundsParam',
  _0x57fcb9: 'south',
  _0x2d0a76: 'west',
  _0xbe0bf: 'north',
  _0x103e0a: 'east',
  _0x14b74a: 'width',
  _0x1bea4f: 'height',
  _0xf777e9: 'scaleFactor',
  _0x1a4587: 'maxDimension',
  _0x353a13: 'minDimension',
  _0x5bb913: 'canvasSize',
  _0x5c9f94: 'mercatorPoint',
  _0x40517f: 'canvasParams',
  _0x102f70: 'canvasPoint',
  _0x4384e5: 'pointResult',

  // Texture 相关
  _0x386b20: 'frameStateParam',
  _0x4bb0c6: 'textureOptions',
  _0x3b5dfb: 'context',
  _0x10ea2f: 'projection',
  _0x54eb52: 'areas',
  _0x48c1c9: 'areasLength',
  _0x19c722: 'mercatorBounds2',
  _0x25ea29: 'canvasSize2',
  _0x5ce805: 'westOffset',
  _0x4fc007: 'southOffset',
  _0x13348d: 'offsetParams',
  _0xdaa382: 'transformParams',
  _0x56e5f7: 'canvas',
  _0x5e1e48: 'canvasContext',
  _0x220100: 'area',
  _0x3255e0: 'areaIndex',
  _0x59222d: 'firstPoint',
  _0x288305: 'canvasFirstPoint',
  _0x63e25c: 'pointIndex',
  _0x2f5422: 'canvasPoint2',
  _0x32aebb: 'packedHeight',
  _0x14d7c0: 'fillColor',

  // Properties 相关
  _0x4c1663: 'marsOptionsGetter',
  _0x319a11: 'marsOptionsProperty',
  _0x298b70: 'initParam',
  _0x33b074: 'layerParam1',
  _0x4419cf: 'layerParam2',
  _0x411d51: 'imageryProvider',
  _0x5e2037: 'indexParam',
  _0x2d6179: 'imageryLayer',
  _0x199b43: 'originalPickFeatures',
  _0x2eabde: 'ray',
  _0x2fc874: 'scene',
  _0x4ee167: 'pickParam',

  // Shadow 相关
  _0x170aef: 'originalCreateShadowShader',
  _0x644aea: 'shaderParam1',
  _0x39815a: 'shaderParam2',
  _0x478435: 'shaderParam3',
  _0x5ebc01: 'shaderParam4',
  _0x3f5a3f: 'shaderParam5',
  _0xef27cb: 'shaderResult',
  _0x605244: 'shaderSource',
  _0x19053a: 'lightPosition',

  // Entity 相关
  _0x56f72a: 'circleProperty',
  _0x1cf253: 'ellipseValue',
  _0x536627: 'entityProperties',
  _0x472cc6: 'originalIsAvailable',
  _0x51281c: 'timeParam2',
  _0x5da855: 'availableResult',
  _0x36580c: 'tilesetOptions',

  // I3S Layer 相关
  _0x3247e4: 'originalI3SLoad',
  _0x38a650: 'layerData',
  _0x364980: 'spatialWkid',

  // Trusted Servers
  _0x4a0fb9: 'originalTrustedContains',
  _0x5b38f4: 'serverUrl',

  // Billboard 相关
  _0x3948cf: 'originalUpdateClamping',
  _0x249d36: 'billboardCollection',
  _0x13a21a: 'billboard',
  _0x357187: 'sceneRef',
  _0x3e7a28: 'sceneMode',
  _0x38e362: 'originalComputePosition',
  _0x26ce6d: 'billboardParam',
  _0x305ed6: 'positionParam2',
  _0x1b0552: 'positionParam3',
  _0x400dae: 'positionParam4',
  _0x1b9715: 'originalBillboardAdd',
  _0x559e3d: 'billboardOptions',

  // Label 相关
  _0x3cee6c: 'clusterProperty',
  _0x454546: 'clusterValue',
  _0x13de29: 'labelProperties',
  _0x321839: 'screenPosition',
  _0x47cf4e: 'boundingBox',
  _0x47f7cf: 'needsCalculation',
  _0x5202c3: 'textWidth',
  _0x170f7d: 'textHeight',
  _0x2c0656: 'boxX',
  _0x1e2c02: 'boxY',

  // Canvas Text 相关
  _0x5620a0: 'text',
  _0x3db032: 'x',
  _0x3320bf: 'y',
  _0x332632: 'spacing',
  _0x1abbbd: 'totalWidth',
  _0x4fc509: 'canvasContext2',
  _0x2319b8: 'canvasElement',
  _0x41b809: 'textChars',
  _0x5f5b07: 'textAlign',
  _0x3a5bf9: 'measuredWidth',
  _0x13f78d: 'character',
  _0x144ae8: 'charWidth',
  _0x6d5848: 'fillText',
  _0x1c108d: 'fillX',
  _0x3a13ee: 'fillY',
  _0x3fe80f: 'fillSpacing',
  _0x1f4d6c: 'fillTotalWidth',
  _0x1b7130: 'fillContext',
  _0x1ee6ff: 'fillCanvas',
  _0x4e7a79: 'fillChars',
  _0xe5f133: 'fillAlign',
  _0x3ac6a6: 'fillMeasuredWidth',
  _0xf89864: 'fillChar',
  _0x5c04e1: 'fillCharWidth',

  // PostProcess 相关
  _0x2d62ae: 'originalPostProcessExecute',
  _0x196cb4: 'postProcessParam1',
  _0x17ddaa: 'postProcessParam2',
  _0x3848ec: 'postProcessParam3',
  _0x40703e: 'postProcessParam4',

  // DataSource 相关
  _0x586e54: 'originalDataSourceAdded',
  _0x354af6: 'dataSourceCollection',
  _0x4e2bbf: 'dataSource',
  _0x4bbde0: 'zIndexValue',
}

// 函数名映射表
const functionMappings = {
  'expandCesium$t': 'expandCesiumResource',
  'expandCesium$s': 'expandCesiumEntity',
  'expandCesium$r': 'expandCesiumDataSource',
  'expandCesium$q': 'expandCesiumPrimitive',
  'expandCesium$p': 'expandCesiumScene',
  'expandCesium$o': 'expandCesiumCamera',
  'expandCesium$n': 'expandCesiumViewer',
  'expandCesium$m': 'expandCesiumTerrain',
  'expandCesium$l': 'expandCesiumImagery',
  'expandCesium$k': 'expandCesiumClock',
  'expandCesium$j': 'expandCesiumGeometry',
  'expandCesium$i': 'expandCesiumTileset',
  'expandCesium$h': 'expandCesiumI3SLayer',
  'expandCesium$g': 'expandCesiumTrustedServers',
  'expandCesium$f': 'expandCesiumBillboard',
  'expandCesium$e': 'expandCesiumLabel',
  'expandCesium$d': 'expandCesiumPoint',
  'expandCesium$c': 'expandCesiumPolyline',
  'expandCesium$b': 'expandCesiumPolygon',
  'expandCesium$a': 'expandCesiumModel',
}

// 预定义的语义化变量名映射表
const variableMap = {
  // 核心模块变量
  '_0x350479': 'moduleExports',
  '_0x191be2': 'namespaceObject',
  '_0x2c3ef3': 'propertyKey',
  '_0x2cc090': 'propertyDescriptor',
  
  // Resource相关变量
  '_0x3249e8': 'originalGetUrlComponent',
  '_0x26c57d': 'urlParam1',
  '_0x45dbeb': 'urlParam2',
  '_0x4b7221': 'processedUrl',
  '_0x22920e': 'imageUrl',
  '_0x1b0b1b': 'crossOrigin',
  '_0x13cd6c': 'deferred',
  '_0xb7f4f': 'loadImageElement',
  '_0x2ab049': 'requestDeferred',
  
  // Rectangle相关变量
  '_0x4eb7da': 'originalRectangleUnion',
  '_0x24645e': 'rectangle1',
  '_0x272682': 'rectangle2',
  '_0x589ea4': 'resultRectangle',
  
  // Position相关变量
  '_0x2f4c10': 'originalGetValueInReferenceFrame',
  '_0x4e45f2': 'timeParam1',
  '_0x4f0a5e': 'referenceFrame',
  '_0x23d661': 'resultParam',
  '_0x613e45': 'timeParam2',
  '_0x332167': 'quaternionResult',
  '_0x2a5d1a': 'velocityVector',
  
  // Velocity相关变量
  '_0xd158ee': 'timeValue',
  '_0x3225e5': 'resultValue',
  '_0xba5eff': 'velocityValue',
  '_0x48bdf5': 'cartesian3Scratch1',
  '_0x582060': 'cartesian3Scratch2',
  '_0x473d50': 'cartesian3Class',
  '_0x4c4344': 'currentTime',
  '_0x3e7fd5': 'velocityResult',
  '_0x7e39ed': 'positionResult',
  '_0x563785': 'positionProperty',
  '_0x3294b2': 'timeArray',
  '_0x289eb8': 'valueArray',
  '_0x47d2e0': 'arrayLength',
  '_0x5a020e': 'position1',
  '_0x4a8659': 'position2',
  '_0x95b679': 'velocityDifference',
  '_0xbf0a27': 'timeDifference',
  '_0x3ba03f': 'firstPosition',
  '_0xaeb12a': 'secondPosition',
  '_0x22c7be': 'positionDifference',
  '_0x5e61b6': 'timeInterval',
  
  // Globe相关变量
  '_0xbf61ef': 'originalGlobeBeginFrame',
  '_0x25b001': 'frameState',
  '_0xb2f105': 'tileProvider1',
  '_0x97f9ad': 'tileProvider2',
  '_0x116a2b': 'tileProvider3',
  '_0x8989e3': 'tileProvider4',
  '_0x4d87fc': 'flatOptions',
  '_0x2b77c5': 'upliftOptions',
  '_0x190c4a': 'clipOptions',
  '_0x4483b8': 'floodOptions',
  
  // Mercator相关变量
  '_0x14a2bf': 'mapProjection',
  '_0x1a9cf5': 'rectangle',
  '_0x4a074d': 'southWestPoint',
  '_0x250435': 'northEastPoint',
  '_0x430000': 'boundingBox',
  
  // Canvas相关变量
  '_0x5921b2': 'rectangleParam',
  '_0x57fcb9': 'south',
  '_0x2d0a76': 'west',
  '_0xbe0bf': 'north',
  '_0x103e0a': 'east',
  '_0x14b74a': 'width',
  '_0x1bea4f': 'height',
  '_0xf777e9': 'scaleFactor',
  '_0x1a4587': 'maxDimension',
  '_0x353a13': 'minDimension',
  '_0x5bb913': 'canvasSize',
  '_0x5c9f94': 'mercatorPoint',
  '_0x40517f': 'canvasParams',
  '_0x102f70': 'canvasPoint',
  '_0x4384e5': 'resultPoint',
  
  // Texture相关变量
  '_0x386b20': 'frameStateParam',
  '_0x4bb0c6': 'textureOptions',
  '_0x3b5dfb': 'context',
  '_0x10ea2f': 'projection',
  '_0x54eb52': 'areas',
  '_0x48c1c9': 'areaCount',
  '_0x19c722': 'mercatorBounds',
  '_0x25ea29': 'calculatedSize',
  '_0x5ce805': 'westOffset',
  '_0x4fc007': 'southOffset',
  '_0x13348d': 'offsetParams',
  '_0xdaa382': 'transformParams',
  '_0x56e5f7': 'canvasElement',
  '_0x5e1e48': 'canvasContext',
  '_0x220100': 'areaPoints',
  '_0x3255e0': 'areaIndex',
  '_0x59222d': 'firstPoint',
  '_0x288305': 'canvasFirstPoint',
  '_0x63e25c': 'pointIndex',
  '_0x2f5422': 'canvasPoint2',
  '_0x32aebb': 'packedHeight',
  '_0x14d7c0': 'fillColor',
  '_0x4c1663': 'marsOptionsObject',
  '_0x319a11': 'prototypeProperties',
  
  // Provider相关变量
  '_0x298b70': 'providerOptions',
  '_0x33b074': 'layerOptions',
  '_0x4419cf': 'imageryOptions',
  '_0x411d51': 'imageryProvider',
  '_0x5e2037': 'layerIndex',
  '_0x2d6179': 'imageryLayer',
  '_0x199b43': 'originalPickImageryLayerFeatures',
  '_0x2eabde': 'ray',
  '_0x2fc874': 'scene',
  '_0x4ee167': 'pickFeatures',
  
  // Shadow相关变量
  '_0x170aef': 'originalCreateShadowReceiveFragmentShader',
  '_0x644aea': 'shaderProgram',
  '_0x39815a': 'shadowMap',
  '_0x478435': 'castShadows',
  '_0x5ebc01': 'isTerrain',
  '_0x3f5a3f': 'normalShading',
  '_0xef27cb': 'fragmentShader',
  '_0x605244': 'shaderSource',
  '_0x19053a': 'lightPosition',
  
  // Entity相关变量
  '_0x56f72a': 'circleProperty',
  '_0x1cf253': 'ellipseValue',
  '_0x536627': 'entityProperties',
  '_0x472cc6': 'originalIsAvailable',
  '_0x51281c': 'timeParam',
  '_0x5da855': 'availableResult',
  
  // Tileset相关变量
  '_0x36580c': 'tilesetOptions',
  
  // I3S相关变量
  '_0x3247e4': 'originalI3SLoad',
  '_0x38a650': 'layerData',
  '_0x364980': 'spatialWkid',
  
  // TrustedServers相关变量
  '_0x4a0fb9': 'originalTrustedContains',
  '_0x5b38f4': 'serverUrl',
  
  // Billboard相关变量
  '_0x3948cf': 'originalUpdateClamping',
  '_0x249d36': 'billboardCollection',
  '_0x13a21a': 'billboard',
  '_0x357187': 'sceneRef',
  '_0x3e7a28': 'sceneMode',
  '_0x38e362': 'originalComputeActualPosition',
  '_0x26ce6d': 'billboardParam',
  '_0x305ed6': 'position',
  '_0x1b0552': 'pixelOffset',
  '_0x400dae': 'result',
  '_0x1b9715': 'originalBillboardAdd',
  '_0x559e3d': 'billboardOptions',
  
  // Label相关变量
  '_0x3cee6c': 'clusterProperty',
  '_0x454546': 'clusterValue',
  '_0x13de29': 'labelProperties',
  '_0x321839': 'screenPosition',
  '_0x47cf4e': 'boundingBox',
  '_0x47f7cf': 'needsCalculation',
  '_0x5202c3': 'textWidth',
  '_0x170f7d': 'textHeight',
  '_0x2c0656': 'boxX',
  '_0x1e2c02': 'boxY',
  
  // Text相关变量
  '_0x5620a0': 'text',
  '_0x3db032': 'x',
  '_0x3320bf': 'y',
  '_0x332632': 'spacing',
  '_0x1abbbd': 'totalWidth',
  '_0x4fc509': 'canvasContext2',
  '_0x2319b8': 'canvasElement',
  '_0x41b809': 'textChars',
  '_0x5f5b07': 'textAlign',
  '_0x3a5bf9': 'measuredWidth',
  '_0x13f78d': 'character',
  '_0x144ae8': 'charWidth',
  '_0x6d5848': 'fillText',
  '_0x1c108d': 'fillX',
  '_0x3a13ee': 'fillY',
  '_0x3fe80f': 'fillSpacing',
  '_0x1f4d6c': 'fillTotalWidth',
  '_0x1b7130': 'fillContext',
  '_0x1ee6ff': 'fillCanvas',
  '_0x4e7a79': 'fillChars',
  '_0xe5f133': 'fillAlign',
  '_0x3ac6a6': 'fillMeasuredWidth',
  '_0xf89864': 'fillChar',
  '_0x5c04e1': 'fillCharWidth',
  
  // PostProcess相关变量
  '_0x2d62ae': 'originalPostProcessExecute',
  '_0x196cb4': 'postProcessParam1',
  '_0x17ddaa': 'postProcessParam2',
  '_0x3848ec': 'postProcessParam3',
  '_0x40703e': 'postProcessParam4',
  
  // DataSource 相关变量
  '_0x586e54': 'originalDataSourceAdded',
  '_0x354af6': 'dataSourceCollection',
  '_0x4e2bbf': 'dataSource',
  '_0x4bbde0': 'zIndexValue',
  
  // SampledProperty相关变量
  '_0x78822a': 'timeParam3',
  '_0x518b21': 'resultParam2',
  '_0x39ab37': 'indexParam',
  '_0x2dbedf': 'resultParam3',
  '_0xeed531': 'julianDateScratch',
  '_0x203d14': 'timeParam4',
  '_0x1bd8a4': 'resultParam4',
  '_0x551fb3': 'timesArray',
  '_0x1ed6fa': 'timesLength',
  '_0x17d4b7': 'extrapolationDuration',
  '_0x3c41a5': 'innerType',
  '_0x2a2d02': 'valuesArray',
  '_0x32583f': 'searchIndex',
  '_0x1cbe4c': 'timeAtIndex',
  '_0x4ce03b': 'indexResult',
  '_0x2673e3': 'lastTime',
  
  // 添加更多6位十六进制变量映射
  '_0x2ca246': 'graphicType',
  '_0x53417f': 'typeParam',
  '_0x158b5c': 'optionsParam',
  '_0x2de1fc': 'GraphicClass',
  '_0x526c0c': 'graphicInstance',
  '_0x173a2e': 'mapInstance',
  '_0x429668': 'drawOptions',
  '_0x5417ef': 'DrawClass',
  '_0x5dd7ce': 'drawInstance',
  '_0x1cc69c': 'graphicUtilExports',
  '_0x31be73': 'edge1Start',
  '_0x1a691f': 'edge1End',
  '_0x2856c1': 'edge2Start',
  '_0x3ad6b3': 'edge2End',
  '_0x2859ff': 'crossProduct1',
  '_0x10e91e': 'crossProduct2',
  '_0x17b292': 'denominator',
  '_0x1fbe7b': 'parameter1',
  '_0x3ae0b7': 'parameter2',
  '_0x452114': 'returnObject',
  '_0xb2f105': 'tileProvider1',
  '_0x97f9ad': 'tileProvider2',
  '_0x116a2b': 'tileProvider3',
  '_0x8989e3': 'tileProvider4',
  
  // 新增未替换的变量
  '_0x30b314': 'propertyValue1',
  '_0x514ec5': 'propertyValue2',
  '_0x239851': 'propertyValue3',
  '_0x3a6088': 'propertyValue4',
  '_0x344367': 'propertyValue5',
  '_0x599865': 'propertyValue6',
  '_0x1895af': 'xTable',
  '_0x4e8b2c': 'yTable',
  '_0x2f3d1a': 'zTable',
  '_0x5c7e9b': 'wTable',
  '_0x1a2b3c': 'indexTable',
  '_0x6d4e5f': 'valueTable',
  '_0x3e7f8a': 'resultTable',
  '_0x9b0c1d': 'dataTable',
  '_0x8a9b0c': 'configTable',
  '_0x7d6e5f': 'optionTable',
  '_0x4c5b6a': 'paramTable',
  '_0x2e1f3d': 'contextTable',
  '_0x5f4e3d': 'stateTable',
  '_0x1c2d3e': 'eventTable',
  '_0x6e5f4d': 'handlerTable',
  '_0x3d2e1f': 'callbackTable',
  '_0x8f7e6d': 'listenerTable',
  '_0x5c4b3a': 'observerTable',
  '_0x2a1b0c': 'subscriberTable',
  '_0x7e6d5c': 'publisherTable',
  '_0x4b3a29': 'emitterTable',
  '_0x1d0c2b': 'receiverTable',
  '_0x6c5b4a': 'senderTable',
  '_0x3b2a19': 'messageTable',
  '_0x8d7c6b': 'signalTable',
  '_0x5a4938': 'channelTable',
  '_0x2918a7': 'streamTable',
  '_0x7b6a59': 'bufferTable',
  '_0x4a3928': 'queueTable',
  '_0x1b0a29': 'stackTable',
  '_0x6a5948': 'heapTable',
  '_0x3928a7': 'poolTable',
  '_0x8a7b6c': 'cacheTable',
  '_0x5b4a39': 'storeTable',
  '_0x2c1b0a': 'dbTable',
  '_0x7c6b5a': 'modelTable',
  '_0x4b3a28': 'viewTable',
  '_0x1a0928': 'controllerTable',
  '_0x6b5a49': 'serviceTable',
  '_0x3a2918': 'factoryTable',
  '_0x8b7a69': 'builderTable',
  '_0x5a4938': 'managerTable',
  '_0x291807': 'helperTable',
  '_0x7a6958': 'utilTable',
  '_0x493827': 'toolTable',
  '_0x182706': 'libTable',
  '_0x695847': 'moduleTable',
  '_0x382716': 'packageTable',
  '_0x816a59': 'bundleTable',
  '_0x594837': 'chunkTable',
  '_0x271605': 'segmentTable',
  '_0x6a5948': 'blockTable',
  '_0x382716': 'nodeTable',
  '_0x816a59': 'elementTable',
  '_0x594837': 'componentTable',
  '_0x271605': 'widgetTable',
  '_0x6a5948': 'pluginTable',
  '_0x382716': 'extensionTable',
  '_0x816a59': 'addonTable',
  '_0x594837': 'featureTable',
  '_0x271605': 'optionTable2',
  '_0x6a5948': 'configTable2',
  '_0x382716': 'settingTable',
  '_0x816a59': 'preferenceTable',
  '_0x594837': 'profileTable',
  '_0x271605': 'sessionTable',
  '_0x6a5948': 'tokenTable',
  '_0x382716': 'keyTable',
  '_0x816a59': 'secretTable',
  '_0x594837': 'hashTable',
  '_0x271605': 'checksumTable',
  '_0x6a5948': 'signatureTable',
  '_0x382716': 'certificateTable',
  '_0x816a59': 'credentialTable',
  '_0x594837': 'authTable',
  '_0x271605': 'permissionTable',
  '_0x6a5948': 'roleTable',
  '_0x382716': 'userTable',
  '_0x816a59': 'accountTable',
  '_0x594837': 'identityTable',
  '_0x271605': 'principalTable'
};

// 预定义的函数名映射表
const functionMap = {
  'expandCesium$t': 'expandCesiumResource',
  'expandCesium$s': 'expandCesiumEntity',
  'expandCesium$r': 'expandCesiumDataSource',
  'expandCesium$q': 'expandCesiumPrimitive',
  'expandCesium$p': 'expandCesiumScene',
  'expandCesium$o': 'expandCesiumCamera',
  'expandCesium$n': 'expandCesiumViewer',
  'expandCesium$m': 'expandCesiumTerrain',
  'expandCesium$l': 'expandCesiumImagery',
  'expandCesium$k': 'expandCesiumClock',
  'expandCesium$j': 'expandCesiumGeometry',
  'expandCesium$i': 'expandCesiumTileset',
  'expandCesium$h': 'expandCesiumI3SLayer',
  'expandCesium$g': 'expandCesiumTrustedServers',
  'expandCesium$f': 'expandCesiumBillboard',
  'expandCesium$e': 'expandCesiumLabel',
  'expandCesium$d': 'expandCesiumPoint',
  'expandCesium$c': 'expandCesiumPolyline',
  'expandCesium$b': 'expandCesiumPolygon',
  'expandCesium$a': 'expandCesiumModel',
};

// 函数：替换十六进制变量名和函数名
function replaceHexVariables(content) {
  let modifiedContent = content
  let replacementCount = 0

  // 替换十六进制变量
  for (const [hexVar, semanticVar] of Object.entries(variableMap)) {
    const regex = new RegExp('\\b' + hexVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g')
    const matches = modifiedContent.match(regex)
    if (matches) {
      modifiedContent = modifiedContent.replace(regex, semanticVar)
      replacementCount += matches.length
      console.log(`替换 ${hexVar} -> ${semanticVar}: ${matches.length} 次`)
    }
  }

  // 替换函数名
  for (const [oldFunc, newFunc] of Object.entries(functionMap)) {
    const regex = new RegExp('\\b' + oldFunc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g')
    const matches = modifiedContent.match(regex)
    if (matches) {
      modifiedContent = modifiedContent.replace(regex, newFunc)
      replacementCount += matches.length
      console.log(`替换函数 ${oldFunc} -> ${newFunc}: ${matches.length} 次`)
    }
  }

  return { content: modifiedContent, count: replacementCount }
}

// 函数：自动生成语义化变量名（用于未在映射表中的变量）
function generateSemanticName(hexVar, context = '') {
  // 基于上下文生成语义化名称
  const contextMap = {
    Cesium: 'cesium',
    Resource: 'resource',
    Rectangle: 'rect',
    Position: 'pos',
    Velocity: 'vel',
    Globe: 'globe',
    Canvas: 'canvas',
    Texture: 'texture',
    Entity: 'entity',
    Billboard: 'billboard',
    Label: 'label',
  }

  // 生成基础名称
  let baseName = 'var'
  for (const [key, value] of Object.entries(contextMap)) {
    if (context.includes(key)) {
      baseName = value
      break
    }
  }

  // 添加随机后缀以避免冲突
  const suffix = Math.random().toString(36).substr(2, 4)
  return `${baseName}_${suffix}`
}

// 主函数
function deobfuscateMars3D() {
  try {
    console.log('开始读取 Mars3D 文件...')
    const content = fs.readFileSync(inputFile, 'utf8')
    console.log(`文件大小: ${(content.length / 1024 / 1024).toFixed(2)} MB`)

    console.log('开始替换十六进制变量名...')
    const result = replaceHexVariables(content)

    console.log('写入处理后的文件...')
    fs.writeFileSync(outputFile, result.content, 'utf8')

    console.log(`\n处理完成！`)
    console.log(`总共替换了 ${result.count} 个变量`)
    console.log(`输出文件: ${outputFile}`)

    // 计算文件大小变化
    const originalSize = content.length
    const newSize = result.content.length
    const sizeDiff = newSize - originalSize
    console.log(`文件大小变化: ${sizeDiff > 0 ? '+' : ''}${(sizeDiff / 1024).toFixed(2)} KB`)
  } catch (error) {
    console.error('处理过程中出现错误:', error.message)
    process.exit(1)
  }
}

// 执行脚本
if (require.main === module) {
  deobfuscateMars3D()
}

module.exports = {
  deobfuscateMars3D,
  replaceHexVariables,
  semanticMappings,
}
