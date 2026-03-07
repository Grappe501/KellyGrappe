import React, { useState } from "react";
import Container from "../../shared/components/Container";
import { Card, CardHeader, CardContent } from "../../shared/components/Card";
import { Button, Input } from "../../shared/components/FormControls";

export default function CommandDashboardPage() {

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");

  async function sendSMS() {
    setStatus("Sending SMS...");

    const res = await fetch("/.netlify/functions/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: phone,
        message
      })
    });

    const data = await res.json();
    setStatus(JSON.stringify(data));
  }

  async function sendEmail() {
    setStatus("Sending Email...");

    const res = await fetch("/.netlify/functions/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: email,
        subject,
        text: message
      })
    });

    const data = await res.json();
    setStatus(JSON.stringify(data));
  }

  return (
    <Container>

      <h1 style={{ marginBottom: 24 }}>
        Campaign Command Dashboard
      </h1>

      <Card>
        <CardHeader>
          Messaging Center
        </CardHeader>

        <CardContent>

          <div style={{ marginBottom: 10 }}>
            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <Input
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <Input
              placeholder="Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <Input
              placeholder="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>

            <Button onClick={sendSMS}>
              Send SMS
            </Button>

            <Button onClick={sendEmail}>
              Send Email
            </Button>

          </div>

          <div style={{ marginTop: 20 }}>
            Status: {status}
          </div>

        </CardContent>
      </Card>

    </Container>
  );
}