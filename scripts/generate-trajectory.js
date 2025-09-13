// 生成target_047的200个轨迹点
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 原始的8个关键轨迹点
const keyPoints = [
  {
    "timestamp": "2024-01-22T06:00:00.000Z",
    "longitude": 119.7740,
    "latitude": 24.5674,
    "altitude": 0,
    "speed": 0,
    "heading": 0,
    "status": "系统启动",
    "location": "台湾海峡监测站"
  },
  {
    "timestamp": "2024-01-22T08:30:00.000Z",
    "longitude": 119.7740,
    "latitude": 24.5674,
    "altitude": 0,
    "speed": 0,
    "heading": 0,
    "status": "正常监控",
    "location": "台湾海峡监测站"
  },
  {
    "timestamp": "2024-01-22T12:00:00.000Z",
    "longitude": 119.8234,
    "latitude": 24.6123,
    "altitude": 0,
    "speed": 8.5,
    "heading": 45,
    "status": "巡逻监测",
    "location": "海峡北部巡逻"
  },
  {
    "timestamp": "2024-01-22T16:00:00.000Z",
    "longitude": 119.6890,
    "latitude": 24.4567,
    "altitude": 0,
    "speed": 12.3,
    "heading": 180,
    "status": "南向巡逻",
    "location": "海峡南部监控"
  },
  {
    "timestamp": "2024-01-22T20:00:00.000Z",
    "longitude": 119.7740,
    "latitude": 24.5674,
    "altitude": 0,
    "speed": 0,
    "heading": 0,
    "status": "返回基地",
    "location": "台湾海峡监测站"
  },
  {
    "timestamp": "2024-01-23T09:00:00.000Z",
    "longitude": 119.9876,
    "latitude": 24.7890,
    "altitude": 0,
    "speed": 15.2,
    "heading": 90,
    "status": "紧急出动",
    "location": "海峡东部救援"
  },
  {
    "timestamp": "2024-01-23T13:30:00.000Z",
    "longitude": 119.5432,
    "latitude": 24.3456,
    "altitude": 0,
    "speed": 6.8,
    "heading": 270,
    "status": "搜救作业",
    "location": "海峡西部搜救"
  },
  {
    "timestamp": "2024-01-23T18:00:00.000Z",
    "longitude": 119.7740,
    "latitude": 24.5674,
    "altitude": 0,
    "speed": 0,
    "heading": 0,
    "status": "任务完成",
    "location": "台湾海峡监测站"
  }
];

// 计算两点之间的距离（简化版）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半径（公里）
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 计算方位角
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
}

// 线性插值函数
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// 生成200个轨迹点
function generateTrajectoryPoints() {
  const trajectoryPoints = [];
  const totalPoints = 200;
  const segmentCount = keyPoints.length - 1;
  
  // 计算每个段落应该分配多少个点
  const pointsPerSegment = Math.floor(totalPoints / segmentCount);
  let remainingPoints = totalPoints - (pointsPerSegment * segmentCount);
  
  for (let i = 0; i < segmentCount; i++) {
    const startPoint = keyPoints[i];
    const endPoint = keyPoints[i + 1];
    
    // 当前段落的点数（最后几个段落可能多分配一个点）
    const currentSegmentPoints = pointsPerSegment + (remainingPoints > 0 ? 1 : 0);
    if (remainingPoints > 0) remainingPoints--;
    
    // 时间插值
    const startTime = new Date(startPoint.timestamp).getTime();
    const endTime = new Date(endPoint.timestamp).getTime();
    
    // 计算距离和速度
    const distance = calculateDistance(
      startPoint.latitude, startPoint.longitude,
      endPoint.latitude, endPoint.longitude
    );
    
    for (let j = 0; j < currentSegmentPoints; j++) {
      const t = j / (currentSegmentPoints - 1);
      
      // 插值计算位置
      const longitude = lerp(startPoint.longitude, endPoint.longitude, t);
      const latitude = lerp(startPoint.latitude, endPoint.latitude, t);
      
      // 插值计算时间
      const timestamp = new Date(startTime + (endTime - startTime) * t).toISOString();
      
      // 计算速度（基于距离和时间）
      let speed = 0;
      if (distance > 0) {
        const timeHours = (endTime - startTime) / (1000 * 60 * 60);
        speed = distance / timeHours;
        // 添加一些随机变化使速度更真实
        speed = speed * (0.8 + Math.random() * 0.4);
      }
      
      // 计算航向
      const heading = calculateBearing(
        startPoint.latitude, startPoint.longitude,
        endPoint.latitude, endPoint.longitude
      );
      
      // 状态插值
      let status = startPoint.status;
      let location = startPoint.location;
      
      // 在段落中间时，使用过渡状态
      if (t > 0.3 && t < 0.7) {
        if (i === 1) status = "前往巡逻点";
        else if (i === 2) status = "巡逻中";
        else if (i === 3) status = "返航中";
        else if (i === 4) status = "待命中";
        else if (i === 5) status = "紧急航行";
        else if (i === 6) status = "搜救进行中";
        else if (i === 7) status = "返回基地中";
        
        location = "航行中";
      }
      
      trajectoryPoints.push({
        timestamp,
        longitude: Math.round(longitude * 10000) / 10000,
        latitude: Math.round(latitude * 10000) / 10000,
        altitude: 0,
        speed: Math.round(speed * 10) / 10,
        heading: Math.round(heading),
        status,
        location
      });
    }
  }
  
  return trajectoryPoints;
}

// 更新JSON文件
function updateTrajectoryData() {
  const dataPath = path.join(__dirname, '../public/data/circleConnectorData.json');
  
  try {
    // 读取现有数据
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // 生成新的轨迹点
    const newTrajectoryPoints = generateTrajectoryPoints();
    
    // 更新target_047的轨迹数据
    data.trajectories.target_047 = newTrajectoryPoints;
    
    // 写回文件
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`成功生成${newTrajectoryPoints.length}个轨迹点`);
    console.log('轨迹数据已更新到 circleConnectorData.json');
    
  } catch (error) {
    console.error('更新轨迹数据时出错:', error);
  }
}

// 执行更新
updateTrajectoryData();