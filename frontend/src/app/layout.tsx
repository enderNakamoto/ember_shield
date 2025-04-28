import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";
import localFont from "next/font/local";
import { headers } from "next/headers";
import ContextProvider from "@/context";

export const metadata: Metadata = {
  title: "Ember Shield",
  description: "Insurance against Wild Fire Everywhere",
};

const quicksand = localFont({
  src: "../../public/fonts/Quicksand/Quicksand-VariableFont_wght.ttf",
  variable: "--font-quicksand",
  display: "swap",
});

const roboto = localFont({
  src: "../../public/fonts/Roboto/Roboto-VariableFont_wdth,wght.ttf",
  variable: "--font-roboto",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersData = await headers();
  const cookies = headersData.get("cookie");
  return (
    <html lang="en">
      <body className={`antialiased ${quicksand.variable} ${roboto.variable}`}>
        <Providers>
          <ContextProvider cookies={cookies}>{children}</ContextProvider>
        </Providers>
      </body>
    </html>
  );
}
