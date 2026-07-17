import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { SpeedInsights } from "@vercel/speed-insights/react"
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
      <SpeedInsights />
    </ToastProvider>
  </React.StrictMode>
)
