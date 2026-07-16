import { Hono } from 'hono';
import { authMiddleware, type AppVariables } from '../middleware/auth';
import { sendMessage, type WhatsAppEnv } from '../services/whatsapp';
import { addMessageResult, saveMessageLog, getMessageLogs, getMessageStats, type MongoEnv } from '../services/db';
import type { SendMessageRequest, MessageStatus } from '../types';

type Bindings = WhatsAppEnv & MongoEnv;

const messageRoutes = new Hono<{ Variables: AppVariables; Bindings: Bindings }>();

messageRoutes.use('*', authMiddleware);

messageRoutes.post('/send', async (c) => {
  try {
    const body = await c.req.json<SendMessageRequest>();
    const { to, content, mediaUrl, template, campaignId, participantId, participantName, categoryName } = body;

    if (!to || !content) {
      return c.json({ error: 'Campos requeridos: to, content' }, 400);
    }

    const organizerId = c.get('organizerId');
    const organizerName = c.get('organizerName');

    console.log('[messages] POST /send request', JSON.stringify({ to, contentLength: content?.length, hasMedia: !!mediaUrl, campaignId, template }));

    const result = await sendMessage(to, content, c.env, mediaUrl);

    console.log('[messages] POST /send result', JSON.stringify(result));

    let status: MessageStatus;
    if (result.success) {
      status = 'sent';
    } else if (result.error === 'NO_WHATSAPP') {
      status = 'no-whatsapp';
    } else {
      status = 'error';
    }

    const sentAt = new Date();

    await saveMessageLog(c.env, {
      organizerId,
      organizerName,
      to: result.to,
      template,
      status,
      messageId: result.messageId,
      error: result.error !== 'NO_WHATSAPP' ? result.error : undefined,
      campaignId,
      sentAt,
    });

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
        sentAt,
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
    console.error('[messages] POST /send error', err);
    return c.json({ error: err.message || 'Error al enviar mensaje' }, 500);
  }
});

messageRoutes.get('/logs', async (c) => {
  try {
    const organizerId = c.get('organizerId');
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    const status = c.req.query('status');
    const from = c.req.query('from');
    const to = c.req.query('to');

    const result = await getMessageLogs(c.env, organizerId, { page, pageSize, status, from, to });
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al consultar logs' }, 500);
  }
});

messageRoutes.get('/stats', async (c) => {
  try {
    const organizerId = c.get('organizerId');
    const from = c.req.query('from');
    const to = c.req.query('to');

    const stats = await getMessageStats(c.env, organizerId, { from, to });
    return c.json(stats);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al consultar estadisticas' }, 500);
  }
});

export { messageRoutes };
