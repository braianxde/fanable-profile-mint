import { NextRequest, NextResponse } from 'next/server'

// In-memory store for job progress (use Redis in production for multi-server setups)
const jobProgress = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'error'
  step?: string
  ordersFetched?: number
  totalOrders?: number
  itemsFetched?: number
  totalItems?: number
  csvContent?: string
  error?: string
  enableCategoryAnalysis?: boolean
  createdAt: number
}>()

// Clean up old jobs (older than 1 hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  for (const [jobId, job] of jobProgress.entries()) {
    if (job.createdAt < oneHourAgo) {
      jobProgress.delete(jobId)
    }
  }
}, 5 * 60 * 1000) // Run cleanup every 5 minutes

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const progress = jobProgress.get(jobId)

  if (!progress) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  return NextResponse.json({
    jobId,
    ...progress
  })
}

export async function POST(request: NextRequest) {
  try {
    const { action, enableCategoryAnalysis = true } = await request.json()

    if (action === 'start') {
      // Generate a unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Initialize progress
      jobProgress.set(jobId, {
        status: 'pending',
        step: 'Initializing...',
        ordersFetched: 0,
        totalOrders: undefined,
        itemsFetched: 0,
        totalItems: undefined,
        enableCategoryAnalysis: enableCategoryAnalysis !== false, // Default to true
        createdAt: Date.now()
      })

      // Start processing in background (don't await)
      processJob(jobId).catch(error => {
        const progress = jobProgress.get(jobId)
        if (progress) {
          progress.status = 'error'
          progress.error = error instanceof Error ? error.message : 'Unknown error'
        }
      })

      return NextResponse.json({ jobId, status: 'pending' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Background job processor
async function processJob(jobId: string) {
  const accessToken = process.env.EBAY_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('Access token is required')
  }

  const allOrders: any[] = []

  // Update status
  const updateProgress = (updates: Partial<{
    status: 'pending' | 'processing' | 'completed' | 'error'
    step?: string
    ordersFetched?: number
    totalOrders?: number
    itemsFetched?: number
    totalItems?: number
    csvContent?: string
    error?: string
  }>) => {
    const progress = jobProgress.get(jobId)
    if (progress) {
      Object.assign(progress, updates)
      progress.status = updates.status || progress.status || 'processing'
    }
  }

  try {
    updateProgress({ step: 'Fetching orders...', ordersFetched: 0 })

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 89)
    const formattedYesterday = yesterday.toISOString().split('T')[0]

    let page = 1
    let totalPages = 999

    // Import required functions (only import category detector if needed)
    const { fetchItemDetails } = await import('@/utils/ebay-item-fetcher')
    const { XMLParser } = await import('fast-xml-parser')
    
    // Get category analysis setting
    const progress = jobProgress.get(jobId)
    const enableCategoryAnalysis = progress?.enableCategoryAnalysis !== false // Default to true
    
    // Only import category detector if analysis is enabled
    let detectFanableCategory: ((title: string, description: string, itemSpecifics?: Record<string, string>) => string) | null = null
    if (enableCategoryAnalysis) {
      const categoryModule = await import('@/utils/ebay-category-detector')
      detectFanableCategory = categoryModule.detectFanableCategory
    }

    const xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
      textNodeName: "#text",
      parseAttributeValue: false,
      parseTagValue: false, // Prevent converting numeric strings to numbers
      trimValues: true,
      alwaysCreateTextNode: true,
      isArray: (name) => {
        if (name === 'NameValueList' || name === 'Transaction' || name === 'Order') {
          return true
        }
        return false
      },
    })

    while (page <= totalPages) {
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
        
        if (!xmlData || xmlData.trim().length === 0) {
          console.error(`[Job ${jobId}] Empty XML response for page ${page}`)
          throw new Error(`Empty response from eBay API`)
        }
        
        const jsonData = xmlParser.parse(xmlData)
        
        // eBay wraps response in GetOrdersResponse
        const responseRoot = jsonData.GetOrdersResponse || jsonData
        
        // Check for errors in response
        if (responseRoot.Errors) {
          console.error(`[Job ${jobId}] eBay API Errors:`, responseRoot.Errors)
          throw new Error(`eBay API returned errors: ${JSON.stringify(responseRoot.Errors)}`)
        }
        
        const ackValue = responseRoot.Ack?.["#text"] || responseRoot.Ack
        if (ackValue && ackValue !== "Success") {
          console.error(`[Job ${jobId}] eBay API Ack not Success:`, ackValue)
          throw new Error(`eBay API Ack: ${ackValue}`)
        }
        
        const tp = parseInt(responseRoot.PaginationResult?.TotalNumberOfPages?.["#text"] || "1")
        if (totalPages === 999) {
          totalPages = tp
          console.log(`[Job ${jobId}] Total pages: ${totalPages}`)
        }

        const orders = responseRoot.OrderArray?.Order || []
        const orderArray = Array.isArray(orders) ? orders : [orders]
        
        console.log(`[Job ${jobId}] Response structure - OrderArray exists:`, !!responseRoot.OrderArray)
        if (responseRoot.OrderArray) {
          console.log(`[Job ${jobId}] OrderArray keys:`, Object.keys(responseRoot.OrderArray))
        }

        console.log(`[Job ${jobId}] Found ${orderArray.length} orders on page ${page}`)
        
        if (orderArray.length === 0) {
          console.log(`[Job ${jobId}] No orders found on page ${page}`)
          console.log(`[Job ${jobId}] ResponseRoot keys:`, Object.keys(responseRoot))
          console.log(`[Job ${jobId}] Full responseRoot structure:`, JSON.stringify(responseRoot).substring(0, 500))
        }

        for (const o of orderArray) {
          const status = o.OrderStatus?.["#text"]
          if (status !== "Completed") {
            console.log(`[Job ${jobId}] Skipping order ${o.OrderID?.["#text"]} with status: ${status}`)
            continue
          }

          const transactions = o.TransactionArray?.Transaction || []
          const transactionArray = Array.isArray(transactions) ? transactions : [transactions]

          console.log(`[Job ${jobId}] Order ${o.OrderID?.["#text"]} has ${transactionArray.length} transactions`)

          for (const t of transactionArray) {
            // Handle ShipmentTrackingDetails - could be array or single object
            let carrier = "OTHER"
            let tracking = ""
            let shipmentStatus = "Awaiting tracking"
            
            // Check for tracking details
            if (t.ShippingDetails?.ShipmentTrackingDetails) {
              const trackingDetails = t.ShippingDetails.ShipmentTrackingDetails
              const trackingArray = Array.isArray(trackingDetails) ? trackingDetails : [trackingDetails]
              if (trackingArray.length > 0) {
                carrier = trackingArray[0].ShippingCarrierUsed?.["#text"] || trackingArray[0].ShippingCarrierUsed || "OTHER"
                const trackingValue = trackingArray[0].ShipmentTrackingNumber?.["#text"] || trackingArray[0].ShipmentTrackingNumber || ""
                // Ensure tracking number is always a string to prevent scientific notation
                // Convert to string and handle if it was already converted to a number
                if (typeof trackingValue === 'number') {
                  // If it's already a number, use toLocaleString to get full precision without scientific notation
                  // Use 'fullwide' to avoid grouping and get the full number
                  tracking = trackingValue.toLocaleString('fullwide', { useGrouping: false, maximumFractionDigits: 0 })
                } else {
                  tracking = String(trackingValue)
                }
              }
            }
            
            // Determine shipment status based on ShippedTime and ActualDeliveryTime
            const shippedTime = t.ShippedTime?.["#text"] || t.ShippedTime || o.ShippedTime?.["#text"] || o.ShippedTime
            const actualDeliveryTime = t.ShippingServiceSelected?.ShippingPackageInfo?.ActualDeliveryTime?.["#text"] 
              || t.ShippingServiceSelected?.ShippingPackageInfo?.ActualDeliveryTime
              || o.ShippingServiceSelected?.ShippingPackageInfo?.ActualDeliveryTime?.["#text"]
              || o.ShippingServiceSelected?.ShippingPackageInfo?.ActualDeliveryTime
            
            if (actualDeliveryTime) {
              // Check if delivery time is in the past
              const deliveryDate = new Date(actualDeliveryTime)
              if (!isNaN(deliveryDate.getTime()) && deliveryDate <= new Date()) {
                shipmentStatus = "Delivered"
              } else {
                shipmentStatus = "Shipped"
              }
            } else if (shippedTime) {
              shipmentStatus = "Shipped"
            } else if (tracking) {
              // Has tracking but no shipped time - likely shipped
              shipmentStatus = "Shipped"
            } else {
              shipmentStatus = "Awaiting tracking"
            }
            
            // Skip transactions without shipping details if no tracking info
            if (!t.ShippingDetails && !shippedTime && !tracking) {
              console.log(`[Job ${jobId}] Transaction ${t.Item?.ItemID?.["#text"]} has no shipping details, skipping`)
              continue
            }

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
              carrier,
              tracking,
              shipmentStatus,
              orderUrl: `https://order.ebay.com/ord/show?orderId=${o.OrderID?.["#text"]}`
            }

            allOrders.push(orderData)
            updateProgress({ ordersFetched: allOrders.length })
            console.log(`[Job ${jobId}] Added order ${orderData.orderId}, total: ${allOrders.length}`)
          }
        }
        
        console.log(`[Job ${jobId}] After page ${page}, total orders: ${allOrders.length}`)
        
        // If no more orders on this page, stop
        if (orderArray.length === 0) {
          break
        }
        
        page++
      } else {
        throw new Error(`Failed to fetch orders: ${response.status}`)
      }
    }

    // Fetch item details in parallel with concurrency limit (only if category analysis is enabled)
    // enableCategoryAnalysis was already set above, reuse it
    const uniqueItemIds = [...new Set(allOrders.map(order => order.itemId).filter(id => id))]
    const itemDetailsMap: Record<string, any> = {}

    if (enableCategoryAnalysis && uniqueItemIds.length > 0) {
      updateProgress({ 
        step: 'Fetching item details...',
        itemsFetched: 0,
        totalItems: uniqueItemIds.length
      })

      // Parallel fetching with concurrency limit (100 concurrent requests)
      // eBay allows multiple concurrent requests, but we limit to avoid rate limits
      const CONCURRENCY_LIMIT = 100
      let completedCount = 0

      const fetchItem = async (itemId: string) => {
        try {
          const itemDetails = await fetchItemDetails(itemId, accessToken)
          if (itemDetails) {
            itemDetailsMap[itemId] = itemDetails
          }
        } catch (error) {
          console.error(`[Job ${jobId}] Error fetching item ${itemId}:`, error)
        } finally {
          completedCount++
          updateProgress({ 
            itemsFetched: Object.keys(itemDetailsMap).length,
            step: `Fetching item details... (${completedCount}/${uniqueItemIds.length})`
          })
        }
      }

      // Process items in batches with concurrency limit
      for (let i = 0; i < uniqueItemIds.length; i += CONCURRENCY_LIMIT) {
        const batch = uniqueItemIds.slice(i, i + CONCURRENCY_LIMIT)
        const batchNumber = Math.floor(i / CONCURRENCY_LIMIT) + 1
        const totalBatches = Math.ceil(uniqueItemIds.length / CONCURRENCY_LIMIT)
        
        console.log(`[Job ${jobId}] Fetching batch ${batchNumber}/${totalBatches} (${batch.length} items)`)
        
        const batchPromises = batch.map(itemId => fetchItem(itemId))
        
        // Wait for this batch to complete before starting next batch
        await Promise.all(batchPromises)
        
        // Small delay between batches to respect rate limits
        if (i + CONCURRENCY_LIMIT < uniqueItemIds.length) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      console.log(`[Job ${jobId}] Completed fetching ${Object.keys(itemDetailsMap).length}/${uniqueItemIds.length} items`)
    }

    // Apply categories (only if category analysis is enabled)
    if (enableCategoryAnalysis && detectFanableCategory) {
      updateProgress({ step: 'Processing categories...' })
      for (const order of allOrders) {
        const itemDetails = itemDetailsMap[order.itemId]
        const description = itemDetails?.description || ""
        const itemSpecifics = itemDetails?.itemSpecifics
        order.fanableCategory = detectFanableCategory(order.title, description, itemSpecifics)
      }
    } else {
      // Set default category for all orders when analysis is disabled
      updateProgress({ step: 'Setting default categories...' })
      for (const order of allOrders) {
        order.fanableCategory = "Others"
      }
    }

    // Generate CSV
    updateProgress({ step: 'Generating CSV...' })
    console.log(`[Job ${jobId}] Generating CSV with ${allOrders.length} orders`)
    
    const headers = [
      "Created Date", "Order ID", "Status", "Total Currency", "Total Amount",
      "Shipping Currency", "Shipping Amount", "Item ID", "Item Title",
      "Item Currency", "Item Price", "Carrier", "Tracking Number",
      "Shipment Status", "Order URL", "Fanable Category"
    ]

    const csvContent = [
      headers.join(","),
      ...allOrders.map(order => [
        `"${order.created}"`, `"${order.orderId}"`, `"${order.status}"`,
        `"${order.totalCurrency}"`, order.total,
        `"${order.shippingCurrency}"`, order.shipping,
        `"${order.itemId}"`, `"${order.title.replace(/"/g, '""')}"`,
        `"${order.itemCurrency}"`, order.itemPrice,
        `"${order.carrier}"`, order.tracking ? `"\t${order.tracking}"` : `""`,
        `"${order.shipmentStatus || "Awaiting tracking"}"`,
        `"${order.orderUrl}"`, `"${order.fanableCategory || "Others"}"`
      ].join(","))
    ].join("\n")

    console.log(`[Job ${jobId}] CSV generated, length: ${csvContent.length} chars, ${allOrders.length} orders`)

    // Mark as completed
    updateProgress({
      status: 'completed',
      step: 'Complete',
      csvContent
    })

  } catch (error) {
    updateProgress({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

