import React, { useState, useEffect } from 'react'
import { X, Settings2, Video, Mic } from 'lucide-react'
import { writeStorage, readStorage, STORAGE_KEYS } from '../lib/storage.js'

export default function SettingsModal({ onClose }) {
  const [cameras, setCameras] = useState([])
  const [mics, setMics] = useState([])
  
  const [selectedCam, setSelectedCam] = useState(readStorage(STORAGE_KEYS.PREFERRED_CAM, 'default'))
  const [selectedMic, setSelectedMic] = useState(readStorage(STORAGE_KEYS.PREFERRED_MIC, 'default'))

  useEffect(() => {
    async function loadDevices() {
      try {
        // Request permissions first to get labels
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        const devices = await navigator.mediaDevices.enumerateDevices()
        
        const videoInput = devices.filter(d => d.kind === 'videoinput')
        const audioInput = devices.filter(d => d.kind === 'audioinput')
        
        setCameras(videoInput)
        setMics(audioInput)
      } catch (err) {
        console.warn('Could not enumerate devices', err)
      }
    }
    loadDevices()
  }, [])

  const handleSave = () => {
    writeStorage(STORAGE_KEYS.PREFERRED_CAM, selectedCam)
    writeStorage(STORAGE_KEYS.PREFERRED_MIC, selectedMic)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-xl border border-app-border panel-elevated shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="settings-title"
      >
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <div className="flex items-center gap-2 text-text-primary">
            <Settings2 className="h-4 w-4" />
            <h2 id="settings-title" className="font-semibold text-sm">Device Settings</h2>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-md p-1 hover:bg-app-hover text-text-muted transition-colors"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
              <Video className="h-3.5 w-3.5" />
              Camera
            </label>
            <select 
              className="input-field w-full h-9 text-sm"
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
            >
              <option value="default">System Default</option>
              {cameras.map(c => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${c.deviceId.slice(0,5)}...`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-2 uppercase tracking-wide">
              <Mic className="h-3.5 w-3.5" />
              Microphone
            </label>
            <select 
              className="input-field w-full h-9 text-sm"
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
            >
              <option value="default">System Default</option>
              {mics.map(m => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `Microphone ${m.deviceId.slice(0,5)}...`}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-app-border px-4 py-3 bg-app-base rounded-b-xl">
          <button 
            onClick={onClose}
            className="btn-ghost h-8 px-4 text-xs font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn-primary h-8 px-4 text-xs font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
