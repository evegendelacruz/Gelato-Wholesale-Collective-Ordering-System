import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://boxzapgxostpqutxabzs.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJveHphcGd4b3N0cHF1dHhhYnpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyOTkwODksImV4cCI6MjA4MTg3NTA4OX0.m9MWKhY15DiYoO363gCAoNq9yma13fR1b2YHrpglfdA";
const client = createClient(supabaseUrl, supabaseKey);

export default client;
