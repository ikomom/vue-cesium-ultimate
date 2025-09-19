/**
 * Mars3D 工具模块 - 数学工具类
 * 提供各种数学计算功能
 */

/**
 * 数学工具类
 * 提供常用的数学计算方法
 */
export default class MathUtil {
    /**
     * 角度转弧度
     * @param {number} degrees - 角度值
     * @returns {number} 弧度值
     */
    static toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    /**
     * 弧度转角度
     * @param {number} radians - 弧度值
     * @returns {number} 角度值
     */
    static toDegrees(radians) {
        return radians * 180 / Math.PI;
    }

    /**
     * 限制数值在指定范围内
     * @param {number} value - 输入值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * 线性插值
     * @param {number} start - 起始值
     * @param {number} end - 结束值
     * @param {number} t - 插值参数 (0-1)
     * @returns {number} 插值结果
     */
    static lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * 计算两点之间的距离
     * @param {Object} point1 - 第一个点 {x, y, z?}
     * @param {Object} point2 - 第二个点 {x, y, z?}
     * @returns {number} 距离
     */
    static distance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const dz = (point2.z || 0) - (point1.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 计算两点之间的距离的平方
     * @param {Object} point1 - 第一个点 {x, y, z?}
     * @param {Object} point2 - 第二个点 {x, y, z?}
     * @returns {number} 距离的平方
     */
    static distanceSquared(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const dz = (point2.z || 0) - (point1.z || 0);
        return dx * dx + dy * dy + dz * dz;
    }

    /**
     * 计算向量的长度
     * @param {Object} vector - 向量 {x, y, z?}
     * @returns {number} 向量长度
     */
    static vectorLength(vector) {
        const x = vector.x || 0;
        const y = vector.y || 0;
        const z = vector.z || 0;
        return Math.sqrt(x * x + y * y + z * z);
    }

    /**
     * 归一化向量
     * @param {Object} vector - 向量 {x, y, z?}
     * @returns {Object} 归一化后的向量
     */
    static normalize(vector) {
        const length = this.vectorLength(vector);
        if (length === 0) {
            return { x: 0, y: 0, z: 0 };
        }
        return {
            x: (vector.x || 0) / length,
            y: (vector.y || 0) / length,
            z: (vector.z || 0) / length
        };
    }

    /**
     * 向量点积
     * @param {Object} vector1 - 第一个向量 {x, y, z?}
     * @param {Object} vector2 - 第二个向量 {x, y, z?}
     * @returns {number} 点积结果
     */
    static dot(vector1, vector2) {
        const x1 = vector1.x || 0;
        const y1 = vector1.y || 0;
        const z1 = vector1.z || 0;
        const x2 = vector2.x || 0;
        const y2 = vector2.y || 0;
        const z2 = vector2.z || 0;
        return x1 * x2 + y1 * y2 + z1 * z2;
    }

    /**
     * 向量叉积 (仅适用于3D向量)
     * @param {Object} vector1 - 第一个向量 {x, y, z}
     * @param {Object} vector2 - 第二个向量 {x, y, z}
     * @returns {Object} 叉积结果向量
     */
    static cross(vector1, vector2) {
        const x1 = vector1.x || 0;
        const y1 = vector1.y || 0;
        const z1 = vector1.z || 0;
        const x2 = vector2.x || 0;
        const y2 = vector2.y || 0;
        const z2 = vector2.z || 0;
        
        return {
            x: y1 * z2 - z1 * y2,
            y: z1 * x2 - x1 * z2,
            z: x1 * y2 - y1 * x2
        };
    }

    /**
     * 计算两个向量之间的角度 (弧度)
     * @param {Object} vector1 - 第一个向量 {x, y, z?}
     * @param {Object} vector2 - 第二个向量 {x, y, z?}
     * @returns {number} 角度 (弧度)
     */
    static angleBetween(vector1, vector2) {
        const dot = this.dot(vector1, vector2);
        const length1 = this.vectorLength(vector1);
        const length2 = this.vectorLength(vector2);
        
        if (length1 === 0 || length2 === 0) {
            return 0;
        }
        
        const cosAngle = this.clamp(dot / (length1 * length2), -1, 1);
        return Math.acos(cosAngle);
    }

    /**
     * 生成随机数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机数
     */
    static random(min = 0, max = 1) {
        return min + Math.random() * (max - min);
    }

    /**
     * 生成随机整数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机整数
     */
    static randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    }

    /**
     * 判断数值是否接近
     * @param {number} a - 第一个数值
     * @param {number} b - 第二个数值
     * @param {number} [epsilon=1e-10] - 误差范围
     * @returns {boolean} 是否接近
     */
    static equals(a, b, epsilon = 1e-10) {
        return Math.abs(a - b) < epsilon;
    }

