"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface ApproveCardProps {
  onApprove: (toAddress: string, tokenId: string) => Promise<void>
  isLoading: boolean
}

export function ApproveCard({ onApprove, isLoading }: ApproveCardProps) {
  const [tokenIdApprove, setTokenIdApprove] = useState("")
  const [approveToAddress, setApproveToAddress] = useState("")

  const handleApprove = async () => {
    try {
      if (!approveToAddress || !tokenIdApprove) {
        toast.error("Please fill in all fields")
        return
      }
      
      await onApprove(approveToAddress, tokenIdApprove)
      setTokenIdApprove("")
      setApproveToAddress("")
    } catch (error: any) {
      toast.error(error.message || "Approval failed")
    }
  }

  return (
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
            <Input 
              placeholder="1" 
              value={tokenIdApprove} 
              onChange={(e) => setTokenIdApprove(e.target.value)} 
            />
          </div>
          <Button
            onClick={handleApprove}
            disabled={isLoading || !approveToAddress || !tokenIdApprove}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve NFT
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
