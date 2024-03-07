"use server";

import { permanentRedirect } from "next/navigation";
import { getCandleStickUrl } from "../helpers/candlestick";

export async function redirectToCandlestick(address) {
  const url = await getCandleStickUrl(address);
  permanentRedirect(url);
}
