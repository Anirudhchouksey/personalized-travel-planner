import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import { createClient } from '@supabase/supabase-js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    displayName?: string;
  };
}

let supabaseClient: any = null;
if (config.supabase.isConfigured && config.supabase.url && config.supabase.anonKey) {
  supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  // Demo user fallback when testing or without active Supabase token
  const defaultDemoUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'traveler@wanderai.demo',
    displayName: 'Demo Explorer',
  };

  if (!token || token === 'demo-token' || !supabaseClient) {
    req.user = defaultDemoUser;
    return next();
  }

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (error || !user) {
      // Fallback to demo user rather than locking the user out in dev/demo mode
      req.user = defaultDemoUser;
      return next();
    }

    req.user = {
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
    };
    next();
  } catch (err) {
    req.user = defaultDemoUser;
    next();
  }
};
