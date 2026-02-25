import type { Handler } from '@netlify/functions';
import { randomUUID } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { Resend } from 'resend';

import eventSchema from './eventRequests.schema.json';
import teamSignupSchema from './teamSignup.schema.json';
import liveContactSchema from './liveContact.schema.json';

type ModuleId =
  | 'MODULE_001_EVENT_REQUEST'
  | 'MODULE_002_TEAM_SIGNUP'
  | 'MODULE_003_LIVE_CONTACT';

type EventData = Record<string, any>;

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: false,
  strict: false,
});
addFormats(ajv);

const validators: Record<ModuleId, ReturnType<typeof ajv.compile>> = {
  MODULE_001_EVENT_REQUEST: ajv.compile(eventSchema as any),
  MODULE_002_TEAM_SIGNUP: ajv.compile(teamSignupSchema as any),
  MODULE_003_LIVE_CONTACT: ajv.compile(liveContactSchema as any),
};

/* -------------------------------------------------------------------------- */
/*                                UTILITIES                                   */
/* -------------------------------------------------------------------------- */

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

function safe(v: unknown) {
  return (v ?? '').toString();
}

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
  // Future: Supabase / database logging
  return true;
}

async function sendEmails(payload: {
  requestId: string;
  moduleId: ModuleId;
  data: EventData;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !to || !from) {
    console.warn('[email] Missing environment variables.');
    return { ok: false, skipped: true };
  }

  const resend = new Resend(apiKey);
  const { requestId, moduleId, data } = payload;

  const replyTo = safe(data.contactEmail || data.email) || undefined;

  const subject =
    moduleId === 'MODULE_001_EVENT_REQUEST'
      ? `Event Request: ${safe(data.eventTitle)} — ${safe(data.city)}, ${safe(
          data.state
        )}`
      : moduleId === 'MODULE_002_TEAM_SIGNUP'
      ? `Volunteer Signup: ${safe(data.name)} — ${safe(data.location)}`
      : `Live Contact: ${safe(data.name)} — ${safe(data.location)}`;

  const internalHtml = (() => {
    if (moduleId === 'MODULE_001_EVENT_REQUEST') {
      const address = [
        safe(data.addressLine1),
        safe(data.addressLine2),
        `${safe(data.city)}, ${safe(data.state)} ${safe(data.zip)}`,
      ]
        .filter(Boolean)
        .join(', ');

      return `
        <h2>New Event Request Submitted</h2>
        <p><strong>Reference ID:</strong> ${requestId}</p>

        <h3>Contact Information</h3>
        <p>
          <strong>Name:</strong> ${safe(data.contactName)}<br/>
          <strong>Email:</strong> ${safe(data.contactEmail)}<br/>
          <strong>Phone:</strong> ${safe(data.contactPhone) || 'N/A'}<br/>
          <strong>Preferred Contact:</strong> ${safe(data.preferredContactMethod)}
        </p>

        <h3>Event Details</h3>
        <p>
          <strong>Title:</strong> ${safe(data.eventTitle)}<br/>
          <strong>Type:</strong> ${safe(data.eventType)}${
            data.eventType === 'Other'
              ? ` (${safe(data.eventTypeOther)})`
              : ''
          }<br/>
          <strong>Description:</strong> ${safe(data.eventDescription) || 'N/A'}<br/>
          <strong>Estimated Attendance:</strong> ${safe(data.expectedAttendance)}<br/>
          <strong>Requested Role:</strong> ${safe(data.requestedRole)}<br/>
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
    }

    if (moduleId === 'MODULE_003_LIVE_CONTACT') {
      return `
        <h2>New Live Contact Captured</h2>
        <p><strong>Reference ID:</strong> ${requestId}</p>

        <h3>Contact</h3>
        <p>
          <strong>Name:</strong> ${safe(data.name)}<br/>
          <strong>Phone:</strong> ${safe(data.phone) || 'N/A'}<br/>
          <strong>Email:</strong> ${safe(data.email) || 'N/A'}<br/>
          <strong>Location:</strong> ${safe(data.location) || 'N/A'}
        </p>

        <h3>Facebook</h3>
        <p>
          <strong>Connected:</strong> ${
            data.facebookConnected ? 'Yes' : 'No'
          }<br/>
          <strong>Profile name:</strong> ${safe(data.facebookProfileName) || 'N/A'}
        </p>

        <h3>Notes</h3>
        <p>${safe(data.notes) || 'N/A'}</p>

        <h3>Follow-up</h3>
        <p>
          <strong>Status:</strong> ${safe(data.followUpStatus) || 'NEW'}<br/>
          <strong>Automation eligible:</strong> ${
            data.automationEligible ? 'Yes' : 'No'
          }<br/>
          <strong>Source:</strong> ${safe(data.source) || 'LIVE_FIELD'}
        </p>

        <p><strong>Permission to contact:</strong> ${
          data.permissionToContact ? 'Yes' : 'No'
        }</p>
      `;
    }

    // MODULE_002_TEAM_SIGNUP
    const arrays: Array<[string, unknown]> = [
      ['Creative & Digital', data.creativeDigitalTeam],
      ['Communications & PR', data.communicationsPRTeam],
      ['Constituent Services', data.constituentServicesTeam],
      ['Democracy & Rights', data.democracyRightsTeam],
      ['Field & Events', data.fieldEventsTeam],
      ['Finance & Fundraising', data.financeFundraisingTeam],
      ['Operations', data.operationsTeam],
      ['Outreach & Organizing', data.outreachOrganizingTeam],
      ['Social Media & Storytelling', data.socialMediaStorytellingTeam],
    ];

    const selections = arrays
      .map(([label, value]) => {
        const items = Array.isArray(value) ? value : [];
        if (!items.length) return '';
        const li = items.map((v: any) => `<li>${safe(v)}</li>`).join('');
        return `<h4>${label}</h4><ul>${li}</ul>`;
      })
      .filter(Boolean)
      .join('');

    return `
      <h2>New Volunteer Signup Submitted</h2>
      <p><strong>Reference ID:</strong> ${requestId}</p>

      <h3>Contact</h3>
      <p>
        <strong>Name:</strong> ${safe(data.name)}<br/>
        <strong>Email:</strong> ${safe(data.email)}<br/>
        <strong>Phone:</strong> ${safe(data.phone) || 'N/A'}<br/>
        <strong>City/County:</strong> ${safe(data.location)}
      </p>

      <h3>Availability</h3>
      <p>
        <strong>Hours per week:</strong> ${safe(data.hoursPerWeek)}${
          safe(data.hoursPerWeek) === 'Other'
            ? ` (${safe(data.hoursPerWeekOther)})`
            : ''
        }
      </p>

      <h3>Volunteer Selections</h3>
      ${selections || '<p>No team roles selected.</p>'}

      <h3>Other</h3>
      <p>
        <strong>Stay in touch:</strong> ${data.stayInTouch ? 'Yes' : 'No'}<br/>
        <strong>Other contribution:</strong> ${
          safe(data.otherContribution) || 'N/A'
        }<br/>
        <strong>Event invite details:</strong> ${
          safe(data.eventInviteDetails) || 'N/A'
        }
      </p>

      <p><strong>Consent Confirmed:</strong> ${
        data.permissionToContact ? 'Yes' : 'No'
      }</p>
    `;
  })();

  try {
    const internalResponse = await resend.emails.send({
      from,
      to,
      subject,
      html: internalHtml,
      reply_to: replyTo,
    });

    if (internalResponse.error) {
      console.error('[email] Internal send error:', internalResponse.error);
    }
  } catch (err) {
    console.error('[email] Internal send crash:', err);
  }

  // No confirmation emails for live-contact (field capture)
  const recipient = safe(data.contactEmail || data.email);
  if (recipient && moduleId !== 'MODULE_003_LIVE_CONTACT') {
    const confirmationSubject =
      moduleId === 'MODULE_001_EVENT_REQUEST'
        ? 'Your event request has been received'
        : 'Thank you for signing up to volunteer';

    const confirmationHtml = (() => {
      if (moduleId === 'MODULE_001_EVENT_REQUEST') {
        const address = [
          safe(data.addressLine1),
          safe(data.addressLine2),
          `${safe(data.city)}, ${safe(data.state)} ${safe(data.zip)}`,
        ]
          .filter(Boolean)
          .join(', ');

        return `
          <h2>Thank You for Your Submission</h2>
          <p>Hi ${safe(data.contactName)},</p>

          <p>We have received your event request for:</p>

          <p>
            <strong>${safe(data.eventTitle)}</strong><br/>
            ${safe(data.startDateTime)}<br/>
            ${address}
          </p>

          <p>Our team will review the request and follow up as soon as possible.</p>

          <p>Reference ID: <strong>${requestId}</strong></p>

          <p>Kelly Grappe for Arkansas Secretary of State</p>
        `;
      }

      return `
        <h2>Thank You for Signing Up</h2>
        <p>Hi ${safe(data.name)},</p>

        <p>We received your volunteer signup. Someone from the team will follow up with next steps.</p>

        <p>Reference ID: <strong>${requestId}</strong></p>

        <p>Kelly Grappe for Arkansas Secretary of State</p>
      `;
    })();

    try {
      const confirmationResponse = await resend.emails.send({
        from,
        to: recipient,
        subject: confirmationSubject,
        html: confirmationHtml,
      });

      if (confirmationResponse.error) {
        console.error('[email] Confirmation error:', confirmationResponse.error);
      }
    } catch (err) {
      console.error('[email] Confirmation crash:', err);
    }
  }

  return { ok: true };
}

async function createCalendarEvent(_payload: unknown) {
  // Future calendar integration
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

  if (moduleId === 'MODULE_001_EVENT_REQUEST') {
    data.startDateTime = normalizeDate(data.startDateTime);
    if (data.endDateTime) data.endDateTime = normalizeDate(data.endDateTime);
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

  let emailResult: any = null;

  try {
    await logSubmission(payload);
  } catch (err) {
    console.error('[logSubmission] error:', err);
  }

  try {
    emailResult = await sendEmails({ requestId, moduleId, data });
  } catch (err) {
    console.error('[sendEmails] error:', err);
  }

  return json(200, {
    ok: true,
    requestId,
    actions: {
      email: emailResult,
    },
  });
};