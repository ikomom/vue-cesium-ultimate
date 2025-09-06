/**
 * Mars3D 工具模块 - 坐标转换工具类
 * 提供各种坐标系转换功能
 */

import * as Cesium from 'cesium';

/**
 * 坐标转换工具类
 * 提供各种坐标系之间的转换方法
 */
export default class CoordinateUtil {
    /**
     * 经纬度转笛卡尔坐标
     * @param {number} longitude - 经度 (度)
     * @param {number} latitude - 纬度 (度)
     * @param {number} [height=0] - 高度 (米)
     * @param {Cesium.Ellipsoid} [ellipsoid=Cesium.Ellipsoid.WGS84] - 椭球体
     * @returns {Cesium.Cartesian3} 笛卡尔坐标
     */
    static lonLatToCartesian(longitude, latitude, height = 0, ellipsoid = Cesium.Ellipsoid.WGS84) {
        const cartographic = Cesium.Cartographic.fromDegrees(longitude, latitude, height);
        return ellipsoid.cartographicToCartesian(cartographic);
    }

    /**
     * 笛卡尔坐标转经纬度
     * @param {Cesium.Cartesian3} cartesian - 笛卡尔坐标
     * @param {Cesium.Ellipsoid} [ellipsoid=Cesium.Ellipsoid.WGS84] - 椭球体
     * @returns {Object} 经纬度坐标 {longitude, latitude, height}
     */
    static cartesianToLonLat(cartesian, ellipsoid = Cesium.Ellipsoid.WGS84) {
        const cartographic = ellipsoid.cartesianToCartographic(cartesian);
        return {
            longitude: Cesium.Math.toDegrees(cartographic.longitude),
            latitude: Cesium.Math.toDegrees(cartographic.latitude),
            height: cartographic.height
        };
    }

    /**
     * 屏幕坐标转世界坐标
     * @param {Cesium.Viewer} viewer - Cesium视图器
     * @param {Cesium.Cartesian2} screenPosition - 屏幕坐标
     * @returns {Cesium.Cartesian3|null} 世界坐标
     */
    static screenToWorld(viewer, screenPosition) {
        if (!viewer || !screenPosition) {
            return null;
        }

        // 尝试从地形获取坐标
        let worldPosition = viewer.camera.pickEllipsoid(screenPosition, viewer.scene.globe.ellipsoid);
        
        // 如果地形拾取失败，尝试从3D Tiles或模型获取
        if (!worldPosition) {
            const pickedObject = viewer.scene.pick(screenPosition);
            if (pickedObject && pickedObject.primitive) {
                worldPosition = viewer.scene.pickPosition(screenPosition);
            }
        }

        return worldPosition;
    }

    /**
     * 世界坐标转屏幕坐标
     * @param {Cesium.Viewer} viewer - Cesium视图器
     * @param {Cesium.Cartesian3} worldPosition - 世界坐标
     * @returns {Cesium.Cartesian2|null} 屏幕坐标
     */
    static worldToScreen(viewer, worldPosition) {
        if (!viewer || !worldPosition) {
            return null;
        }

        return Cesium.SceneTransforms.wgs84ToWindowCoordinates(viewer.scene, worldPosition);
    }

    /**
     * 计算两点之间的距离
     * @param {Object} point1 - 第一个点 {longitude, latitude, height?}
     * @param {Object} point2 - 第二个点 {longitude, latitude, height?}
     * @param {Cesium.Ellipsoid} [ellipsoid=Cesium.Ellipsoid.WGS84] - 椭球体
     * @returns {number} 距离 (米)
     */
    static distance(point1, point2, ellipsoid = Cesium.Ellipsoid.WGS84) {
        const cartesian1 = this.lonLatToCartesian(point1.longitude, point1.latitude, point1.height || 0, ellipsoid);
        const cartesian2 = this.lonLatToCartesian(point2.longitude, point2.latitude, point2.height || 0, ellipsoid);
        
        return Cesium.Cartesian3.distance(cartesian1, cartesian2);
    }

    /**
     * 计算两点之间的方位角
     * @param {Object} point1 - 起始点 {longitude, latitude}
     * @param {Object} point2 - 目标点 {longitude, latitude}
     * @returns {number} 方位角 (度，0-360)
     */
    static bearing(point1, point2) {
        const lon1 = Cesium.Math.toRadians(point1.longitude);
        const lat1 = Cesium.Math.toRadians(point1.latitude);
        const lon2 = Cesium.Math.toRadians(point2.longitude);
        const lat2 = Cesium.Math.toRadians(point2.latitude);

        const dLon = lon2 - lon1;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        let bearing = Math.atan2(y, x);
        bearing = Cesium.Math.toDegrees(bearing);
        bearing = (bearing + 360) % 360;
        
        return bearing;
    }

