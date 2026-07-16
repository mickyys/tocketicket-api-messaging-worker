import { Hono } from 'hono';
import { validateToken, type WhatsAppEnv } from '../services/whatsapp';

type Bindings = WhatsAppEnv;

const healthRoutes = new Hono<{ Bindings: Bindings }>();

healthRoutes.get('/', async (c) => {
  console.log('ENV keys:', Object.keys(c.env));
  console.log('WHATSAPP_TOKEN exists:', !!c.env.WHATSAPP_TOKEN);
  console.log('WHATSAPP_PHONE_NUMBER_ID exists:', !!c.env.WHATSAPP_PHONE_NUMBER_ID);

  const result = await validateToken(c.env);

  return c.json({
    status: result.valid ? 'ok' : 'error',
    provider: 'whatsapp',
    message: result.valid
      ? 'WhatsApp Cloud API conectado correctamente'
      : result.error || 'Error de conexion',
  });
});

export { healthRoutes };