    /**
     * 判断数值是否为零
     * @param {number} value - 数值
     * @param {number} [epsilon=1e-10] - 误差范围
     * @returns {boolean} 是否为零
     */
    static isZero(value, epsilon = 1e-10) {
        return Math.abs(value) < epsilon;
    }

    /**
     * 计算贝塞尔曲线上的点
     * @param {Array<Object>} controlPoints - 控制点数组 [{x, y}, ...]
     * @param {number} t - 参数 (0-1)
     * @returns {Object} 曲线上的点 {x, y}
     */
    static bezier(controlPoints, t) {
        if (controlPoints.length === 0) {
            return { x: 0, y: 0 };
        }
        
        if (controlPoints.length === 1) {
            return { ...controlPoints[0] };
        }
        
        // 递归计算贝塞尔曲线
        const newPoints = [];
        for (let i = 0; i < controlPoints.length - 1; i++) {
            const p1 = controlPoints[i];
            const p2 = controlPoints[i + 1];
            newPoints.push({
                x: this.lerp(p1.x, p2.x, t),
                y: this.lerp(p1.y, p2.y, t)
            });
        }
        
        return this.bezier(newPoints, t);
    }

    /**
     * 计算多边形面积
     * @param {Array<Object>} points - 顶点数组 [{x, y}, ...]
     * @returns {number} 面积
     */
    static polygonArea(points) {
        if (points.length < 3) {
            return 0;
        }
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    /**
     * 判断点是否在多边形内
     * @param {Object} point - 点 {x, y}
     * @param {Array<Object>} polygon - 多边形顶点数组 [{x, y}, ...]
     * @returns {boolean} 是否在多边形内
     */
    static pointInPolygon(point, polygon) {
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x;
            const yi = polygon[i].y;
            const xj = polygon[j].x;
            const yj = polygon[j].y;
            
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }

    /**
     * 计算点到线段的距离
     * @param {Object} point - 点 {x, y}
     * @param {Object} lineStart - 线段起点 {x, y}
     * @param {Object} lineEnd - 线段终点 {x, y}
     * @returns {number} 距离
     */
    static pointToLineDistance(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        
        if (lenSq === 0) {
            // 线段退化为点
            return this.distance(point, lineStart);
        }
        
        let param = dot / lenSq;
        
        let xx, yy;
        if (param < 0) {
            xx = lineStart.x;
            yy = lineStart.y;
        } else if (param > 1) {
            xx = lineEnd.x;
            yy = lineEnd.y;
        } else {
            xx = lineStart.x + param * C;
            yy = lineStart.y + param * D;
        }
        
        return this.distance(point, { x: xx, y: yy });
    }

    /**
     * 计算矩形的中心点
     * @param {Object} rect - 矩形 {x, y, width, height}
     * @returns {Object} 中心点 {x, y}
     */
    static rectCenter(rect) {
        return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2
        };
    }

    /**
     * 判断两个矩形是否相交
     * @param {Object} rect1 - 第一个矩形 {x, y, width, height}
     * @param {Object} rect2 - 第二个矩形 {x, y, width, height}
     * @returns {boolean} 是否相交
     */
    static rectIntersect(rect1, rect2) {
        return !(rect1.x + rect1.width < rect2.x ||
                rect2.x + rect2.width < rect1.x ||
                rect1.y + rect1.height < rect2.y ||
                rect2.y + rect2.height < rect1.y);
    }

    /**
     * 计算圆的面积
     * @param {number} radius - 半径
     * @returns {number} 面积
     */
    static circleArea(radius) {
        return Math.PI * radius * radius;
    }

    /**
     * 计算圆的周长
     * @param {number} radius - 半径
     * @returns {number} 周长
     */
    static circleCircumference(radius) {
        return 2 * Math.PI * radius;
    }

    /**
     * 判断点是否在圆内
     * @param {Object} point - 点 {x, y}
     * @param {Object} circle - 圆 {x, y, radius}
     * @returns {boolean} 是否在圆内
     */
    static pointInCircle(point, circle) {
        const distance = this.distance(point, circle);
        return distance <= circle.radius;
    }

    /**
     * 数值格式化
     * @param {number} value - 数值
     * @param {number} [decimals=2] - 小数位数
     * @returns {number} 格式化后的数值
     */
    static round(value, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round(value * factor) / factor;
    }

    /**
     * 数值映射
     * @param {number} value - 输入值
     * @param {number} inMin - 输入最小值
     * @param {number} inMax - 输入最大值
     * @param {number} outMin - 输出最小值
     * @param {number} outMax - 输出最大值
     * @returns {number} 映射后的值
     */
    static map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
}