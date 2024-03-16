import { getSummary } from "@/helpers/analytics/summary";
import { createClient } from "@/helpers/supabase/client";
import dayjs from "dayjs";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dayjs(dateParam);
  if (!date.isValid()) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid date" }));
  }

  const supabase = createClient();

  const { data: tokens, error } = await supabase
    .from("tokens")
    .select()
    .gte("created_at", date.startOf("day").toISOString())
    .lte("created_at", date.endOf("day").toISOString());

  if (error) {
    console.error(error);
    return new Response(JSON.stringify({ ok: false, error }));
  }

  const results = [];
  for (const token of tokens) {
    const summary = await getSummary(token);
    results.push(summary);
  }

  return new Response(JSON.stringify({ ok: true, results }));
}
