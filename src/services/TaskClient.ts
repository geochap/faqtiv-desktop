import { Client } from '@opensearch-project/opensearch';
import { Agent, TaskEntry } from '../types';
import { OpenAIService } from './OpenAIService';

export class TaskClient {
  private client: Client;
  private indexName: string;
  private openai: OpenAIService;

  constructor(agent: Agent) {
    if (!agent.vectorDbUrl || !agent.taskIndexName) {
      throw new Error('Agent is missing vector DB config for tasks');
    }

    if (!agent.openAiApiKey) {
      throw new Error('Agent is missing OpenAI API key');
    }

    this.client = new Client({ node: agent.vectorDbUrl });
    this.indexName = agent.taskIndexName;
    this.openai = new OpenAIService(agent.openAiApiKey);
  }

  async ensureIndexExists(): Promise<void> {
    const existsResponse = await this.client.indices.exists({ index: this.indexName });

    if (!existsResponse.body) {
      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: {
            index: { knn: true }
          },
          mappings: {
            properties: {
              task: { type: 'text' },
              code: { type: 'text' },
              taskEmbedding: {
                type: 'knn_vector',
                dimension: 1536
              },
              agentId: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              evalResult: { type: 'object' },
              dataDictionary: { type: 'object' }
            }
          }
        }
      });
    }
  }

  async search(text: string, topK = 20): Promise<TaskEntry[]> {
    const embedding = await this.openai.getEmbedding(text);
    await this.ensureIndexExists();

    const { body } = await this.client.search({
      index: this.indexName,
      body: {
        size: topK,
        query: {
          knn: {
            taskEmbedding: {
              vector: embedding,
              k: topK
            }
          }
        }
      }
    });

    return body.hits.hits.map((hit: any) => ({
      id: hit._id,
      description: hit._source.task,
      code: hit._source.code,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      evalResult: hit._source.evalResult,
      dataDictionary: hit._source.dataDictionary,
      score: hit._score
    }));
  }

  async getRecent(limit = 10): Promise<TaskEntry[]> {
    await this.ensureIndexExists();

    const { body } = await this.client.search({
      index: this.indexName,
      body: {
        size: limit,
        sort: [{ createdAt: 'desc' }],
        query: { match_all: {} }
      }
    });

    return body.hits.hits.map((hit: any) => ({
      id: hit._id,
      description: hit._source.task,
      code: hit._source.code,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      evalResult: hit._source.evalResult,
      dataDictionary: hit._source.dataDictionary
    }));
  }

  async insertTask(
    agentId: string,
    description: string,
    code?: string,
    evalResult?: any,
    dataDictionary?: any
  ): Promise<string> {
    const embedding = await this.openai.getEmbedding(description);
    await this.ensureIndexExists();

    const now = new Date().toISOString();

    const res = await this.client.index({
      index: this.indexName,
      body: {
        agentId,
        task: description,
        code,
        taskEmbedding: embedding,
        evalResult,
        dataDictionary,
        createdAt: now,
        updatedAt: now
      },
      refresh: true
    });

    return res.body._id;
  }

  async updateTask(id: string, updates: { description?: string; code?: string }): Promise<void> {
    const body: any = {
      updatedAt: new Date().toISOString()
    };

    if (updates.description) {
      body.task = updates.description;
      body.taskEmbedding = await this.openai.getEmbedding(updates.description);
    }

    if (updates.code) {
      body.code = updates.code;
    }

    await this.client.update({
      index: this.indexName,
      id,
      body: { doc: body },
      refresh: true
    });
  }

  async deleteTask(id: string): Promise<void> {
    await this.client.delete({
      index: this.indexName,
      id,
      refresh: true
    });
  }

  async getById(id: string): Promise<TaskEntry | null> {
    try {
      const res = await this.client.get({
        index: this.indexName,
        id
      });

      const source = res.body._source;

      return {
        id,
        description: source?.task,
        code: source?.code,
        createdAt: source?.createdAt,
        updatedAt: source?.updatedAt,
        evalResult: source?.evalResult,
        dataDictionary: source?.dataDictionary
      };
    } catch (err: any) {
      if (err.meta?.statusCode === 404) return null;
      throw err;
    }
  }
}
