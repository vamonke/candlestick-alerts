export type CandlestickTransaction = {
  time: string;
  address: string;
  buy_token_symbol: string;
  buy_token_address: string;
  txn_value: number;
};

export type Honeypot = {
  token: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
    totalHolders: number;
  };
  withToken: {
    name: string;
    symbol: string;
    decimals: number;
    address: string;
    totalHolders: number;
  };
  summary: unknown;
  simulationSuccess: boolean;
  honeypotResult: {
    isHoneypot: boolean;
  };
  simulationResult: {
    buyTax: number;
    sellTax: number;
    transferTax: number;
    buyGas: string;
    sellGas: string;
  };
  holderAnalysis: {
    holders: string;
    successful: string;
    failed: string;
    siphoned: string;
    averageTax: number;
    averageGas: number;
    highestTax: number;
    highTaxWallets: string;
    taxDistribution: {
      tax: number;
      count: number;
    }[];
    snipersFailed: number;
    snipersSuccess: number;
  };
  flags: string[];
  contractCode: {
    openSource: boolean;
    rootOpenSource: boolean;
    isProxy: boolean;
    hasProxyCalls: boolean;
  };
  chain: {
    id: string;
    name: string;
    shortName: string;
    currency: string;
  };
  router: string;
  pair: {
    pair: {
      name: string;
      address: string;
      token0: string;
      token1: string;
      type: string;
    };
    chainId: string;
    reserves0: string;
    reserves1: string;
    liquidity: number;
    router: string;
    createdAtTimestamp: string;
    creationTxHash: string;
  };
  pairAddress: string;
};

export type GoPlusTokenSecurity = {
  anti_whale_modifiable: string;
  buy_tax: string;
  can_take_back_ownership: string;
  cannot_buy: string;
  cannot_sell_all: string;
  creator_address: string;
  creator_balance: string;
  creator_percent: string;
  dex: {
    liquidity_type: string;
    name: string;
    liquidity: string;
    pair: string;
  }[];
  external_call: string;
  hidden_owner: string;
  holder_count: string;
  holders: {
    address: string;
    tag: string;
    is_contract: number;
    balance: string;
    percent: string;
    is_locked: number;
  }[];
  honeypot_with_same_creator: string;
  is_anti_whale: string;
  is_blacklisted: string;
  is_honeypot: string;
  is_in_dex: string;
  is_mintable: string;
  is_open_source: string;
  is_proxy: string;
  is_whitelisted: string;
  lp_holder_count: string;
  lp_holders: {
    address: string;
    tag: string;
    value: null;
    is_contract: number;
    balance: string;
    percent: string;
    NFT_list: null;
    is_locked: number;
  }[];
  lp_total_supply: string;
  owner_address: string;
  owner_balance: string;
  owner_change_balance: string;
  owner_percent: string;
  personal_slippage_modifiable: string;
  selfdestruct: string;
  sell_tax: string;
  slippage_modifiable: string;
  token_name: string;
  token_symbol: string;
  total_supply: string;
  trading_cooldown: string;
  transfer_pausable: string;
};
