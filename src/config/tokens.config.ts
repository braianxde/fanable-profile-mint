import { NetworkTypes } from "./network.config";

export type TokenInfo = {
    id: number;
    name: string;
    symbol: string;
    address: string;
    image: string;
    native?: boolean;
    decimals: number;
    walletAddressToTransferWeb2?: string;
};

export enum TokenType {
    EPIC = "EPIC",
}

export type Tokens = {
    [network in NetworkTypes]: {
        [key in TokenType]: TokenInfo;
    };
};

/**
 * Project Token Addresses
 */
const tokens: Tokens = {
    [NetworkTypes.ETHEREUM]: {
        /**
         * EPIC Token
         */
        [TokenType.EPIC]: {
            id: 1,
            name: process.env.NEXT_PUBLIC_EPIC_TOKEN_NAME_ETHEREUM || "EPIC",
            symbol:
                process.env.NEXT_PUBLIC_EPIC_TOKEN_SYMBOL_ETHEREUM || "EPIC",
            address:
                process.env.NEXT_PUBLIC_EPIC_TOKEN_ADDRESS_ETHEREUM ||
                "0x94314a14df63779c99c0764a30e0cd22fa78fc0e",
            image: "/tokens/epic.png",
            decimals: 18,
            walletAddressToTransferWeb2:
                process.env.NEXT_PUBLIC_EPIC_WALLET_ADDRESS || "",
        },
    },
    [NetworkTypes.EPICCHAIN]: {
        /**
         * ERN Token
         */
        [TokenType.EPIC]: {
            id: 2,
            name: process.env.NEXT_PUBLIC_EPIC_TOKEN_NAME_EPICCHAIN || "EPIC",
            symbol:
                process.env.NEXT_PUBLIC_EPIC_TOKEN_SYMBOL_EPICCHAIN || "EPIC",
            address: process.env.NEXT_PUBLIC_EPIC_TOKEN_ADDRESS_EPICCHAIN || "",
            image: "/tokens/epic.png",
            decimals: 18,
        },
    },
};

export default tokens;
