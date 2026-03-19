import { supabase } from "@/shared/utils/db/client"

export type Contact = {
  id?: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  voter_id?: string
  tags?: string[]
  created_at?: string
}

export const contactsService = {
  async create(contact: Contact) {
    const { data, error } = await supabase
      .from("contacts")
      .insert([contact])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Contact>) {
    const { data, error } = await supabase
      .from("contacts")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getAll(limit = 50) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .limit(limit)

    if (error) throw error
    return data
  },

  async findByEmail(email: string) {
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("email", email)
      .single()

    if (error) return null
    return data
  }
}