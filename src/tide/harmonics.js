// 潮汐层：四大分潮合成的全球潮高场与潮流场
//
// 物理基础（真实频率，Doodson 常数）：
//   M2 主太阴半日分潮  周期 12.4206 h —— 潮汐主力（振幅占主导）
//   S2 主太阳半日分潮  周期 12.0000 h —— 与 M2 叠加形成大潮/小潮（朔望周期 14.77 天）
//   K1 太阴太阳全日分潮 周期 23.9345 h —— 全日潮主成分（低纬大陆东岸显著）
//   O1 主太阴全日分潮  周期 25.8193 h —— 与 K1 调制出全日潮不等
//
// 振幅与相位：真实世界由验潮站调和分析得出（数千个谐波常数）。v1 用
// 平衡潮理论 + 海盆地形近似（大陆西岸增强、东海/西北大陆架放大、
// 无潮点旋涡）构造形态正确的演示场；v2 接 TPXO/FES 全球潮汐模型数据。
//
// 输出：tideHeight(lon, lat, t) 米；tideCurrent(lon, lat, t) m/s（梯度旋转 90°）

const D2R = Math.PI / 180;

export const CONSTITUENTS = [
  { id: 'M2', name: '主太阴半日潮', periodH: 12.4206012, ampBase: 1.0, semi: true },
  { id: 'S2', name: '主太阳半日潮', periodH: 12.0, ampBase: 0.46, semi: true },
  { id: 'K1', name: '太阴太阳全日潮', periodH: 23.9344725, ampBase: 0.31, semi: false },
  { id: 'O1', name: '主太阴全日潮', periodH: 25.8193387, ampBase: 0.20, semi: false },
];

/** 各分潮相位（弧度），t 为小时 */
const phase = (c, t) => (2 * Math.PI * t) / c.periodH;

/** 海盆形态因子：振幅地理分布的粗粒度近似（0.1~2.2） */
function basinFactor(lon, lat) {
  // 大陆西岸（美洲太平洋侧）涌潮放大；东岸次之；开阔大洋中心小
  const westCoast = Math.exp(-(((Math.abs(lon + 140) < 40 ? 1 : 0) - 1) ** 2)); // 占位不用
  void westCoast;
  let f = 0.35;
  // 东海/黄海（大陆架浅海放大，宁波外海正是典型强潮区）
  if (lon > 117 && lon < 131 && lat > 22 && lat < 41) f += 1.5;
  // 鄂霍次克/白令海陆架
  if (lon > 135 && lon < 165 && lat > 45 && lat < 62) f += 0.8;
  // 北海/英吉利海峡（欧洲陆架）
  if (lon > -6 && lon < 10 && lat > 48 && lat < 62) f += 1.2;
  // 马六甲/孟加拉湾北部
  if (lon > 88 && lon < 98 && lat > 15 && lat < 23) f += 0.9;
  // 加拿大芬迪湾方向（世界最大潮差）由新斯科舍半岛附近增强表示
  if (lon > -68 && lon < -60 && lat > 43 && lat < 48) f += 1.8;
  // 澳大利亚西北陆架（King Sound 大潮）
  if (lon > 122 && lon < 130 && lat > -20 && lat < -14) f += 1.4;
  // 地中海/黑海（半封闭小潮）
  if (lon > 0 && lon < 42 && lat > 30 && lat < 46) f *= 0.25;
  // 波罗的海（微潮）
  if (lon > 14 && lon < 30 && lat > 54 && lat < 66) f *= 0.2;
  return f;
}

/** 无潮点（amphidromic point）旋涡：真实海洋潮波绕无潮点旋转。
 *  列出几个主要半日潮无潮点的近似位置与旋向。 */
const AMPHIDROMES = [
  { lon: -155, lat: 25, r: 28, sign: -1 },   // 北太平洋副热带
  { lon: 165, lat: 35, r: 26, sign: 1 },     // 西北太平洋
  { lon: -35, lat: 45, r: 22, sign: -1 },    // 北大西洋
  { lon: 70, lat: -30, r: 30, sign: 1 },     // 南印度洋
  { lon: 5, lat: -35, r: 26, sign: -1 },     // 南大西洋
];

