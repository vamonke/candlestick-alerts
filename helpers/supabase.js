import { createClient } from "@supabase/supabase-js";
import { sendError } from "./send";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Create a single supabase client for interacting with your database
export const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export const insertTokens = async (tokens) => {
  // { address }
  const { data, error } = await supabaseService.from("tokens").upsert(tokens, {
    ignoreDuplicates: true,
  });
  if (error) {
    console.error(error);
    sendError({ msg: "Error inserting token", error });
  }
  return data;
};
