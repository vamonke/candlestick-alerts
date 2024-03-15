import { createClient } from "@/helpers/supabase/server";
import { cookies } from "next/headers";
import { Box } from "@radix-ui/themes";

export default async function TokenList(props) {
  const { date } = props;
  console.log("date", date.toString());

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: tokens } = await supabase
    .from("tokens")
    .select()
    .gte("created_at", date.startOf("day").toISOString())
    .lte("created_at", date.endOf("day").toISOString());

  return (
    <Box>
      {tokens?.map(({ address }) => (
        <Box key={address}>{address}</Box>
      ))}
    </Box>
  );
}
