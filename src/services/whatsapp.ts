import type { SendMessageResponse, WhatsAppTemplatesResponse } from '../types';

export interface WhatsAppEnv {
  WHATSAPP_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_WABA_ID?: string;
  WHATSAPP_API_BASE_URL?: string;
  WHATSAPP_API_VERSION?: string;
  WHATSAPP_VERIFY_TOKEN?: string;
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('56')) {
    return cleaned;
  }
  return '56' + cleaned;
}

export async function validateToken(env: WhatsAppEnv): Promise<{ valid: boolean; error?: string }> {
  const token = env.WHATSAPP_TOKEN || '';
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';

  if (!token || !phoneNumberId) {
    return {
      valid: false,
      error: 'WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID son requeridos',
    };
  }

  try {
    const baseUrl = env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
    const version = env.WHATSAPP_API_VERSION || 'v22.0';
    const url = `${baseUrl}/${version}/${phoneNumberId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      return { valid: true };
    }

    const data: any = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: data.error?.message || `Error de autenticacion (${response.status})`,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `No se pudo conectar con WhatsApp API: ${err.message}`,
    };
  }
}

export interface SendMessageOptions {
  mediaUrl?: string;
  templateName?: string;
  templateLanguage?: string;
  templateComponents?: Array<{
    type: 'header' | 'body' | 'footer' | 'buttons';
    parameters: Array<{
      type: 'text' | 'image' | 'video' | 'document';
      parameter_name?: string;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }>;
  }>;
}

export async function sendMessage(
  phone: string,
  content: string,
  env: WhatsAppEnv,
  opts: SendMessageOptions = {}
): Promise<SendMessageResponse> {
  const token = env.WHATSAPP_TOKEN || '';
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID || '';
  const baseUrl = env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
  const version = env.WHATSAPP_API_VERSION || 'v22.0';

  const normalizedPhone = normalizePhone(phone);
  const url = `${baseUrl}/${version}/${phoneNumberId}/messages`;

  let body: Record<string, any>;

  if (opts.templateName && opts.templateComponents) {
    body = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: opts.templateName,
        language: { code: opts.templateLanguage || 'es_CL' },
        components: opts.templateComponents,
      },
    };
  } else if (opts.mediaUrl) {
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'image',
      image: { link: opts.mediaUrl },
    };
  } else {
    body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: { preview_url: false, body: content },
    };
  }

  console.log('[whatsapp] sendMessage request', JSON.stringify({ to: normalizedPhone, type: body.type, hasMedia: !!opts.mediaUrl, hasTemplate: !!opts.templateName, url }));
  console.log('[whatsapp] sendMessage body', JSON.stringify(body));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  console.log('[whatsapp] sendMessage response status', response.status, response.statusText);

  const data: any = await response.json();
  console.log('[whatsapp] sendMessage response body', JSON.stringify(data));

  if (!response.ok) {
    const errMsg =
      data.error?.error_user_msg ||
      data.error?.message ||
      `Error ${response.status}`;

    console.log('[whatsapp] sendMessage error', JSON.stringify({ to: normalizedPhone, code: data.error?.code, error: errMsg }));

    if (
      data.error?.code === 131047 ||
      data.error?.error_data?.details?.includes('not a valid WhatsApp')
    ) {
      return {
        success: false,
        error: 'NO_WHATSAPP',
        to: normalizedPhone,
      };
    }

    return {
      success: false,
      error: errMsg,
      to: normalizedPhone,
    };
  }

  console.log('[whatsapp] sendMessage success', JSON.stringify({ to: normalizedPhone, messageId: data.messages?.[0]?.id }));

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    to: normalizedPhone,
  };
}

export async function fetchTemplates(env: WhatsAppEnv): Promise<WhatsAppTemplatesResponse> {
  const token = env.WHATSAPP_TOKEN || '';
  const baseUrl = env.WHATSAPP_API_BASE_URL || 'https://graph.facebook.com';
  const version = env.WHATSAPP_API_VERSION || 'v22.0';
  const wabaId = env.WHATSAPP_WABA_ID || '';

  if (!wabaId) {
    throw new Error('WHATSAPP_WABA_ID no configurado');
  }

  const url = `${baseUrl}/${version}/${wabaId}/message_templates`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const data: any = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `Error ${response.status} al obtener templates`);
  }

  return response.json() as Promise<WhatsAppTemplatesResponse>;
}

export function verifyWebhookToken(token: string, env: WhatsAppEnv): boolean {
  return token === (env.WHATSAPP_VERIFY_TOKEN || '');
}
