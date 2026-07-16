import { Hono } from 'hono';
import { validateToken } from '../services/whatsapp';

const healthRoutes = new Hono();

healthRoutes.get('/', async (c) => {
  const result = await validateToken();

  return c.json({
    status: result.valid ? 'ok' : 'error',
    provider: 'whatsapp',
    message: result.valid
      ? 'WhatsApp Cloud API conectado correctamente'
      : result.error || 'Error de conexion',
  });
});

export { healthRoutes };
