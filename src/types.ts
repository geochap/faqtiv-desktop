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

export type Agent = {
  id: string
  name: string
  url: string
}

export type FDConfig = {
  version: string
  agents: Agent[]
}

export type OpenAIConfig = {
  apiKey: string
  model?: string
}
