import aes from "../../../../helpers/aes";

export const GET = async (request, { params }) => {
  const address = params.address;

  if (!address) {
    return new Response.redirect("https://candlestick.io", 302);
  }

  // Usage
  var encrypted = aes.encrypt(address.toLowerCase(), "5yT4rYQjstaTGpRw");

  const urlEncoded = encodeURIComponent(encrypted.toString());

  console.log(urlEncoded);

  const url = `https://www.candlestick.io/traderscan/trading-performance/?active_in=last_1_month&WA=${urlEncoded}`;

  // return Response.redirect(url, 302);

  return new Response(JSON.stringify({ ok: true, url }), { status: 200 });
};
