import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory or root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  corsOrigins: string[];
  supabase: {
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
    isConfigured: boolean;
  };
  ai: {
    provider: 'gemini' | 'groq' | 'mock';
    geminiApiKey?: string;
    geminiModel: string;
    groqApiKey?: string;
    groqModel: string;
  };
  routing: {
    provider: 'osrm' | 'haversine';
    osrmUrl: string;
  };
}

const rawCors = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
const corsOrigins = rawCors.split(',').map((o) => o.trim());

const rawSupabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseUrl = rawSupabaseUrl
  ? rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : undefined;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('your-project-id') &&
  (supabaseAnonKey || supabaseServiceRoleKey)
);

export const config: AppConfig = {
  env: (process.env.NODE_ENV as any) || 'development',
  port: Number(process.env.PORT) || 8000,
  corsOrigins,
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    serviceRoleKey: supabaseServiceRoleKey,
    isConfigured: isSupabaseConfigured,
  },
  ai: {
    provider: (process.env.AI_PROVIDER as any) || (process.env.GEMINI_API_KEY ? 'gemini' : process.env.GROQ_API_KEY ? 'groq' : 'mock'),
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  routing: {
    provider: (process.env.ROUTING_PROVIDER as any) || 'osrm',
    osrmUrl: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  },
};
