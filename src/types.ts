export type AgentTask = {
  schema: {
    [key: string]: {
      type: string
      description: string
    }
  }
  name: string
  description: string
  returns: string
  requiredParams: string[]
}

export interface Agent {
  id: string
  name: string
  url: string
  includeToolMessages?: boolean
  maxTokens?: number | undefined
  temperature?: number | undefined
}

export type FDConfig = {
  version: string
  agents: Agent[]
}

export type OpenAIConfig = {
  apiKey: string
  model?: string
}
