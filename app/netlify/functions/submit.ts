import type { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Resend } from 'resend';

import eventSchema from './eventRequests.schema.json';

type ModuleId = 'MODULE_001_EVENT_REQUEST';
type EventData = Record<string, any>;

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: false,
  strict: false,
});
addFormats(ajv);

const validators: Record<ModuleId, ReturnType<typeof ajv.compile>> = {
  MODULE_001_EVENT_REQUEST: ajv.compile(eventSchema as any),
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function isSpam(honeypot?: string) {
  return typeof honeypot === 'string' && honeypot.trim().length > 0;
}

/* -------------------------------------------------------------------------- */
/*                               HELPERS                                      */
/* -------------------------------------------------------------------------- */

function normalizeDate(value: unknown) {
  if (!value) return value;
  try {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return value;
    return d.toISOString();
  } catch {
    return value;
  }
}

/* -------------------------------------------------------------------------- */
/*                                ACTIONS                                     */
/* -------------------------------------------------------------------------- */

async function logSubmission(_payload: unknown) {
  return true;
}

async function sendEmail(payload: {
  requestId: string;
  data: EventData;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !to || !from) {
    console.warn('Resend not configured properly.');
    return;
  }

  const resend = new Resend(apiKey);
  const { requestId, data } = payload;

  const safe = (v: unknown) => (v ?? '').toString();

  const address = [
    safe(data.addressLine1),
    safe(data.addressLine2),
    `${safe(data.city)}, ${safe(data.state)} ${safe(data.zip)}`,
  ]
    .filter(Boolean)
    .join(', ');

  const subject = `Event Request: ${safe(
    data.eventTitle
  )} — ${safe(data.city)}, ${safe(data.state)}`;

  const htmlBody = `
    <h2>New Event Request Submitted</h2>
    <p><strong>Request ID:</strong> ${requestId}</p>

    <h3>Contact</h3>
    <p>
      <strong>Name:</strong> ${safe(data.contactName)}<br/>
      <strong>Email:</strong> ${safe(data.contactEmail)}<br/>
      <strong>Phone:</strong> ${safe(data.contactPhone) || 'N/A'}<br/>
      <strong>Preferred Contact:</strong> ${safe(data.preferredContactMethod)}
    </p>

    <h3>Event</h3>
    <p>
      <strong>Title:</strong> ${safe(data.eventTitle)}<br/>
      <strong>Type:</strong> ${safe(data.eventType)}${
    data.eventType === 'Other'
      ? ` (${safe(data.eventTypeOther)})`
      : ''
  }<br/>
      <strong>Description:</strong> ${
        safe(data.eventDescription) || 'N/A'
      }<br/>
      <strong>Estimated Attendance:</strong> ${safe(
        data.expectedAttendance
      )}<br/>
      <strong>Requested Role:</strong> ${safe(
        data.requestedRole
      )}<br/>
      <strong>Media Expected:</strong> ${safe(data.mediaExpected)}
    </p>

    <h3>Date & Time</h3>
    <p>
      <strong>Start:</strong> ${safe(data.startDateTime)}<br/>
      <strong>End:</strong> ${safe(data.endDateTime) || 'N/A'}<br/>
      <strong>Flexible:</strong> ${data.isTimeFlexible ? 'Yes' : 'No'}
    </p>

    <h3>Location</h3>
    <p>
      <strong>Venue:</strong> ${safe(data.venueName) || 'N/A'}<br/>
      <strong>Address:</strong> ${address}
    </p>

    <p><strong>Consent Confirmed:</strong> ${
      data.permissionToContact ? 'Yes' : 'No'
    }</p>
  `;

  const response = await resend.emails.send({
    from,
    to,
    subject,
    html: htmlBody,
  });

  if (response.error) {
    console.error('Resend error:', response.error);
    throw new Error('Email delivery failed');
  }
}

async function createCalendarEvent(_payload: unknown) {
  return true;
}

/* -------------------------------------------------------------------------- */
/*                                  HANDLER                                   */
/* -------------------------------------------------------------------------- */

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  let body: any;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const moduleId = body?.moduleId as ModuleId | undefined;
  const data = body?.data as EventData | undefined;
  const honeypot = body?.honeypot as string | undefined;

  if (!moduleId || !data) {
    return json(400, { ok: false, error: 'Missing moduleId or data' });
  }

  if (isSpam(honeypot)) {
    return json(200, { ok: true, requestId: randomUUID() });
  }

  // 🔥 Auto-normalize date fields before validation
  data.startDateTime = normalizeDate(data.startDateTime);
  if (data.endDateTime) {
    data.endDateTime = normalizeDate(data.endDateTime);
  }

  const validate = validators[moduleId];

  if (!validate) {
    return json(400, { ok: false, error: 'Unknown moduleId' });
  }

  const valid = validate(data);

  if (!valid) {
    return json(400, {
      ok: false,
      error: 'Validation failed',
      details: validate.errors,
    });
  }

  const requestId = randomUUID();

  const payload = {
    requestId,
    moduleId,
    data,
    meta: {
      ip:
        event.headers['x-nf-client-connection-ip'] ||
        event.headers['x-forwarded-for'] ||
        null,
    },
  };

  try {
    await logSubmission(payload);
    await sendEmail(payload);
    await createCalendarEvent(payload);
  } catch (err) {
    console.error('Submit pipeline error:', err);
    return json(500, { ok: false, error: 'Server error' });
  }

  return json(200, { ok: true, requestId });
};