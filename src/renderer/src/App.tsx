import { useState, useEffect } from 'react'
import './App.css'

interface PedalData {
  accelerator: number
  brake: number
  clutch: number
}

function App(): JSX.Element {
  const [pedalData, setPedalData] = useState<PedalData>({
    accelerator: 0,
    brake: 0,
    clutch: 0
  })

  useEffect(() => {
    // Set up IPC listener for pedal updates
    const pedalUpdateHandler = (_event: unknown, data: PedalData): void => {
      console.log('Pedal data received:', data)
      setPedalData(data)
    }

    window.electron.ipcRenderer.on('pedal-update', pedalUpdateHandler)

    // return (): void => {
    //   // Cleanup listener when component unmounts
    //   window.electron.ipcRenderer.removeListener('pedal-update', pedalUpdateHandler)
    // }
  }, [])

  const handleActionChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const newAction = event.target.value
    window.electron.ipcRenderer.send('update-pedal-config', {
      pedal: 'accelerator',
      action: newAction
    })
  }

  return (
    <div className="pedal-container">
      <h2>Pedals</h2>

      <div className="pedal-group">
        <h3>Accelerator</h3>
        <div className="pedal-value">
          <div
            className="pedal-value-inner"
            style={{ width: `${pedalData.accelerator.toFixed(0)}%` }}
          >
            {pedalData.accelerator.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="pedal-group">
        <h3>Brake</h3>
        <div className="pedal-value">
          <div
            className="pedal-value-inner brake"
            style={{ width: `${pedalData.brake.toFixed(0)}%` }}
          >
            {pedalData.brake.toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="pedal-group">
        <h3>Clutch</h3>
        <div className="pedal-value">
          <div
            className="pedal-value-inner clutch"
            style={{ width: `${pedalData.clutch.toFixed(0)}%` }}
          >
            {pedalData.clutch.toFixed(0)}%
          </div>
        </div>
      </div>

      <select onChange={handleActionChange}>
        <option value="keypress">Key Press</option>
        <option value="mouseScroll">Mouse Scroll</option>
        <option value="volumeControl">Volume Control</option>
        <option value="windowSwitch">Window Switch</option>
      </select>
    </div>
  )
}

export default App
