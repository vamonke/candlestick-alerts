import CryptoJS from "crypto-js";

export const hash = (walletAddress, portfolioAESKey) => {
  const key = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  var iv = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  return CryptoJS.AES.encrypt(walletAddress, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

export async function fetchPortfolioAESKey() {
  try {
    // Fetch the HTML content
    const response = await fetch("https://www.candlestick.io", {
      headers: {
        Accept: "text/html",
      },
    });
    const htmlContent = await response.text();

    // console.log("HTML content:\n" + htmlContent);

    // Regular expression to match the portfolioAESKey
    var regex = /portfolioAESKey:"([^"]+)"/;

    // Executing the regex on the htmlText
    var matches = regex.exec(htmlContent);

    // Extracting the portfolioAESKey value
    if (matches && matches.length > 1) {
      var portfolioAESKey = matches[1];
      console.log("PortfolioAESKey:", portfolioAESKey);
      return portfolioAESKey;
    } else {
      console.log("PortfolioAESKey not found");
    }
  } catch (error) {
    console.error("Error fetching the HTML:", error);
  }
}
