import { XMLParser } from 'fast-xml-parser'

export interface ItemDetails {
  itemId: string
  description?: string
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

export async function fetchItemDetails(itemId: string, accessToken: string): Promise<ItemDetails | null> {
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
    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    const response = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers,
      body: xmlPayload,
      signal: controller.signal
    }).finally(() => {
      clearTimeout(timeoutId)
    })

    if (!response.ok) {
      console.error(`eBay GetItem API Error for ${itemId}: ${response.status}`)
      return null
    }

    const xmlData = await response.text()
    
    // Validate XML data exists
    if (!xmlData || xmlData.trim().length === 0) {
      console.error(`Empty response for item ${itemId}`)
      return null
    }
    
    let jsonData
    try {
      jsonData = xmlParser.parse(xmlData)
    } catch (parseError) {
      console.error(`XML parsing error for item ${itemId}:`, parseError)
      return null
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
    // Note: Most items don't have ProductListingDetails, and when they do, UPC is usually "Does not apply"
    if (item.ProductListingDetails) {
      const productDetails = item.ProductListingDetails
      
      // Extract identifiers directly from ProductListingDetails
      // Filter out "Does not apply" values as they're not useful
      const upcValue = productDetails.UPC?.["#text"] || productDetails.UPC
      if (upcValue && !upcValue.match(/does not apply/i)) {
        productIdentifiers.upc = upcValue
      }
      
      const eanValue = productDetails.EAN?.["#text"] || productDetails.EAN
      if (eanValue && !eanValue.match(/does not apply/i)) {
        productIdentifiers.ean = eanValue
      }
      
      const isbnValue = productDetails.ISBN?.["#text"] || productDetails.ISBN
      if (isbnValue && !isbnValue.match(/does not apply/i)) {
        productIdentifiers.isbn = isbnValue
      }
      
      if (productDetails.ProductReferenceID) {
        productIdentifiers.productReferenceID = productDetails.ProductReferenceID["#text"] || productDetails.ProductReferenceID
      }
      
      if (productDetails.BrandMPN) {
        const brandMPN = productDetails.BrandMPN
        const brand = brandMPN.Brand?.["#text"] || brandMPN.Brand
        const mpn = brandMPN.MPN?.["#text"] || brandMPN.MPN
        if (brand || mpn) {
          productIdentifiers.brandMPN = {
            brand,
            mpn
          }
        }
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

    // Log extracted data for debugging (only if there's meaningful data)
    if (Object.keys(productIdentifiers).length > 0 || Object.keys(itemSpecifics).length > 0) {
      console.log(`[Item ${itemId}] Product Identifiers:`, Object.keys(productIdentifiers).length > 0 ? productIdentifiers : 'none')
      console.log(`[Item ${itemId}] Item Specifics:`, Object.keys(itemSpecifics).length, 'fields')
    }

    return {
      itemId,
      description,
      productIdentifiers: Object.keys(productIdentifiers).length > 0 ? productIdentifiers : undefined,
      productKeyFeatures: productKeyFeatures.length > 0 ? productKeyFeatures : undefined,
      productInformation: Object.keys(productInformation).length > 0 ? productInformation : undefined,
      itemSpecifics: Object.keys(itemSpecifics).length > 0 ? itemSpecifics : undefined,
    }
  } catch (error) {
    // Handle timeout and other errors
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        console.error(`Request timeout for item ${itemId} (30s)`)
      } else {
        console.error(`Error fetching item ${itemId}:`, error.message)
      }
    } else {
      console.error(`Error fetching item ${itemId}:`, error)
    }
    return null
  }
}

