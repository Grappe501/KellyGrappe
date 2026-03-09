import React, { useEffect, useState } from "react"

import { Card, CardHeader, CardContent } from "@components/Card"
import { Input, Textarea, Button, Label } from "@components/FormControls"

import { listContactsDirectoryRows } from "@services/contacts.service"

type ContactRow = {
  id:string
  fullName:string
  phone?:string
  email?:string
}

const TEMPLATES = [
  {
    label:"Volunteer Reminder",
    subject:"Volunteer Reminder",
    body:"Reminder: thank you for being part of the team. Please confirm your availability."
  },
  {
    label:"Event Reminder",
    subject:"Event Reminder",
    body:"Reminder: our event is coming up soon. Let us know if you can attend."
  },
  {
    label:"Follow-Up",
    subject:"Following Up",
    body:"Following up from our last conversation. Let us know if you have any questions."
  }
]

export default function MessagingCenterCard(){

  const [contacts,setContacts] = useState<ContactRow[]>([])
  const [search,setSearch] = useState("")
  const [results,setResults] = useState<ContactRow[]>([])

  const [phone,setPhone] = useState("")
  const [email,setEmail] = useState("")
  const [subject,setSubject] = useState("")
  const [message,setMessage] = useState("")
  const [status,setStatus] = useState("")

  useEffect(()=>{

    async function load(){

      const rows =
        await listContactsDirectoryRows()

      setContacts(rows)

    }

    load()

  },[])

  function runSearch(q:string){

    const v = q.trim().toLowerCase()

    if(!v){
      setResults([])
      return
    }

    const matches =
      contacts.filter(c =>
        c.fullName?.toLowerCase().includes(v) ||
        c.phone?.includes(v) ||
        c.email?.toLowerCase().includes(v)
      ).slice(0,6)

    setResults(matches)

  }

  function selectContact(c:ContactRow){

    if(c.phone) setPhone(c.phone)
    if(c.email) setEmail(c.email)

    setResults([])
    setSearch("")

  }

  async function sendSMS(){

    if(!phone || !message){
      setStatus("Phone and message required")
      return
    }

    setStatus("Sending SMS...")

    const res =
      await fetch("/.netlify/functions/send-sms",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          to:phone,
          message
        })
      })

    const data =
      await res.json()

    setStatus(JSON.stringify(data))

  }

  async function sendEmail(){

    if(!email || !subject || !message){
      setStatus("Email, subject, and message required")
      return
    }

    setStatus("Sending Email...")

    const res =
      await fetch("/.netlify/functions/send-email",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          to:email,
          subject,
          text:message
        })
      })

    const data =
      await res.json()

    setStatus(JSON.stringify(data))

  }

  function applyTemplate(t:any){

    setSubject(t.subject)
    setMessage(t.body)

  }

  return(

    <Card>

      <CardHeader
        title="Messaging Center"
        subtitle="Send SMS or Email"
      />

      <CardContent>

        <div className="space-y-5">

          {/* CONTACT SEARCH */}

          <div>

            <Label>Search Contact</Label>

            <Input
              placeholder="Search name, phone, email"
              value={search}
              onChange={(e)=>{
                const v = e.target.value
                setSearch(v)
                runSearch(v)
              }}
            />

            {results.length>0 &&(

              <div className="mt-2 border rounded divide-y">

                {results.map(c=>(
                  <div
                    key={c.id}
                    onClick={()=>selectContact(c)}
                    className="p-3 text-sm hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="font-semibold">
                      {c.fullName}
                    </div>

                    <div className="text-xs text-slate-500">
                      {c.phone} {c.email}
                    </div>
                  </div>
                ))}

              </div>

            )}

          </div>

          {/* PHONE */}

          <div>
            <Label>Phone</Label>

            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
            />
          </div>

          {/* EMAIL */}

          <div>
            <Label>Email</Label>

            <Input
              placeholder="Email Address"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
            />
          </div>

          {/* SUBJECT */}

          <div>
            <Label>Email Subject</Label>

            <Input
              placeholder="Subject"
              value={subject}
              onChange={(e)=>setSubject(e.target.value)}
            />
          </div>

          {/* MESSAGE */}

          <div>
            <Label>Message</Label>

            <Textarea
              value={message}
              onChange={(e)=>setMessage(e.target.value)}
            />
          </div>

          {/* TEMPLATES */}

          <div className="flex flex-wrap gap-2">

            {TEMPLATES.map(t=>(
              <Button
                key={t.label}
                size="sm"
                variant="secondary"
                onClick={()=>applyTemplate(t)}
              >
                {t.label}
              </Button>
            ))}

          </div>

          {/* SEND BUTTONS */}

          <div className="flex gap-3">

            <Button
              onClick={sendSMS}
            >
              Send SMS
            </Button>

            <Button
              variant="secondary"
              onClick={sendEmail}
            >
              Send Email
            </Button>

          </div>

          {/* STATUS */}

          <div className="text-xs text-slate-600">

            {status || "No messages sent yet"}

          </div>

        </div>

      </CardContent>

    </Card>

  )

}