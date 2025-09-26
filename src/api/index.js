import { apiClient } from '@/utils'

// 新的API函数 - 支持时间区间和target_ids查询
export const getDataByTimeRange = async (options = {}) => {
  return apiClient.post('/data', options)
}

// 原有的API函数保持兼容性，但内部使用新的时间查询
export const getTargetBaseData = async () => {
  return await getDataByTimeRange().then((data) => data.targetBaseData || [])
}

export const getTargetLocationData = async () => {
  return await getDataByTimeRange().then((data) => data.targetLocationData || [])
}

export const getRelationData = async () => {
  return await getDataByTimeRange().then((data) => data.relationData || [])
}

export const getEventData = async () => {
  return await getDataByTimeRange().then((data) => data.eventData || [])
}

export const getShipTrajectoryData = async () => {
  return await getDataByTimeRange().then((data) => data.trajectoryData || {})
}

export const getTargetStatusData = async () => {
  return await getDataByTimeRange().then((data) => data.targetStatusData || [])
}

export const getCircleConnectorData = async () => {
  // 圆环连接器数据暂时使用本地文件
  const response = await fetch('/data/circleConnectorData.json')
  return await response.json()
}

export const getFusionLineData = async () => {
  return await getDataByTimeRange().then((data) => data.fusionLineData || [])
}
