import { Box, Container, Heading } from "@radix-ui/themes";
import DateSelector from "./ui/DateSelector";
import TokenList from "./ui/TokenList";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";

export default function Page({ searchParams }) {
  const dateParam = searchParams?.date;
  const date = dayjs(dateParam).isValid() ? dayjs(dateParam) : dayjs();
  return (
    <Box>
      <Container py="6">
        <Heading
          size="8"
          mb="2"
          style={{
            letterSpacing: "-0.025em",
          }}
        >
          Degen Alerts
        </Heading>
        <Box>
          <DateSelector />
          <Box py="3">
            <TokenList date={date} />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
