import { CovalentClient } from "@covalenthq/client-sdk";

export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const tokenAddress = searchParams.get("address");
  const txnHash = searchParams.get("hash");

  console.log("tokenAddress:", tokenAddress);
  console.log("txnHash:", txnHash);

  const txnValue = await getTxnValue(txnHash);
  // const price = await getTokenPrice(tokenAddress);

  return new Response(
    JSON.stringify({
      tokenAddress,
      // results,
      txnValue,
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

const getTxnValue = async (txHash) => {
  const client = new CovalentClient(process.env.COVALENT_API_KEY);
  const resp = await client.TransactionService.getTransaction(
    "eth-mainnet",
    txHash,
    { noLogs: true, quoteCurrency: "USD" }
  );
  return resp.data?.items?.[0]?.pretty_value_quote;
};
