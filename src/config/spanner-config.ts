import { z } from 'zod';
import dotenv from 'dotenv';
import { SpannerConfig } from '../types/index.js';

dotenv.config();

const ConfigSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  instanceId: z.string().min(1, 'Instance ID is required'),
  databaseId: z.string().min(1, 'Database ID is required'),
  credentials: z.string().optional(),
  openaiApiKey: z.string().optional(),
  maxQueryTime: z.number().default(30000), // 30 seconds
  maxResults: z.number().default(1000),
  enableLogging: z.boolean().default(true),
  cacheSchemaFor: z.number().default(3600000), // 1 hour
});

export class SpannerConfigManager {
  private config: z.infer<typeof ConfigSchema>;

  constructor() {
    this.config = ConfigSchema.parse({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      instanceId: process.env.SPANNER_INSTANCE_ID,
      databaseId: process.env.SPANNER_DATABASE_ID,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      openaiApiKey: process.env.OPENAI_API_KEY,
      maxQueryTime: parseInt(process.env.MAX_QUERY_TIME || '30000'),
      maxResults: parseInt(process.env.MAX_RESULTS || '1000'),
      enableLogging: process.env.ENABLE_LOGGING !== 'false',
      cacheSchemaFor: parseInt(process.env.CACHE_SCHEMA_FOR || '3600000'),
    });
  }

  getSpannerConfig(): SpannerConfig {
    return {
      projectId: this.config.projectId,
      instanceId: this.config.instanceId,
      databaseId: this.config.databaseId,
      credentials: this.config.credentials,
    };
  }

  getOpenAIApiKey(): string | undefined {
    return this.config.openaiApiKey;
  }

  getMaxQueryTime(): number {
    return this.config.maxQueryTime;
  }

  getMaxResults(): number {
    return this.config.maxResults;
  }

  isLoggingEnabled(): boolean {
    return this.config.enableLogging;
  }

  getSchemaCacheTime(): number {
    return this.config.cacheSchemaFor;
  }

  validate(): void {
    if (!this.config.projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
    }
    if (!this.config.instanceId) {
      throw new Error('SPANNER_INSTANCE_ID environment variable is required');
    }
    if (!this.config.databaseId) {
      throw new Error('SPANNER_DATABASE_ID environment variable is required');
    }
  }
}

export const configManager = new SpannerConfigManager(); 