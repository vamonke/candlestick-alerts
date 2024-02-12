// TODO: Use KV to store the token and fetch it from there
// TODO: Error handling
// TODO: Handle logic for sleath wallets
// TODO: Add a cron job to run this every 5 minutes
// TODO: Call telegram API for notifications

const LOGIN_URL = "https://www.candlestick.io/api/v2/user/login-email";
const STEATH_WALLETS_URL =
  "https://www.candlestick.io/api/v1/stealth-money/degen-explorer-by-stealth-money?current_page=1&page_size=100&sort_type=3&oriented=1&blockchain_id=2&exploreType=token&days=1&value_filter=200&include_noise_trades=false&fundingSource=ALL&boughtTokenLimit=true&hide_first_mins=0&activeSource=ETH";

export async function GET() {
  const loginResponse = await getAuthToken();
  const token = loginResponse.data.token;
  const steathMoney = await getStealthWallets(token);
  return Response.json({ loginResponse, steathMoney }, { status: 200 });
}

const getAuthToken = async () => {
  const data = {
    deviceId: process.env.DEVICE_ID,
    email: process.env.EMAIL,
    password: process.env.HASHED_PASSWORD,
  };
  try {
    const result = await fetch(LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return result.json();
  } catch (error) {
    console.log("Error fetching auth token", error);
    return null;
  }
};

const getStealthWallets = async (token) => {
  try {
    const result = await fetch(STEATH_WALLETS_URL, {
      headers: {
        "x-authorization": token,
        "Content-Type": "application/json",
      },
      method: "GET",
    });
    return result.json();
  } catch (error) {
    console.log("Error fetching stealth wallets", error);
    return null;
  }
};
