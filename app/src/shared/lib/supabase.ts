import { createClient } from "@supabase/supabase-js"

// Grab env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 🔍 DEBUG — this is the key part
console.log("SUPABASE ENV DEBUG:", {
  url: supabaseUrl,
  key: supabaseAnonKey,
  allEnv: import.meta.env,
})

// 🚨 Instead of crashing immediately, we log clearly
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase env variables are missing", {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  })
}

// Create client (even if undefined, so app doesn’t hard crash)
export const supabase = createClient(
  supabaseUrl || "",
  supabaseAnonKey || ""
)