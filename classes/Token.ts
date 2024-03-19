import { getContractCreation, getTokenName } from "@/helpers/contract";
import { formatOwnership, getTokenSecurity } from "@/helpers/goplus";
import { checkHoneypot } from "@/helpers/honeypot";
import {
  formatHoneypot,
  formatTaxString,
  getRelativeDate,
} from "@/helpers/parse";
import { GoPlusTokenSecurity, Honeypot } from "./types";
import { supabaseClient } from "@/helpers/supabase";
import { sendError } from "@/helpers/send";

class Token {
  public address: string;
  public symbol: string;

  private creationDate: Date;
  private name: string;
  private honeypot: Honeypot;
  private tokenSecurity: GoPlusTokenSecurity;

  constructor({
    symbol,
    name,
    address,
    creationDate,
  }: {
    address: string;
    symbol: string;
    name?: string;
    creationDate?: Date;
  }) {
    this.symbol = symbol;
    this.name = name;
    this.address = address;
    this.creationDate = creationDate;
  }

  getSymbol(): string {
    return this.symbol;
  }

  async getCreationDate(): Promise<Date | null> {
    if (this.creationDate) {
      return this.creationDate;
    } else {
      return this._fetchCreationDate();
    }
  }

  async _fetchCreationDate(): Promise<Date> {
    const timestamp = await getContractCreation(this.address);
    if (!timestamp) return null;
    this.creationDate = timestamp;
    return this.creationDate;
  }

  async getName(): Promise<string> {
    if (this.name) {
      return this.name;
    } else {
      return this._fetchName();
    }
  }

  async _fetchName(): Promise<string> {
    const name = await getTokenName(this.address);
    if (!name || typeof name !== "string") return null;
    this.name = name;
    return this.name;
  }

  async getHoneypot(): Promise<Honeypot> {
    if (this.honeypot) {
      return this.honeypot;
    } else {
      return this._fetchHoneypot();
    }
  }

  async _fetchHoneypot(): Promise<Honeypot> {
    const honeypot = await checkHoneypot(this.address);
    this.honeypot = honeypot;
    return this.honeypot;
  }

  async getTokenSecurity() {
    if (this.tokenSecurity) {
      return this.tokenSecurity;
    } else {
      return this._fetchTokenSecurity();
    }
  }

  async _fetchTokenSecurity() {
    const tokenSecurity = await getTokenSecurity(this.address);
    this.tokenSecurity = tokenSecurity;
    return this.tokenSecurity;
  }

  async craftTokenString(): Promise<string> {
    const tokenName = await this.getName();
    const tokenSymbol = this.symbol.toUpperCase();
    const tokenString = `Token: <b>${tokenName} ($${tokenSymbol})</b>`;

    const caString = `CA: <code>${this.address}</code>`;

    const creationDate = await this.getCreationDate();
    const ageString = `Token age: ${getRelativeDate(creationDate)}`;

    const honeypot = await this.getHoneypot();
    const honeypotString = formatHoneypot(honeypot, this.address);
    const taxString = formatTaxString(honeypot);

    const tokenSecurity = await this.getTokenSecurity();
    const ownershipString = formatOwnership(tokenSecurity, this.address);

    const message = [
      tokenString,
      caString,
      ageString,
      honeypotString,
      ownershipString,
      taxString,
    ]
      .filter(Boolean)
      .join("\n");

    return message;
  }

  async save(): Promise<void> {
    const token = {
      address: this.address,
      symbol: this.symbol,
      name: this.name,
      creation_date: this.creationDate,
    };
    const { error } = await supabaseClient.from("tokens").upsert(token);
    if (error) {
      sendError({ message: "Error saving token", error });
    } else {
      console.log("✅ Saved token", this.address);
    }
  }
}

export default Token;
