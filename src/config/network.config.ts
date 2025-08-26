import { NetworkProvider } from "./provider.config";

export type NetworkProviders = {
    ethereum: NetworkProvider;
    epicchain: NetworkProvider;
};

export enum NetworkTypes {
    ETHEREUM = "ethereum",
    EPICCHAIN = "epicchain",
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
         * Ethernity Http Provider
         */
        epicchain: {
            /**
             * Epicchain Network Name
             */
            network:
                process.env.NEXT_PUBLIC_EPICCHAIN_PROVIDER_NETWORK ||
                "Epicchain Mainnet",
            name: "Epicchain",
            key: process.env.NEXT_PUBLIC_EPICCHAIN_PROVIDER_KEY || "ernscan",
            chainId: parseInt(
                process.env.NEXT_PUBLIC_EPICCHAIN_CHAIN_ID || "183"
            ),
            chainIdHex:
                "0x" +
                parseInt(
                    process.env.NEXT_PUBLIC_EPICCHAIN_CHAIN_ID || "183"
                ).toString(16),
            rpc:
                process.env.NEXT_PUBLIC_EPICCHAIN_RPC_URL ||
                "https://mainnet.ethernitychain.io",
            image: "/chains/ethernity.svg",
        },
    },
};
