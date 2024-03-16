import { GoPlus, ErrorCode } from "@goplus/sdk-node";
import { sendError } from "./send";

const chainId = 1; // Ethereum

export const getTokenSecurity = async (addresses) => {
  const response = await GoPlus.tokenSecurity(chainId, addresses);

  if (response.code !== ErrorCode.SUCCESS) {
    console.error(response.message);
    sendError(response.message);
    return null;
  }

  const result = response?.result?.[addresses];
  return result;
};

/*
{
  "code": 1,
  "message": "OK",
  "result": {
    "0x2264927271f2d60b2fcd0f571728a9753b9f4cbd": {
      "anti_whale_modifiable": "0",
      "buy_tax": "0",
      "can_take_back_ownership": "0",
      "cannot_buy": "0",
      "cannot_sell_all": "0",
      "creator_address": "0xb8b4ee01abb7efee8efb5b06d3595cf8a89e70a0",
      "creator_balance": "50000000000",
      "creator_percent": "0.050000",
      "dex": [
        {
          "liquidity_type": "UniV2",
          "name": "UniswapV2",
          "liquidity": "8857.31530126",
          "pair": "0xb0f17b16960996e74ae170adcefe1ef1a9533d40"
        }
      ],
      "external_call": "1",
      "hidden_owner": "0",
      "holder_count": "199",
      "holders": [
        {
          "address": "0xb0f17b16960996e74ae170adcefe1ef1a9533d40",
          "tag": "UniswapV2",
          "is_contract": 1,
          "balance": "93129560085.61833345",
          "percent": "0.093129560085618333",
          "is_locked": 0
        },
        {
          "address": "0xb8b4ee01abb7efee8efb5b06d3595cf8a89e70a0",
          "tag": "",
          "is_contract": 0,
          "balance": "50000000000",
          "percent": "0.050000000000000000",
          "is_locked": 0
        },
        {
          "address": "0xffffab07392dbd555c8d46429fe14018ec71a5a3",
          "tag": "",
          "is_contract": 0,
          "balance": "33683512599.172501707",
          "percent": "0.033683512599172501",
          "is_locked": 0
        },
        {
          "address": "0x3da6de083581b02d47ea23b6dd41676d2744fb3d",
          "tag": "",
          "is_contract": 0,
          "balance": "25310644602.245234733",
          "percent": "0.025310644602245234",
          "is_locked": 0
        },
        {
          "address": "0x2aa8feb0091b722ab20d72559f85bb2e8a7d9e22",
          "tag": "",
          "is_contract": 0,
          "balance": "23847296860.935367737",
          "percent": "0.023847296860935367",
          "is_locked": 0
        },
        {
          "address": "0xc80684e4253d75036d968b843eb8115918ea2660",
          "tag": "",
          "is_contract": 0,
          "balance": "22044755286.079787832",
          "percent": "0.022044755286079787",
          "is_locked": 0
        },
        {
          "address": "0xdde19c73309a0ed598606c3813b7dc644f9b39e5",
          "tag": "",
          "is_contract": 0,
          "balance": "18650665968.465235266",
          "percent": "0.018650665968465235",
          "is_locked": 0
        },
        {
          "address": "0x7b8190bf6dc9571a3a12894e0a9d1da8511c34f3",
          "tag": "",
          "is_contract": 0,
          "balance": "17567783946.52655576",
          "percent": "0.017567783946526555",
          "is_locked": 0
        },
        {
          "address": "0x2740b58fed93c129cbf9594dd2c5db1efdbc4cb9",
          "tag": "",
          "is_contract": 0,
          "balance": "17129295200.712371566",
          "percent": "0.017129295200712371",
          "is_locked": 0
        },
        {
          "address": "0x67a554f1106896d11875874c42838a8cd81c8604",
          "tag": "",
          "is_contract": 0,
          "balance": "15892404859.239715332",
          "percent": "0.015892404859239715",
          "is_locked": 0
        }
      ],
      "honeypot_with_same_creator": "0",
      "is_anti_whale": "1",
      "is_blacklisted": "1",
      "is_honeypot": "0",
      "is_in_dex": "1",
      "is_mintable": "0",
      "is_open_source": "1",
      "is_proxy": "0",
      "is_whitelisted": "0",
      "lp_holder_count": "2",
      "lp_holders": [
        {
          "address": "0x000000000000000000000000000000000000dead",
          "tag": "",
          "value": null,
          "is_contract": 0,
          "balance": "23.66431913239846317",
          "percent": "0.999999999999999957",
          "NFT_list": null,
          "is_locked": 1
        },
        {
          "address": "0x0000000000000000000000000000000000000000",
          "tag": "Null Address",
          "value": null,
          "is_contract": 0,
          "balance": "0.000000000000001",
          "percent": "0.000000000000000042",
          "NFT_list": null,
          "is_locked": 1
        }
      ],
      "lp_total_supply": "23.66431913239846417",
      "owner_address": "0x000000000000000000000000000000000000dead",
      "owner_balance": "0",
      "owner_change_balance": "0",
      "owner_percent": "0.000000",
      "personal_slippage_modifiable": "0",
      "selfdestruct": "0",
      "sell_tax": "0",
      "slippage_modifiable": "0",
      "token_name": "Troe Coin",
      "token_symbol": "TROE",
      "total_supply": "1000000000000",
      "trading_cooldown": "0",
      "transfer_pausable": "0"
    }
  }
}
*/
