class Token {
  private symbol: string;
  private name: string;
  private address: string;
  private createdAt: Date;
  private transactions: object[];

  constructor({
    symbol,
    name,
    address,
    createdAt,
  }: {
    address: string;
    symbol?: string;
    name?: string;
    createdAt?: Date;
  }) {
    this.symbol = symbol;
    this.name = name;
    this.address = address;
    this.createdAt = createdAt;
  }

  getSymbol(): string {
    return this.symbol;
  }

  getName(): string {
    return this.name;
  }

  getAddress(): string {
    return this.address;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getTransactions(): object[] {
    return this.transactions;
  }
}

// Usage example
const token = new Token({
  symbol: "ETH",
  name: "Ethereum",
  address: "0x1234567890abcdef",
});
console.log(token.getSymbol()); // Output: ETH
console.log(token.getName()); // Output: Ethereum
