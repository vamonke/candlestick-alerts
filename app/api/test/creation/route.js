import {
  getContractInfo,
  getContractCreation,
} from "../../../../helpers/contract";

export async function GET() {
  const ca = "0x87fd01183ba0235e1568995884a78f61081267ef";
  const createdAt = await getContractCreation(ca);
  const info = await getContractInfo(ca);

  return new Response(
    JSON.stringify({
      createdAt,
      info,
    })
  );
}
