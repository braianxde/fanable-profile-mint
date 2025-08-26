"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface TransferCardProps {
  onTransfer: (fromAddress: string, toAddress: string, tokenId: string) => Promise<void>
  isLoading: boolean
  defaultFromAddress?: string
}

export function TransferCard({ onTransfer, isLoading, defaultFromAddress = "0xa63cce06Adc521ef91a2DB2153dD75d336Cd0004" }: TransferCardProps) {
  const [tokenIdTransfer, setTokenIdTransfer] = useState("")
  const [toAddress, setToAddress] = useState("")
  const [fromAddress, setFromAddress] = useState(defaultFromAddress)

  const handleTransfer = async () => {
    try {
      if (!fromAddress || !toAddress || !tokenIdTransfer) {
        toast.error("Please fill in all fields")
        return
      }
      
      await onTransfer(fromAddress, toAddress, tokenIdTransfer)
      setTokenIdTransfer("")
      setToAddress("")
    } catch (error: any) {
      toast.error(error.message || "Transfer failed")
    }
  }

  return (
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
            <Input 
              placeholder="1" 
              value={tokenIdTransfer} 
              onChange={(e) => setTokenIdTransfer(e.target.value)} 
            />
          </div>
          <Button
            onClick={handleTransfer}
            disabled={isLoading || !fromAddress || !toAddress || !tokenIdTransfer}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Transfer NFT
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
