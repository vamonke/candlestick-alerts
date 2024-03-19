import { unstable_noStore as noStore } from "next/cache";
import { sendError } from "@/helpers/send";
import Alert from "@/classes/Alert";
import config from "@/classes/Config";
import { supabaseClient } from "@/helpers/supabase";

export const maxDuration = 60; // This function can run for a maximum of 60 seconds

export async function GET() {
  noStore();
  try {
    return await handler();
  } catch (error) {
    sendError(error);
    return Response.json({ ok: false, error });
  }
}

const handler = async () => {
  console.log("🚀 Running cron job");

  await config.init();
  console.log(`Config: ${JSON.stringify(config, null, 2)}`);

  const { authToken } = config;
  if (!authToken) {
    const error = "⁉️ Missing token";
    sendError(error);
    return Response.json({ error }, { status: 500 });
  }

  const alerts = await fetchAlerts();
  console.log(`Alerts to execute: ${alerts.length}`);

  // Parallel execution
  // const alertPromises = alerts.map(async (alert, index) => {
  //   console.log(`Executing alert ${index + 1}: ${alert.name}`);
  //   console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
  //   try {
  //     await alert.execute();
  //     console.log(`Finished executing alert ${index + 1}: ${alert.name}`);
  //   } catch (error) {
  //     sendError({ message: "Error executing alert", error });
  //   }
  // });
  // await Promise.all(promises);

  // Sequential execution
  for (const alert of alerts) {
    console.log(`Executing alert: ${alert.name}`);
    console.log(`Parameters: ${JSON.stringify(alert, null, 2)}`);
    try {
      await alert.execute();
      console.log(`Finished executing alert: ${alert.name}`);
    } catch (error) {
      sendError({ message: "Error executing alert", error });
    }
  }

  return Response.json({ success: true }, { status: 200 });
};

const fetchAlerts = async (): Promise<Alert[]> => {
  const { data, error } = await supabaseClient
    .from("alerts")
    .select("*")
    .eq("active", true);
  if (error) {
    sendError({ msg: "Failed to fetch alerts", error });
    return [];
  }
  return data.map((alert) => new Alert(alert));
};
