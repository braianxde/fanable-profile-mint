"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

import { toast } from "sonner"
import { Wallet, Copy, RefreshCw, History, Clock, CheckCircle, XCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

declare global {
  interface Window {
    ethereum?: any
  }
}

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
  const [account, setAccount] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [contractAddress, setContractAddress] = useState("0x239993F94E2C20dD8568a40b6D45Df5c3375cf02")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const [tokenIdMint, setTokenIdMint] = useState("")
  const [tokenIdTransfer, setTokenIdTransfer] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [toAddressMint, setToAddressMint] = useState("")
  const [fromAddress, setFromAddress] = useState("")
  
  // Approval fields
  const [tokenIdApprove, setTokenIdApprove] = useState("")
  const [approveToAddress, setApproveToAddress] = useState("")
  
  // Ownership check fields
  const [tokenIdOwnership, setTokenIdOwnership] = useState("")
  
  // Approval check fields
  const [tokenIdApprovalCheck, setTokenIdApprovalCheck] = useState("")

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
    console.log("useEffect running - loading transactions")
    checkConnection()
    addEpicChainNetwork()
    loadTransactionsFromStorage()
    // Set default addresses for Epic Chain
    setToAddressMint("0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054")
    setFromAddress(epicChainNetwork.fanableProfilesWallet)
  }, []) // Empty dependency array - should only run once

  // Monitor transactions state changes
  useEffect(() => {
    console.log("Transactions state changed:", transactions.length)
  }, [transactions])

  // Check localStorage integrity periodically
  useEffect(() => {
    const checkLocalStorage = () => {
      const stored = localStorage.getItem("erc721_transactions")
      if (stored && transactions.length === 0) {
        console.warn("localStorage has data but transactions state is empty - reloading")
        loadTransactionsFromStorage()
      }
    }
    
    const interval = setInterval(checkLocalStorage, 2000) // Check every 2 seconds
    return () => clearInterval(interval)
  }, [transactions.length])

  // localStorage utilities for transactions
  const saveTransactionsToStorage = (transactions: Transaction[]) => {
    try {
      console.log("Saving transactions to storage:", transactions.length)
      if (transactions.length > 0) {
        localStorage.setItem("erc721_transactions", JSON.stringify(transactions))
        console.log("Successfully saved to localStorage")
      } else {
        console.log("No transactions to save")
      }
    } catch (error) {
      console.error("Error saving transactions to localStorage:", error)
    }
  }

  const loadTransactionsFromStorage = () => {
    try {
      const stored = localStorage.getItem("erc721_transactions")
      console.log("Raw localStorage value:", stored ? stored.substring(0, 100) + "..." : "null")
      if (stored) {
        const parsedTransactions = JSON.parse(stored)
        console.log("Loading transactions from storage:", parsedTransactions.length)
        if (Array.isArray(parsedTransactions)) {
          setTransactions(parsedTransactions)
        } else {
          console.error("Stored transactions is not an array:", typeof parsedTransactions)
          setTransactions([])
        }
      } else {
        console.log("No stored transactions found")
        setTransactions([])
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
    console.log("Adding transaction, total count:", updatedTransactions.length)
    setTransactions(updatedTransactions)
    saveTransactionsToStorage(updatedTransactions)
    return newTransaction.id
  }

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const updatedTransactions = transactions.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    )
    console.log("Updating transaction", id, "total count:", updatedTransactions.length)
    setTransactions(updatedTransactions)
    saveTransactionsToStorage(updatedTransactions)
  }

  const clearTransactionHistory = () => {
    console.log("Clearing transaction history manually")
    setTransactions([])
    localStorage.removeItem("erc721_transactions")
    toast.success("Transaction history cleared")
  }

  const addEpicChainNetwork = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: epicChainNetwork.chainId,
              chainName: epicChainNetwork.chainName,
              nativeCurrency: epicChainNetwork.nativeCurrency,
              rpcUrls: epicChainNetwork.rpcUrls,
              blockExplorerUrls: epicChainNetwork.blockExplorerUrls,
            },
          ],
        })
      } catch (error) {
        console.error("Error adding Epic Chain network:", error)
      }
    }
  }

  const checkConnection = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
        }
      } catch (error) {
        console.error("Error checking connection:", error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        setLoading(true)
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
        setAccount(accounts[0])
        setIsConnected(true)
        toast.success(`Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)
      } catch (error: any) {
        toast.error(error.message)
      } finally {
        setLoading(false)
      }
    } else {
      toast.error("Please install MetaMask to use this application")
    }
  }

  const disconnectWallet = () => {
    setAccount("")
    setIsConnected(false)
    setResults({})
    toast.success("Successfully disconnected from wallet")
  }

  const callContractFunction = async (functionName: string, params: any[] = []) => {
    if (!contractAddress) {
      toast.error("Please enter a valid ERC721 contract address")
      return
    }

    // Input validation
    if (functionName === "mint") {
      if (!params[0] || !ethers.isAddress(params[0])) {
        toast.error("Please enter a valid 'To Address' for minting")
        return
      }
      if (!params[1] || isNaN(Number(params[1])) || Number(params[1]) < 0) {
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
    }

    if (functionName === "transferFrom") {
      if (!params[0] || !ethers.isAddress(params[0])) {
        toast.error("Please enter a valid 'From Address'")
        return
      }
      if (!params[1] || !ethers.isAddress(params[1])) {
        toast.error("Please enter a valid 'To Address'")
        return
      }
      if (!params[2] || isNaN(Number(params[2])) || Number(params[2]) < 0) {
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
    }

    if (["approve", "ownerOf", "getApproved"].includes(functionName)) {
      const tokenId = functionName === "approve" ? params[1] : params[0]
      if (!tokenId || isNaN(Number(tokenId)) || Number(tokenId) < 0) {
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
      if (functionName === "approve" && (!params[0] || !ethers.isAddress(params[0]))) {
        toast.error("Please enter a valid address to approve")
        return
      }
    }

    // Validate wallet for mint function
    if (functionName === "mint" && !isValidMintWallet()) {
      toast.error(`Minting requires connection to wallet: ${epicChainNetwork.requiredMintWallet}`)
      return
    }

    try {
      setLoading(true)

      // Pre-validation for operations that require existing tokens
      if (["transferFrom", "approve", "getApproved"].includes(functionName)) {
        const tokenId = functionName === "transferFrom" ? params[2] : params[0]
        const tokenExists = await checkTokenExists(tokenId)
        if (!tokenExists) {
          // Check if token was burned before throwing generic error
          try {
            const burnResult = await checkTokenWasBurned(tokenId)
            if (burnResult.wasBurned && burnResult.burnTxHash) {
              throw new Error(`Burned:\n${burnResult.burnTxHash}`)
            }
          } catch (burnCheckError) {
            console.warn("Could not check burn status:", burnCheckError)
          }
          throw new Error(`Token #${tokenId} does not exist`)
        }
      }

      const erc721ABI = [
        "function mint(address to, uint256 tokenId)",
        "function transferFrom(address from, address to, uint256 tokenId)",
        "function approve(address to, uint256 tokenId)",
        "function getApproved(uint256 tokenId) view returns (address)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
        "function ownerOf(uint256 tokenId) view returns (address)",
        "function setApprovalForAll(address operator, bool approved)"
      ]

      // Create contract interface
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, erc721ABI, signer)

      let result

      switch (functionName) {
        case "mint":
          const mintTx = await contract.mint(params[0], params[1])
          result = mintTx.hash
          await mintTx.wait()
          result = mintTx.hash
          break
        case "transferFrom":
          const transferTx = await contract.transferFrom(params[0], params[1], params[2])
          
          result = transferTx.hash
          await transferTx.wait()
          
          result = transferTx.hash
          break
        case "approve":
          const approveTx = await contract.approve(params[0], params[1])
          result = approveTx.hash
          await approveTx.wait()
          result = approveTx.hash
          break
        case "ownerOf":
          const owner = await contract.ownerOf(params[0])
          
          // Validate the returned owner address
          if (!owner || owner === "0x") {
            throw new Error(`Token #${params[0]} does not exist`)
          }
          
          if (!ethers.isAddress(owner)) {
            throw new Error(`Invalid owner address returned: ${owner}`)
          }
          
          // Check if token has been burned (transferred to zero address)
          if (owner === "0x0000000000000000000000000000000000000000") {
            result = `Burned:\n${owner}`
          } else {
            result = owner
          }
          
          break
        case "getApproved":
          const approved = await contract.getApproved(params[0])
          result = approved
          break
        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      // Only add successful transactions to history
      addTransaction({
        type: functionName as any,
        contractAddress,
        parameters: params,
        status: "success",
        result: result
      })
      
      setResults((prev: any) => ({ ...prev, [functionName]: result }))
      toast.success(`${functionName} executed successfully`)
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error)
      const userFriendlyError = await parseContractError(error, functionName, params)
      
      // Check if this is actually a burned token result (success case)
      if (userFriendlyError.startsWith("Burned:")) {
        setResults((prev: any) => ({ ...prev, [functionName]: userFriendlyError }))
        toast.success(`${functionName} executed successfully`)
      } else {
        toast.error(userFriendlyError)
        // Store the error in results for debugging
        setResults((prev: any) => ({ 
          ...prev, 
          [functionName]: `❌ Error: ${userFriendlyError}` 
        }))
      }
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Text copied to clipboard")
  }

  const parseContractError = async (error: any, functionName: string, params?: any[]): Promise<string> => {
    console.log(error)
    const errorMessage = error.message || error.toString()
    const errorData = error.data || ""
    
    // First check if this is a burned token
    const burnedResult = await handleBurnedTokenError(error, functionName, params)
    if (burnedResult) {
      return burnedResult
    }
    
    // Handle CALL_EXCEPTION errors (common when token doesn't exist)
    if (error.code === "CALL_EXCEPTION" || errorMessage.includes("CALL_EXCEPTION")) {
      const tokenId = params?.[0] || params?.[1] || params?.[2]
      return `Token #${tokenId || 'N/A'} does not exist`
    }
    
    // Handle ethers v6 BAD_DATA errors (empty return values)
    if (error.code === "BAD_DATA" || errorMessage.includes("could not decode result data")) {
      return `Token #${params?.[0] || params?.[2] || 'N/A'} does not exist.`
    }
    
    // Check for specific error patterns
    if (errorMessage.includes("execution reverted")) {
      const customErrorCode = error.data || ""
      
      // Handle specific error scenarios
      if (customErrorCode.includes("0x7e273289")) {
        return `Token #${params?.[0] || params?.[1] || params?.[2] || 'N/A'} does not exist.`
      }
      
      if (errorMessage.includes("insufficient allowance") || errorMessage.includes("not approved")) {
        return `Transfer failed: Not approved for token #${params?.[2] || 'N/A'}.`
      }
      
      if (errorMessage.includes("not owner")) {
        return `Failed: Not owner of token #${params?.[1] || params?.[2] || 'N/A'}.`
      }
      
      if (errorMessage.includes("already minted") || errorMessage.includes("exists")) {
        return `Token #${params?.[1] || 'N/A'} already exists.`
      }
      
      if (errorMessage.includes("unauthorized") || errorMessage.includes("access")) {
        return `Unauthorized: Check wallet permissions.`
      }
      
      return `Transaction failed: ${errorMessage.substring(0, 100)}...`
    }
    
    // Network-related errors
    if (errorMessage.includes("wrong network") || errorMessage.includes("chain")) {
      return `Network Error: Please switch to ${epicChainNetwork.chainName} network in your wallet.`
    }
    
    if (errorMessage.includes("user rejected") || errorMessage.includes("denied")) {
      return "Transaction cancelled: User rejected the transaction in wallet."
    }
    
    if (errorMessage.includes("insufficient funds")) {
      return "Insufficient funds: You don't have enough ETH to pay for gas fees."
    }
    
    // Contract not found
    if (errorMessage.includes("ENS name not configured") || errorMessage.includes("could not detect network")) {
      return "Contract Error: Could not connect to contract. Please check the contract address and network."
    }
    
    // Fallback to original error
    return errorMessage.length > 200 ? errorMessage.substring(0, 200) + "..." : errorMessage
  }

  const isValidMintWallet = () => {
    return account.toLowerCase() === epicChainNetwork.requiredMintWallet.toLowerCase()
  }

  const checkTokenWasBurned = async (tokenId: string): Promise<{ wasBurned: boolean, burnTxHash?: string }> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, [
        "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
      ], provider)
      
      // Query Transfer events for this specific token
      const filter = contract.filters.Transfer(null, null, tokenId)
      const events = await contract.queryFilter(filter)
      
      if (events.length === 0) {
        return { wasBurned: false } // No transfer events, token never existed
      }
      
      // Check the last transfer event
      const lastTransfer = events[events.length - 1] as any
      const toAddress = lastTransfer.args?.to as string
      
      // Check if last transfer was to zero address (burn)
      const wasBurned = toAddress === "0x0000000000000000000000000000000000000000"
      
      return { 
        wasBurned, 
        burnTxHash: wasBurned ? lastTransfer.transactionHash : undefined 
      }
    } catch (error: any) {
      console.warn("Error checking transfer events:", error)
      return { wasBurned: false }
    }
  }

  const handleBurnedTokenError = async (error: any, functionName: string, params?: any[]): Promise<string | null> => {
    // Only check for burned tokens on specific error codes and functions
    if (error.code === "CALL_EXCEPTION" && error.data?.includes("0x7e273289")) {
      const tokenId = params?.[0] || params?.[1] || params?.[2] // Different functions use different param positions
      if (tokenId && ["ownerOf", "getApproved", "transferFrom", "approve"].includes(functionName)) {
        try {
          const burnResult = await checkTokenWasBurned(tokenId)
          if (burnResult.wasBurned && burnResult.burnTxHash) {
            return `Burned:\n${burnResult.burnTxHash}`
          }
        } catch (burnCheckError) {
          console.warn("Could not check burn status:", burnCheckError)
        }
      }
    }
    return null // Not a burned token
  }

  const checkTokenExists = async (tokenId: string): Promise<boolean> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, ["function ownerOf(uint256 tokenId) view returns (address)"], provider)
      const owner = await contract.ownerOf(tokenId)
      
      // Check if the returned value is a valid address (not empty)
      // Note: Zero address (0x00...00) is valid for burned tokens
      if (!owner || owner === "0x") {
        return false
      }
      
      return ethers.isAddress(owner)
    } catch (error: any) {
      // Handle specific ethers v6 BAD_DATA error
      if (error.code === "BAD_DATA" || error.message?.includes("could not decode result data")) {
        return false
      }
      
      // Handle CALL_EXCEPTION errors (token doesn't exist)
      if (error.code === "CALL_EXCEPTION" || error.message?.includes("CALL_EXCEPTION")) {
        return false
      }
      
      // Handle other contract errors that indicate token doesn't exist
      if (error.message?.includes("execution reverted") || 
          error.message?.includes("ERC721: invalid token ID") ||
          error.message?.includes("ERC721NonexistentToken")) {
        return false
      }
      
      // Log unexpected errors for debugging
      console.warn("Unexpected error in checkTokenExists:", error)
      return false
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="h-full max-w-none space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Network Info */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Network Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-medium">Network:</p>
                  <p className="text-muted-foreground">{epicChainNetwork.chainName}</p>
                </div>
                <div>
                  <p className="font-medium">Chain ID:</p>
                  <p className="text-muted-foreground">{parseInt(epicChainNetwork.chainId, 16)}</p>
                </div>
                <div>
                  <p className="font-medium">Currency:</p>
                  <p className="text-muted-foreground">{epicChainNetwork.nativeCurrency.symbol}</p>
                </div>
                <div>
                  <p className="font-medium">Explorer:</p>
                  <a
                    href={epicChainNetwork.blockExplorerUrls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    {epicChainNetwork.blockExplorerUrls[0].replace('https://', '')}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Connection */}
          <Card className="h-fit flex">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-4 w-4" />
                Wallet Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {!isConnected ? (
                <Button onClick={connectWallet} disabled={loading} className="w-full">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-1">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Connected Account</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {account.slice(0, 6)}...{account.slice(-4)}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(account)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Mint Permission</p>
                    <Badge variant={isValidMintWallet() ? "default" : "destructive"} className="text-xs">
                      {isValidMintWallet() ? "✓ Authorized for Minting" : "✗ Not Authorized for Minting"}
                    </Badge>
                  </div>

                  <Button variant="outline" onClick={disconnectWallet} className="w-full bg-transparent">
                    Disconnect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contract Address */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Contract Configuration</CardTitle>
              <CardDescription className="text-sm">ERC721 contract on {epicChainNetwork.chainName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <Label htmlFor="contract-address" className="text-sm">
                  Contract Address
                </Label>
                <Input
                  id="contract-address"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {isConnected && contractAddress && (
          <Card className="w-full">
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Wallet Requirements:</strong><br/>
                  <strong>Minting:</strong> Must be connected with {epicChainNetwork.requiredMintWallet}<br/>
                  <strong>Transfers:</strong> From address defaults to Fanable Profiles wallet ({epicChainNetwork.fanableProfilesWallet})
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Mint Function */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl text-green-600">Mint Token</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">To Address</Label>
                        <Input
                          placeholder="0x..."
                          disabled
                          value={toAddressMint}
                          onChange={(e) => setToAddressMint(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenIdMint} onChange={(e) => setTokenIdMint(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("mint", [toAddressMint, tokenIdMint])}
                        disabled={loading || !toAddressMint || !tokenIdMint || !isValidMintWallet()}
                        className="w-full h-12 text-lg"
                        size="lg"
                        variant={isValidMintWallet() ? "default" : "secondary"}
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isValidMintWallet() ? "Mint NFT" : "Mint NFT (Unauthorized Wallet)"}
                      </Button>
                      
                      {results.mint && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                          </div>
                          <div className="text-xs flex items-center gap-1">
                            {(() => {
                              const result = String(results.mint)
                              
                              // Don't create links for error messages
                              if (result.startsWith("❌ Error:")) {
                                return <pre className="break-all text-xs whitespace-pre-line font-mono text-red-600">{result}</pre>
                              }
                              
                              // Regular transaction hash
                              const txHashMatch = result.match(/^(0x[a-fA-F0-9]{64})$/)
                              if (txHashMatch) {
                                const txHash = txHashMatch[1]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              }
                              
                              // Fallback for other formats
                              return <pre className="break-all text-xs whitespace-pre-line font-mono">{result}</pre>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Transfer From Function */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl text-blue-600">Transfer Token</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">From Address</Label>
                        <Input
                          placeholder="0x..."
                          value={fromAddress}
                          disabled
                          onChange={(e) => setFromAddress(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">To Address</Label>
                        <Input
                          placeholder="0x..."
                          value={toAddress}
                          onChange={(e) => setToAddress(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenIdTransfer} onChange={(e) => setTokenIdTransfer(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("transferFrom", [fromAddress, toAddress, tokenIdTransfer])}
                        disabled={loading || !fromAddress || !toAddress || !tokenIdTransfer}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        Transfer NFT
                      </Button>
                      
                      {results.transferFrom && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                          </div>
                          <div className="text-xs flex items-center gap-1">
                            {(() => {
                              const result = String(results.transferFrom)
                              
                              // Don't create links for error messages
                              if (result.startsWith("❌ Error:")) {
                                return <pre className="break-all text-xs whitespace-pre-line font-mono text-red-600">{result}</pre>
                              }
                              
                              // Check for burned token format
                              const burnedTxMatch = result.match(/^Burned:\n(0x[a-fA-F0-9]{64})/)
                              if (burnedTxMatch) {
                                const txHash = burnedTxMatch[1]
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Burned:</span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline font-mono break-all"
                                      >
                                        {txHash}
                                      </a>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-4 w-4 p-0 flex-shrink-0"
                                        onClick={() => copyToClipboard(txHash)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              }
                              
                              // Regular transaction hash
                              const txHashMatch = result.match(/^(0x[a-fA-F0-9]{64})$/)
                              if (txHashMatch) {
                                const txHash = txHashMatch[1]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              }
                              
                              // Fallback for other formats
                              return <pre className="break-all text-xs whitespace-pre-line font-mono">{result}</pre>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Approve Function */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl text-orange-600">Approve Token</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Approve To Address</Label>
                        <Input
                          placeholder="0x..."
                          value={approveToAddress}
                          onChange={(e) => setApproveToAddress(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenIdApprove} onChange={(e) => setTokenIdApprove(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("approve", [approveToAddress, tokenIdApprove])}
                        disabled={loading || !approveToAddress || !tokenIdApprove}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        Approve NFT
                      </Button>
                      
                      {results.approve && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                          </div>
                          <div className="text-xs flex items-center gap-1">
                            {(() => {
                              const result = String(results.approve)
                              
                              // Don't create links for error messages
                              if (result.startsWith("❌ Error:")) {
                                return <pre className="break-all text-xs whitespace-pre-line font-mono text-red-600">{result}</pre>
                              }
                              
                              // Check for burned token format
                              const burnedTxMatch = result.match(/^Burned:\n(0x[a-fA-F0-9]{64})/)
                              if (burnedTxMatch) {
                                const txHash = burnedTxMatch[1]
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Burned:</span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline font-mono break-all"
                                      >
                                        {txHash}
                                      </a>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-4 w-4 p-0 flex-shrink-0"
                                        onClick={() => copyToClipboard(txHash)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              }
                              
                              // Regular transaction hash
                              const txHashMatch = result.match(/^(0x[a-fA-F0-9]{64})$/)
                              if (txHashMatch) {
                                const txHash = txHashMatch[1]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              }
                              
                              // Fallback for other formats
                              return <pre className="break-all text-xs whitespace-pre-line font-mono">{result}</pre>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Check Ownership Function */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl text-purple-600">Check Ownership</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenIdOwnership} onChange={(e) => setTokenIdOwnership(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("ownerOf", [tokenIdOwnership])}
                        disabled={loading || !tokenIdOwnership}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        Check Owner
                      </Button>
                      
                      {results.ownerOf && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                          </div>
                          <div className="text-xs flex items-center gap-1">
                            {(() => {
                              const result = String(results.ownerOf)
                              const burnedTxMatch = result.match(/^Burned:\n(0x[a-fA-F0-9]{64})/)
                              const burnedAddressMatch = result.match(/^Burned:\n(0x[a-fA-F0-9]{40})/)
                              const addressMatch = result.match(/0x[a-fA-F0-9]{40}/)
                              const txHashMatch = result.match(/0x[a-fA-F0-9]{64}/)
                              
                              if (burnedTxMatch) {
                                // It's a burned token with tx hash
                                const txHash = burnedTxMatch[1]
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Burned:</span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline font-mono break-all"
                                      >
                                        {txHash}
                                      </a>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-4 w-4 p-0 flex-shrink-0"
                                        onClick={() => copyToClipboard(txHash)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              } else if (burnedAddressMatch) {
                                // It's a burned token with zero address
                                const address = burnedAddressMatch[1]
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Burned:</span>
                                    <div className="flex items-center gap-1">
                                      <a
                                        href={`${epicChainNetwork.blockExplorerUrls[0]}/address/${address}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline font-mono break-all"
                                      >
                                        {address}
                                      </a>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-4 w-4 p-0 flex-shrink-0"
                                        onClick={() => copyToClipboard(address)}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              } else if (txHashMatch) {
                                // It's a transaction hash (without burned prefix)
                                const txHash = txHashMatch[0]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              } else if (addressMatch) {
                                // It's an address (regular owner)
                                const address = addressMatch[0]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/address/${address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {address}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(address)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              }
                              
                              return <pre className="break-all text-xs whitespace-pre-line font-mono">{result}</pre>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Check Approval Function */}
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-xl text-cyan-600">Check Approval</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenIdApprovalCheck} onChange={(e) => setTokenIdApprovalCheck(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("getApproved", [tokenIdApprovalCheck])}
                        disabled={loading || !tokenIdApprovalCheck}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        Check Approved
                      </Button>
                      
                      {results.getApproved && (
                        <div className="mt-4 p-3 bg-muted rounded-md">
                          <div className="flex items-center mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                          </div>
                          <div className="text-xs flex items-center gap-1">
                            {(() => {
                              const result = String(results.getApproved)
                              const burnedTxMatch = result.match(/^Burned: (0x[a-fA-F0-9]{64})/)
                              const addressMatch = result.match(/0x[a-fA-F0-9]{40}/)
                              const txHashMatch = result.match(/0x[a-fA-F0-9]{64}/)
                              
                              if (burnedTxMatch) {
                                // It's a burned token with tx hash
                                const txHash = burnedTxMatch[1]
                                return (
                                  <>
                                    <span className="text-muted-foreground">Burned: </span>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              } else if (txHashMatch) {
                                // It's a transaction hash (without burned prefix)
                                const txHash = txHashMatch[0]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/tx/${txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {txHash}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(txHash)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              } else if (addressMatch) {
                                // It's an address (regular approval)
                                const address = addressMatch[0]
                                return (
                                  <>
                                    <a
                                      href={`${epicChainNetwork.blockExplorerUrls[0]}/address/${address}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:underline font-mono break-all"
                                    >
                                      {address}
                                    </a>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-4 w-4 p-0 flex-shrink-0"
                                      onClick={() => copyToClipboard(address)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </>
                                )
                              }
                              
                              return <pre className="break-all text-xs whitespace-pre-line font-mono">{result}</pre>
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle className="text-xl">Transaction History</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{transactions.length} transactions</Badge>
                {transactions.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={clearTransactionHistory}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear History
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              All transactions are stored locally in your browser
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Parameters</TableHead>
                      <TableHead>Hash/Result</TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.status === "pending" && (
                              <>
                                <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
                                <Badge variant="secondary">Pending</Badge>
                              </>
                            )}
                            {tx.status === "success" && (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
                              </>
                            )}
                            {tx.status === "failed" && (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <Badge variant="destructive">Failed</Badge>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(tx.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tx.parameters.map((param, index) => (
                              <div key={index} className="text-sm font-mono">
                                <span className="text-muted-foreground">#{index}:</span>{" "}
                                <span className="break-all">
                                  {typeof param === "string" && param.length > 20 
                                    ? `${param.slice(0, 10)}...${param.slice(-6)}`
                                    : String(param)
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tx.hash && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Hash:</span>{" "}
                                <code className="font-mono bg-muted px-1 rounded">
                                  {tx.hash.slice(0, 10)}...{tx.hash.slice(-6)}
                                </code>
                              </div>
                            )}
                            {tx.result && (
                              <div className="text-sm">
                                <span className="text-muted-foreground">Result:</span>{" "}
                                <span className="break-all">
                                  {tx.result.length > 50 
                                    ? `${tx.result.slice(0, 50)}...`
                                    : tx.result
                                  }
                                </span>
                              </div>
                            )}
                            {tx.errorMessage && (
                              <div className="text-sm text-red-600">
                                <span className="text-muted-foreground">Error:</span>{" "}
                                <span className="break-all">
                                  {tx.errorMessage.length > 50 
                                    ? `${tx.errorMessage.slice(0, 50)}...`
                                    : tx.errorMessage
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const details = {
                                id: tx.id,
                                type: tx.type,
                                timestamp: new Date(tx.timestamp).toISOString(),
                                contractAddress: tx.contractAddress,
                                parameters: tx.parameters,
                                status: tx.status,
                                hash: tx.hash,
                                result: tx.result,
                                errorMessage: tx.errorMessage
                              }
                              copyToClipboard(JSON.stringify(details, null, 2))
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