    /**
     * 根据起始点、方位角和距离计算目标点
     * @param {Object} startPoint - 起始点 {longitude, latitude}
     * @param {number} bearing - 方位角 (度)
     * @param {number} distance - 距离 (米)
     * @param {number} [earthRadius=6371000] - 地球半径 (米)
     * @returns {Object} 目标点 {longitude, latitude}
     */
    static destination(startPoint, bearing, distance, earthRadius = 6371000) {
        const lat1 = Cesium.Math.toRadians(startPoint.latitude);
        const lon1 = Cesium.Math.toRadians(startPoint.longitude);
        const bearingRad = Cesium.Math.toRadians(bearing);
        const angularDistance = distance / earthRadius;

        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(angularDistance) +
            Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
        );

        const lon2 = lon1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
            Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
        );

        return {
            longitude: Cesium.Math.toDegrees(lon2),
            latitude: Cesium.Math.toDegrees(lat2)
        };
    }

    /**
     * 计算多边形的中心点
     * @param {Array<Object>} points - 顶点数组 [{longitude, latitude}, ...]
     * @returns {Object} 中心点 {longitude, latitude}
     */
    static polygonCenter(points) {
        if (!points || points.length === 0) {
            return { longitude: 0, latitude: 0 };
        }

        let totalLon = 0;
        let totalLat = 0;
        
        for (const point of points) {
            totalLon += point.longitude;
            totalLat += point.latitude;
        }

        return {
            longitude: totalLon / points.length,
            latitude: totalLat / points.length
        };
    }

    /**
     * 计算多边形的边界框
     * @param {Array<Object>} points - 顶点数组 [{longitude, latitude}, ...]
     * @returns {Object} 边界框 {west, south, east, north}
     */
    static polygonBounds(points) {
        if (!points || points.length === 0) {
            return { west: 0, south: 0, east: 0, north: 0 };
        }

        let west = points[0].longitude;
        let south = points[0].latitude;
        let east = points[0].longitude;
        let north = points[0].latitude;

        for (const point of points) {
            west = Math.min(west, point.longitude);
            south = Math.min(south, point.latitude);
            east = Math.max(east, point.longitude);
            north = Math.max(north, point.latitude);
        }

        return { west, south, east, north };
    }

    /**
     * 判断点是否在边界框内
     * @param {Object} point - 点 {longitude, latitude}
     * @param {Object} bounds - 边界框 {west, south, east, north}
     * @returns {boolean} 是否在边界框内
     */
    static pointInBounds(point, bounds) {
        return point.longitude >= bounds.west &&
               point.longitude <= bounds.east &&
               point.latitude >= bounds.south &&
               point.latitude <= bounds.north;
    }

    /**
     * Web墨卡托投影转经纬度
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {Object} 经纬度坐标 {longitude, latitude}
     */
    static webMercatorToLonLat(x, y) {
        const longitude = (x / 20037508.34) * 180;
        let latitude = (y / 20037508.34) * 180;
        latitude = 180 / Math.PI * (2 * Math.atan(Math.exp(latitude * Math.PI / 180)) - Math.PI / 2);
        
        return { longitude, latitude };
    }

    /**
     * 经纬度转Web墨卡托投影
     * @param {number} longitude - 经度
     * @param {number} latitude - 纬度
     * @returns {Object} Web墨卡托坐标 {x, y}
     */
    static lonLatToWebMercator(longitude, latitude) {
        const x = longitude * 20037508.34 / 180;
        let y = Math.log(Math.tan((90 + latitude) * Math.PI / 360)) / (Math.PI / 180);
        y = y * 20037508.34 / 180;
        
        return { x, y };
    }

    /**
     * 度分秒转十进制度
     * @param {number} degrees - 度
     * @param {number} minutes - 分
     * @param {number} seconds - 秒
     * @param {string} [direction='N'] - 方向 ('N', 'S', 'E', 'W')
     * @returns {number} 十进制度
     */
    static dmsToDecimal(degrees, minutes, seconds, direction = 'N') {
        let decimal = degrees + minutes / 60 + seconds / 3600;
        
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }
        
        return decimal;
    }

    /**
     * 十进制度转度分秒
     * @param {number} decimal - 十进制度
     * @param {boolean} [isLatitude=true] - 是否为纬度
     * @returns {Object} 度分秒 {degrees, minutes, seconds, direction}
     */
    static decimalToDms(decimal, isLatitude = true) {
        const direction = decimal >= 0 ? 
            (isLatitude ? 'N' : 'E') : 
            (isLatitude ? 'S' : 'W');
        
        decimal = Math.abs(decimal);
        const degrees = Math.floor(decimal);
        const minutesFloat = (decimal - degrees) * 60;
        const minutes = Math.floor(minutesFloat);
        const seconds = (minutesFloat - minutes) * 60;
        
        return {
            degrees,
            minutes,
            seconds: Math.round(seconds * 1000) / 1000,
            direction
        };
    }

    /**
     * 计算地球表面两点间的大圆距离
     * @param {Object} point1 - 第一个点 {longitude, latitude}
     * @param {Object} point2 - 第二个点 {longitude, latitude}
     * @param {number} [earthRadius=6371000] - 地球半径 (米)
     * @returns {number} 距离 (米)
     */
    static haversineDistance(point1, point2, earthRadius = 6371000) {
        const lat1 = Cesium.Math.toRadians(point1.latitude);
        const lon1 = Cesium.Math.toRadians(point1.longitude);
        const lat2 = Cesium.Math.toRadians(point2.latitude);
        const lon2 = Cesium.Math.toRadians(point2.longitude);

        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        
        return earthRadius * c;
    }

    /**
     * 计算点到线段的最短距离
     * @param {Object} point - 点 {longitude, latitude}
     * @param {Object} lineStart - 线段起点 {longitude, latitude}
     * @param {Object} lineEnd - 线段终点 {longitude, latitude}
     * @returns {number} 距离 (米)
     */
    static pointToLineDistance(point, lineStart, lineEnd) {
        // 将经纬度转换为笛卡尔坐标进行计算
        const pointCart = this.lonLatToCartesian(point.longitude, point.latitude);
        const startCart = this.lonLatToCartesian(lineStart.longitude, lineStart.latitude);
        const endCart = this.lonLatToCartesian(lineEnd.longitude, lineEnd.latitude);

        // 计算线段向量
        const lineVector = Cesium.Cartesian3.subtract(endCart, startCart, new Cesium.Cartesian3());
        const pointVector = Cesium.Cartesian3.subtract(pointCart, startCart, new Cesium.Cartesian3());

        // 计算投影参数
        const lineLength = Cesium.Cartesian3.magnitude(lineVector);
        if (lineLength === 0) {
            return Cesium.Cartesian3.distance(pointCart, startCart);
        }

        const t = Cesium.Cartesian3.dot(pointVector, lineVector) / (lineLength * lineLength);
        
        let closestPoint;
        if (t < 0) {
            closestPoint = startCart;
        } else if (t > 1) {
            closestPoint = endCart;
        } else {
            const scaledVector = Cesium.Cartesian3.multiplyByScalar(lineVector, t, new Cesium.Cartesian3());
            closestPoint = Cesium.Cartesian3.add(startCart, scaledVector, new Cesium.Cartesian3());
        }

        return Cesium.Cartesian3.distance(pointCart, closestPoint);
    }

    /**
     * 计算多边形面积 (球面)
     * @param {Array<Object>} points - 顶点数组 [{longitude, latitude}, ...]
     * @param {number} [earthRadius=6371000] - 地球半径 (米)
     * @returns {number} 面积 (平方米)
     */
    static polygonArea(points, earthRadius = 6371000) {
        if (!points || points.length < 3) {
            return 0;
        }

        let area = 0;
        const n = points.length;
        
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            const lat1 = Cesium.Math.toRadians(points[i].latitude);
            const lon1 = Cesium.Math.toRadians(points[i].longitude);
            const lat2 = Cesium.Math.toRadians(points[j].latitude);
            const lon2 = Cesium.Math.toRadians(points[j].longitude);
            
            area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
        }
        
        area = Math.abs(area) * earthRadius * earthRadius / 2;
        return area;
    }

    /**
     * 格式化坐标显示
     * @param {number} longitude - 经度
     * @param {number} latitude - 纬度
     * @param {number} [height] - 高度
     * @param {number} [precision=6] - 精度
     * @returns {string} 格式化后的坐标字符串
     */
    static formatCoordinate(longitude, latitude, height, precision = 6) {
        const lonStr = longitude.toFixed(precision);
        const latStr = latitude.toFixed(precision);
        
        if (height !== undefined) {
            const heightStr = height.toFixed(2);
            return `${lonStr}, ${latStr}, ${heightStr}`;
        }
        
        return `${lonStr}, ${latStr}`;
    }

    /**
     * 解析坐标字符串
     * @param {string} coordStr - 坐标字符串
     * @returns {Object|null} 坐标对象 {longitude, latitude, height?}
     */
    static parseCoordinate(coordStr) {
        if (!coordStr || typeof coordStr !== 'string') {
            return null;
        }
        
        const parts = coordStr.split(',').map(part => part.trim());
        
        if (parts.length < 2) {
            return null;
        }
        
        const longitude = parseFloat(parts[0]);
        const latitude = parseFloat(parts[1]);
        
        if (isNaN(longitude) || isNaN(latitude)) {
            return null;
        }
        
        const result = { longitude, latitude };
        
        if (parts.length > 2) {
            const height = parseFloat(parts[2]);
            if (!isNaN(height)) {
                result.height = height;
            }
        }
        
        return result;
    }

    /**
     * 验证坐标有效性
     * @param {number} longitude - 经度
     * @param {number} latitude - 纬度
     * @returns {boolean} 是否有效
     */
    static isValidCoordinate(longitude, latitude) {
        return typeof longitude === 'number' &&
               typeof latitude === 'number' &&
               !isNaN(longitude) &&
               !isNaN(latitude) &&
               longitude >= -180 &&
               longitude <= 180 &&
               latitude >= -90 &&
               latitude <= 90;
    }
}