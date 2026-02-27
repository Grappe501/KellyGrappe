import type { Handler } from '@netlify/functions';

type Mode = 'extract' | 'drafts' | 'notify';

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function safeTrim(v: unknown) {
  return (v ?? '').toString().trim();
}

/* =========================
   TWILIO SMS
========================= */

async function sendSMS(to: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    throw new Error('Missing Twilio environment variables.');
  }

  const creds = Buffer.from(`${sid}:${token}`).toString('base64');

  const resp = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: message,
      }),
    }
  );

  if (!resp.ok) {
    const raw = await resp.text().catch(() => '');
    throw new Error(`Twilio failed: ${raw}`);
  }
}

/* =========================
   SENDGRID EMAIL
========================= */

async function sendEmail(to: string, subject: string, body: string) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;

  if (!key || !from) {
    throw new Error('Missing SendGrid env vars.');
  }

  const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });

  if (!resp.ok) {
    const raw = await resp.text().catch(() => '');
    throw new Error(`SendGrid failed: ${raw}`);
  }
}

/* =========================
   DISCORD WEBHOOK
========================= */

async function notifyDiscord(content: string) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return;

  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
    }),
  });
}

/* =========================
   SUPABASE LOGGING
========================= */

async function logToSupabase(entry: any) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase env vars.');
  }

  const resp = await fetch(`${url}/rest/v1/event_notifications`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(entry),
  });

  if (!resp.ok) {
    const raw = await resp.text().catch(() => '');
    throw new Error(`Supabase log failed: ${raw}`);
  }
}

/* =========================
   MAIN HANDLER
========================= */

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  try {
    const parsed = JSON.parse(event.body || '{}');
    const mode = (parsed.mode || 'extract') as Mode;

    /* =========================
       NOTIFY MODE (PRODUCTION)
    ========================= */

    if (mode === 'notify') {
      const approvalCode = safeTrim(parsed.approvalCode);
      const expectedCode = process.env.EVENT_APPROVAL_CODE;

      if (!expectedCode) {
        return json(500, { error: 'Approval code not configured.' });
      }

      if (approvalCode !== expectedCode) {
        return json(403, { error: 'Invalid approval code.' });
      }

      const email = safeTrim(parsed.email);
      const phone = safeTrim(parsed.phone);
      const subject = safeTrim(parsed.subject);
      const message = safeTrim(parsed.message);
      const followupId = safeTrim(parsed.followupId);

      if (!message) {
        return json(400, { error: 'Missing message.' });
      }

      if (!email && !phone) {
        return json(400, { error: 'No contact method provided.' });
      }

      const now = new Date().toISOString();

      if (email) {
        await sendEmail(email, subject || 'Event Update', message);
      }

      if (phone) {
        await sendSMS(phone, message);
      }

      await notifyDiscord(
        `📢 Event Approved & Notified\nFollowUp: ${followupId}\nEmail: ${email || '—'}\nPhone: ${phone || '—'}\nTime: ${now}`
      );

      await logToSupabase({
        followup_id: followupId,
        email_sent: !!email,
        sms_sent: !!phone,
        subject,
        message,
        approved_at: now,
      });

      return json(200, {
        success: true,
        emailSent: !!email,
        smsSent: !!phone,
      });
    }

    /* =========================
       EXISTING OPENAI LOGIC
    ========================= */

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json(500, { error: 'Missing OPENAI_API_KEY env var.' });
    }

    const text = safeTrim(parsed.text);
    if (!text) {
      return json(400, { error: 'Missing text.' });
    }

    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: text,
        text: { format: { type: 'json_object' } },
      }),
    });

    if (!resp.ok) {
      const raw = await resp.text().catch(() => '');
      return json(resp.status, { error: raw });
    }

    const data = await resp.json();
    const content = data?.output_text || '';

    if (!content) {
      return json(500, { error: 'No output from model.' });
    }

    return json(200, JSON.parse(content));
  } catch (e: any) {
    return json(500, { error: e?.message ?? 'Unexpected error' });
  }
};