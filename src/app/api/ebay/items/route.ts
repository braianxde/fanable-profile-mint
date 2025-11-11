import { NextRequest, NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

interface ItemDetails {
  itemId: string
  description?: string
  // Product Information
  productIdentifiers?: {
    upc?: string
    ean?: string
    isbn?: string
    brandMPN?: string
    [key: string]: any
  }
  productKeyFeatures?: string[]
  productInformation?: Record<string, any>
  itemSpecifics?: Record<string, string>
}

// Configure XML parser to match the format used in client-side parsing
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  textNodeName: "#text",
  parseAttributeValue: false, // Keep as strings to match client-side format
  trimValues: true,
  alwaysCreateTextNode: true, // Always create #text nodes
  isArray: (name, jPath, isLeafNode, isAttribute) => {
    // Handle arrays - NameValueList should be an array
    if (name === 'NameValueList' || name === 'Transaction' || name === 'Order') {
      return true
    }
    return false
  },
})

async function fetchItemDetails(itemId: string, accessToken: string): Promise<ItemDetails | null> {
  const xmlPayload = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <ItemID>${itemId}</ItemID>
      <DetailLevel>ReturnAll</DetailLevel>
      <IncludeItemSpecifics>true</IncludeItemSpecifics>
      <OutputSelector>Item.Description</OutputSelector>
      <OutputSelector>Item.ProductListingDetails</OutputSelector>
      <OutputSelector>Item.ItemSpecifics</OutputSelector>
    </GetItemRequest>
  `

  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "text/xml",
    "X-EBAY-API-SITEID": "0",
    "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
    "X-EBAY-API-CALL-NAME": "GetItem",
    "X-EBAY-API-IAF-TOKEN": accessToken,
  }

  try {
    const response = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers,
      body: xmlPayload
    })

    if (!response.ok) {
      console.error(`eBay GetItem API Error for ${itemId}: ${response.status}`)
      return null
    }

    const xmlData = await response.text()
    const jsonData = xmlParser.parse(xmlData)
    
    // Debug: Log the structure to understand the response format
    if (process.env.NODE_ENV === 'development') {
      console.log(`Parsed response for ${itemId}:`, JSON.stringify(jsonData, null, 2).substring(0, 500))
    }
    
    // Check for errors in response - eBay wraps response in GetItemResponse
    const responseRoot = jsonData.GetItemResponse || jsonData
    if (responseRoot.Errors) {
      console.error(`eBay GetItem API Error for ${itemId}:`, responseRoot.Errors)
      return null
    }

    // Check Ack status - handle both string and object formats
    const ackValue = responseRoot.Ack?.["#text"] || responseRoot.Ack
    if (ackValue && ackValue !== "Success") {
      console.error(`eBay GetItem API Ack not Success for ${itemId}:`, ackValue)
      return null
    }

    const item = responseRoot.Item || jsonData.Item
    if (!item) {
      console.error(`No Item found in response for ${itemId}. Response keys:`, Object.keys(responseRoot))
      return null
    }

    // Extract only description - the only field we actually use
    const description = item.Description?.["#text"] || item.Description || ""

    // Initialize product information variables outside the if block
    const productIdentifiers: Record<string, any> = {}
    let productKeyFeatures: string[] = []
    const productInformation: Record<string, any> = {}
    
    // Extract Product Identifiers (UPC, EAN, ISBN, Brand MPN, etc.)
    if (item.ProductListingDetails) {
      const productDetails = item.ProductListingDetails
      
      // Extract identifiers
      if (productDetails.UPC) {
        productIdentifiers.upc = productDetails.UPC["#text"] || productDetails.UPC
      }
      if (productDetails.EAN) {
        productIdentifiers.ean = productDetails.EAN["#text"] || productDetails.EAN
      }
      if (productDetails.ISBN) {
        productIdentifiers.isbn = productDetails.ISBN["#text"] || productDetails.ISBN
      }
      if (productDetails.BrandMPN) {
        const brandMPN = productDetails.BrandMPN
        productIdentifiers.brandMPN = {
          brand: brandMPN.Brand?.["#text"] || brandMPN.Brand,
          mpn: brandMPN.MPN?.["#text"] || brandMPN.MPN
        }
      }
      
      // Extract Key Features
      if (productDetails.ProductDetails?.KeyFeatures) {
        const keyFeatures = productDetails.ProductDetails.KeyFeatures
        const featuresArray = Array.isArray(keyFeatures) ? keyFeatures : [keyFeatures]
        productKeyFeatures = featuresArray.map((f: any) => f["#text"] || f).filter(Boolean)
      }
      
      // Extract Product Information
      if (productDetails.ProductDetails) {
        const details = productDetails.ProductDetails
        // Extract various product information fields
        if (details.ProductReferenceID) {
          productInformation.productReferenceID = details.ProductReferenceID["#text"] || details.ProductReferenceID
        }
        // Add more product information fields as needed
      }
    }
    
    // Extract ItemSpecifics (product attributes)
    const itemSpecifics: Record<string, string> = {}
    if (item.ItemSpecifics?.NameValueList) {
      const nameValueList = Array.isArray(item.ItemSpecifics.NameValueList) 
        ? item.ItemSpecifics.NameValueList 
        : [item.ItemSpecifics.NameValueList]
      
      for (const nv of nameValueList) {
        const name = nv.Name?.["#text"] || nv.Name || ""
        let value = ""
        if (nv.Value) {
          if (Array.isArray(nv.Value)) {
            value = nv.Value.map((v: any) => v["#text"] || v).join(", ")
          } else {
            value = nv.Value["#text"] || nv.Value || ""
          }
        }
        itemSpecifics[name] = value
      }
    }

    // Log extracted data for debugging
    console.log(`\n=== Item ${itemId} Data ===`)
    console.log(`Description length: ${description.length} chars`)
    console.log(`Product Identifiers:`, JSON.stringify(productIdentifiers, null, 2))
    console.log(`Product Key Features (${productKeyFeatures.length}):`, productKeyFeatures)
    console.log(`Product Information:`, JSON.stringify(productInformation, null, 2))
    console.log(`Item Specifics (${Object.keys(itemSpecifics).length}):`, JSON.stringify(itemSpecifics, null, 2))
    console.log(`========================\n`)

    return {
      itemId,
      description,
      productIdentifiers: Object.keys(productIdentifiers).length > 0 ? productIdentifiers : undefined,
      productKeyFeatures: productKeyFeatures.length > 0 ? productKeyFeatures : undefined,
      productInformation: Object.keys(productInformation).length > 0 ? productInformation : undefined,
      itemSpecifics: Object.keys(itemSpecifics).length > 0 ? itemSpecifics : undefined,
    }
  } catch (error) {
    console.error(`Error fetching item ${itemId}:`, error)
    return null
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    const { itemIds } = await request.json()

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds array is required' }, { status: 400 })
    }

    const accessToken = process.env.EBAY_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    // Remove duplicates
    const uniqueItemIds = [...new Set(itemIds)]
    const results: Record<string, ItemDetails> = {}
    const errors: string[] = []

    // Process items sequentially with rate limiting (eBay API rate limits)
    // Add small delay between requests to avoid hitting rate limits
    for (let i = 0; i < uniqueItemIds.length; i++) {
      const itemId = uniqueItemIds[i]
      
      try {
        // Add delay between requests (except first one)
        if (i > 0) {
          await sleep(100) // 100ms delay between requests
        }
        
        const itemDetails = await fetchItemDetails(itemId, accessToken)
        if (itemDetails) {
          results[itemId] = itemDetails
          console.log(`✓ Successfully fetched item ${itemId}`)
        } else {
          // Item fetch failed but continue processing other items
          errors.push(`Failed to fetch details for item ${itemId}`)
          console.error(`✗ Failed to fetch details for item ${itemId}`)
        }
      } catch (error) {
        // Individual item error - log but continue processing
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing item ${itemId}:`, errorMessage)
        errors.push(`Error processing item ${itemId}: ${errorMessage}`)
        // Continue to next item
      }
    }

    console.log(`\n=== Batch Summary ===`)
    console.log(`Requested: ${uniqueItemIds.length} items`)
    console.log(`Successfully fetched: ${Object.keys(results).length} items`)
    console.log(`Failed: ${errors.length} items`)
    if (errors.length > 0) {
      console.log(`Errors:`, errors)
    }
    console.log(`====================\n`)

    return NextResponse.json({
      success: true,
      data: results,
      count: Object.keys(results).length,
      requested: uniqueItemIds.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

