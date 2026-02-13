import { ethers } from "ethers";
import { network as networkConfig, NetworkTypes } from "./network.config";

export type NetworkProvider = {
    network: string;
    key: string;
    chainId: number;
    chainIdHex: string;
    name: string;
    rpc?: string;
    image: string;
};

/**
 * Network Provider
 */
export class Provider {
    private static provider: Partial<{
        [key in NetworkTypes]:
            | ethers.InfuraProvider
            | ethers.AlchemyProvider
            | ethers.JsonRpcProvider;
    }> = {};

    /**
     * @param {NetworkTypes} network
     *
     * @returns Network provider url
     */
    private static getProvider(network: NetworkTypes): NetworkProvider {
        if (network === NetworkTypes.BASE) {
            return networkConfig.providers.base;
        } else {
            return networkConfig.providers.ethereum;
        }
    }

    /**
     * Set Provider
     *
     * @param {NetworkTypes} network
     */
    private static async set(network: NetworkTypes) {
        const provider = Provider.getProvider(network);

        if (network === NetworkTypes.BASE) {
            Provider.provider[network] = new ethers.JsonRpcProvider(
                provider.rpc
            );
        } else {
            Provider.provider[network] = new ethers.InfuraProvider(
                provider.network,
                provider.key
            );
        }
    }

    /**
     * Get Provider
     *
     * @param {NetworkTypes} network
     *
     * @returns Json Rpc Provider
     */
    public static get(
        network: NetworkTypes
    ): ethers.InfuraProvider | ethers.AlchemyProvider | ethers.JsonRpcProvider {
        if (!Provider.provider[network]) {
            Provider.set(network);
        }

        return Provider.provider[network]!;
    }
}
