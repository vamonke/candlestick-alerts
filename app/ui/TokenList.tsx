import { Box, Table, Text } from "@radix-ui/themes";
import { getDayToken } from "app/actions";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

export default async function TokenList(props) {
  const { date } = props;
  const tokens = await getDayToken(date);

  return (
    <Box>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Token</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Alert time</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Honeypot</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="40%">Price</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Price change</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {tokens?.map(({ name, symbol, address, created_at, honeypot }) => {
            return (
              <Table.Row key={address}>
                <Table.RowHeaderCell>
                  <Box style={{ fontWeight: "bold" }}>
                    {name} ${symbol}
                  </Box>
                  <Text size="1">{address}</Text>
                </Table.RowHeaderCell>
                <Table.Cell>{formatHoneypot(honeypot?.IsHoneypot)}</Table.Cell>
                <Table.Cell>{dayjs(created_at).format("hh:mm A")}</Table.Cell>
                <Table.Cell>chart</Table.Cell>
                <Table.Cell>%50</Table.Cell>
              </Table.Row>
            );
          })}
          {tokens?.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={4}>No tokens found</Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}

const formatHoneypot = (result) => {
  if (result === false) return "No";
  if (result === true) return "⚠️ YES";
  return "Unknown";
};