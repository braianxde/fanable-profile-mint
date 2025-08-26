import { ethers } from "ethers";
import ABI from "./abis/FARMING.json";
import * as Types from "./abis/index";
import { BaseContract } from "./base-contract";

export class Farming extends BaseContract {
    public contract!: Types.FARMING;

    /**
     * @setContract
     *
     * Creates contract instance with given address and provider or signer.
     * Provider is needed for read calls, signer is needed for write calls
     */
    getContract(): this {
        if (!this.address) {
            throw new Error("Please provide an address");
        }

        if (!this.provider && !this.signer) {
            throw new Error("Please provide a signer or a provider");
        }

        this.contract = new ethers.Contract(
            this.address,
            ABI,
            this.signer || this.provider
        ) as unknown as Types.FARMING;

        return this;
    }
}
