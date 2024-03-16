import { createClient } from "@supabase/supabase-js";
import { sendError } from "./send";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const insertTokens = async (tokens) => {
  console.log("💾 Saving tokens", tokens);
  const { data, error } = await supabaseClient.from("tokens").upsert(tokens);
  if (error) {
    console.error(error);
    sendError({ msg: "Error inserting token", error });
  }
  return data;
};
