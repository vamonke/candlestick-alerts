export const getTokenInfo = async (tokenAddress) => {
  try {
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
    console.log("Fetching token info for:", tokenAddress);
    const url = `${endPoint}?${searchParams.toString()}`;
    const response = await fetch(url);
    const json = await response.json();
    console.log(`✅ Fetched token info for ${tokenAddress}`, json);
    return json?.result?.[0];
  } catch (error) {
    console.error("Error fetching token info:", error);
    return null;
  }
};
