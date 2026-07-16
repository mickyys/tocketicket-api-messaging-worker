import { Hono } from 'hono';
import { authMiddleware, type AppVariables } from '../middleware/auth';
import { sendMessage, type WhatsAppEnv } from '../services/whatsapp';
import { addMessageResult, type MongoEnv } from '../services/db';
import type { SendMessageRequest, MessageStatus } from '../types';

type Bindings = WhatsAppEnv & MongoEnv;

const messageRoutes = new Hono<{ Variables: AppVariables; Bindings: Bindings }>();

messageRoutes.use('*', authMiddleware);

messageRoutes.post('/send', async (c) => {
  try {
    const body = await c.req.json<SendMessageRequest>();
    const { to, content, mediaUrl, campaignId, participantId, participantName, categoryName } = body;

    if (!to || !content) {
      return c.json({ error: 'Campos requeridos: to, content' }, 400);
    }

    const result = await sendMessage(to, content, c.env, mediaUrl);

    let status: MessageStatus;
    if (result.success) {
      status = 'sent';
    } else if (result.error === 'NO_WHATSAPP') {
      status = 'no-whatsapp';
    } else {
      status = 'error';
    }

    if (campaignId) {
      await addMessageResult(c.env, campaignId, {
        participantId: participantId || '',
        participantName: participantName || '',
        phone: result.to,
        categoryName: categoryName,
        content,
        status,
        messageId: result.messageId,
        error: result.error !== 'NO_WHATSAPP' ? result.error : undefined,
        sentAt: new Date(),
      });
    }

    return c.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error !== 'NO_WHATSAPP' ? result.error : undefined,
      to: result.to,
      status,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al enviar mensaje' }, 500);
  }
});

export { messageRoutes };
