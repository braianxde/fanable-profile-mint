export const serializeError = (error: { message: string }) => {
    console.log(error);
    if (typeof error !== "object" || error === null || !("message" in error)) {
        return "Something went wrong, please try again.";
    }

    let message = "Something went wrong, please try again.";

    if (
        error.message.includes("ethers-user-denied") ||
        error.message.includes("user rejected action") ||
        error.message.includes("User denied the transaction") ||
        error.message.includes("User rejected the request")
    ) {
        message = "The user declined the transaction.";
    } else if (error.message.includes("1155 NFT transfer")) {
        message =
            "The transaction was declined; therefore, the contract doesn`t have permission to manage your NFT.";
    } else if (error.message.includes("value approved is not sufficient")) {
        message = "The value approved is not sufficient for the loan amount";
    } else if (error.message.includes("insufficient allowance")) {
        message =
            "The contract doesn't have enough allowance to manage the lender's ERC20 tokens.";
    } else if (error.message.includes("expire")) {
        message = "Offer expired";
    } else if (error.message.includes("insufficient allowance")) {
        message =
            "The contract doesn`t have enough allowance to manage the lender`s ERC20 tokens.";
    }

    return message;
};

export const withTryCatch = <T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>,
    setIsLoading?: (value: boolean) => void
): ((...args: A) => Promise<T>) => {
    return async (...args: A): Promise<T> => {
        try {
            setIsLoading?.(true);

            const result = await fn(...args);

            return result;
        } catch (error: unknown) {
            console.warn(error);

            const message = serializeError(error as { message: string });
            throw new Error(message);
        } finally {
            setIsLoading?.(false);
        }
    };
};
