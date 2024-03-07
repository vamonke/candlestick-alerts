import { getCandleStickUrl } from "../../../../helpers/candlestick";

export const GET = async (request, { params }) => {
  const address = params.address;

  if (!address) {
    return new Response.redirect("https://candlestick.io", 302);
  }

  const url = await getCandleStickUrl(address);
  if (!url) {
    return new Response.redirect("https://candlestick.io", 302);
  }

  return Response.redirect(url, 302);
  // return new Response({ url }, { status: 200 });
};
