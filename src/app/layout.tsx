"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { DynamicContextProvider, SortWallets } from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SignerProvider } from "@/providers/SignerProvider";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DynamicContextProvider
                theme={"light"}
                settings={{
                    environmentId:
                        process.env.NEXT_PUBLIC_DYNAMIC_PROJECT_ID || "",
                    walletConnectors: [EthereumWalletConnectors],
                    walletsFilter: SortWallets([
                        "metamask",
                        "coinbase",
                        "walletconnect",
                    ]),
                    defaultNumberOfWalletsToShow: 3,
                }}
            >
          <SignerProvider>{children}</SignerProvider>
        </DynamicContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
