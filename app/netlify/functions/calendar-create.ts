
// app/netlify/functions/calendar-create.ts
import { getGoogleAccessToken } from "./_lib/googleAuth";

export const handler = async (event) => {
  const { title, start, end } = JSON.parse(event.body);
  const accessToken = await getGoogleAccessToken();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: `HOLD – ${title}`,
        start: { dateTime: start },
        end: { dateTime: end },
        colorId: "5",
      }),
    }
  );

  const data = await res.json();

  return {
    statusCode: 200,
    body: JSON.stringify(data),
  };
};
