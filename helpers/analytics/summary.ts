import { getPriceChart } from "@/helpers/candlestick";
import { getContractInfo } from "@/helpers/contract";
import { checkHoneypot } from "@/helpers/honeypot";
import { parseUtcTimeString } from "@/helpers/parse";
import dayjs from "dayjs";

export const getSummary = async ({ address, created_at, name, symbol }) => {
  const row: {
    address: string;
    created_at: string;
    name: string;
    symbol: string;
    priceChart?: { time: Date; price: number }[];
    honeypot?: void | {
      honeypotResult: {
        isHoneypot: boolean;
      };
    };
  } = {
    address,
    created_at,
    name,
    symbol,
  };

  const createdAt = dayjs(created_at);
  const fiveMinBeforeCreation = createdAt.subtract(5, "minute");
  const oneHourAfterCreation = createdAt.add(1, "hour");

  const [priceChart, honeypot, contractInfo] = await Promise.all([
    getPriceChart(address),
    checkHoneypot(address),
    name ? null : getContractInfo(address),
  ]);

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

  if (contractInfo?.name) row.name = contractInfo.name as unknown as string;
  if (contractInfo?.symbol)
    row.symbol = contractInfo.symbol as unknown as string;

  return row;
};
