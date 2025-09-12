"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { DynamicEmbeddedWidget, DynamicWidget } from "@dynamic-labs/sdk-react-core"
import { NetworkTypes } from "@/config/network.config"
import { Erc721Interface } from "@/components/erc721/erc721-interface"
import { TransactionHistory } from "@/components/erc721/transaction-history"
import { ContractConfig } from "@/components/erc721/contract-config"
import { EbayPurchaseHistory } from "@/components/ebay/ebay-purchase-history"

interface Transaction {
  id: string
  type: "mint" | "transfer" | "approve" | "ownerOf" | "getApproved"
  timestamp: number
  contractAddress: string
  parameters: any[]
  status: "pending" | "success" | "failed"
  hash?: string
  result?: string
  errorMessage?: string
}

export default function Web3ERC721Interface() {
  const [contractAddress, setContractAddress] = useState("0x239993F94E2C20dD8568a40b6D45Df5c3375cf02")
  const [transactions, setTransactions] = useState<Transaction[]>([])

  // Epic Chain network configuration
  const epicChainNetwork = {
    chainId: "0xB7", // 183 in hex
    chainName: "Epic Chain",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.ethernitychain.io/"],
    blockExplorerUrls: ["https://explorer.epicchain.io"],
    requiredMintWallet: "0xB9d5c93ec9abA93180ddD00a628e8FAcc3103039",
    fanableProfilesWallet: "0xa63cce06Adc521ef91a2DB2153dD75d336Cd0004"
  }

  useEffect(() => {
    loadTransactionsFromStorage()
  }, [])

  // localStorage utilities for transactions
  const saveTransactionsToStorage = (transactions: Transaction[]) => {
    try {
      if (transactions.length > 0) {
        localStorage.setItem("erc721_transactions", JSON.stringify(transactions))
      }
    } catch (error) {
      console.error("Error saving transactions to localStorage:", error)
    }
  }

  const loadTransactionsFromStorage = () => {
    try {
      const stored = localStorage.getItem("erc721_transactions")
      if (stored) {
        const parsedTransactions = JSON.parse(stored)
        if (Array.isArray(parsedTransactions)) {
          setTransactions(parsedTransactions)
        }
      }
    } catch (error) {
      console.error("Error loading transactions from localStorage:", error)
      setTransactions([])
    }
  }

  const addTransaction = (transaction: Omit<Transaction, "id" | "timestamp">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      timestamp: Date.now()
    }
    const updatedTransactions = [newTransaction, ...transactions]
    setTransactions(updatedTransactions)
    saveTransactionsToStorage(updatedTransactions)
    return newTransaction.id
  }

  const clearTransactionHistory = () => {
    setTransactions([])
    localStorage.removeItem("erc721_transactions")
    toast.success("Transaction history cleared")
  }

  const handleTransactionComplete = (type: string, result: string) => {
    addTransaction({
      type: type as any,
      contractAddress,
      parameters: [],
      status: "success",
      result: result
    })
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="h-full max-w-none space-y-3">
        <div className="flex flex-col gap-4 items-end">
          <EbayPurchaseHistory />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Contract Configuration */}
          <ContractConfig
            contractAddress={contractAddress}
            onContractAddressChange={setContractAddress}
            networkName={epicChainNetwork.chainName}
          />

          {/* Wallet Info */}
          <div className="h-fit flex items-start justify-start w-full">
            <div className="text-center">
              <DynamicWidget variant='dropdown' />
            </div>
          </div>
        </div>

        {contractAddress && (
          <Erc721Interface
            contractAddress={contractAddress}
            network={NetworkTypes.EPICCHAIN}
            onTransactionComplete={handleTransactionComplete}
          />
        )}

        {/* Transaction History */}
        <TransactionHistory
          transactions={transactions}
          onClearHistory={clearTransactionHistory}
          explorerUrl={epicChainNetwork.blockExplorerUrls[0]}
        />
      </div>
    </div>
  )
}
