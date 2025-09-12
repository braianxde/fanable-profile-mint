import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { page = 1, daysBack = 89 } = await request.json()

    const accessToken = process.env.EBAY_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    // Get date from specified days ago
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - daysBack)
    const formattedDate = pastDate.toISOString().split('T')[0]

    const xmlPayload = `
      <?xml version="1.0" encoding="utf-8"?>
      <GetOrdersRequest xmlns="urn:ebay:apis:eBLBaseComponents">    
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <CreateTimeFrom>${formattedDate}T00:00:00.000Z</CreateTimeFrom>
        <OrderRole>Buyer</OrderRole>
        <Pagination>
          <EntriesPerPage>100</EntriesPerPage>
          <PageNumber>${page}</PageNumber>
        </Pagination>
      </GetOrdersRequest>
    `

    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-EBAY-API-SITEID": "0",
      "X-EBAY-API-COMPATIBILITY-LEVEL": "967",
      "X-EBAY-API-CALL-NAME": "GetOrders",
      "X-EBAY-API-IAF-TOKEN": accessToken,
    }

    const response = await fetch("https://api.ebay.com/ws/api.dll", {
      method: "POST",
      headers,
      body: xmlPayload
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`eBay API Error: ${response.status} - ${errorText}`)
      return NextResponse.json(
        { error: `eBay API Error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const xmlData = await response.text()
    
    return NextResponse.json({ 
      success: true, 
      data: xmlData,
      page,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
