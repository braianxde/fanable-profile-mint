import { withTryCatch } from "@/utils/error.utils";
import { useCallback } from "react";

export const useWithTryCatch = <T, A extends unknown[]>(
    fn: (...args: A) => Promise<T>,
    setIsLoading?: (value: boolean) => void
) => {
    return useCallback(
        (...args: A) => withTryCatch(fn, setIsLoading)(...args),
        [fn, setIsLoading]
    );
};
