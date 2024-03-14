export const checkHoneypot = async (tokenAddress) => {
  const getPairsUrl = `https://api.honeypot.is/v1/GetPairs?address=${tokenAddress}&chainID=1`;
  console.log("🔗 Fetching pairs", getPairsUrl);
  const pairsResponse = await fetch(getPairsUrl);
  const pairs = await pairsResponse.json();
  const pair = pairs?.[0]?.Pair?.Address;
  if (!pair) {
    console.error("No pair found for token", tokenAddress);
    return null;
  }
  console.log("✅ Found pair", pair);
  const honeypotUrl = `https://api.honeypot.is/v1/IsHoneypot?address=${tokenAddress}&pair=${pair}&chainID=1`;
  console.log("🔗 Fetching honeypot", honeypotUrl);
  const honeypotResponse = await fetch(honeypotUrl);
  const result = await honeypotResponse.json();
  console.log("✅ Honeypot result", result);
  return result;
};
