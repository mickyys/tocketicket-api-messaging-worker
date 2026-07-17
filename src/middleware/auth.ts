import type { Context } from 'hono';

export interface AppVariables {
  organizerId: string;
  organizerName: string;
  userId: string;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export async function authMiddleware(c: AppContext, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;

  if (authHeader) {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  } else {
    const cookieHeader = c.req.header('Cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
    token = match?.[1];
  }

  if (!token) {
    return c.json({ error: 'No autorizado' }, 401);
  }

  try {
    const payload = parseToken(token);
    c.set('organizerId', (payload.organizerId || payload.sub || '') as string);
    c.set('organizerName', (payload.organizerName || payload.name || '') as string);
    c.set('userId', (payload.userId || payload.userID || payload.sub || '') as string);
    await next();
  } catch {
    return c.json({ error: 'Token invalido' }, 401);
  }
}

function parseToken(token: string): Record<string, any> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const payload = parts[1];
    const decoded = base64UrlDecode(payload);
    return JSON.parse(decoded);
  } catch {
    throw new Error('Invalid token');
  }
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}
