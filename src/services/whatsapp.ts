import type { SendMessageResponse } from '../types';

interface WhatsAppEnv {
  WHATSAPP_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_API_BASE_URL: string;
  WHATSAPP_API_VERSION: string;
  WHATSAPP_VERIFY_TOKEN: string;
}

function getEnv(): WhatsAppEnv {
  return {
    WHATSAPP_TOKEN: (globalThis as any).WHATSAPP_TOKEN || '',
    WHATSAPP_PHONE_NUMBER_ID: (globalThis as any).WHATSAPP_PHONE_NUMBER_ID || '',
    WHATSAPP_API_BASE_URL:
      (globalThis as any).WHATSAPP_API_BASE_URL || 'https://graph.facebook.com',
    WHATSAPP_API_VERSION: (globalThis as any).WHATSAPP_API_VERSION || 'v22.0',
    WHATSAPP_VERIFY_TOKEN: (globalThis as any).WHATSAPP_VERIFY_TOKEN || '',
  };
}

function apiUrl(): string {
  const env = getEnv();
  return `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
}

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('56')) {
    return cleaned;
  }
  return '56' + cleaned;
}

export async function validateToken(): Promise<{ valid: boolean; error?: string }> {
  const env = getEnv();
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    return {
      valid: false,
      error: 'WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID son requeridos',
    };
  }

  try {
    const url = `${env.WHATSAPP_API_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
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

export async function sendMessage(
  phone: string,
  content: string
): Promise<SendMessageResponse> {
  const env = getEnv();
  const normalizedPhone = normalizePhone(phone);
  const url = `${apiUrl()}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizedPhone,
    type: 'text',
    text: { preview_url: false, body: content },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json();

  if (!response.ok) {
    const errMsg =
      data.error?.error_user_msg ||
      data.error?.message ||
      `Error ${response.status}`;

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

  return {
    success: true,
    messageId: data.messages?.[0]?.id,
    to: normalizedPhone,
  };
}

export function verifyWebhookToken(token: string): boolean {
  const env = getEnv();
  return token === env.WHATSAPP_VERIFY_TOKEN;
}
