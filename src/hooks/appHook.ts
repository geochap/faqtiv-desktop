import { createContext, useEffect, useState } from 'react'
import { Agent, FDConfig } from '../types'

type Page = 'Home' | 'Agents'

export const AppContext = createContext<{
  activePage: Page
  config?: FDConfig
  agents: Agent[]
  setConfig: (config: FDConfig) => void
  addAgent: (agent: Agent) => Promise<void | string>
  deleteAgent: (agentId: string) => Promise<void | string>
  updateAgent: (agent: Agent) => Promise<void | string>
}>({
  activePage: 'Home',
  agents: [],
  setConfig: () => {
    throw new Error('Not implemented')
  },
  addAgent: () => {
    throw new Error('Not implemented')
  },
  deleteAgent: () => {
    throw new Error('Not implemented')
  },
  updateAgent: () => {
    throw new Error('Not implemented')
  }
})

const useAppHook = () => {
  const [isInit, setIsInit] = useState(false)
  const [activePage, setActivePage] = useState<Page>('Home')
  const [config, setConfig] = useState<FDConfig>()
  const [agents, setAgents] = useState<Agent[]>([])

  const initializeAgent = (agent: Agent): Agent => ({
    id: agent.id,
    name: agent.name,
    url: agent.url
  })

  const addAgent = (agent: Agent) => {
    return new Promise<void | string>((resolve, reject) => {
      window.ipcRenderer.send('add-agent', agent)
      window.ipcRenderer.once('add-agent-reply', (_event, response) => {
        if (response.error) {
          console.error('Failed to add agent:', response.error)
          reject(response.error)
        } else {
          const newAgent = initializeAgent(agent)
          setAgents((prevAgents) => [...prevAgents, newAgent])
          resolve()
        }
      })
    })
  }

  const deleteAgent = (agentId: string) => {
    return new Promise<void | string>((resolve, reject) => {
      window.ipcRenderer.send('delete-agent', agentId)
      window.ipcRenderer.once('delete-agent-reply', (_event, response) => {
        if (response.error) {
          console.error('Failed to delete agent:', response.error)
          reject(response.error)
        } else {
          setAgents((prevAgents) => prevAgents.filter((agent) => agent.id !== agentId))
          resolve()
        }
      })
    })
  }

  const updateAgent = (agent: Agent) => {
    return new Promise<void | string>((resolve, reject) => {
      window.ipcRenderer.send('update-agent', agent)
      window.ipcRenderer.once('update-agent-reply', (_event, response) => {
        if (response.error) {
          console.error('Failed to update agent:', response.error)
          reject(response.error)
        } else {
          setAgents((prevAgents) => prevAgents.map((a) => (a.id === agent.id ? agent : a)))
          resolve()
        }
      })
    })
  }

  useEffect(() => {
    window.ipcRenderer.removeAllListeners('open-agent-settings')

    if (!isInit || !config) {
      window.ipcRenderer.send('app-init')
      window.ipcRenderer.once('app-init-reply', (_event, response) => {
        try {
          const data = JSON.parse(response)
          setConfig(data.config)
          if (data.config.agents) {
            const initializedAgents = data.config.agents.map(initializeAgent)
            setAgents(initializedAgents)
          }
        } catch (e) {
          console.error('Failed to read config')
          console.error(e)
        }
      })
    }
    window.ipcRenderer.on('change-page', (_event, page) => {
      setActivePage(page)
    })
    setIsInit(true)
  }, [isInit, config])

  return {
    isInit,
    activePage,
    config,
    agents,
    setConfig,
    addAgent,
    deleteAgent,
    updateAgent
  }
}

export default useAppHook
