// lib/client.ts (or wherever this file is located)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://boxzapgxostpqutxabzs.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveHphcGd4b3N0cHF1dHhhYnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTkwODksImV4cCI6MjA4MTg3NTA4OX0.m9MWKhY15DiYoO363gCAoNq9yma13fR1b2YHrpglfdA";

// Client-side Supabase client (with anon key)
const client = createClient(supabaseUrl, supabaseKey);

// Upload file using standard upload
export async function uploadFile(file) {
  const filePath = `uploads/${Date.now()}-${file.name}`;

  const { data, error } = await client.storage
    .from("admin_profile")
    .upload(filePath, file);

  if (error) {
    console.error("Upload failed:", error.message);
    return null;
  }

  return data;
}

export default client;