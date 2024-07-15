import { createContext, useCallback, useEffect, useState } from 'react'
import { Agent, AgentTask, FDConfig, OpenAIConfig } from '../types'
import { AssistantTools, generateToolsFromAgentTasks } from '../ai/tools'

type Page = 'Home' | 'Agents'

export const AppContext = createContext<{
  activePage: Page
  config?: FDConfig
  openaiConfig?: OpenAIConfig
  agents: Agent[]
  openConfigModal?: boolean
  assistantTools: AssistantTools
  toggleConfigModal: () => void
  setConfig: (config: FDConfig) => void
  callAssistantTool: (name: string, parameters: string[]) => Promise<any>
  getToolSchemas: () => any[]
  addAgent: (agent: Agent) => Promise<void | string>
  deleteAgent: (agentId: string) => Promise<void | string>
  updateAgent: (agent: Agent) => Promise<void | string>
}>({
  activePage: 'Home',
  agents: [],
  assistantTools: {},
  toggleConfigModal: () => {
    throw new Error('Not implemented')
  },
  setConfig: () => {
    throw new Error('Not implemented')
  },
  callAssistantTool: () => {
    throw new Error('Not implemented')
  },
  getToolSchemas: () => {
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
  const [openaiConfig, setOpenAIConfig] = useState<OpenAIConfig>()
  const [agents, setAgents] = useState<Agent[]>([])
  const [openConfigModal, setOpenConfigModal] = useState<boolean>(false)
  const [assistantTools, setAssistantTools] = useState<AssistantTools>({})

  const callAssistantTool = async (name: string, parameters: string[]) => {
    if (!assistantTools[name]) {
      throw new Error(`Tool not found: ${name}`)
    }
    const { agentId, taskName, params } = assistantTools[name]._getCallParams(parameters)

    return new Promise((resolve, reject) => {
      window.ipcRenderer.send('run-agent-task', agentId, taskName, JSON.stringify(params))
      window.ipcRenderer.once('run-agent-task-reply', (_event, response) => {
        if (response.error) {
          console.error('Failed to run agent task:', response.error)
          reject(response.error)
        } else {
          resolve(response)
        }
      })
    })
  }

  const getToolSchemas = () => {
    return Object.values(assistantTools).map((t) => t.getOpenAISchema())
  }

  const toggleConfigModal = () => {
    setOpenConfigModal((prev) => !prev)
  }

  const initializeAgent = (agent: Agent): Agent => ({
    id: agent.id,
    name: agent.name,
    path: agent.path,
    tasks: []
  })

  const fetchAgentTasks = (agentId: string) => {
    const uniqueListener = `get-agent-tasks-reply-${agentId}`

    const handleAgentTasksReply = (_event: any, response: any) => {
      if (response.error) {
        console.error('Failed to fetch agent tasks:', response.error)
      } else {
        const agentInfo = JSON.parse(response)
        const tasks: AgentTask[] = agentInfo.tasks
        const tools = generateToolsFromAgentTasks(agentId, tasks)

        setAssistantTools((prev) => ({ ...prev, ...tools }))
        setAgents((prevAgents) =>
          prevAgents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  tasks,
                  instructions: agentInfo.instructions
                }
              : a
          )
        )
      }
    }

    window.ipcRenderer.send('get-agent-tasks', agentId)
    window.ipcRenderer.once(uniqueListener, handleAgentTasksReply)
  }

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
          fetchAgentTasks(agent.id)
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
          setAssistantTools((prev) => {
            const tools = Object.values(prev)
            for (const tool of tools) {
              if (tool.agentId === agentId) {
                delete prev[tool.name]
              }
            }
            return prev
          })
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
          setOpenAIConfig(data.openai)
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
      toggleConfigModal()
    })
    setIsInit(true)
  }, [isInit, config])

  const fetchAgentsTasks = useCallback(() => {
    if (config && config.agents) {
      for (const agent of config.agents) {
        fetchAgentTasks(agent.id)
      }
    }
  }, [config])

  useEffect(() => {
    if (isInit && config) {
      fetchAgentsTasks()
    }
  }, [isInit, config, fetchAgentsTasks])

  return {
    isInit,
    activePage,
    config,
    agents,
    openaiConfig,
    openConfigModal,
    assistantTools,
    toggleConfigModal,
    setConfig,
    callAssistantTool,
    getToolSchemas,
    addAgent,
    deleteAgent,
    updateAgent
  }
}

export default useAppHook
