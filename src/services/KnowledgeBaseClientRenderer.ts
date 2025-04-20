import { Agent, QAEntry } from '../types';

export class KnowledgeBaseClientRenderer {
  private agent: Agent;

  constructor(agent: Agent) {
    if (!agent.vectorDbUrl || !agent.knowledgeBaseName || !agent.openAiApiKey) {
      throw new Error('Agent is missing KB configuration');
    }

    this.agent = agent;
  }

  async search(query: string): Promise<QAEntry[]> {
    const response = await window.ipcRenderer.invoke('kb:search', this.agent, query);
    if (response?.error) throw new Error(response.error);
    return response;
  }

  async getRecent(): Promise<QAEntry[]> {
    const response = await window.ipcRenderer.invoke('kb:recent', this.agent);
    if (response?.error) throw new Error(response.error);
    return response;
  }

  async insertQA(question: string, answer: string): Promise<string> {
    const response = await window.ipcRenderer.invoke('kb:insert', this.agent, question, answer);
    if (response?.error) throw new Error(response.error);
    return response.id;
  }

  async getById(id: string): Promise<QAEntry | null> {
    const result = await window.ipcRenderer.invoke('kb:getById', this.agent, id);
    if (result?.error) throw new Error(result.error);
    return result;
  }
  
  async updateQA(id: string, updates: { question?: string; answer?: string }): Promise<void> {
    const result = await window.ipcRenderer.invoke('kb:update', this.agent, id, updates);
    if (result?.error) throw new Error(result.error);
  }
  
  async deleteQA(id: string): Promise<void> {
    const result = await window.ipcRenderer.invoke('kb:delete', this.agent, id);
    if (result?.error) throw new Error(result.error);
  }

  // Optional future methods
  // async insertQA(question: string, answer: string): Promise<string> { ... }
  // async updateQA(id: string, updates: { ... }): Promise<void> { ... }
  // async deleteQA(id: string): Promise<void> { ... }
}
