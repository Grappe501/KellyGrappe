import XLSX from "xlsx"

const file = process.argv[2]

if (!file) {
  console.log("Usage: ts-node inspect_excel.ts <file>")
  process.exit(1)
}

const workbook = XLSX.readFile(file)

const sheet = workbook.Sheets[workbook.SheetNames[0]]

const rows: any[] = XLSX.utils.sheet_to_json(sheet)

if (!rows.length) {
  console.log("No rows found")
  process.exit(0)
}

console.log("Columns detected:\n")

console.log(Object.keys(rows[0]))

console.log("\nSample row:\n")

console.log(rows[0])