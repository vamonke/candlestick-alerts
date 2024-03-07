import { permanentRedirect } from "next/navigation";
import { getCandleStickUrl } from "../../../helpers/candlestick";

export default async function Page({ params }) {
  const address = params.address;
  const url = await getCandleStickUrl(address);
  if (url) permanentRedirect(url);
  return (
    <div>
      <style>{`
        body {
          background: #0e002e;
          color: #fff;
          text-align: center;
          font-size: 24px;
          padding: 36px;
          font-family: system-ui;
          font-weight: 200;
        }
        a {
          color: #00c838;
          text-decoration: none;
        }
        .gray {
          font-size: 18px;
          margin-top: 24px;
          color: #8a8a98;
        }
      `}</style>
      <div>
        Go to <a href="https://candlestick.io">candlestick.io</a>...
      </div>
      <div className="gray">
        Wallet Address:
        <br />
        {address}
      </div>
    </div>
  );
}
