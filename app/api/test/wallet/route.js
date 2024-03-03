import CryptoJS from "crypto-js";

export async function GET(req) {
  const searchParams = req.nextUrl.searchParams;
  const walletAddress = searchParams.get("walletAddress");
  console.log("walletAddress:", walletAddress);

  const portfolioAESKey = await fetchPortfolioAESKey();
  const hashedWalletAddress = hash(walletAddress, portfolioAESKey);
  const WA = simpleHash(walletAddress.toLowerCase(), portfolioAESKey);

  console.log("hashedWalletAddress:", hashedWalletAddress);
  console.log("WA:", WA);

  return new Response(
    JSON.stringify({
      walletAddress,
      hashedWalletAddress,
      WA,
    })
  );
}

const hash = (walletAddress, portfolioAESKey) => {
  const key = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  var iv = CryptoJS.enc.Utf8.parse(portfolioAESKey);
  return CryptoJS.AES.encrypt(walletAddress, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const simpleHash = (walletAddress, portfolioAESKey) => {
  return CryptoJS.AES.encrypt(walletAddress, portfolioAESKey).toString();
};

async function fetchPortfolioAESKey() {
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

// 5yT4rYQjstaTGpRw
// 0x939137aa45a1f569cb7222910ac4a3d12aa0cb41
// F4xjxI9h8FA+vlmpDGCCPI3xtM3W4sRyaLGWXKqyjwMxWdTivqhukmHAMhWMUIlk

/*

JV = (e,t)=>WV.encrypt(e, portfolioAESKey).toString()
Q4e = (e,t)=>WV.decrypt(e, portfolioAESKey).toString(E4e)

encrypt: (s,f,h)=>???

0x1d2a9df4e0d5f0493daeda94f589f00697c40f9d
Code:  U2FsdGVkX18o/UF+uuim7vCW32HRI3ZN3GNPfCRLWZYYWsNtiZ862tvhexk1wLIm4uv9v2r5X2ojDIUevOpW8Q==
n.WA = U2FsdGVkX1+JwEtQwZU7DyzLHy1cNfQpmSR6LohtldPlT5AMc1N6mj612ARr7VaXVzFE1OF0tIQ5AgvmvrCDlQ==
Works: U2FsdGVkX19DuWvwKdpJPNPG%2BKGt8Nd04KEGzvB/q3hp%2BxkjvyelB7mkM82i9c2L%2Buec1iCwa4qtgUSqcr2srw==

WV.encrypt("0x1d2a9df4e0d5f0493daeda94f589f00697c40f9d", "5yT4rYQjstaTGpRw").toString()

Wallet URL changes every second. It's too difficult to derive URL from javascript source code.

*/
