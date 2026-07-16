import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { healthRoutes } from './routes/health';
import { campaignRoutes } from './routes/campaigns';
import { messageRoutes } from './routes/messages';
import { webhookRoutes } from './routes/webhooks';
import { templateRoutes } from './routes/templates';

const app = new Hono();

app.use(
  '*',
  cors({
    origin: ['http://localhost:3001', 'https://admin.tocketicket.cl'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.route('/health', healthRoutes);
app.route('/api/campaigns', campaignRoutes);
app.route('/api/messages', messageRoutes);
app.route('/webhook', webhookRoutes);
app.route('/api/templates', templateRoutes);

app.get('/', (c) => c.json({ service: 'api-messaging-worker', version: '1.0.0' }));

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
