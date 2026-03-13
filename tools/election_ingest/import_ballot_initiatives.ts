import fs from "fs"
import path from "path"
import XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"
import "dotenv/config"

/*
=========================================================
Ballot Initiative Signature Importer
Arkansas Voter File Format
=========================================================

Features
• Handles Excel column variations
• Normalizes column names automatically
• Batch inserts for performance
• Safe to run repeatedly
• Robust error logging

=========================================================
*/

const DATA_PATH = path.join(
  process.cwd(),
  "data",
  "ballot_initiatives",
  "raw"
)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/*
=========================================================
Utilities
=========================================================
*/

function listExcelFiles(dir: string) {

  if (!fs.existsSync(dir)) return []

  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith(".xlsx"))
    .map(f => path.join(dir, f))

}

function normalizeRow(row: any) {

  const normalized: any = {}

  for (const key of Object.keys(row)) {

    const cleanKey = key.trim().toLowerCase()

    normalized[cleanKey] = row[key]

  }

  return normalized

}

/*
=========================================================
Ensure Initiative Record
=========================================================
*/

async function ensureInitiative(name: string) {

  const { data, error } = await supabase
    .from("ballot_initiatives")
    .select("id")
    .eq("name", name)
    .maybeSingle()

  if (error) {
    console.error("Lookup error:", error)
  }

  if (data) return data.id

  const { data: inserted, error: insertError } = await supabase
    .from("ballot_initiatives")
    .insert({ name })
    .select()
    .single()

  if (insertError) {
    console.error("Initiative insert error:", insertError)
    throw insertError
  }

  return inserted.id
}

/*
=========================================================
Process Excel File
=========================================================
*/

async function processFile(filePath: string) {

  console.log("")
  console.log("Processing:", filePath)

  const workbook = XLSX.readFile(filePath)

  const sheet = workbook.Sheets[workbook.SheetNames[0]]

  const rows: any[] = XLSX.utils.sheet_to_json(sheet)

  if (!rows.length) {
    console.log("No rows found in file")
    return
  }

  const initiativeName = path.basename(filePath).replace(".xlsx","")

  const initiativeId = await ensureInitiative(initiativeName)

  let inserted = 0
  const batch: any[] = []

  for (const rawRow of rows) {

    const row = normalizeRow(rawRow)

    const voterId =
      row["registrant id"] ||
      row["voter id"] ||
      row["voterid"]

    if (!voterId) continue

    const record = {

      initiative_id: initiativeId,

      voter_id: voterId.toString(),

      county: row["county name"] || null,

      first_name: row["firstname"] || null,
      last_name: row["lastname"] || null,

      dob: row["dateofbirth"] || null

    }

    batch.push(record)

    if (batch.length >= 500) {

      const { error } = await supabase
        .from("initiative_signatures")
        .insert(batch)

      if (error) {
        console.error("Batch insert error:", error)
      } else {
        inserted += batch.length
      }

      batch.length = 0

    }

  }

  if (batch.length) {

    const { error } = await supabase
      .from("initiative_signatures")
      .insert(batch)

    if (error) {
      console.error("Batch insert error:", error)
    } else {
      inserted += batch.length
    }

  }

  console.log(`✓ Imported ${inserted} signatures`)
}

/*
=========================================================
Run Import
=========================================================
*/

async function run() {

  console.log("")
  console.log("======================================")
  console.log("Ballot Initiative Import")
  console.log("======================================")

  const files = listExcelFiles(DATA_PATH)

  if (files.length === 0) {

    console.log("No files found")
    return

  }

  console.log(`Found ${files.length} files`)

  for (const file of files) {

    await processFile(file)

  }

  console.log("")
  console.log("======================================")
  console.log("Import Complete")
  console.log("======================================")

}

run()