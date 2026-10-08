import { useRef, useState } from 'react'
import TideGlobe from './components/TideGlobe.jsx'
import { TideHud, PortStrip } from './components/Hud.jsx'

const SPEEDS = [['慢', 0.5], ['标准', 1], ['快', 3]]

export default function App() {
  const apiRef = useRef(null)
  const [speed, setSpeed] = useState(1)

  return (
    <>
      <TideGlobe ref={apiRef} />
      <TideHud apiRef={apiRef} />
      <PortStrip apiRef={apiRef} />
      <div id="controls">
        <span className="k">流速</span>
        {SPEEDS.map(([label, v]) => (
          <button key={label} className={`ctl ${speed === v ? 'on' : ''}`}
            onClick={() => { setSpeed(v); apiRef.current?.setSpeed(v) }}>{label}</button>
        ))}
        <div className="sep" />
        <button className="ctl" onClick={() => apiRef.current?.rotateTo(122, 30)}>东海</button>
        <button className="ctl" onClick={() => apiRef.current?.rotateTo(0, 50)}>欧洲陆架</button>
        <button className="ctl" onClick={() => apiRef.current?.rotateTo(-150, 20)}>太平洋</button>
      </div>
    </>
  )
}
