import { Agent, TaskEntry } from '../types';

export class TaskClientRenderer {
  private agent: Agent;

  constructor(agent: Agent) {
    if (!agent.vectorDbUrl || !agent.taskIndexName || !agent.openAiApiKey) {
      throw new Error('Agent is missing task configuration');
    }

    this.agent = agent;
  }

  async search(query: string): Promise<TaskEntry[]> {
    const response = await window.ipcRenderer.invoke('tasks:search', this.agent, query);
    if (response?.error) throw new Error(response.error);
    return response;
  }

  async getRecent(): Promise<TaskEntry[]> {
    const response = await window.ipcRenderer.invoke('tasks:recent', this.agent);
    if (response?.error) throw new Error(response.error);
    return response;
  }

  async insertTask(description: string): Promise<string> {
    const response = await window.ipcRenderer.invoke('tasks:insert', this.agent, description);
    if (response?.error) throw new Error(response.error);
    return response.id;
  }

  async getById(id: string): Promise<TaskEntry | null> {
    const response = await window.ipcRenderer.invoke('tasks:getById', this.agent, id);
    if (response?.error) throw new Error(response.error);
    return response;
  }

  async updateTask(id: string, updates: { description?: string; code?: string }): Promise<void> {
    const result = await window.ipcRenderer.invoke('tasks:update', this.agent, id, updates);
    if (result?.error) throw new Error(result.error);
  }

  async deleteTask(id: string): Promise<void> {
    const result = await window.ipcRenderer.invoke('tasks:delete', this.agent, id);
    if (result?.error) throw new Error(result.error);
  }
}
