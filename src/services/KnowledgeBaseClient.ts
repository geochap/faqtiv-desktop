import { Client } from '@opensearch-project/opensearch';
import { Agent, QAEntry } from '../types';
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
              question: { type: 'text' },
              answer: { type: 'text' },
              embedding: {
                type: 'knn_vector',
                dimension: 1536
              },
              agentId: { type: 'keyword' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
    }
  }

  async search(text: string, topK = 5): Promise<QAEntry[]> {
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
      question: hit._source.question,
      answer: hit._source.answer,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      score: hit._score
    }));
  }

  async getRecent(limit = 10): Promise<QAEntry[]> {
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
      question: hit._source.question,
      answer: hit._source.answer,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt
    }));
  }

  async insertQA(agentId: string, question: string, answer: string): Promise<string> {
    const embedding = await this.openai.getEmbedding(question);
    await this.ensureIndexExists();

    const now = new Date().toISOString();

    const res = await this.client.index({
      index: this.indexName,
      body: {
        agentId,
        question,
        answer,
        embedding,
        createdAt: now,
        updatedAt: now
      },
      refresh: true
    });

    return res.body._id;
  }

  async updateQA(id: string, updates: { question?: string; answer?: string }): Promise<void> {
    const body: any = {
      updatedAt: new Date().toISOString()
    };

    if (updates.question) {
      body.question = updates.question;
      body.embedding = await this.openai.getEmbedding(updates.question);
    }

    if (updates.answer) {
      body.answer = updates.answer;
    }

    await this.client.update({
      index: this.indexName,
      id,
      body: { doc: body },
      refresh: true
    });
  }

  async deleteQA(id: string): Promise<void> {
    await this.client.delete({
      index: this.indexName,
      id,
      refresh: true
    });
  }

  async getById(id: string): Promise<QAEntry | null> {
    try {
      const res = await this.client.get({
        index: this.indexName,
        id
      });

      const source = res.body._source;

      return {
        id,
        question: source?.question,
        answer: source?.answer,
        createdAt: source?.createdAt,
        updatedAt: source?.updatedAt,
        score: source?.score // optional
      };
    } catch (err: any) {
      if (err.meta?.statusCode === 404) return null;
      throw err;
    }
  }
}
