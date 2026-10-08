import { useEffect, useRef } from 'react'
import { tideHeight, tideType, springNeap, PORTS } from '../tide/harmonics.js'

/** 右上信息面板：时间/大潮小潮/潮高色标（命令式刷新） */
export function TideHud({ apiRef }) {
  const time = useRef(null), phaseLabel = useRef(null)

  useEffect(() => {
    let raf
    const loop = () => {
      const h = apiRef.current?.simHours?.() ?? 0
      if (time.current) {
        const hh = Math.floor(h % 24), mm = Math.floor((h % 1) * 60)
        time.current.textContent = `T+${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      }
      if (phaseLabel.current) {
        const sn = springNeap(h)
        phaseLabel.current.textContent = sn.label
        phaseLabel.current.style.color = sn.factor > 0.7 ? '#ffd27a' : sn.factor < 0.3 ? '#7fb8d8' : '#cfeeff'
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <aside id="hud">
      <h1>🌊 潮汐之舞</h1>
      <div className="hud-grid">
        <span className="k">模拟时刻</span><span ref={time}>T+00:00</span>
        <span className="k">潮相</span><span ref={phaseLabel}>——</span>
      </div>
      <div id="tide-scale">
        <span>-4m</span>
        <div className="bar" />
        <span>+4m</span>
      </div>
      <p className="hud-note">M2 · S2 · K1 · O1 四大分潮合成 · 拖拽旋转/滚轮缩放</p>
    </aside>
  )
}

/** 底部港口潮位读数条 */
export function PortStrip({ apiRef }) {
  const refs = useRef([])

  useEffect(() => {
    let raf
    const loop = () => {
      const h = apiRef.current?.simHours?.() ?? 0
      refs.current.forEach((el, i) => {
        if (!el) return
        const p = PORTS[i]
        const v = tideHeight(p.lon, p.lat, h)
        el.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(2)}m`
        el.style.color = v > 0.5 ? '#ffd27a' : v < -0.5 ? '#7fb8d8' : '#cfeeff'
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div id="ports">
      {PORTS.map((p, i) => (
        <div key={p.zh} className="port">
          <span className="port-name">{p.zh}</span>
          <span className="port-tide" ref={(el) => (refs.current[i] = el)}>——</span>
          <span className="port-type">{tideType(p.lon, p.lat).type}</span>
        </div>
      ))}
    </div>
  )
}
