import { useEffect, useImperativeHandle, useRef } from 'react'
import { WindGlobe } from '../tide/globeBase.js'
import { tideCurrent } from '../tide/harmonics.js'

/**
 * 潮汐地球：复用风之镜的球面渲染器（三层画布：地球/粒子/标记），
 * 但粒子平流改用潮流场，且叠加潮高着色层。
 */
export default function TideGlobe({ ref }) {
  const baseRef = useRef(null), trailRef = useRef(null), trackRef = useRef(null), g = useRef(null)

  useEffect(() => {
    const globe = new WindGlobe(baseRef.current, trailRef.current, trackRef.current, {
      // 接口适配：风之镜的 sample() 约定 —— 潮流场包装成同构网格采样器
      u: 0, v: 0,
    })
    // 覆盖采样器：直接解析调用潮流函数（无网格）
    globe.field = {
      sampleProxy: true,
      dynamic: true,
      days: 0,
      typhoons: [],
      update() {},
    }
    g.current = globe
    window.__tide = globe

    let raf, last = performance.now()
    const loop = (now) => {
      const dt = Math.min(3, (now - last) / 16.7)
      last = now
      globe.simHours = (globe.simHours ?? 0) + dt * globe.simSpeed * 0.25
      globe.frame(dt, (lon, lat) => {
        const { u, v } = tideCurrent(lon, lat, globe.simHours)
        return { u, v, speed: Math.hypot(u, v) }
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => globe.resize())
    ro.observe(baseRef.current.parentElement)

    const el = trailRef.current
    let dragging = false, lx = 0, ly = 0
    const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId) }
    const move = (e) => {
      if (!dragging) return
      globe.rotateBy((e.clientX - lx) * 0.24, (e.clientY - ly) * 0.24)
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { dragging = false }
    const wheel = (e) => { e.preventDefault(); globe.setScale(e.deltaY < 0 ? 1.12 : 1 / 1.12) }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [])

  useImperativeHandle(ref, () => ({
    setSpeed(v) { if (g.current) g.current.simSpeed = v },
    setDensity(n) { g.current?.setDensity(n) },
    rotateTo(lon, lat) {
      const gb = g.current
      if (!gb) return
      gb.lon0 = lon; gb.lat0 = lat; gb.viewDirty = true
    },
    simHours() { return g.current?.simHours ?? 0 },
  }))

  return (
    <div id="globe-wrap">
      <canvas id="globe-base" ref={baseRef} />
      <canvas id="globe-trail" ref={trailRef} />
      <canvas id="globe-track" ref={trackRef} />
    </div>
  )
}
