import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface NetworkInfoProps {
  chainName: string
  chainId: string
  currencySymbol: string
  explorerUrl: string
}

export function NetworkInfo({ chainName, chainId, currencySymbol, explorerUrl }: NetworkInfoProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg">Network Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="font-medium">Network:</p>
            <p className="text-muted-foreground">{chainName}</p>
          </div>
          <div>
            <p className="font-medium">Chain ID:</p>
            <p className="text-muted-foreground">{parseInt(chainId, 16)}</p>
          </div>
          <div>
            <p className="font-medium">Currency:</p>
            <p className="text-muted-foreground">{currencySymbol}</p>
          </div>
          <div>
            <p className="font-medium">Explorer:</p>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline text-xs"
            >
              {explorerUrl.replace('https://', '')}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
