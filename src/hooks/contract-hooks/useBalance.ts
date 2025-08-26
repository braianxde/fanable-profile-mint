
import { formatUnits } from "ethers";
import { useEffect, useState } from "react";
import { useErc20 } from "./useERC20";
import { TokenInfo } from "@/config/tokens.config";
import { NetworkTypes } from "@/config/network.config";

export interface UseBalanceReturn {
    balance: number;
    balanceWithTwoDecimals: number;
    isLoading: boolean;
}

export const useBalance = (
    tokenInfo: TokenInfo | null | undefined,
    address: string | null | undefined,
    network: NetworkTypes | null | undefined,
    timeout = 30000
): UseBalanceReturn => {
    const [balance, setBalance] = useState(0);
    const [balanceWithTwoDecimals, setBalanceWithTwoDecimals] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const { balanceOf } = useErc20({
        tokenInfo,
        network,
    });

    const [times, setTimes] = useState(0);

    // Fetch Balance
    useEffect(() => {
        const fetchData = async () => {
            if (address && tokenInfo != undefined) {
                if (times === 0) setIsLoading(true);

                const BN = await balanceOf(address);

                // Ensure BN is a valid BigNumber before formatting
                if (BN) {
                    const formattedBalance = formatUnits(BN, 18);
                    const fixedBalance =
                        parseFloat(formattedBalance).toFixed(2);

                    setBalance(parseFloat(fixedBalance));
                    setBalanceWithTwoDecimals(parseFloat(fixedBalance));
                    if (times === 0) setIsLoading(false);
                }
            }
        };

        fetchData();
        const timer = setTimeout(() => setTimes(times + 1), timeout);

        return () => clearTimeout(timer);
    }, [address, tokenInfo, times, timeout, balanceOf]);

    return { balance, balanceWithTwoDecimals, isLoading };
};
