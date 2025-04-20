import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter as Router } from 'react-router-dom'
import NavigationListener from './components/Layout/NavigationListener'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <NavigationListener />
      <App />
    </Router>
  </React.StrictMode>
)


