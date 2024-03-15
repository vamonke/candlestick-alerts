"use server";
import { getSummary } from "@/helpers/analytics/summary";
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

export async function getDayToken(date) {
  const tokens = await getTokens(date);

  const results = [];
  for (const token of tokens) {
    const summary = await getSummary(token);
    results.push(summary);
  }

  return results;
}
