"use client";

import { Box, Button, Flex } from "@radix-ui/themes";
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

  const isToday = date.isSame(dayjs(), "day");

  return (
    <Box>
      <Flex align="center" gap={"3"}>
        <Flex align="center" gap={"1"}>
          <Button
            color="plum"
            radius="full"
            variant="soft"
            onClick={() => setDate(date.subtract(1, "day"))}
          >
            {"<"}
          </Button>
          <Box style={{ width: 120, textAlign: "center" }}>
            {isToday ? "Today" : date.format("ddd, D MMM")}
          </Box>
          <Button
            color="plum"
            radius="full"
            variant="soft"
            onClick={() => setDate(date.add(1, "day"))}
          >
            {">"}
          </Button>
          {!isToday && (
            <Button
              ml="3"
              size="3"
              color="plum"
              radius="full"
              variant="ghost"
              onClick={() => setDate(dayjs())}
            >
              Today
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
