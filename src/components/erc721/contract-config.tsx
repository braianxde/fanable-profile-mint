import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DynamicWidget } from "@dynamic-labs/sdk-react-core"

interface ContractConfigProps {
  contractAddress: string
  onContractAddressChange: (address: string) => void
  networkName: string
}

export function ContractConfig({ contractAddress, onContractAddressChange, networkName }: ContractConfigProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg">Contract Configuration</CardTitle>
        <CardDescription className="text-sm">ERC721 contract on {networkName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Label htmlFor="contract-address" className="text-sm">
            Contract Address
          </Label>
          <Input
            id="contract-address"
            value={contractAddress}
            onChange={(e) => onContractAddressChange(e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      </CardContent>
    </Card>
  )
}