/** 某分潮在 (lon,lat) 的相位延迟：纬向传播 + 无潮点旋涡扭转 */
function phaseDelay(lon, lat) {
  let d = (lon / 360) * 2 * Math.PI * 0.55;            // 潮波自东向西为主的经向滞后
  for (const a of AMPHIDROMES) {
    const dx = (lon - a.lon), dy = (lat - a.lat);
    const dist = Math.hypot(dx, dy);
    const infl = Math.exp(-((dist / a.r) ** 2));
    d += a.sign * (Math.atan2(dy, dx)) * infl * 2.2;   // 靠近无潮点相位快速旋转
  }
  return d;
}

/**
 * 合成潮高（米，演示量级 ±0~4 m）
 * @param tHours 模拟时间（小时，自任意历元）
 */
export function tideHeight(lon, lat, tHours) {
  let h = 0;
  for (const c of CONSTITUENTS) {
    const amp = c.ampBase * basinFactor(lon, lat) * (c.semi ? 1 : 0.9);
    const ph = phase(c, tHours) - phaseDelay(lon, lat) * (c.semi ? 1 : 0.6);
    h += amp * Math.cos(ph);
  }
  // 纬度衰减（全日潮在低纬更显著——保留，半日潮全球分布）
  h *= 1 - 0.25 * Math.abs(Math.sin(lat * D2R));
  return h;
}

/** 潮流：潮高梯度旋转 90°（地转平衡流的直观近似），返回 {u, v} m/s */
export function tideCurrent(lon, lat, tHours) {
  const e = 0.35;   // 度
  const dhdlon = (tideHeight(lon + e, lat, tHours) - tideHeight(lon - e, lat, tHours)) / (2 * e);
  const dhdlat = (tideHeight(lon, lat + e, tHours) - tideHeight(lon, lat - e, tHours)) / (2 * e);
  const f = 1.15;   // 米→m/s 的演示缩放
  return { u: -dhdlat * f, v: dhdlon * f };
}

/** 潮型判定：半日潮 / 全日潮 / 混合潮（按四大分潮振幅比，形态学分类） */
export function tideType(lon, lat) {
  const semiAmp = (1.0 + 0.46) * basinFactor(lon, lat);
  const diAmp = (0.31 + 0.20) * basinFactor(lon, lat) * 0.9;
  const ratio = diAmp / semiAmp;
  // 阈值按演示场标定：0.35 以下视觉上每天两次规整涨落 → 半日潮
  if (ratio < 0.35) return { type: '半日潮', desc: '每天两次涨落，周期约 12 小时 25 分' };
  if (ratio > 1.2) return { type: '全日潮', desc: '每天一次涨落，北部湾/墨西哥湾典型' };
  return { type: '混合潮', desc: '半日潮为主但有明显日不等' };
}

/** 朔望周期里的大潮/小潮状态（M2-S2 春潮相位差） */
export function springNeap(tHours) {
  const beat = 2 * Math.PI * tHours * (1 / 12.0 - 1 / 12.4206012); // M2 与 S2 的相位差变化
  const k = (1 - Math.cos(beat)) / 2;   // 0=小潮 1=大潮
  return { factor: k, label: k > 0.7 ? '大潮' : k < 0.3 ? '小潮' : '中潮' };
}

/** 参考港口（读数展示用） */
export const PORTS = [
  { zh: '宁波-舟山', lon: 121.95, lat: 29.95 },
  { zh: '青岛', lon: 120.38, lat: 36.07 },
  { zh: '旧金山', lon: -122.42, lat: 37.77 },
  { zh: '伦敦(泰晤士河口)', lon: 0.45, lat: 51.5 },
  { zh: '悉尼', lon: 151.2, lat: -33.86 },
  { zh: '新加坡', lon: 103.85, lat: 1.29 },
];
