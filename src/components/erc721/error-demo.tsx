"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Erc721ErrorResult } from "@/utils/erc721-error-handler"

interface ErrorDemoProps {
  errorResult?: Erc721ErrorResult
}

export function ErrorDemo({ errorResult }: ErrorDemoProps) {
  if (!errorResult) return null

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'burned': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'non_existent': return 'bg-red-100 text-red-800 border-red-200'
      case 'unauthorized': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'insufficient_allowance': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'already_minted': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'burned': return '🔥'
      case 'non_existent': return '❌'
      case 'unauthorized': return '🚫'
      case 'insufficient_allowance': return '💰'
      case 'already_minted': return '⚠️'
      default: return 'ℹ️'
    }
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getErrorIcon(errorResult.type)} Error Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={getErrorColor(errorResult.type)}>
            {errorResult.type.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        
        <div className="text-sm">
          <p className="font-medium">Message:</p>
          <p className="text-muted-foreground">{errorResult.message}</p>
        </div>

        {errorResult.details?.tokenId && (
          <div className="text-sm">
            <p className="font-medium">Token ID:</p>
            <p className="text-muted-foreground font-mono">{errorResult.details.tokenId}</p>
          </div>
        )}

        {errorResult.details?.burnTxHash && (
          <div className="text-sm">
            <p className="font-medium">Burn Transaction:</p>
            <p className="text-muted-foreground font-mono break-all">
              {errorResult.details.burnTxHash}
            </p>
          </div>
        )}

        {errorResult.type === 'burned' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
            <p className="text-sm text-orange-800">
              <strong>Note:</strong> This token was burned (transferred to zero address). 
              It no longer exists in the collection.
            </p>
          </div>
        )}

        {errorResult.type === 'non_existent' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Note:</strong> This token ID has never been minted in this collection.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
