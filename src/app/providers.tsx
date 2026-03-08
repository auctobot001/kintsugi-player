"use client";
import { type ReactNode } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: "Kintsugi Player" }),
  ],
  transports: {
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

function OnchainProviders({ children }: { children: ReactNode }) {
  try {
    const { OnchainKitProvider } = require("@coinbase/onchainkit");
    const { MiniKitProvider } = require("@coinbase/onchainkit/minikit");
    return (
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || ""}
        chain={base}
      >
        <MiniKitProvider>
          {children}
        </MiniKitProvider>
      </OnchainKitProvider>
    );
  } catch {
    return <>{children}</>;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainProviders>
          {children}
        </OnchainProviders>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
