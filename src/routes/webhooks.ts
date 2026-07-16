import { Hono } from 'hono';
import { verifyWebhookToken } from '../services/whatsapp';

const webhookRoutes = new Hono();

webhookRoutes.get('/', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  if (mode === 'subscribe' && token && verifyWebhookToken(token)) {
    return c.text(challenge || '', 200);
  }

  return c.text('Forbidden', 403);
});

webhookRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages' && change.value) {
            const statuses = change.value.statuses || [];
            for (const s of statuses) {
              console.log(
                `Webhook: mensaje ${s.id} → ${s.status} (recipient: ${s.recipient_id})`
              );
            }

            const messages = change.value.messages || [];
            for (const msg of messages) {
              console.log(
                `Webhook: mensaje entrante de ${msg.from} → ${msg.text?.body || msg.type}`
              );
            }
          }
        }
      }
    }

    return c.text('OK', 200);
  } catch (err: any) {
    return c.text('Error', 500);
  }
});

export { webhookRoutes };
