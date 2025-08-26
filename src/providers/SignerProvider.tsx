import { getSigner } from "@dynamic-labs/ethers-v6";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { ethers } from "ethers";
import React, { createContext, useContext, useEffect, useState } from "react";

interface SignerContextProps {
    signer: ethers.Signer | null;
}

interface SignerProviderProps {
    children: React.ReactNode;
}

const SignerContext = createContext<SignerContextProps>({
    signer: null,
});

export const useSignerContext = () => useContext(SignerContext);

export const SignerProvider: React.FC<SignerProviderProps> = ({ children }) => {
    const { primaryWallet } = useDynamicContext();
    const [signer, setSigner] = useState<ethers.Signer | null>(null);

    useEffect(() => {
        const initializeSigner = async () => {
            if (!primaryWallet) return;
            try {
                const signer = await getSigner(primaryWallet);
                setSigner(signer || null);
            } catch (error) {
                console.error(error);
            }
        };
        if (primaryWallet) {
            setTimeout(() => {
                initializeSigner();
            }, 1000);
        }
    }, [primaryWallet]);

    return (
        <SignerContext.Provider value={{ signer }}>
            {children}
        </SignerContext.Provider>
    );
};
