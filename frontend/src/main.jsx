import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { WebSocketProvider } from './context/WebSocketContext'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

// WebSocketProvider must wrap AuthProvider so that AuthContext can call
// connect() / disconnect() from useWebSocket() on login/logout.

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <WebSocketProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1A1A2E',
                color: '#E0E0E0',
                border: '1px solid rgba(255,255,255,0.1)',
              },
            }}
          />
        </AuthProvider>
      </WebSocketProvider>
    </BrowserRouter>
  </StrictMode>
)
