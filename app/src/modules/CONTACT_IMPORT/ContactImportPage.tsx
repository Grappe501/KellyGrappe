import React, { useState } from "react"
import Container from "../../shared/components/Container"
import { Card, CardHeader, CardContent } from "../../shared/components/Card"
import {
  Button,
  Input,
  Label,
  HelpText,
  ErrorText,
} from "../../shared/components/FormControls"

type ImportPreviewRow = {
  name?: string
  email?: string
  phone?: string
  city?: string
  county?: string
}

function parseCsv(text: string): ImportPreviewRow[] {
  const rows = text.split("\n").map((r) => r.trim()).filter(Boolean)
  if (!rows.length) return []

  const header = rows[0].split(",").map((h) => h.trim().toLowerCase())

  return rows.slice(1).map((row) => {
    const cols = row.split(",").map((c) => c.trim())
    const obj: any = {}

    header.forEach((h, i) => {
      const val = cols[i]
      if (!val) return

      if (h.includes("name")) obj.name = val
      if (h.includes("email")) obj.email = val
      if (h.includes("phone")) obj.phone = val
      if (h.includes("city")) obj.city = val
      if (h.includes("county")) obj.county = val
    })

    return obj
  })
}

export default function ContactImportPage() {

  const [preview, setPreview] = useState<ImportPreviewRow[]>([])
  const [fileName, setFileName] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    try {
      setError(null)

      const text = await file.text()

      const rows = parseCsv(text)

      if (!rows.length) {
        setError("No contacts detected in file.")
        return
      }

      setPreview(rows.slice(0, 50))
      setFileName(file.name)

    } catch (err: any) {
      setError("Unable to parse file.")
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    handleFile(file)
  }

  async function importContacts() {
    alert("Bulk import pipeline will be implemented next step.")
  }

  return (
    <Container>

      <Card>

        <CardHeader
          title="Contact Import Center"
          subtitle="Upload voter files, spreadsheets, petitions, or contacts."
        />

        <CardContent className="space-y-8">

          <section className="space-y-3">

            <Label>Upload CSV or Spreadsheet</Label>

            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={onFileChange}
            />

            <HelpText>
              Supported formats: CSV, Excel, Google Sheets export.
            </HelpText>

          </section>

          <section className="space-y-3">

            <Label>Import From Google Contacts</Label>

            <Button
              type="button"
              variant="secondary"
              onClick={() => alert("Google Contacts import will be added in next phase.")}
            >
              Connect Google Contacts
            </Button>

          </section>

          <section className="space-y-3">

            <Label>Import Phone Contacts</Label>

            <Button
              type="button"
              variant="secondary"
              onClick={() => alert("Phone contact import coming soon.")}
            >
              Import Device Contacts
            </Button>

          </section>

          {error && (
            <ErrorText>{error}</ErrorText>
          )}

          {preview.length > 0 && (

            <section className="space-y-4">

              <div className="flex items-center justify-between">

                <div>
                  <strong>{fileName}</strong>
                  <HelpText>
                    Showing first {preview.length} contacts detected
                  </HelpText>
                </div>

                <Button onClick={importContacts}>
                  Import Contacts
                </Button>

              </div>

              <div className="border rounded overflow-x-auto">

                <table className="min-w-full text-sm">

                  <thead className="bg-gray-100">

                    <tr>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Email</th>
                      <th className="p-2 text-left">Phone</th>
                      <th className="p-2 text-left">City</th>
                      <th className="p-2 text-left">County</th>
                    </tr>

                  </thead>

                  <tbody>

                    {preview.map((row, i) => (
                      <tr key={i} className="border-t">

                        <td className="p-2">{row.name}</td>
                        <td className="p-2">{row.email}</td>
                        <td className="p-2">{row.phone}</td>
                        <td className="p-2">{row.city}</td>
                        <td className="p-2">{row.county}</td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </section>

          )}

        </CardContent>

      </Card>

    </Container>
  )
}