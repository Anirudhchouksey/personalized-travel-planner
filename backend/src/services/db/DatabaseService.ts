import { config } from '../../config/index.js';
import { ITripRepository } from './types.js';
import { InMemoryRepository } from './InMemoryRepository.js';
import { SupabaseRepository } from './SupabaseRepository.js';

export class DatabaseService {
  private repo: ITripRepository;
  private backendType: 'supabase' | 'in-memory-demo';

  constructor() {
    const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
    if (
      !isTest &&
      config.supabase.isConfigured &&
      config.supabase.url &&
      (config.supabase.serviceRoleKey || config.supabase.anonKey)
    ) {
      const key = config.supabase.serviceRoleKey || config.supabase.anonKey!;
      this.repo = new SupabaseRepository(config.supabase.url, key);
      this.backendType = 'supabase';
      console.log('✅ Supabase PostgreSQL repository initialized.');
    } else {
      this.repo = new InMemoryRepository();
      this.backendType = 'in-memory-demo';
      console.log('ℹ️ Running in Demo Mode: In-Memory Resilient Repository active.');
    }
  }

  public getRepository(): ITripRepository {
    return this.repo;
  }

  public getBackendType(): 'supabase' | 'in-memory-demo' {
    return this.backendType;
  }
}

export const dbService = new DatabaseService();
export const tripRepository = dbService.getRepository();
