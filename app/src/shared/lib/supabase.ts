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
  console.error("❌ Supabase ENV variables missing")

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
// CONTACT HELPERS (MATCH YOUR DB)
// ===============================

// 🔹 Get all contacts
export async function fetchContacts() {
  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id,
      "What is your name?",
      "Email Address",
      "Contact Phone Number (text & call)"
    `)
    .limit(100)

  if (error) {
    console.error("❌ fetchContacts error:", error)
    return []
  }

  return data
}

// 🔹 Search contacts
export async function searchContacts(searchTerm) {
  if (!searchTerm) return fetchContacts()

  const { data, error } = await supabase
    .from("contacts")
    .select(`
      id,
      "What is your name?",
      "Email Address",
      "Contact Phone Number (text & call)"
    `)
    .or(`
      "What is your name?".ilike.%${searchTerm}%,
      "Email Address".ilike.%${searchTerm}%
    `)
    .limit(50)

  if (error) {
    console.error("❌ searchContacts error:", error)
    return []
  }

  return data
}