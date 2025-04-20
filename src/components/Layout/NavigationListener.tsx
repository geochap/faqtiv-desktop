import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const NavigationListener = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (_event: any, path: string) => {
      navigate(path)
    }
  
    window.ipcRenderer.on('navigate', handler)
  
    return () => {
      if (window.ipcRenderer?.removeListener) {
        window.ipcRenderer.removeListener('navigate', handler)
      } else if (window.ipcRenderer?.off) {
        window.ipcRenderer.off('navigate', handler)
      }
    }
  }, [navigate])
  
  return null
}

export default NavigationListener
