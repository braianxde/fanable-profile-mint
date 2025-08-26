import { useCallback, useState } from "react";
import { Erc20 } from "../../contracts/erc20";
import { useSignerContext } from "../../providers/SignerProvider";
import { useProvider } from "./useProvider";
import { TokenInfo } from "@/config/tokens.config";
import { NetworkTypes } from "@/config/network.config";
import { useWithTryCatch } from "../use-with-try-catch";

interface UseErc20Props {
    tokenInfo?: TokenInfo | null | undefined;
    network?: NetworkTypes | null | undefined;
}

interface UseErc20Return {
    checkAndApprove: (
        owner: string,
        spender: string,
        amount: bigint
    ) => Promise<boolean>;
    balanceOf: (owner: string) => Promise<bigint>;
    decimals: () => Promise<number>;
    transfer: (to: string, amountInWei: bigint) => Promise<void>;
    isLoading: boolean;
    txId: string | null;
}

/**
 * useErc20 hook
 * @param {TokenType} type - The type of the token
 * @param {NetworkTypes} network - The network type
 * @returns {UseErc20Return} - The object containing checkAndApprove, balanceOf and decimals functions
 */
export const useErc20 = ({
    tokenInfo,
    network,
}: UseErc20Props = {}): UseErc20Return => {
    const { signer } = useSignerContext();

    const provider = useProvider(network);

    const [isLoading, setIsLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);

    const getContract = useCallback(
        (needSigner: boolean): Erc20 => {
            if (!tokenInfo) {
                throw new Error(
                    "ERC20 - Token info is needed to make the transaction"
                );
            }

            if (!provider) {
                throw new Error(
                    "ERC20 - Provider is needed to make the transaction"
                );
            }

            if (needSigner && signer) {
                return new Erc20()
                    .setAddress(tokenInfo.address)
                    .setSigner(signer)
                    .setProvider(provider)
                    .getContract();
            } else if (needSigner) {
                throw new Error(
                    "ERC20 - Signer is needed to make the transaction"
                );
            }

            return new Erc20()
                .setAddress(tokenInfo.address)
                .setProvider(provider)
                .getContract();
        },
        [signer, tokenInfo, provider]
    );

    const transfer = useWithTryCatch(
        useCallback(
            async (to: string, amountInWei: bigint): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract.transfer(
                    to,
                    amountInWei
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const approve = useWithTryCatch(
        useCallback(
            async (address: string, amountInWei: bigint): Promise<void> => {
                const instance = getContract(true);

                const transaction = await instance.contract.approve(
                    address,
                    amountInWei
                );
                setTxId(transaction.hash);
                await transaction.wait();
            },
            [getContract]
        )
    );

    const allowance = useWithTryCatch(
        useCallback(
            async (owner: string, spender: string): Promise<bigint> => {
                const instance = getContract(false);

                const value = await instance.contract.allowance(owner, spender);

                return value;
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

    const decimals = useWithTryCatch(
        useCallback(async (): Promise<number> => {
            const instance = getContract(false);

            const value = await instance.contract.decimals();

            return Number(value.toString());
        }, [getContract])
    );

    const checkAndApprove = useWithTryCatch(
        useCallback(
            async (
                owner: string,
                spender: string,
                amountInWei: bigint
            ): Promise<boolean> => {
                setIsLoading(true);
                const currentAllowance = await allowance(owner, spender);

                if (currentAllowance < amountInWei) {
                    await approve(spender, amountInWei);
                    const newAllowance = await allowance(owner, spender);

                    if (newAllowance >= amountInWei) {
                        return true;
                    } else {
                        throw new Error(
                            "The value approved is not sufficient for the loan amount"
                        );
                    }
                }

                return true;
            },
            [allowance, approve]
        ),
        setIsLoading
    );

    return { checkAndApprove, balanceOf, decimals, isLoading, txId, transfer };
};
