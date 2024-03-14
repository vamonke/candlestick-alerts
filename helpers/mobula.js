import { sendError } from "./send";

export const getMarketData = async (contractAddress) => {
  try {
    const endPoint = `https://api.mobula.io/api/1/market/data`;
    const searchParams = new URLSearchParams({
      asset: contractAddress,
      blockchain: 1,
    });
    const url = `${endPoint}?${searchParams.toString()}`;
    console.log(`🔗 Fetching market data from: ${url}`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MOBULA_API_KEY}`,
      },
    });
    const json = await response.json();
    console.log("✅ Received market data:", json.data);
    return json.data;
  } catch (error) {
    sendError({ msg: "Error fetching market data", error });
    return null;
  }
};
