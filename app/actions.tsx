"use server";
import { createClient } from "@/helpers/supabase/client";

export const getTokens = async (date) => {
  const supabase = createClient();
  const { data: tokens } = await supabase
    .from("tokens")
    .select()
    .gte("created_at", date.startOf("day").toISOString())
    .lte("created_at", date.endOf("day").toISOString());
  return tokens;
};
