import { NextRequest } from 'next/server'
import { XMLParser } from 'fast-xml-parser'
import { detectFanableCategory } from '@/utils/ebay-category-detector'
import { fetchItemDetails } from '@/utils/ebay-item-fetcher'

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error'
  step?: string
  ordersFetched?: number
  totalOrders?: number
  itemsFetched?: number
  totalItems?: number
  data?: any
  error?: string
}

function sendSSE(controller: ReadableStreamDefaultController, event: ProgressEvent) {
  const data = JSON.stringify(event)
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Server-side XML parser using fast-xml-parser
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  parseAttributeValue: false,
  trimValues: true,
  alwaysCreateTextNode: true,
  isArray: (name, jPath, isLeafNode, isAttribute) => {
    if (name === 'NameValueList' || name === 'Transaction' || name === 'Order') {
      return true
    }
    return false
  },
})

function parseXmlToJson(xmlString: string): any {
  return xmlParser.parse(xmlString)
}

export async function GET(request: NextRequest) {
  const accessToken = process.env.EBAY_ACCESS_TOKEN
  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'Access token is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const MAX_ORDERS = 10
        const MAX_ITEMS_TO_FETCH = 10
        const allOrders: any[] = []

        // Step 1: Fetch orders
        sendSSE(controller, {
          type: 'progress',
          step: 'Fetching orders...',
          ordersFetched: 0,
          totalOrders: MAX_ORDERS
        })

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 89)
        const formattedYesterday = yesterday.toISOString().split('T')[0]

        let page = 1
        let totalPages = 999

        while (page <= totalPages && allOrders.length < MAX_ORDERS) {
          const response = await fetch("https://api.ebay.com/ws/api.dll", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Content-Type": "text/xml",
              "X-EBAY-API-SITEID": "0",
              "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
              "X-EBAY-API-CALL-NAME": "GetOrders",
              "X-EBAY-API-IAF-TOKEN": accessToken,
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
<GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">    
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <CreateTimeFrom>${formattedYesterday}T00:00:00.000Z</CreateTimeFrom>
  <OrderRole>Buyer</OrderRole>
  <Pagination>
    <EntriesPerPage>100</EntriesPerPage>
    <PageNumber>${page}</PageNumber>
  </Pagination>
</GetOrdersRequest>`
          })

          if (response.ok) {
            const xmlData = await response.text()
            const jsonData = parseXmlToJson(xmlData)
            
            const tp = parseInt(jsonData.PaginationResult?.TotalNumberOfPages?.["#text"] || "1")
            if (totalPages === 999) {
              totalPages = tp
            }

            const orders = jsonData.OrderArray?.Order || []
            const orderArray = Array.isArray(orders) ? orders : [orders]

            for (const o of orderArray) {
              const status = o.OrderStatus?.["#text"]
              if (status !== "Completed") continue

              const transactions = o.TransactionArray?.Transaction || []
              const transactionArray = Array.isArray(transactions) ? transactions : [transactions]

              for (const t of transactionArray) {
                if (!t.ShippingDetails) break

                const orderData = {
                  created: o.CreatedTime?.["#text"]?.slice(0, 10) || "",
                  orderId: o.OrderID?.["#text"],
                  status,
                  totalCurrency: o.AmountPaid?.["@currencyID"] || "USD",
                  total: parseFloat(o.AmountPaid?.["#text"] || "0"),
                  shippingCurrency: o.ShippingServiceSelected?.ShippingServiceCost?.["@currencyID"] || "USD",
                  shipping: parseFloat(o.ShippingServiceSelected?.ShippingServiceCost?.["#text"] || "0"),
                  itemId: t.Item?.ItemID?.["#text"] || "",
                  title: t.Item?.Title?.["#text"] || "",
                  itemCurrency: t.TransactionPrice?.["@currencyID"] || "USD",
                  itemPrice: parseFloat(t.TransactionPrice?.["#text"] || "0"),
                  carrier: t.ShippingDetails.ShipmentTrackingDetails?.[0]?.ShippingCarrierUsed?.["#text"] || "OTHER",
                  tracking: t.ShippingDetails.ShipmentTrackingDetails?.[0]?.ShipmentTrackingNumber?.["#text"] || "",
                  orderUrl: `https://order.ebay.com/ord/show?orderId=${o.OrderID?.["#text"]}`
                }

                allOrders.push(orderData)
                
                sendSSE(controller, {
                  type: 'progress',
                  step: 'Fetching orders...',
                  ordersFetched: allOrders.length,
                  totalOrders: MAX_ORDERS
                })

                if (allOrders.length >= MAX_ORDERS) break
              }
              if (allOrders.length >= MAX_ORDERS) break
            }
            
            if (allOrders.length >= MAX_ORDERS) break
            page++
          } else {
            throw new Error(`Failed to fetch orders: ${response.status}`)
          }
        }

        // Step 2: Fetch item details
        const uniqueItemIds = [...new Set(allOrders.map(order => order.itemId).filter(id => id))]
        const itemIdsToFetch = uniqueItemIds.slice(0, MAX_ITEMS_TO_FETCH)
        const itemDetailsMap: Record<string, any> = {}

        if (itemIdsToFetch.length > 0) {
          sendSSE(controller, {
            type: 'progress',
            step: 'Fetching item details...',
            ordersFetched: allOrders.length,
            totalOrders: MAX_ORDERS,
            itemsFetched: 0,
            totalItems: itemIdsToFetch.length
          })

          // Use the shared fetchItemDetails function
          for (let i = 0; i < itemIdsToFetch.length; i++) {
            const itemId = itemIdsToFetch[i]
            
            if (i > 0) {
              await sleep(100)
            }

            try {
              const itemDetails = await fetchItemDetails(itemId, accessToken)
              if (itemDetails) {
                itemDetailsMap[itemId] = itemDetails
              }
            } catch (error) {
              console.error(`Error fetching item ${itemId}:`, error)
            }

            sendSSE(controller, {
              type: 'progress',
              step: `Fetching item details... (${i + 1}/${itemIdsToFetch.length})`,
              ordersFetched: allOrders.length,
              totalOrders: MAX_ORDERS,
              itemsFetched: Object.keys(itemDetailsMap).length,
              totalItems: itemIdsToFetch.length
            })
          }
        }

        // Step 3: Apply categories
        sendSSE(controller, {
          type: 'progress',
          step: 'Processing categories...',
          ordersFetched: allOrders.length,
          totalOrders: MAX_ORDERS,
          itemsFetched: Object.keys(itemDetailsMap).length,
          totalItems: itemIdsToFetch.length
        })

        for (const order of allOrders) {
          const itemDetails = itemDetailsMap[order.itemId]
          const description = itemDetails?.description || ""
          const itemSpecifics = itemDetails?.itemSpecifics
          order.fanableCategory = detectFanableCategory(order.title, description, itemSpecifics)
        }

        // Step 4: Generate CSV
        sendSSE(controller, {
          type: 'progress',
          step: 'Generating CSV...',
          ordersFetched: allOrders.length,
          totalOrders: MAX_ORDERS,
          itemsFetched: Object.keys(itemDetailsMap).length,
          totalItems: itemIdsToFetch.length
        })

        const headers = [
          "Created Date", "Order ID", "Status", "Total Currency", "Total Amount",
          "Shipping Currency", "Shipping Amount", "Item ID", "Item Title",
          "Item Currency", "Item Price", "Carrier", "Tracking Number",
          "Order URL", "Fanable Category"
        ]

        const csvContent = [
          headers.join(","),
          ...allOrders.map(order => [
            `"${order.created}"`, `"${order.orderId}"`, `"${order.status}"`,
            `"${order.totalCurrency}"`, order.total,
            `"${order.shippingCurrency}"`, order.shipping,
            `"${order.itemId}"`, `"${order.title.replace(/"/g, '""')}"`,
            `"${order.itemCurrency}"`, order.itemPrice,
            `"${order.carrier}"`, `"${order.tracking}"`,
            `"${order.orderUrl}"`, `"${order.fanableCategory || "Others"}"`
          ].join(","))
        ].join("\n")

        // Step 5: Complete
        sendSSE(controller, {
          type: 'complete',
          step: 'Complete',
          ordersFetched: allOrders.length,
          totalOrders: MAX_ORDERS,
          itemsFetched: Object.keys(itemDetailsMap).length,
          totalItems: itemIdsToFetch.length,
          data: { csvContent, orders: allOrders }
        })

      } catch (error) {
        sendSSE(controller, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

