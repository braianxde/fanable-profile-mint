"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, User, AlertCircle, Flame, X } from "lucide-react"
import { toast } from "sonner"
import { Erc721ErrorResult } from "@/utils/erc721-error-handler"

interface OwnershipCardProps {
  onCheckOwnership: (tokenId: string) => Promise<Erc721ErrorResult | string>
  isLoading: boolean
}

export function OwnershipCard({ onCheckOwnership, isLoading }: OwnershipCardProps) {
  const [tokenIdOwnership, setTokenIdOwnership] = useState("")
  const [result, setResult] = useState<Erc721ErrorResult | string | null>(null)

  const handleCheckOwnership = async () => {
    try {
      if (!tokenIdOwnership) {
        toast.error("Please enter a token ID")
        return
      }
      
      const resultData = await onCheckOwnership(tokenIdOwnership)
      setResult(resultData)
      
      // Check if result is an error
      if (typeof resultData === 'object' && 'type' in resultData) {
        const errorResult = resultData as Erc721ErrorResult
        
        if (errorResult.type === 'burned') {
          toast.success(`Token #${tokenIdOwnership} was burned`)
        } else if (errorResult.type === 'non_existent') {
          toast.error(`Token #${tokenIdOwnership} does not exist`)
        } else {
          toast.error(errorResult.message)
        }
      } else {
        // Success case - result is the owner address
        toast.success(`Owner: ${resultData}`)
      }
    } catch (error: any) {
      toast.error(error.message || "Ownership check failed")
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-xl text-purple-600">Check Ownership</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Token ID</Label>
            <Input 
              placeholder="1" 
              value={tokenIdOwnership} 
              onChange={(e) => setTokenIdOwnership(e.target.value)} 
            />
          </div>
          <Button
            onClick={handleCheckOwnership}
            disabled={isLoading || !tokenIdOwnership}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Check Owner
          </Button>
        </div>

        {/* Result Display */}
        {result && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Result</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResult(null)}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {typeof result === 'string' ? (
              // Success case - owner address
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">Owner Found</span>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-mono text-green-800 break-all">
                    {result}
                  </p>
                </div>
              </div>
            ) : (
              // Error case
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {result.type === 'burned' ? (
                    <Flame className="h-4 w-4 text-orange-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <Badge 
                    variant="secondary" 
                    className={
                      result.type === 'burned' 
                        ? 'bg-orange-100 text-orange-800 border-orange-200' 
                        : 'bg-red-100 text-red-800 border-red-200'
                    }
                  >
                    {result.type === 'burned' ? 'Burned' : 'Not Found'}
                  </Badge>
                </div>
                <div className={`p-3 rounded-md border ${
                  result.type === 'burned' 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm ${
                    result.type === 'burned' ? 'text-orange-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.details?.burnTxHash && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-orange-700">Burn Transaction:</p>
                      <p className="text-xs font-mono text-orange-600 break-all">
                        {result.details.burnTxHash}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
