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
