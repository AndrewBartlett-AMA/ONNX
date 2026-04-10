import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles.css'

registerSW({
  immediate: true,
  onOfflineReady() {
    console.info('Quiet Scribe is ready for offline use.')
  },
  onNeedRefresh() {
    console.info('A new version is available. Reload to update.')
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
