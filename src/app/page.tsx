"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Wallet, Copy, RefreshCw } from "lucide-react"

declare global {
  interface Window {
    ethereum?: any
  }
}

export default function Web3ERC721Interface() {
  const [account, setAccount] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [contractAddress, setContractAddress] = useState("0xd452CE0985B9B11653A3B2c789B87ab5bA3428d4")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})
  const [selectedNetwork, setSelectedNetwork] = useState<"epicchain" | "sepolia">("sepolia")


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

  // Network configurations
  const networks = {
    epicchain: {
      chainId: "0xB7", // 183 in hex
      chainName: "Epic Chain",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://mainnet.ethernitychain.io/"],
      blockExplorerUrls: ["https://explorer.epicchain.io"],
      requiredMintWallet: "0xB9d5c93ec9abA93180ddD00a628e8FAcc3103039",
      fanableProfilesWallet: "0xa63cce06Adc521ef91a2DB2153dD75d336Cd0004"
    },
    sepolia: {
      chainId: "0xaa36a7", // 11155111 in hex
      chainName: "Sepolia test network",
      nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
      rpcUrls: ["https://sepolia.infura.io/v3/"],
      blockExplorerUrls: ["https://sepolia.etherscan.io"],
      requiredMintWallet: "0xAf555DcdC173023035306a12C89F3cCAF8e31a9d",
      fanableProfilesWallet: "0xAf555DcdC173023035306a12C89F3cCAF8e31a9d"
    }
  }

  const currentNetwork = networks[selectedNetwork]

  useEffect(() => {
    checkConnection()
    addNetworks()
  }, [])

  useEffect(() => {
    if (typeof window.ethereum !== "undefined") {
      switchToNetwork(selectedNetwork)
    }
    // Update default addresses when network changes
    setToAddressMint(currentNetwork.requiredMintWallet || "")
    setFromAddress(currentNetwork.fanableProfilesWallet || "")
  }, [selectedNetwork, currentNetwork])

  const addNetworks = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        // Add Epic Chain network
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: networks.epicchain.chainId,
              chainName: networks.epicchain.chainName,
              nativeCurrency: networks.epicchain.nativeCurrency,
              rpcUrls: networks.epicchain.rpcUrls,
              blockExplorerUrls: networks.epicchain.blockExplorerUrls,
            },
          ],
        })
      } catch (error) {
        console.error("Error adding Epic Chain network:", error)
      }
    }
  }

  const switchToNetwork = async (networkKey: "epicchain" | "sepolia") => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const network = networks[networkKey]
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: network.chainId }],
        })
      } catch (error: any) {
        // If the network doesn't exist, add it
        if (error.code === 4902 && networkKey === "epicchain") {
          await addNetworks()
        } else {
          console.error(`Error switching to ${networkKey} network:`, error)
        }
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
      const requiredWallet = currentNetwork.requiredMintWallet
      if (requiredWallet) {
        toast.error(`Minting requires connection to wallet: ${requiredWallet}`)
        return
      }
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
          result = `Transaction sent: ${mintTx.hash}`
          await mintTx.wait()
          result = `Transaction confirmed: ${mintTx.hash}`
          break
        case "transferFrom":
          const transferTx = await contract.transferFrom(params[0], params[1], params[2])
          result = `Transaction sent: ${transferTx.hash}`
          await transferTx.wait()
          result = `Transaction confirmed: ${transferTx.hash}`
          break
        case "approve":
          const approveTx = await contract.approve(params[0], params[1])
          result = `Transaction sent: ${approveTx.hash}`
          await approveTx.wait()
          result = `Transaction confirmed: ${approveTx.hash}`
          break
        case "ownerOf":
          const owner = await contract.ownerOf(params[0])
          result = `Owner: ${owner}`
          break
        case "getApproved":
          const approved = await contract.getApproved(params[0])
          result = `Approved: ${approved}`
          break
        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      setResults((prev: any) => ({ ...prev, [functionName]: result }))
      toast.success(`${functionName} executed successfully`)
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error)
      const userFriendlyError = parseContractError(error, functionName, params)
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
      return `Network Error: Please switch to ${currentNetwork.chainName} network in your wallet.`
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
    const requiredWallet = currentNetwork.requiredMintWallet
    if (!requiredWallet) return true // No restriction for this network
    return account.toLowerCase() === requiredWallet.toLowerCase()
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
      <div className="h-full max-w-none space-y-4">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Fanable Minting</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Network Info */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Network Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select Network</Label>
                <Select value={selectedNetwork} onValueChange={(value: "epicchain" | "sepolia") => setSelectedNetwork(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sepolia">Sepolia Testnet</SelectItem>
                    <SelectItem value="epicchain">Epic Chain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-medium">Network:</p>
                  <p className="text-muted-foreground">{currentNetwork.chainName}</p>
                </div>
                <div>
                  <p className="font-medium">Chain ID:</p>
                  <p className="text-muted-foreground">{parseInt(currentNetwork.chainId, 16)}</p>
                </div>
                <div>
                  <p className="font-medium">Currency:</p>
                  <p className="text-muted-foreground">{currentNetwork.nativeCurrency.symbol}</p>
                </div>
                <div>
                  <p className="font-medium">Explorer:</p>
                  <a
                    href={currentNetwork.blockExplorerUrls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    {currentNetwork.blockExplorerUrls[0].replace('https://', '')}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Connection */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-4 w-4" />
                Wallet Connection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isConnected ? (
                <Button onClick={connectWallet} disabled={loading} className="w-full">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Connect Wallet
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
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
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contract Configuration</CardTitle>
              <CardDescription className="text-sm">ERC721 contract on {currentNetwork.chainName}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
                  {currentNetwork.requiredMintWallet && (
                    <>
                      <strong>Minting:</strong> Must be connected with {currentNetwork.requiredMintWallet}<br/>
                    </>
                  )}
                  {currentNetwork.fanableProfilesWallet && (
                    <>
                      <strong>Transfers:</strong> From address defaults to Fanable Profiles wallet ({currentNetwork.fanableProfilesWallet})
                    </>
                  )}
                  {!currentNetwork.requiredMintWallet && !currentNetwork.fanableProfilesWallet && (
                    <span>No wallet restrictions for {currentNetwork.chainName}</span>
                  )}
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
                          disabled={selectedNetwork === "epicchain"}
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
      </div>
    </div>
  )
}
