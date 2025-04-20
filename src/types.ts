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
  id: string;
  name: string;
  url: string;
  includeToolMessages?: boolean;
  maxTokens?: number;
  temperature?: number;
  vectorDbUrl?: string; // NEW
  knowledgeBaseName?: string; // NEW
  openAiApiKey?: string;
}

export type FDConfig = {
  version: string
  agents: Agent[]
}

export type OpenAIConfig = {
  apiKey: string
  model?: string
}

export interface QAEntry {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  updatedAt: string;
  score?: number; // Optional: only present on search hits
}