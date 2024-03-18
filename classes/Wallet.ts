class Wallet {
  address: string;

  constructor({ address }: { address: string }) {
    this.address = address;
  }
}

export default Wallet;
