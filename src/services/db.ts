import { MongoClient, Db, Collection, ObjectId, Filter, Sort, type MongoClientOptions } from 'mongodb';
import type {
  WhatsAppCampaign,
  CampaignMessageResult,
  CreateCampaignRequest,
  CampaignProgress,
  CampaignStatus,
  ListCampaignsResponse,
} from '../types';

let client: MongoClient | null = null;
let db: Db | null = null;

export interface MongoEnv {
  MONGO_URI?: string;
  MONGO_DB?: string;
}

async function getDb(env: MongoEnv): Promise<Db> {
  if (db) return db;

  const uri = env.MONGO_URI || 'mongodb://localhost:27017';
  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  } as MongoClientOptions);

  await client.connect();
  db = client.db(env.MONGO_DB || 'tocketicket');
  return db;
}

function collection(env: MongoEnv): Promise<Collection<WhatsAppCampaign>> {
  return getDb(env).then((d) => d.collection<WhatsAppCampaign>('whatsapp_campaigns'));
}

function toCampaignId(id: string | ObjectId): ObjectId {
  if (id instanceof ObjectId) return id;
  return new ObjectId(id);
}

export async function createCampaign(
  env: MongoEnv,
  req: CreateCampaignRequest
): Promise<WhatsAppCampaign> {
  const col = await collection(env);
  const now = new Date();

  const campaign: WhatsAppCampaign = {
    organizerId: req.organizerId,
    organizerName: req.organizerName,
    eventId: req.eventId,
    eventName: req.eventName,
    eventDate: req.eventDate,
    template: req.template,
    templateName: req.templateName,
    status: 'sending',
    totalCount: req.totalCount,
    sentCount: 0,
    failedCount: 0,
    noWhatsappCount: 0,
    pendingCount: req.totalCount,
    totalPhones: req.totalPhones,
    omitDuplicates: req.omitDuplicates,
    delayMs: req.delayMs,
    startedAt: now,
    messageResults: [],
    createdAt: now,
    updatedAt: now,
  };

  const result = await col.insertOne(campaign as any);
  return { ...campaign, _id: result.insertedId };
}

export async function getCampaign(env: MongoEnv, id: string): Promise<WhatsAppCampaign | null> {
  const col = await collection(env);
  return col.findOne({ _id: toCampaignId(id) } as Filter<WhatsAppCampaign>);
}

export async function listCampaigns(
  env: MongoEnv,
  organizerId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ListCampaignsResponse> {
  const col = await collection(env);
  const filter = { organizerId } as Filter<WhatsAppCampaign>;
  const skip = (page - 1) * pageSize;

  const [campaigns, total] = await Promise.all([
    col
      .find(filter)
      .sort({ createdAt: -1 } as Sort)
      .skip(skip)
      .limit(pageSize)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return {
    campaigns: campaigns as unknown as WhatsAppCampaign[],
    total,
    page,
    pageSize,
  };
}

export async function updateCampaignStatus(
  env: MongoEnv,
  id: string,
  status: CampaignStatus
): Promise<WhatsAppCampaign | null> {
  const col = await collection(env);
  const now = new Date();
  const update: any = {
    $set: {
      status,
      updatedAt: now,
    },
  };

  if (status === 'completed' || status === 'cancelled') {
    update.$set.completedAt = now;
  }

  await col.updateOne({ _id: toCampaignId(id) } as Filter<WhatsAppCampaign>, update);
  return getCampaign(env, id);
}

export async function addMessageResult(
  env: MongoEnv,
  campaignId: string,
  result: CampaignMessageResult
): Promise<WhatsAppCampaign | null> {
  const col = await collection(env);
  const now = new Date();

  const increment: any = {};
  switch (result.status) {
    case 'sent':
      increment.sentCount = 1;
      increment.pendingCount = -1;
      break;
    case 'error':
      increment.failedCount = 1;
      increment.pendingCount = -1;
      break;
    case 'no-whatsapp':
      increment.noWhatsappCount = 1;
      increment.pendingCount = -1;
      break;
  }

  await col.updateOne(
    { _id: toCampaignId(campaignId) } as Filter<WhatsAppCampaign>,
    {
      $push: { messageResults: { ...result, sentAt: result.sentAt || now } },
      $inc: increment,
      $set: { updatedAt: now },
    } as any
  );

  return getCampaign(env, campaignId);
}

export async function getCampaignProgress(
  env: MongoEnv,
  id: string
): Promise<CampaignProgress | null> {
  const campaign = await getCampaign(env, id);
  if (!campaign) return null;

  return {
    total: campaign.totalCount,
    sent: campaign.sentCount,
    failed: campaign.failedCount,
    noWhatsapp: campaign.noWhatsappCount,
    pending:
      campaign.totalCount -
      campaign.sentCount -
      campaign.failedCount -
      campaign.noWhatsappCount,
    current:
      campaign.sentCount + campaign.failedCount + campaign.noWhatsappCount,
    status: campaign.status,
  };
}

export async function deleteCampaign(env: MongoEnv, id: string): Promise<boolean> {
  const col = await collection(env);
  const result = await col.deleteOne({
    _id: toCampaignId(id),
  } as Filter<WhatsAppCampaign>);
  return result.deletedCount > 0;
}
