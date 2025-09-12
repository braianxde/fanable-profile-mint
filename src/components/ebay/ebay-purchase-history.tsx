"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"

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
}

interface TrackingData {
  trackingId: string
  carrier: string
}

export function EbayPurchaseHistory() {
  const [isLoading, setIsLoading] = useState(false)

  const parseXmlToJson = (xmlString: string): any => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, "text/xml")
    
    const xmlToObject = (element: Element): any => {
      const result: any = {}
      
      // Handle attributes
      if (element.attributes.length > 0) {
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i]
          result[`@${attr.name}`] = attr.value
        }
      }
      
      // Handle child elements
      if (element.children.length > 0) {
        for (let i = 0; i < element.children.length; i++) {
          const child = element.children[i]
          const childName = child.tagName
          const childValue = xmlToObject(child)
          
          if (result[childName]) {
            if (!Array.isArray(result[childName])) {
              result[childName] = [result[childName]]
            }
            result[childName].push(childValue)
          } else {
            result[childName] = childValue
          }
        }
      } else {
        // Handle text content
        const textContent = element.textContent?.trim()
        if (textContent) {
          result["#text"] = textContent
        }
      }
      
      return result
    }
    
    return xmlToObject(xmlDoc.documentElement)
  }

  const downloadCSV = async () => {
    setIsLoading(true)
    const allOrders: EbayOrder[] = []
    const apiPayload: TrackingData[] = []

    try {
      // Get date from 89 days ago
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 89)
      const formattedYesterday = yesterday.toISOString().split('T')[0]

      let page = 1
      let totalPages = 999

      while (page <= totalPages) {
        console.log(`Getting page ${page} starting ${formattedYesterday}`)

        const response = await fetch("/api/ebay/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page,
            daysBack: 89
          })
        })

        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const xmlData = result.data
            const jsonData = parseXmlToJson(xmlData)
            
            const tp = parseInt(jsonData.PaginationResult?.TotalNumberOfPages?.["#text"] || "1")
            if (totalPages === 999) {
              totalPages = tp
              console.log(`... (total pages: ${totalPages})`)
            }

            const orders = jsonData.OrderArray?.Order || []
            const orderArray = Array.isArray(orders) ? orders : [orders]

            for (const o of orderArray) {
              const oid = o.OrderID?.["#text"]
              const status = o.OrderStatus?.["#text"]

              // Only complete orders
              if (status !== "Completed") {
                console.log(" skipped", oid, status)
                continue
              }

              const total = parseFloat(o.AmountPaid?.["#text"] || "0")
              const totalCur = o.AmountPaid?.["@currencyID"] || "USD"

              const shipping = parseFloat(o.ShippingServiceSelected?.ShippingServiceCost?.["#text"] || "0")
              const shippingCur = o.ShippingServiceSelected?.ShippingServiceCost?.["@currencyID"] || "USD"

              const created = o.CreatedTime?.["#text"]?.slice(0, 10) || ""

              const trackings: TrackingData[] = []
              const transactions = o.TransactionArray?.Transaction || []
              const transactionArray = Array.isArray(transactions) ? transactions : [transactions]

              for (const t of transactionArray) {
                const itemId = t.Item?.ItemID?.["#text"] || ""
                const title = t.Item?.Title?.["#text"] || ""
                const itemPrice = parseFloat(t.TransactionPrice?.["#text"] || "0")
                const itemCur = t.TransactionPrice?.["@currencyID"] || "USD"

                if (!t.ShippingDetails) {
                  break // not shipped yet!
                }

                let carrier = "OTHER"
                let tracking = ""

                if (t.ShippingDetails.ShipmentTrackingDetails) {
                  const trackingDetails = t.ShippingDetails.ShipmentTrackingDetails
                  const trackingArray = Array.isArray(trackingDetails) ? trackingDetails : [trackingDetails]

                  for (const tr of trackingArray) {
                    carrier = tr.ShippingCarrierUsed?.["#text"] || "OTHER"
                    tracking = tr.ShipmentTrackingNumber?.["#text"] || ""

                    const trackingData = { trackingId: tracking, carrier }
                    
                    if (!apiPayload.some(p => p.trackingId === tracking && p.carrier === carrier)) {
                      apiPayload.push(trackingData)
                    }
                    if (!trackings.some(t => t.trackingId === tracking && t.carrier === carrier)) {
                      trackings.push(trackingData)
                    }
                  }
                }

                const orderData: EbayOrder = {
                  created,
                  orderId: oid,
                  status,
                  totalCurrency: totalCur,
                  total,
                  shippingCurrency: shippingCur,
                  shipping,
                  itemId,
                  title,
                  itemCurrency: itemCur,
                  itemPrice,
                  carrier,
                  tracking,
                  orderUrl: `https://order.ebay.com/ord/show?orderId=${oid}`
                }

                allOrders.push(orderData)
              }
            }
            page++
          } else {
            console.error("Invalid response format:", result)
            toast.error("Invalid response from eBay API")
            break
          }
        } else {
          const errorResult = await response.json()
          console.error(`API Error: ${response.status}`, errorResult)
          toast.error(`API Error: ${response.status} - ${errorResult.error || 'Unknown error'}`)
          break
        }
      }

      // Generate CSV from fetched orders
      const headers = [
        "Created Date",
        "Order ID", 
        "Status",
        "Total Currency",
        "Total Amount",
        "Shipping Currency", 
        "Shipping Amount",
        "Item ID",
        "Item Title",
        "Item Currency",
        "Item Price",
        "Carrier",
        "Tracking Number",
        "Order URL"
      ]

      const csvContent = [
        headers.join(","),
        ...allOrders.map(order => [
          `"${order.created}"`,
          `"${order.orderId}"`,
          `"${order.status}"`,
          `"${order.totalCurrency}"`,
          order.total,
          `"${order.shippingCurrency}"`,
          order.shipping,
          `"${order.itemId}"`,
          `"${order.title.replace(/"/g, '""')}"`, // Escape quotes in title
          `"${order.itemCurrency}"`,
          order.itemPrice,
          `"${order.carrier}"`,
          `"${order.tracking}"`,
          `"${order.orderUrl}"`
        ].join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `ebay-orders-${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success(`CSV file downloaded successfully with ${allOrders.length} orders`)
      }

    } catch (error) {
      console.error("Error fetching eBay data:", error)
      toast.error("Failed to fetch eBay purchase history")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-xs">
        <CardHeader>
            <CardTitle>eBay CSV Download</CardTitle>
        </CardHeader>
        <CardContent>
                <Button 
                    onClick={downloadCSV} 
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full"
                >
                    {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Fetching & Downloading eBay Orders...
                    </>
                    ) : (
                    <>
                        <Download className="h-4 w-4" />
                        Fetch & Download eBay Orders CSV
                    </>
                    )}
                </Button>
            
        </CardContent>
    </Card>
  )
}
