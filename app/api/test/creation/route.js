import {
  getContractInfo,
  getContractCreation,
} from "../../../../helpers/contract";

export async function GET(request) {
  const searchParams = new URL(request.url).searchParams;
  const ca = searchParams.get("ca");

  if (!ca) {
    return new Response("Missing ca", { status: 400 });
  }

  const createdAt = await getContractCreation(ca);
  const info = await getContractInfo(ca);

  return new Response(
    JSON.stringify({
      createdAt,
      info,
    })
  );
}
