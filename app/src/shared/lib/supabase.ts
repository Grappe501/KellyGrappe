import { createClient } from "@supabase/supabase-js"

// ===============================
// ENV SETUP
// ===============================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// ===============================
// DEBUG LOGGING (SAFE + CLEAN)
// ===============================
if (import.meta.env.DEV) {
  console.log("🔍 SUPABASE ENV DEBUG", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    mode: import.meta.env.MODE,
  })
}

// ===============================
// VALIDATION
// ===============================
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase ENV variables missing", {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  })

  throw new Error(
    "Missing Supabase environment variables. Check Netlify + .env file."
  )
}

// ===============================
// CLIENT
// ===============================
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ===============================
// 🔥 CONNECTION TEST (IMPORTANT)
// ===============================
export async function testConnection() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .limit(5)

  console.log("🔥 TEST DATA:", data)
  console.log("🔥 TEST ERROR:", error)

  return { data, error }
}

// ===============================
// CONTACT HELPERS (SAFE VERSION)
// ===============================

// ⚠️ IMPORTANT:
// These column names MUST match EXACTLY what exists in Supabase
// BUT we will avoid filtering on special-character columns

// 🔹 Get contacts
export async function fetchContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .limit(100)

  if (error) {
    console.error("❌ fetchContacts error:", error)
    return []
  }

  return data || []
}

// 🔹 Search contacts (SAFE fallback)
export async function searchContacts(searchTerm: string) {
  if (!searchTerm) return fetchContacts()

  // ⚠️ DO NOT FILTER ON SPECIAL CHARACTER COLUMN NAMES
  // Instead, fetch + filter locally (reliable for now)

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .limit(200)

  if (error) {
    console.error("❌ searchContacts error:", error)
    return []
  }

  if (!data) return []

  const lower = searchTerm.toLowerCase()

  return data.filter((row: any) => {
    return (
      (row["What is your name?"] || "")
        .toLowerCase()
        .includes(lower) ||
      (row["Email Address"] || "")
        .toLowerCase()
        .includes(lower)
    )
  })
}