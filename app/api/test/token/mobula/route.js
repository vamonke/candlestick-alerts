export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const tokenAddress = searchParams.get("address");

  console.log("tokenAddress:", tokenAddress);

  const price = await getMarketData(tokenAddress);

  return new Response(
    JSON.stringify({
      tokenAddress,
      price,
    })
  );
}

const getMarketData = async (contractAddress) => {
  const endPoint = `https://api.mobula.io/api/1/market/data`;
  const searchParams = new URLSearchParams({
    asset: contractAddress,
    blockchain: 1,
  });
  const url = `${endPoint}?${searchParams.toString()}`;
  const response = await fetch(url);
  const json = await response.json();
  return json;
};
