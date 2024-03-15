"use client";

import { Box, Button, Flex, Text } from "@radix-ui/themes";
import dayjs from "dayjs";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DateSelector() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const dateParam = searchParams.get("date")?.toString();
  const date = dayjs(dateParam).isValid() ? dayjs(dateParam) : dayjs();

  useEffect(() => {
    if (!dayjs(dateParam).isValid()) {
      const params = new URLSearchParams(searchParams);
      params.delete("date");
      replace(`${pathname}?${params.toString()}`);
    }
  }, [searchParams]);

  const setDate = (date: dayjs.Dayjs) => {
    const params = new URLSearchParams(searchParams);
    params.set("date", date.format("YYYY-MM-DD"));
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Box>
      <Flex align="center" gap={"2"}>
        <Text>{date.format("ddd, D MMMM YYYY")}</Text>
        <Button onClick={() => setDate(date.subtract(1, "day"))}>{"<"}</Button>
        <Button onClick={() => setDate(date.add(1, "day"))}>{">"}</Button>
      </Flex>
    </Box>
  );
}
