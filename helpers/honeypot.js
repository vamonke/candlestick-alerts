export const checkHoneypot = async (tokenAddress) => {
  try {
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
  } catch (error) {
    console.error("Error checking honeypot", error);
    return null;
  }
};

/*
{
  "Token": {
    "Name": "BlockGames",
    "Symbol": "BLOCK",
    "Decimals": 18,
    "Address": "0xb6f2aa17a2ce2410a116205f13d7d031b69cafa6"
  },
  "WithToken": {
    "Name": "Wrapped Ether",
    "Symbol": "WETH",
    "Decimals": 18,
    "Address": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
  },
  "IsHoneypot": true,
  "Error": "HONEYPOT DETECTED",
  "MaxBuy": null,
  "MaxSell": null,
  "BuyTax": 0,
  "SellTax": 0,
  "TransferTax": 0,
  "Flags": [
    "high_siphon_rate"
  ],
  "BuyGas": 144646,
  "SellGas": 104040,
  "Chain": {
    "ID": 1,
    "Name": "Ethereum",
    "ShortName": "eth",
    "Currency": "ETH"
  },
  "Router": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
  "Pair": {
    "ChainID": 1,
    "Pair": {
      "Name": "Uniswap V2: BLOCK-WETH",
      "Tokens": [
        "0xb6f2aa17a2ce2410a116205f13d7d031b69cafa6",
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
      ],
      "Address": "0x4c33733b4cb70cde907f556ef963f04c12b88897"
    },
    "Reserves": [
      2.318286314658952e+28,
      42000548520456280
    ],
    "Liquidity": 334.8132526076103,
    "Router": "0x7a250d5630b4cf539739df2c5dacb4c659f2488d"
  },
  "PairAddress": "0x4c33733b4cb70cde907f556ef963f04c12b88897"
}
}
*/
