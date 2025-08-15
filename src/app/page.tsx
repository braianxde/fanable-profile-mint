"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
  const [contractAddress, setContractAddress] = useState("0x239993F94E2C20dD8568a40b6D45Df5c3375cf02")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>({})


  const [tokenId, setTokenId] = useState("")
  
  const [toAddress, setToAddress] = useState("")
  const [fromAddress, setFromAddress] = useState("0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054")

  // Required wallet addresses
  const REQUIRED_MINT_WALLET = "0xB9d5c93ec9abA93180ddD00a628e8FAcc3103039"
  const FANABLE_PROFILES_WALLET = "0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054"

  useEffect(() => {
    checkConnection()
    addEpicchainNetwork()
  }, [])

  const addEpicchainNetwork = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xB7", // 183 in hex
              chainName: "Epic Chain",
              nativeCurrency: {
                name: "ETH",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: ["https://mainnet.ethernitychain.io/"],
              blockExplorerUrls: ["https://explorer.epicchain.io"],
            },
          ],
        })
      } catch (error) {
        console.error("Error adding Epicchain network:", error)
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

    // Validate wallet for mint function
    if (functionName === "mint" && !isValidMintWallet()) {
      toast.error(`Minting requires connection to wallet: ${REQUIRED_MINT_WALLET}`)
      return
    }

    try {
      setLoading(true)

      const erc721ABI = [
        "function mint(address to, uint256 tokenId)",
        "function transferFrom(address from, address to, uint256 tokenId)",
      ]

      // Create contract interface
      const { ethers } = await import("ethers")
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
        default:
          throw new Error(`Unknown function: ${functionName}`)
      }

      setResults((prev: any) => ({ ...prev, [functionName]: result }))
      toast.success(`${functionName} executed successfully`)
    } catch (error: any) {
      console.error(`Error calling ${functionName}:`, error)
      toast.error(error.message || `Failed to call ${functionName}`)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Text copied to clipboard")
  }

  const isValidMintWallet = () => {
    return account.toLowerCase() === REQUIRED_MINT_WALLET.toLowerCase()
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
              <CardTitle className="text-lg">Network Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-medium">Network:</p>
                  <p className="text-muted-foreground">Epic Chain</p>
                </div>
                <div>
                  <p className="font-medium">Chain ID:</p>
                  <p className="text-muted-foreground">183</p>
                </div>
                <div>
                  <p className="font-medium">Currency:</p>
                  <p className="text-muted-foreground">ETH</p>
                </div>
                <div>
                  <p className="font-medium">Explorer:</p>
                  <a
                    href="https://explorer.epicchain.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-xs"
                  >
                    explorer.epicchain.io
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
              <CardDescription className="text-sm">ERC721 contract on Epicchain</CardDescription>
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
                  <strong>Minting:</strong> Must be connected with {REQUIRED_MINT_WALLET}<br/>
                  <strong>Transfers:</strong> From address defaults to Fanable Profiles wallet ({FANABLE_PROFILES_WALLET})
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                          value="0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054"
                          onChange={(e) => setToAddress(e.target.value)}
                          className="font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Token ID</Label>
                        <Input placeholder="1" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("mint", [toAddress, tokenId])}
                        disabled={loading || !toAddress || !tokenId || !isValidMintWallet()}
                        className="w-full h-12 text-lg"
                        size="lg"
                        variant={isValidMintWallet() ? "default" : "secondary"}
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        {isValidMintWallet() ? "Mint NFT" : "Mint NFT (Unauthorized Wallet)"}
                      </Button>
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
                        <Input placeholder="1" value={tokenId} onChange={(e) => setTokenId(e.target.value)} />
                      </div>
                      <Button
                        onClick={() => callContractFunction("transferFrom", [fromAddress, toAddress, tokenId])}
                        disabled={loading || !fromAddress || !toAddress || !tokenId}
                        className="w-full h-12 text-lg"
                        size="lg"
                      >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                        Transfer NFT
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {Object.keys(results).length > 0 && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Transaction Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(results).map(([functionName, result]) => (
                  <div key={functionName} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{functionName}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(String(result))}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-md">
                      <code className="text-sm break-all">{String(result)}</code>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
