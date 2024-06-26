import "@radix-ui/themes/styles.css";
import "@/styles/global.css";
import "@/styles/theme.css";

import { Theme } from "@radix-ui/themes";
import { DM_Sans } from "next/font/google";

export const metadata = {
  title: "Candlestick Alerts",
  description: "Generated by Next.js",
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>
        <Theme>{children}</Theme>
      </body>
    </html>
  );
}
