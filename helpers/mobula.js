import { sendError } from "./send";

export const getMarketData = async (contractAddress) => {
  try {
    const endPoint = `https://api.mobula.io/api/1/market/data`;
    const searchParams = new URLSearchParams({
      asset: contractAddress,
      blockchain: 1,
    });
    const url = `${endPoint}?${searchParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MOBULA_API_KEY}`,
      },
    });
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Error fetching market data", error);
    sendError("Error fetching market data", error);
    return null;
  }
};
