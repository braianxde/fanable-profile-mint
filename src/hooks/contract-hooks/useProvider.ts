
import { NetworkTypes } from "@/config/network.config";
import { Provider } from "@/config/provider.config";
import { ethers } from "ethers";
import { useMemo } from "react";

export const useProvider = (
    network: NetworkTypes | null | undefined
):
    | ethers.InfuraProvider
    | ethers.AlchemyProvider
    | ethers.JsonRpcProvider
    | null => {
    return useMemo(():
        | ethers.InfuraProvider
        | ethers.AlchemyProvider
        | ethers.JsonRpcProvider
        | null => {
        if (!network) {
            return null;
        }

        return Provider.get(network);
    }, [network]);
};
