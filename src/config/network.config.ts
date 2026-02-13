import { NetworkProvider } from "./provider.config";

export type NetworkProviders = {
    ethereum: NetworkProvider;
    base: NetworkProvider;
};

export enum NetworkTypes {
    ETHEREUM = "ethereum",
    BASE = "base",
}

export type Network = {
    providers: NetworkProviders;
};
/**
 * Network
 */
export const network: Network = {
    /**
     * Http Providers
     */
    providers: {
        /**
         * Ethereum Http Provider
         */
        ethereum: {
            /**
             * Ethereum Network Name
             */
            network:
                process.env.NEXT_PUBLIC_ETHEREUM_PROVIDER_NETWORK ||
                "homestead",
            name: "Ethereum",

            /**
             * Ethereum Network Key
             */
            key: process.env.NEXT_PUBLIC_ETHEREUM_PROVIDER_KEY || "",

            chainId: parseInt(process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID || "1"),

            chainIdHex:
                "0x" +
                parseInt(
                    process.env.NEXT_PUBLIC_ETHEREUM_CHAIN_ID || "1"
                ).toString(16),
            image: "/chains/ethereum.svg",
        },
        /**
         * Base Http Provider
         */
        base: {
            /**
             * Base Network Name
             */
            network:
                process.env.NEXT_PUBLIC_BASE_PROVIDER_NETWORK ||
                "Base Mainnet",
            name: "Base",
            key: process.env.NEXT_PUBLIC_BASE_PROVIDER_KEY || "",
            chainId: parseInt(
                process.env.NEXT_PUBLIC_BASE_CHAIN_ID || "8453"
            ),
            chainIdHex:
                "0x" +
                parseInt(
                    process.env.NEXT_PUBLIC_BASE_CHAIN_ID || "8453"
                ).toString(16),
            rpc:
                process.env.NEXT_PUBLIC_BASE_RPC_URL ||
                "https://mainnet.base.org",
            image: "/chains/base.svg",
        },
    },
};
