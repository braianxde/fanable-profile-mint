import { ethers } from 'ethers'

/**
 * Contract Builder
 */
export class Builder {
    protected address?: string
    protected provider?:
        | ethers.InfuraProvider
        | ethers.AlchemyProvider
        | ethers.JsonRpcProvider
    protected signer?: ethers.Signer

    /**
     * @setAddress
     *
     * @param {string} address
     *
     * @returns {this} instance
     */
    setAddress(address: string): this {
        if (!address) {
            throw new Error('Address must be string!')
        }

        this.address = address

        return this
    }

    /**
     * @setProvider
     *
     * @param {object} provider provider instance
     *
     * @returns {this} instance
     */
    setProvider(
        provider:
            | ethers.InfuraProvider
            | ethers.AlchemyProvider
            | ethers.JsonRpcProvider
    ): this {
        if (!provider) {
            throw new Error('Provider must be an instance!')
        }

        this.provider = provider

        return this
    }

    /**
     * @setSigner
     *
     * @param {object} signer ethers signer instance
     *
     * @returns {this} instance
     */
    setSigner(signer: ethers.Signer): this {
        if (!signer) {
            throw new Error('Signer must be present!')
        }

        this.signer = signer

        return this
    }
}
