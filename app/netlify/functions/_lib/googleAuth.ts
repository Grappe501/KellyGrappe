// app/netlify/functions/_lib/googleAuth.ts
import jwt from "jsonwebtoken";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export async function getGoogleAccessToken() {
  const clientEmail = mustEnv("GOOGLE_CLIENT_EMAIL");
  const privateKeyRaw = mustEnv("GOOGLE_PRIVATE_KEY");

  // Netlify typically stores private keys with \n sequences
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);

  const assertion = jwt.sign(
    {
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/calendar",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    },
    privateKey,
    { algorithm: "RS256" }
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    const msg =
      json?.error_description ||
      json?.error ||
      `Google token endpoint failed (${res.status}).`;
    throw new Error(msg);
  }

  if (!json?.access_token) {
    throw new Error("Google token response missing access_token.");
  }

  return json.access_token as string;
}