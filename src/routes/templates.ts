import { Hono } from 'hono';
import { authMiddleware, type AppVariables } from '../middleware/auth';
import {
  createTemplateDoc,
  syncTemplatesFromAPI,
  listTemplates,
  type MongoEnv,
} from '../services/db';
import type { WhatsAppEnv } from '../services/whatsapp';

type Bindings = MongoEnv & WhatsAppEnv;

const templateRoutes = new Hono<{ Variables: AppVariables; Bindings: Bindings }>();

templateRoutes.use('*', authMiddleware);

templateRoutes.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, names } = body;

    if (names && Array.isArray(names)) {
      const results = [];
      for (const n of names) {
        results.push(await createTemplateDoc(c.env, n));
      }
      return c.json(results, 201);
    }

    if (!name) {
      return c.json({ error: 'name es requerido' }, 400);
    }

    const doc = await createTemplateDoc(c.env, name);
    return c.json(doc, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al crear template' }, 500);
  }
});

templateRoutes.get('/', async (c) => {
  try {
    const refresh = c.req.query('refresh') === 'true';

    if (refresh) {
      const docs = await syncTemplatesFromAPI(c.env);
      return c.json(docs);
    }

    const docs = await listTemplates(c.env);
    return c.json(docs);
  } catch (err: any) {
    return c.json({ error: err.message || 'Error al listar templates' }, 500);
  }
});

export { templateRoutes };
