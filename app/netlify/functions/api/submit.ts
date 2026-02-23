import type { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

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
 * Phase 1 action pipeline stubs:
 * - logSubmission()
 * - sendEmail()
 * - createCalendarEvent()
 *
 * Replace stubs in /actions as integrations are added.
 */
async function logSubmission(_payload: any) {
  // TODO: Google Sheets and/or Supabase insert
  return true;
}
async function sendEmail(_payload: any) {
  // TODO: SendGrid integration
  return true;
}
async function createCalendarEvent(_payload: any) {
  // TODO: Google Calendar integration
  return true;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { ok: false, error: 'Method not allowed' });

  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const moduleId = body?.moduleId as ModuleId | undefined;
  const data = body?.data as Record<string, unknown> | undefined;
  const honeypot = body?.honeypot as string | undefined;

  if (!moduleId || !data) return json(400, { ok: false, error: 'Missing moduleId or data' });
  if (isSpam(honeypot)) return json(200, { ok: true, requestId: randomUUID() }); // silently accept

  const validate = validators[moduleId];
  if (!validate) return json(400, { ok: false, error: 'Unknown moduleId' });

  const valid = validate(data);
  if (!valid) {
    const details = (validate.errors || []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
    return json(400, { ok: false, error: 'Validation failed', details });
  }

  const requestId = randomUUID();

  // Phase 1: run actions in a safe order
  const payload = { requestId, moduleId, data, meta: { ip: event.headers['x-nf-client-connection-ip'] ?? null } };

  try {
    await logSubmission(payload);
    await sendEmail(payload);
    await createCalendarEvent(payload);
  } catch (err: any) {
    // Don’t leak internal errors; log in function logs.
    console.error('Submit pipeline error:', err);
    return json(500, { ok: false, error: 'Server error' });
  }

  return json(200, { ok: true, requestId });
};
