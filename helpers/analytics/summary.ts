import { getPriceChart } from "@/helpers/candlestick";
import { getContractInfo } from "@/helpers/contract";
import { checkHoneypot } from "@/helpers/honeypot";
import { parseUtcTimeString } from "@/helpers/parse";
import dayjs from "dayjs";

export const getSummary = async ({ address, created_at }) => {
  const row: {
    address: string;
    created_at: string;
    name?: void | string;
    symbol?: void | string;
    priceChart?: { time: Date; price: Number }[];
    honeypot?: void | object;
  } = {
    address,
    created_at,
  };

  const createdAt = dayjs(created_at);
  const fiveMinBeforeCreation = createdAt.subtract(5, "minute");
  const oneHourAfterCreation = createdAt.add(1, "hour");

  const [priceChart, contractInfo, honeypot] = await Promise.all([
    getPriceChart(address),
    // [],
    getContractInfo(address),
    checkHoneypot(address),
  ]);

  row.name = contractInfo?.name as void | string;
  row.symbol = contractInfo?.symbol as void | string;

  row.priceChart = priceChart
    ?.map(({ time, price }) => ({
      time: parseUtcTimeString(time),
      price: Number(price),
    }))
    ?.filter(({ time }) => {
      const isAfter = dayjs(time).isAfter(fiveMinBeforeCreation);
      const isBefore = dayjs(time).isBefore(oneHourAfterCreation);
      return isAfter && isBefore;
    });

  row.honeypot = honeypot;

  return row;
};
