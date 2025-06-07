import { Client } from '@opensearch-project/opensearch';
import { Agent } from '../types';
import { OpenAIService } from './OpenAIService';

export class KnowledgeBaseClient {
  private client: Client;
  private indexName: string;
  private openai: OpenAIService;

  constructor(agent: Agent) {
    if (!agent.vectorDbUrl || !agent.knowledgeBaseName) {
      throw new Error('Agent is missing vector DB config');
    }

    if (!agent.openAiApiKey) {
      throw new Error('Agent is missing OpenAI API key');
    }

    this.client = new Client({ node: agent.vectorDbUrl });
    this.indexName = agent.knowledgeBaseName;
    this.openai = new OpenAIService(agent.openAiApiKey);
  }

  async ensureIndexExists(): Promise<void> {
    const existsResponse = await this.client.indices.exists({ index: this.indexName });

    if (!existsResponse.body) {
      await this.client.indices.create({
        index: this.indexName,
        body: {
          settings: {
            index: {
              knn: true
            }
          },
          mappings: {
            properties: {
              text: { type: 'text' },
              embedding: { type: 'knn_vector', dimension: 1536 },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
    }
  }

  async search(text: string, topK = 20): Promise<any[]> {
    const embedding = await this.openai.getEmbedding(text);
    await this.ensureIndexExists();

    const { body } = await this.client.search({
      index: this.indexName,
      body: {
        size: topK,
        query: {
          knn: {
            embedding: {
              vector: embedding,
              k: topK
            }
          }
        }
      }
    });

    return body.hits.hits.map((hit: any) => ({
      id: hit._id,
      text: hit._source.text,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      score: hit._score
    }));
  }

  async getRecent(limit = 20): Promise<any[]> {
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
      text: hit._source.text,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt
    }));
  }

  async insertText(text: string): Promise<string> {
    const embedding = await this.openai.getEmbedding(text);
    await this.ensureIndexExists();

    const now = new Date().toISOString();

    const res = await this.client.index({
      index: this.indexName,
      body: {
        text,
        embedding,
        createdAt: now,
        updatedAt: now
      },
      refresh: true
    });

    return res.body._id;
  }

  async updateText(id: string, newText: string): Promise<void> {
    const embedding = await this.openai.getEmbedding(newText);

    await this.client.update({
      index: this.indexName,
      id,
      body: {
        doc: {
          text: newText,
          embedding,
          updatedAt: new Date().toISOString()
        }
      },
      refresh: true
    });
  }

  async delete(id: string): Promise<void> {
    await this.client.delete({
      index: this.indexName,
      id,
      refresh: true
    });
  }

  async getById(id: string): Promise<any | null> {
    try {
      const res = await this.client.get({
        index: this.indexName,
        id
      });

      const source = res.body._source;

      return {
        id,
        text: source?.text,
        createdAt: source?.createdAt,
        updatedAt: source?.updatedAt
      };
    } catch (err: any) {
      if (err.meta?.statusCode === 404) return null;
      throw err;
    }
  }
}
