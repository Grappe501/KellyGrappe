
// app/netlify/functions/calendar-check.ts
import { getGoogleAccessToken } from "./_lib/googleAuth";

export const handler = async (event) => {
  const { start, end } = JSON.parse(event.body);
  const accessToken = await getGoogleAccessToken();

  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${start}&timeMax=${end}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const data = await res.json();

  return {
    statusCode: 200,
    body: JSON.stringify({ conflict: data.items?.length > 0 }),
  };
};
