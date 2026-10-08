// 潮汐层回归测试：node tools/test-tide.mjs
// 校准点：
//   M2 周期 12.4206h → 宁波同一地点潮高曲线应有 12.42h 主周期（24.84h 内两次高潮）
//   半日潮港（宁波）一天两次高潮；地中海振幅显著小于东海
//   大潮/小潮拍频周期 = 1/(1/12 - 1/12.4206) ≈ 353.9h ≈ 14.77 天
import { tideHeight, tideCurrent, tideType, springNeap, CONSTITUENTS, PORTS } from '../src/tide/harmonics.js';

let pass = 0, fail = 0;
const check = (name, cond) => { cond ? pass++ : fail++; console.log(`${cond ? '✅' : '❌'} ${name}`); };

// 1. 分潮频率与 Doodson 标准值一致
const m2 = CONSTITUENTS.find((c) => c.id === 'M2');
check('M2 周期 = 12.4206h', Math.abs(m2.periodH - 12.4206012) < 1e-4);
check('S2 周期 = 12h 整', CONSTITUENTS.find((c) => c.id === 'S2').periodH === 12);

// 2. 半日潮港：宁波 24.84h 内两次高潮（M2 主导）
const NINGBO = PORTS[0];
let highs = 0, prev = tideHeight(NINGBO.lon, NINGBO.lat, 0), prevDelta = -1;
for (let t = 0.1; t <= 25; t += 0.1) {
  const h = tideHeight(NINGBO.lon, NINGBO.lat, t);
  const d = h - prev;
  if (prevDelta > 0 && d < 0) highs++;           // 由升转降 = 高潮
  prevDelta = d; prev = h;
}
console.log(`宁波 25h 内高潮次数: ${highs}`);
check('宁波一天约两次高潮（半日潮）', highs >= 2 && highs <= 3);

// 3. 振幅地理分布：东海 > 地中海（陆架放大 vs 半封闭小潮）
let ampECS = 0, ampMed = 0;
for (let t = 0; t < 50; t += 0.5) {
  ampECS = Math.max(ampECS, Math.abs(tideHeight(125, 30, t)));
  ampMed = Math.max(ampMed, Math.abs(tideHeight(20, 38, t)));
}
console.log(`东海最大潮高 ${ampECS.toFixed(2)}m vs 地中海 ${ampMed.toFixed(2)}m`);
check('东海振幅 > 地中海（形态正确）', ampECS > ampMed * 1.8);

// 4. 潮型：宁波半日潮
const tt = tideType(NINGBO.lon, NINGBO.lat);
check('宁波为半日潮型', tt.type === '半日潮');

// 5. 大潮小潮拍频周期 ≈ 14.77 天（353.9h）
let t0 = null;
for (let t = 1; t < 720; t += 0.5) {
  const f0 = springNeap(t - 0.5).factor, f1 = springNeap(t).factor;
  if (f0 < 0.95 && f1 >= 0.95 && t0 === null) t0 = t;
  if (t0 !== null && t - t0 > 300) {
    const f2 = springNeap(t).factor;
    if (f0 < 0.95 && f1 >= 0.95 && f2 >= 0.95) {
      const period = t - t0;
      console.log(`大潮拍频周期: ${period.toFixed(1)}h（理论 353.9h ≈ 14.77 天）`);
      check('大潮周期误差 < 3%', Math.abs(period - 353.9) < 11);
      t0 = t;
      break;
    }
  }
}

// 6. 潮流场连续且有界
let maxSpeed = 0;
for (let lon = -170; lon <= 170; lon += 13) {
  for (let lat = -80; lat <= 80; lat += 11) {
    const { u, v } = tideCurrent(lon, lat, 3.3);
    maxSpeed = Math.max(maxSpeed, Math.hypot(u, v));
  }
}
console.log(`潮流最大模长: ${maxSpeed.toFixed(2)} m/s`);
check('潮流模长有界（0 < max < 15）', maxSpeed > 0.1 && maxSpeed < 15);

console.log(`\n${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
