import type { ObjectId } from 'mongodb';

export type CampaignStatus = 'sending' | 'paused' | 'completed' | 'cancelled';
export type MessageStatus = 'sent' | 'error' | 'no-whatsapp';

export interface CampaignMessageResult {
  participantId: string;
  participantName: string;
  phone: string;
  categoryName?: string;
  content: string;
  status: MessageStatus;
  messageId?: string;
  error?: string;
  sentAt?: Date;
}

export interface WhatsAppCampaign {
  _id?: ObjectId;
  organizerId: string;
  organizerName: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  template: string;
  templateName?: string;
  status: CampaignStatus;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  noWhatsappCount: number;
  pendingCount: number;
  totalPhones: number;
  omitDuplicates: boolean;
  delayMs: number;
  startedAt: Date;
  completedAt?: Date;
  messageResults: CampaignMessageResult[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCampaignRequest {
  organizerId: string;
  organizerName: string;
  eventId: string;
  eventName: string;
  eventDate?: string;
  template: string;
  templateName?: string;
  totalCount: number;
  totalPhones: number;
  omitDuplicates: boolean;
  delayMs: number;
}

export interface TemplateParameterMapping {
  paramName: string;
  source: 'participant' | 'event' | 'manual' | 'media';
  field?: string;
  manualValue?: string;
}

export interface TemplateConfigDoc {
  _id?: ObjectId;
  templateId: string;
  templateName: string;
  organizerId: string;
  parameterMappings: TemplateParameterMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageLog {
  _id?: ObjectId;
  organizerId: string;
  organizerName: string;
  to: string;
  template?: string;
  status: MessageStatus;
  messageId?: string;
  error?: string;
  campaignId?: string;
  sentAt: Date;
  createdAt: Date;
}

export interface SendMessageRequest {
  campaignId?: string;
  provider: string;
  to: string;
  content: string;
  template?: string;
  mediaUrl?: string;
  participantId?: string;
  participantName?: string;
  categoryName?: string;
}

export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  to: string;
}

export interface CampaignProgress {
  total: number;
  sent: number;
  failed: number;
  noWhatsapp: number;
  pending: number;
  current: number;
  status: CampaignStatus;
}

export interface ListCampaignsResponse {
  campaigns: WhatsAppCampaign[];
  total: number;
  page: number;
  pageSize: number;
}

// --- WhatsApp Templates ---

export interface TemplateComponentExample {
  header_handle?: string[];
  header_text?: string[];
  body_text_named_params?: { param_name: string; example: string }[];
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LOCATION';
  text?: string;
  example?: TemplateComponentExample;
}

export interface WhatsAppTemplate {
  name: string;
  parameter_format: 'NAMED' | 'POSITIONAL';
  components: TemplateComponent[];
  language: string;
  status: string;
  category: string;
  sub_category?: string;
  id: string;
}

export interface WhatsAppTemplatesResponse {
  data: WhatsAppTemplate[];
  paging?: { cursors: { before: string; after: string } };
}

export interface WhatsAppTemplateDoc {
  _id?: ObjectId;
  name: string;
  whatsappId: string;
  language: string;
  status: string;
  category: string;
  parameter_format: string;
  components: TemplateComponent[];
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
