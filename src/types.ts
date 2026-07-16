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

export interface SendMessageRequest {
  campaignId?: string;
  provider: string;
  to: string;
  content: string;
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
