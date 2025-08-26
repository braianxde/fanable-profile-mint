import { useCallback, useState } from "react";
import { Erc721 } from "../../contracts/erc721";
import { useSignerContext } from "../../providers/SignerProvider";
import { useProvider } from "./useProvider";
import { NetworkTypes } from "@/config/network.config";
import { useWithTryCatch } from "../use-with-try-catch";
import { handleErc721ErrorWithBurnCheck, Erc721ErrorResult } from "../../utils/erc721-error-handler";

interface UseErc721Props {
    address?: string | null | undefined;
    network?: NetworkTypes | null | undefined;
}

interface UseErc721Return {
    approve: (to: string, tokenId: bigint) => Promise<Erc721ErrorResult | void>;
    getApproved: (tokenId: bigint) => Promise<Erc721ErrorResult | string>;
    setApprovalForAll: (operator: string, approved: boolean) => Promise<Erc721ErrorResult | void>;
    isApprovedForAll: (owner: string, operator: string) => Promise<Erc721ErrorResult | boolean>;
    balanceOf: (owner: string) => Promise<Erc721ErrorResult | bigint>;
    ownerOf: (tokenId: bigint) => Promise<Erc721ErrorResult | string>;
    safeTransferFrom: (from: string, to: string, tokenId: bigint) => Promise<Erc721ErrorResult | void>;
    transferFrom: (from: string, to: string, tokenId: bigint) => Promise<Erc721ErrorResult | void>;
    mint: (account: string, amount: bigint) => Promise<Erc721ErrorResult | bigint>;
    totalSupply: () => Promise<Erc721ErrorResult | bigint>;
    tokenURI: (tokenId: bigint) => Promise<Erc721ErrorResult | string>;
    name: () => Promise<Erc721ErrorResult | string>;
    symbol: () => Promise<Erc721ErrorResult | string>;
    isLoading: boolean;
    txId: string | null;
}

/**
 * useErc721 hook
 * @param {string} address - The address of the ERC721 contract
 * @param {NetworkTypes} network - The network type
 * @returns {UseErc721Return} - The object containing ERC721 contract functions
 */
export const useErc721 = ({
    address,
    network,
}: UseErc721Props = {}): UseErc721Return => {
    const { signer } = useSignerContext();

    const provider = useProvider(network);

    const [isLoading, setIsLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);

    const getContract = useCallback(
        (needSigner: boolean): Erc721 => {
            if (!address) {
                throw new Error(
                    "ERC721 - Contract address is needed to make the transaction"
                );
            }

            if (!provider) {
                throw new Error(
                    "ERC721 - Provider is needed to make the transaction"
                );
            }

            if (needSigner && signer) {
                return new Erc721()
                    .setAddress(address)
                    .setSigner(signer)
                    .setProvider(provider)
                    .getContract();
            } else if (needSigner) {
                throw new Error(
                    "ERC721 - Signer is needed to make the transaction"
                );
            }

            return new Erc721()
                .setAddress(address)
                .setProvider(provider)
                .getContract();
        },
        [signer, address, provider]
    );

    const approve = useWithTryCatch(
        useCallback(
            async (to: string, tokenId: bigint): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract.approve(
                    to,
                    tokenId
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const getApproved = useWithTryCatch(
        useCallback(
            async (tokenId: bigint): Promise<Erc721ErrorResult | string> => {
                try {
                    const instance = getContract(false);
                    const approved = await instance.contract.getApproved(tokenId);
                    return approved;
                } catch (error: any) {
                    const instance = getContract(false);
                    return await handleErc721ErrorWithBurnCheck(
                        error, 
                        'getApproved', 
                        instance.contract, 
                        tokenId.toString()
                    );
                }
            },
            [getContract]
        )
    );

    const setApprovalForAll = useWithTryCatch(
        useCallback(
            async (operator: string, approved: boolean): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract.setApprovalForAll(
                    operator,
                    approved
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const isApprovedForAll = useWithTryCatch(
        useCallback(
            async (owner: string, operator: string): Promise<boolean> => {
                const instance = getContract(false);

                const approved = await instance.contract.isApprovedForAll(owner, operator);

                return approved;
            },
            [getContract]
        )
    );

    const balanceOf = useWithTryCatch(
        useCallback(
            async (owner: string): Promise<bigint> => {
                const instance = getContract(false);
                const value = await instance.contract.balanceOf(owner);

                return value;
            },
            [getContract]
        )
    );

    const ownerOf = useWithTryCatch(
        useCallback(async (tokenId: bigint): Promise<Erc721ErrorResult | string> => {
            try {
                const instance = getContract(false);
                const owner = await instance.contract.ownerOf(tokenId);
                return owner;
            } catch (error: any) {
                const instance = getContract(false);
                return await handleErc721ErrorWithBurnCheck(
                    error, 
                    'ownerOf', 
                    instance.contract, 
                    tokenId.toString()
                );
            }
        }, [getContract])
    );

    const safeTransferFrom = useWithTryCatch(
        useCallback(
            async (from: string, to: string, tokenId: bigint): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract["safeTransferFrom(address,address,uint256)"](
                    from,
                    to,
                    tokenId
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const transferFrom = useWithTryCatch(
        useCallback(
            async (from: string, to: string, tokenId: bigint): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract.transferFrom(
                    from,
                    to,
                    tokenId
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const mint = useWithTryCatch(
        useCallback(
            async (account: string, amount: bigint): Promise<bigint> => {
                const instance = getContract(true);

                const transaction = await instance.contract.mint(account, amount);
                setTxId(transaction.hash);
                const receipt = await transaction.wait();
                
                // The mint function returns the tokenId directly from the contract call
                // We need to call the contract function with staticCall to get the return value
                const tokenId = await instance.contract.mint.staticCall(account, amount);
                return tokenId;
            },
            [getContract]
        )
    );

    const totalSupply = useWithTryCatch(
        useCallback(async (): Promise<bigint> => {
            const instance = getContract(false);

            const supply = await instance.contract.totalSupply();

            return supply;
        }, [getContract])
    );

    const tokenURI = useWithTryCatch(
        useCallback(async (tokenId: bigint): Promise<string> => {
            const instance = getContract(false);

            const uri = await instance.contract.tokenURI(tokenId);

            return uri;
        }, [getContract])
    );

    const name = useWithTryCatch(
        useCallback(async (): Promise<string> => {
            const instance = getContract(false);

            const contractName = await instance.contract.name();

            return contractName;
        }, [getContract])
    );

    const symbol = useWithTryCatch(
        useCallback(async (): Promise<string> => {
            const instance = getContract(false);

            const contractSymbol = await instance.contract.symbol();

            return contractSymbol;
        }, [getContract])
    );



    return {
        approve,
        getApproved,
        setApprovalForAll,
        isApprovedForAll,
        balanceOf,
        ownerOf,
        safeTransferFrom,
        transferFrom,
        mint,
        totalSupply,
        tokenURI,
        name,
        symbol,
        isLoading,
        txId
    };
};
