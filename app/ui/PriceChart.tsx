"use client";

import { Box, Text } from "@radix-ui/themes";
import dayjs from "dayjs";
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  Tooltip,
  CartesianAxis,
  ResponsiveContainer,
} from "recharts";

const PriceChart = ({ data }) => {
  const maxPrice = Math.max(...data.map((d) => d.price));
  const scientificNotation = maxPrice.toExponential();
  const [_, exponent] = scientificNotation
    .split("e")
    .map((part) => parseFloat(part));
  const power = Math.max(0, -exponent);
  const values = data.map((d) => ({
    time: d.time,
    price: d.price * Math.pow(10, power),
  }));
  return (
    <ResponsiveContainer width="100%" height={100}>
      <AreaChart data={values}>
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tickFormatter={(time) => dayjs(time).format("hh:mm")}
          interval="preserveStartEnd"
          // axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
          height={12}
        />
        <YAxis
          interval={0}
          axisLine={false}
          // tick={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
          width={32}
        />
        <CartesianGrid strokeDasharray="1 1" vertical={false} />
        <Tooltip
          content={renderTooltip}
          // labelFormatter={(time) => dayjs(time).format("hh:mm")}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="price"
          stroke="#8884d8"
          fillOpacity={1}
          fill="url(#colorUv)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const renderTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Box>
        <Box>{`${dayjs(label).format("hh:mm")}`}</Box>
        <Box>{`$${payload[0].value.toFixed(2)}`}</Box>
      </Box>
    );
  }

  return null;
};

export default PriceChart;
