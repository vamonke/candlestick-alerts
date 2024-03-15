"use server";
import { getSummary } from "@/helpers/analytics/summary";
import { createClient } from "@/helpers/supabase/client";

export const getTokens = async (date) => {
  const supabase = createClient();
  const { data: tokens } = await supabase
    .from("tokens")
    .select()
    .gte("created_at", date.startOf("day").toISOString())
    .lte("created_at", date.endOf("day").toISOString())
    // .limit(2)
    .order("created_at", { ascending: false });
  return tokens;
};

export async function getDayToken(date) {
  const tokens = await getTokens(date);
  const results = await Promise.all(tokens.map(getSummary));
  return results;
}
