import type { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import sgMail from '@sendgrid/mail';

import eventSchema from '../../../src/modules/eventRequests/eventRequests.schema.json';

type ModuleId = 'MODULE_001_EVENT_REQUEST';

const ajv = new Ajv({ allErrors: true, removeAdditional: false });
addFormats(ajv);

const validators: Record<ModuleId, ReturnType<typeof ajv.compile>> = {
  MODULE_001_EVENT_REQUEST: ajv.compile(eventSchema as any),
};

function json(statusCode: number, body: any) {
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

/**
 * Phase 1 action pipeline
 */

async function logSubmission(_payload: any) {
  // Future: Google Sheets or Supabase logging
  return true;
}

async function sendEmail(payload: any) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !to || !from) {
    console.warn('SendGrid environment variables not configured.');
    return;
  }

  sgMail.setApiKey(apiKey);

  const { requestId, data } = payload;

  const address = [
    data.addressLine1,
    data.addressLine2,
    `${data.city}, ${data.state} ${data.zip}`
  ]
    .filter(Boolean)
    .join(', ');

  const subject = `Event Request: ${data.eventTitle} — ${data.city}, ${data.state}`;

  const textBody = `
New Event Request Submitted

Request ID: ${requestId}

CONTACT
Name: ${data.contactName}
Email: ${data.contactEmail}
Phone: ${data.contactPhone || 'N/A'}
Preferred Contact: ${data.preferredContactMethod}

EVENT
Title: ${data.eventTitle}
Type: ${data.eventType}${data.eventType === 'Other' ? ` (${data.eventTypeOther})` : ''}
Description: ${data.eventDescription || 'N/A'}
Estimated Attendance: ${data.expectedAttendance}
Requested Role: ${data.requestedRole}
Media Expected: ${data.mediaExpected}

DATE & TIME
Start: ${data.startDateTime}
End: ${data.endDateTime || 'N/A'}
Flexible: ${data.isTimeFlexible ? 'Yes' : 'No'}

LOCATION
Venue: ${data.venueName || 'N/A'}
Address: ${address}

Consent Confirmed: ${data.permissionToContact ? 'Yes' : 'No'}
`;

  const htmlBody = `
    <h2>New Event Request Submitted</h2>
    <p><strong>Request ID:</strong> ${requestId}</p>

    <h3>Contact</h3>
    <p>
      <strong>Name:</strong> ${data.contactName}<br/>
      <strong>Email:</strong> ${data.contactEmail}<br/>
      <strong>Phone:</strong> ${data.contactPhone || 'N/A'}<br/>
      <strong>Preferred Contact:</strong> ${data.preferredContactMethod}
    </p>

    <h3>Event</h3>
    <p>
      <strong>Title:</strong> ${data.eventTitle}<br/>
      <strong>Type:</strong> ${data.eventType}${data.eventType === 'Other' ? ` (${data.eventTypeOther})` : ''}<br/>
      <strong>Description:</strong> ${data.eventDescription || 'N/A'}<br/>
      <strong>Estimated Attendance:</strong> ${data.expectedAttendance}<br/>
      <strong>Requested Role:</strong> ${data.requestedRole}<br/>
      <strong>Media Expected:</strong> ${data.mediaExpected}
    </p>

    <h3>Date & Time</h3>
    <p>
      <strong>Start:</strong> ${data.startDateTime}<br/>
      <strong>End:</strong> ${data.endDateTime || 'N/A'}<br/>
      <strong>Flexible:</strong> ${data.isTimeFlexible ? 'Yes' : 'No'}
    </p>

    <h3>Location</h3>
    <p>
      <strong>Venue:</strong> ${data.venueName || 'N/A'}<br/>
      <strong>Address:</strong> ${address}
    </p>

    <p><strong>Consent Confirmed:</strong> ${data.permissionToContact ? 'Yes' : 'No'}</p>
  `;

  await sgMail.send({
    to,
    from,
    subject,
    text: textBody,
    html: htmlBody,
  });
}

async function createCalendarEvent(_payload: any) {
  // Phase 2 integration
  return true;
}

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
  const data = body?.data as Record<string, any> | undefined;
  const honeypot = body?.honeypot as string | undefined;

  if (!moduleId || !data) {
    return json(400, { ok: false, error: 'Missing moduleId or data' });
  }

  if (isSpam(honeypot)) {
    return json(200, { ok: true, requestId: randomUUID() });
  }

  const validate = validators[moduleId];
  if (!validate) {
    return json(400, { ok: false, error: 'Unknown moduleId' });
  }

  const valid = validate(data);
  if (!valid) {
    const details = (validate.errors || [])
      .map((e) => `${e.instancePath || '/'} ${e.message}`)
      .join('; ');
    return json(400, { ok: false, error: 'Validation failed', details });
  }

  const requestId = randomUUID();

  const payload = {
    requestId,
    moduleId,
    data,
    meta: { ip: event.headers['x-nf-client-connection-ip'] ?? null }
  };

  try {
    await logSubmission(payload);
    await sendEmail(payload);
    await createCalendarEvent(payload);
  } catch (err: any) {
    console.error('Submit pipeline error:', err);
    return json(500, { ok: false, error: 'Server error' });
  }

  return json(200, { ok: true, requestId });
};