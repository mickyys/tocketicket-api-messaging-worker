import { Hono } from 'hono';
import { authMiddleware, type AppVariables } from '../middleware/auth';
import {
  createCampaign,
  getCampaign,
  listCampaigns,
  updateCampaignStatus,
  getCampaignProgress,
  deleteCampaign,
} from '../services/db';
import type { CampaignStatus } from '../types';

const campaignRoutes = new Hono<{ Variables: AppVariables }>();

campaignRoutes.use('*', authMiddleware);

campaignRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const organizerId = c.get('organizerId') || body.organizerId;
    const organizerName = c.get('organizerName') || body.organizerName;

    const campaign = await createCampaign({
      organizerId,
      organizerName,
      eventId: body.eventId,
      eventName: body.eventName,
      eventDate: body.eventDate,
      template: body.template,
      templateName: body.templateName,
      totalCount: body.totalCount,
      totalPhones: body.totalPhones,
      omitDuplicates: body.omitDuplicates ?? true,
      delayMs: body.delayMs || 8000,
    });

    return c.json(campaign, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al crear campana' }, 500);
  }
});

campaignRoutes.get('/', async (c) => {
  try {
    const organizerId = c.get('organizerId');
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);

    const result = await listCampaigns(organizerId, page, pageSize);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al listar campanas' }, 500);
  }
});

campaignRoutes.get('/:id', async (c) => {
  try {
    const campaign = await getCampaign(c.req.param('id'));
    if (!campaign) {
      return c.json({ error: 'Campana no encontrada' }, 404);
    }
    return c.json(campaign);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al obtener campana' }, 500);
  }
});

campaignRoutes.put('/:id/status', async (c) => {
  try {
    const body = await c.req.json();
    const status = body.status as CampaignStatus;

    if (!['sending', 'paused', 'completed', 'cancelled'].includes(status)) {
      return c.json({ error: 'Estado invalido' }, 400);
    }

    const campaign = await updateCampaignStatus(c.req.param('id'), status);
    if (!campaign) {
      return c.json({ error: 'Campana no encontrada' }, 404);
    }
    return c.json(campaign);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al actualizar campana' }, 500);
  }
});

campaignRoutes.get('/:id/progress', async (c) => {
  try {
    const progress = await getCampaignProgress(c.req.param('id'));
    if (!progress) {
      return c.json({ error: 'Campana no encontrada' }, 404);
    }
    return c.json(progress);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al obtener progreso' }, 500);
  }
});

campaignRoutes.delete('/:id', async (c) => {
  try {
    const deleted = await deleteCampaign(c.req.param('id'));
    if (!deleted) {
      return c.json({ error: 'Campana no encontrada' }, 404);
    }
    return c.json({ message: 'Campana eliminada' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al eliminar campana' }, 500);
  }
});

campaignRoutes.get('/:id/stream', async (c) => {
  const campaignId = c.req.param('id');

  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    return c.json({ error: 'Campana no encontrada' }, 404);
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendSSE = async () => {
        if (controller.desiredSize === null) return;

        const progress = await getCampaignProgress(campaignId);
        if (!progress) {
          controller.enqueue(encoder.encode('event: error\ndata: {"error":"Campana no encontrada"}\n\n'));
          controller.close();
          return;
        }

        const data = JSON.stringify(progress);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));

        if (progress.status === 'completed' || progress.status === 'cancelled') {
          controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
          controller.close();
          return;
        }
      };

      await sendSSE();

      const interval = setInterval(async () => {
        try {
          await sendSSE();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 2000);

      const cleanup = () => clearInterval(interval);
      c.req.raw.signal?.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

export { campaignRoutes };
