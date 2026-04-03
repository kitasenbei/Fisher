import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Demo from './App.jsx'
import { EditorProvider } from './stores/editorStore'
import { ToastProvider } from './components'
import EditorLayout from './views/EditorLayout'

function EditorPage() {
  return (
    <ToastProvider>
      <EditorProvider>
        <EditorLayout />
      </EditorProvider>
    </ToastProvider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
