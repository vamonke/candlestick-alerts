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

  const result = response.result;
  return result;
};
