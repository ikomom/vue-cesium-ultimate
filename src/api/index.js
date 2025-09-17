import { apiClient } from '@/utils/apiClient.js'
/**
 * 获取目标基础数据
 * @returns {Promise} 返回目标基础数据的Promise对象
 */
export function getTargetBaseData() {
  return fetch('/data/targetBaseData.json').then((res) => res.json())
}

/**
 * 获取目标位置数据
 * @returns {Promise} 返回目标位置数据的Promise对象
 */
export function getTargetLocationData() {
  return fetch('/data/targetLocationData.json').then((res) => res.json())
}

/**
 * 获取关系数据
 * @returns {Promise} 返回关系数据的Promise对象
 */
export function getRelationData() {
  return fetch('/data/relationData.json').then((res) => res.json())
}

/**
 * 获取船舶轨迹数据
 * @returns {Promise} 返回船舶轨迹数据的Promise对象
 */
export function getShipTrajectoryData() {
  return fetch('/data/shipTrajectoryData.json').then((res) => res.json())
}

/**
 * 获取事件数据
 * @returns {Promise} 返回事件数据的Promise对象
 */
export function getEventData() {
  return fetch('/data/eventData.json').then((res) => res.json())
}

/**
 * 获取目标状态数据
 * @returns {Promise} 返回目标状态数据的Promise对象
 */
export function getTargetStatusData() {
  return fetch('/data/targetStatusData.json').then((res) => res.json())
}

/**
 * 获取圆环连接器数据
 * @returns {Promise} 返回圆环连接器数据的Promise对象
 */
export function getCircleConnectorData() {
  return fetch('/data/circleConnectorData.json').then((res) => res.json())
}
