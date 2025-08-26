import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { History, Clock, CheckCircle, XCircle, Copy } from "lucide-react"
import { toast } from "sonner"

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

interface TransactionHistoryProps {
  transactions: Transaction[]
  onClearHistory: () => void
  explorerUrl: string
}

export function TransactionHistory({ transactions, onClearHistory, explorerUrl }: TransactionHistoryProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Text copied to clipboard")
  }

  return (
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
                onClick={onClearHistory}
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
  )
}
