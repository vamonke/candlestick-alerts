export const checkHoneypot = async (tokenAddress) => {
  try {
    const getPairsUrl = `https://api.honeypot.is/v1/GetPairs?address=${tokenAddress}&chainID=1`;
    console.log("🔗 Fetching pairs", getPairsUrl);

    const pairsResponse = await fetch(getPairsUrl);
    const pairs = await pairsResponse.json();
    const pair = pairs?.[0]?.Pair?.Address;
    if (pair) {
      console.log("✅ Found pair", pair);
      // return null;
    } else {
      console.log("No pair found for token", tokenAddress);
    }

    const honeypotEndpoint = `https://api.honeypot.is/v2/IsHoneypot`;
    const searchParams = new URLSearchParams();
    searchParams.set("address", tokenAddress);
    searchParams.set("chainID", "1");
    if (pair) {
      searchParams.set("pair", pair);
    } else {
      searchParams.set("forceSimulateLiquidity", "true");
    }
    const honeypotUrl = `${honeypotEndpoint}?${searchParams.toString()}`;

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
    "token": {
        "name": "NodeAI",
        "symbol": "GPU",
        "decimals": 18,
        "address": "0x1258D60B224c0C5cD888D37bbF31aa5FCFb7e870",
        "totalHolders": 16203
    },
    "withToken": {
        "name": "Wrapped Ether",
        "symbol": "WETH",
        "decimals": 18,
        "address": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "totalHolders": 791650
    },
    "summary": null,
    "simulationSuccess": true,
    "honeypotResult": {
        "isHoneypot": false
    },
    "simulationResult": {
        "buyTax": 3.999999999999995,
        "sellTax": 3.9988707480822705,
        "transferTax": 0,
        "buyGas": "172646",
        "sellGas": "112088"
    },
    "holderAnalysis": {
        "holders": "11771",
        "successful": "11770",
        "failed": "0",
        "siphoned": "1",
        "averageTax": 4.013385726423027,
        "averageGas": 140375.92353440952,
        "highestTax": 5.84,
        "highTaxWallets": "0",
        "taxDistribution": [
            {
                "tax": 2,
                "count": 1
            },
            {
                "tax": 3,
                "count": 11584
            },
            {
                "tax": 4,
                "count": 6
            },
            {
                "tax": 5,
                "count": 179
            }
        ],
        "snipersFailed": 0,
        "snipersSuccess": 0
    },
    "flags": [],
    "contractCode": {
        "openSource": true,
        "rootOpenSource": true,
        "isProxy": false,
        "hasProxyCalls": false
    },
    "chain": {
        "id": "1",
        "name": "Ethereum",
        "shortName": "eth",
        "currency": "ETH"
    },
    "router": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "pair": {
        "pair": {
            "name": "Uniswap V2: GPU-WETH",
            "address": "0x769f539486b31eF310125C44d7F405C6d470cD1f",
            "token0": "0x1258D60B224c0C5cD888D37bbF31aa5FCFb7e870",
            "token1": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            "type": "UniswapV2"
        },
        "chainId": "1",
        "reserves0": "1050457449869616117457948",
        "reserves1": "324406666917773263906",
        "liquidity": 2383331.4361114814,
        "router": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
        "createdAtTimestamp": "1702002671",
        "creationTxHash": "0x3d88c09c51d29c317d6417468c787155c92c7935f270ffc55ae5a4de1629c335"
    },
    "pairAddress": "0x769f539486b31eF310125C44d7F405C6d470cD1f"
}
*/
