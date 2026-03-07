import type { Handler } from "@netlify/functions";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed",
      };
    }

    const data = JSON.parse(event.body || "{}");

    const msg = {
      to: data.to,
      from: process.env.SENDGRID_FROM_EMAIL!,
      subject: data.subject,
      text: data.text,
      html: data.html,
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error: any) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Email send failed",
        details: error.message,
      }),
    };
  }
};