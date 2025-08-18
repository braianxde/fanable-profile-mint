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
  const [contractAddress, setContractAddress] = useState("0xd452CE0985B9B11653A3B2c789B87ab5bA3428d4")
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
    checkConnection()
    addEpicChainNetwork()
    loadTransactionsFromStorage()
    // Set default addresses for Epic Chain
    setToAddressMint("0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054")
    setFromAddress(epicChainNetwork.fanableProfilesWallet)
  }, [])

  // localStorage utilities for transactions
  const saveTransactionsToStorage = (transactions: Transaction[]) => {
    try {
      localStorage.setItem("erc721_transactions", JSON.stringify(transactions))
    } catch (error) {
      console.error("Error saving transactions to localStorage:", error)
    }
  }

  const loadTransactionsFromStorage = () => {
    try {
      const stored = localStorage.getItem("erc721_transactions")
      if (stored) {
        const parsedTransactions = JSON.parse(stored)
        setTransactions(parsedTransactions)
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

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    const updatedTransactions = transactions.map(tx => 
      tx.id === id ? { ...tx, ...updates } : tx
    )
    setTransactions(updatedTransactions)
    saveTransactionsToStorage(updatedTransactions)
  }

  const clearTransactionHistory = () => {
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

    // Add transaction to history when starting
    const transactionId = addTransaction({
      type: functionName as any,
      contractAddress,
      parameters: params,
      status: "pending"
    })

    // Input validation
    if (functionName === "mint") {
      if (!params[0] || !ethers.isAddress(params[0])) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid 'To Address' for minting" })
        toast.error("Please enter a valid 'To Address' for minting")
        return
      }
      if (!params[1] || isNaN(Number(params[1])) || Number(params[1]) < 0) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid Token ID (must be positive number)" })
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
    }

    if (functionName === "transferFrom") {
      if (!params[0] || !ethers.isAddress(params[0])) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid 'From Address'" })
        toast.error("Please enter a valid 'From Address'")
        return
      }
      if (!params[1] || !ethers.isAddress(params[1])) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid 'To Address'" })
        toast.error("Please enter a valid 'To Address'")
        return
      }
      if (!params[2] || isNaN(Number(params[2])) || Number(params[2]) < 0) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid Token ID (must be positive number)" })
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
    }

    if (["approve", "ownerOf", "getApproved"].includes(functionName)) {
      const tokenId = functionName === "approve" ? params[1] : params[0]
      if (!tokenId || isNaN(Number(tokenId)) || Number(tokenId) < 0) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid Token ID (must be positive number)" })
        toast.error("Please enter a valid Token ID (positive number)")
        return
      }
      if (functionName === "approve" && (!params[0] || !ethers.isAddress(params[0]))) {
        updateTransaction(transactionId, { status: "failed", errorMessage: "Invalid address to approve" })
        toast.error("Please enter a valid address to approve")
        return
      }
    }

    // Validate wallet for mint function
    if (functionName === "mint" && !isValidMintWallet()) {
      updateTransaction(transactionId, { status: "failed", errorMessage: "Unauthorized wallet for minting" })
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
          throw new Error(`Token #${tokenId} does not exist. This token has not been minted yet.`)
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
          updateTransaction(transactionId, { hash: mintTx.hash })
          result = `Transaction sent: ${mintTx.hash}`
          await mintTx.wait()
          result = `Transaction confirmed: ${mintTx.hash}`
          updateTransaction(transactionId, { status: "success", result })
          break
        case "transferFrom":
          const transferTx = await contract.transferFrom(params[0], params[1], params[2])
          updateTransaction(transactionId, { hash: transferTx.hash })
          result = `Transaction sent: ${transferTx.hash}`
          await transferTx.wait()
          result = `Transaction confirmed: ${transferTx.hash}`
          updateTransaction(transactionId, { status: "success", result })
          break
        case "approve":
          const approveTx = await contract.approve(params[0], params[1])
          updateTransaction(transactionId, { hash: approveTx.hash })
          result = `Transaction sent: ${approveTx.hash}`
          await approveTx.wait()
          result = `Transaction confirmed: ${approveTx.hash}`
          updateTransaction(transactionId, { status: "success", result })
          break
        case "ownerOf":
          const owner = await contract.ownerOf(params[0])
          result = `Owner: ${owner}`
          updateTransaction(transactionId, { status: "success", result })
          break
        case "getApproved":
          const approved = await contract.getApproved(params[0])
          result = `Approved: ${approved}`
          updateTransaction(transactionId, { status: "success", result })
          break
        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      setResults((prev: any) => ({ ...prev, [functionName]: result }))
      toast.success(`${functionName} executed successfully`)
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error)
      const userFriendlyError = parseContractError(error, functionName, params)
      updateTransaction(transactionId, { status: "failed", errorMessage: userFriendlyError })
      toast.error(userFriendlyError)
      
      // Store the error in results for debugging
      setResults((prev: any) => ({ 
        ...prev, 
        [functionName]: `❌ Error: ${userFriendlyError}` 
      }))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Text copied to clipboard")
  }

  const parseContractError = (error: any, functionName: string, params?: any[]): string => {
    const errorMessage = error.message || error.toString()
    
    // Check for specific error patterns
    if (errorMessage.includes("execution reverted")) {
      const customErrorCode = error.data || ""
      
      // Common ERC721 error scenarios
      switch (functionName) {
        case "ownerOf":
          if (customErrorCode.includes("0x7e273289")) {
            return `Token #${params?.[0] || 'N/A'} does not exist. This token has not been minted yet.`
          }
          return `Token #${params?.[0] || 'N/A'} does not exist or query failed.`
          
        case "transferFrom":
          if (customErrorCode.includes("0x7e273289")) {
            return `Token #${params?.[2] || 'N/A'} does not exist. Cannot transfer a token that hasn't been minted.`
          }
          if (errorMessage.includes("insufficient allowance") || errorMessage.includes("not approved")) {
            return `Transfer failed: You don't have permission to transfer token #${params?.[2] || 'N/A'}. The token owner must approve you first.`
          }
          if (errorMessage.includes("not owner")) {
            return `Transfer failed: ${params?.[0] || 'Address'} does not own token #${params?.[2] || 'N/A'}.`
          }
          return `Transfer failed: Token #${params?.[2] || 'N/A'} cannot be transferred. Check ownership and approvals.`
          
        case "approve":
          if (customErrorCode.includes("0x7e273289")) {
            return `Token #${params?.[1] || 'N/A'} does not exist. Cannot approve a token that hasn't been minted.`
          }
          if (errorMessage.includes("not owner")) {
            return `Approval failed: You are not the owner of token #${params?.[1] || 'N/A'}.`
          }
          return `Approval failed for token #${params?.[1] || 'N/A'}. You may not be the owner.`
          
        case "mint":
          if (errorMessage.includes("already minted") || errorMessage.includes("exists")) {
            return `Minting failed: Token #${params?.[1] || 'N/A'} already exists. Choose a different token ID.`
          }
          if (errorMessage.includes("unauthorized") || errorMessage.includes("access")) {
            return `Minting failed: You don't have permission to mint tokens. Check if you're using the correct wallet.`
          }
          return `Minting failed: Token #${params?.[1] || 'N/A'} could not be created. Check permissions and token ID.`
          
        case "getApproved":
          if (customErrorCode.includes("0x7e273289")) {
            return `Token #${params?.[0] || 'N/A'} does not exist. Cannot check approvals for unminted tokens.`
          }
          return `Could not check approval for token #${params?.[0] || 'N/A'}. Token may not exist.`
          
        default:
          return `Transaction failed: ${errorMessage}`
      }
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

  const checkTokenExists = async (tokenId: string): Promise<boolean> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress, ["function ownerOf(uint256 tokenId) view returns (address)"], provider)
      await contract.ownerOf(tokenId)
      return true
    } catch {
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
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(results.mint))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <code className="text-xs break-all block">{String(results.mint)}</code>
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
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(results.transferFrom))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <code className="text-xs break-all block">{String(results.transferFrom)}</code>
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
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(results.approve))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <code className="text-xs break-all block">{String(results.approve)}</code>
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
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(results.ownerOf))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <code className="text-xs break-all block">{String(results.ownerOf)}</code>
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
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">Result</Badge>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(results.getApproved))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <code className="text-xs break-all block">{String(results.getApproved)}</code>
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
