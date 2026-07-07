import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClickProvider } from './lib/click'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ClickProvider>
        <App />
      </ClickProvider>
    </BrowserRouter>
  </StrictMode>
)
