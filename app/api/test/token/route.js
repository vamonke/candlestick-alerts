export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const tokenAddress = searchParams.get("address");

  console.log("tokenAddress:", tokenAddress);

  const results = await getTokenCreationDate(tokenAddress);

  return new Response(
    JSON.stringify({
      tokenAddress,
      results,
    })
  );
}

const getTokenCreationDate = async (tokenAddress) => {
  const endPoint = `https://api.etherscan.io/api`;
  const searchParams = new URLSearchParams({
    module: "account",
    action: "tokentx",
    contractaddress: tokenAddress,
    address: "0x0000000000000000000000000000000000000000",
    apikey: process.env.ETHERSCAN_API_KEY,
    sort: "asc",
    page: 1,
  });
  const url = `${endPoint}?${searchParams.toString()}`;
  const response = await fetch(url);
  const json = await response.json();
  console.log("json:", json);
  const timeStamp = json?.result?.[0]?.timeStamp;
  return new Date(timeStamp * 1000);
};
