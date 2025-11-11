"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface EbayOrder {
  created: string
  orderId: string
  status: string
  totalCurrency: string
  total: number
  shippingCurrency: string
  shipping: number
  itemId: string
  title: string
  itemCurrency: string
  itemPrice: number
  carrier: string
  tracking: string
  orderUrl: string
  ebayCategoryId?: string
  ebayCategoryName?: string
  fanableCategory?: string
  itemDescription?: string
  itemBrand?: string
  itemSpecs?: string
}

interface TrackingData {
  trackingId: string
  carrier: string
}

export function EbayPurchaseHistory() {
  const [isLoading, setIsLoading] = useState(false)
  const [enableCategoryAnalysis, setEnableCategoryAnalysis] = useState<string>("true")
  const [progress, setProgress] = useState<{
    ordersFetched: number
    itemsFetched: number
    currentStep: string
  }>({
    ordersFetched: 0,
    itemsFetched: 0,
    currentStep: ""
  })
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const jobIdRef = useRef<string | null>(null)

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/ebay/job?jobId=${jobId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.status}`)
      }

      const data = await response.json()

      // Update progress
      setProgress({
        ordersFetched: data.ordersFetched || 0,
        itemsFetched: data.itemsFetched || 0,
        currentStep: data.step || ""
      })

      // Check if job is complete
      if (data.status === 'completed') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }

        // Download CSV
        if (data.csvContent) {
          const blob = new Blob([data.csvContent], { type: "text/csv;charset=utf-8;" })
          const link = document.createElement("a")
          
          if (link.download !== undefined) {
            const url = URL.createObjectURL(blob)
            link.setAttribute("href", url)
            link.setAttribute("download", `ebay-orders-${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = "hidden"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success(`CSV file downloaded successfully with ${data.ordersFetched} orders`)
          }
        }

        setIsLoading(false)
        setProgress({
          ordersFetched: 0,
          itemsFetched: 0,
          currentStep: ""
        })
        jobIdRef.current = null
        return true // Job complete
      }

      // Check if job failed
      if (data.status === 'error') {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        toast.error(`Error: ${data.error || 'Unknown error'}`)
        setIsLoading(false)
        setProgress({
          ordersFetched: 0,
          itemsFetched: 0,
          currentStep: ""
        })
        jobIdRef.current = null
        return true // Job complete (with error)
      }

      return false // Job still processing
    } catch (error) {
      console.error("Error polling job status:", error)
      return false
    }
  }

  const downloadCSV = async () => {
    setIsLoading(true)
    setProgress({
      ordersFetched: 0,
      itemsFetched: 0,
      currentStep: "Starting..."
    })

    try {
      // Start the job
      const response = await fetch("/api/ebay/job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action: 'start',
          enableCategoryAnalysis: enableCategoryAnalysis === "true"
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to start job: ${response.status}`)
      }

      const data = await response.json()
      jobIdRef.current = data.jobId

      // Start polling immediately, then every 500ms
      await pollJobStatus(data.jobId)
      
      pollingIntervalRef.current = setInterval(async () => {
        if (jobIdRef.current) {
          const isComplete = await pollJobStatus(jobIdRef.current)
          if (isComplete && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
        }
      }, 500) // Poll every 500ms

    } catch (error) {
      console.error("Error starting job:", error)
      toast.error("Failed to start download process")
      setIsLoading(false)
      setProgress({
        ordersFetched: 0,
        itemsFetched: 0,
        currentStep: ""
      })
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }

  return (
    <Card className="w-full max-w-xl">
        <CardHeader>
            <CardTitle>eBay CSV Download</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-analysis">Item Category Analysis</Label>
                  <Select 
                    value={enableCategoryAnalysis} 
                    onValueChange={setEnableCategoryAnalysis}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="category-analysis" className="w-full">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled</SelectItem>
                      <SelectItem value="false">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                    onClick={downloadCSV} 
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full h-12"
                >
                    {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                       LOADING...
                    </>
                    ) : (
                    <>
                        <Download className="h-4 w-4" />
                        FETCH & DOWNLOAD
                    </>
                    )}
                </Button>
                
                {isLoading && (
                  <div className="space-y-2 text-sm">
                    {progress.currentStep && (
                      <div className="text-muted-foreground">
                        {progress.currentStep}
                      </div>
                    )}
                    {progress.ordersFetched > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Orders:</span>
                        <span>{progress.ordersFetched}</span>
                      </div>
                    )}
                    {progress.itemsFetched > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Items:</span>
                        <span>{progress.itemsFetched}</span>
                      </div>
                    )}
                  </div>
                )}
            
        </CardContent>
    </Card>
  )
}
