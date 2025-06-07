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
  vectorDbUrl?: string; 
  knowledgeBaseName?: string;
  taskIndexName?: string;
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

export type QAEntry = {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  score?: number;
};

export type TaskEntry = {
  id: string;
  description: string;
  code?: string;
  createdAt: string;
  updatedAt?: string;
  score?: number;
  evalResult?: any;
  dataDictionary?: any;
};