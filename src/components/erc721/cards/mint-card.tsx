"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, CheckCircle, AlertCircle, X } from "lucide-react"
import { toast } from "sonner"

interface MintCardProps {
  onMint: (toAddress: string, tokenId: string) => Promise<void>
  isLoading: boolean
  defaultToAddress?: string
}

export function MintCard({ onMint, isLoading, defaultToAddress = "0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054" }: MintCardProps) {
  const [tokenIdMint, setTokenIdMint] = useState("")
  const [toAddressMint, setToAddressMint] = useState(defaultToAddress)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleMint = async () => {
    try {
      if (!toAddressMint || !tokenIdMint) {
        toast.error("Please fill in all fields")
        return
      }
      
      setError(null)
      setResult(null)
      
      await onMint(toAddressMint, tokenIdMint)
      setResult(`Successfully minted token #${tokenIdMint} to ${toAddressMint}`)
      setTokenIdMint("")
    } catch (error: any) {
      const errorMessage = error.message || "Minting failed"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  return (
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
            <Input 
              placeholder="1" 
              value={tokenIdMint} 
              onChange={(e) => setTokenIdMint(e.target.value)} 
            />
          </div>
          <Button
            onClick={handleMint}
            disabled={isLoading || !toAddressMint || !tokenIdMint}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Mint NFT
          </Button>
        </div>

        {/* Result Display */}
        {(result || error) && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Result</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setResult(null)
                  setError(null)
                }}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            
            {result && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Success</span>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">{result}</p>
                </div>
              </div>
            )}
            
            {error && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    Error
                  </Badge>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
