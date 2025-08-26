export interface Erc721ErrorResult {
  type: 'non_existent' | 'burned' | 'unauthorized' | 'insufficient_allowance' | 'already_minted' | 'other'
  message: string
  details?: {
    tokenId?: string
    burnTxHash?: string
    originalError?: any
  }
}

export async function handleErc721Error(
  error: any, 
  functionName: string, 
  tokenId?: string
): Promise<Erc721ErrorResult> {
  const errorMessage = error.message || error.toString()
  const errorData = error.data || ""
  
  // Check for burned token scenarios
  if (error.code === "CALL_EXCEPTION" && errorData?.includes("0x7e273289")) {
    return {
      type: 'non_existent',
      message: `Token #${tokenId || 'N/A'} does not exist`,
      details: { tokenId }
    }
  }
  
  // Handle ethers v6 BAD_DATA errors (empty return values)
  if (error.code === "BAD_DATA" || errorMessage.includes("could not decode result data")) {
    return {
      type: 'non_existent',
      message: `Token #${tokenId || 'N/A'} does not exist`,
      details: { tokenId }
    }
  }
  
  // Check for specific error patterns
  if (errorMessage.includes("execution reverted")) {
    const customErrorCode = errorData || ""
    
    // Handle specific error scenarios
    if (customErrorCode.includes("0x7e273289")) {
      return {
        type: 'non_existent',
        message: `Token #${tokenId || 'N/A'} does not exist`,
        details: { tokenId }
      }
    }
    
    if (errorMessage.includes("insufficient allowance") || errorMessage.includes("not approved")) {
      return {
        type: 'insufficient_allowance',
        message: `Transfer failed: Not approved for token #${tokenId || 'N/A'}`,
        details: { tokenId }
      }
    }
    
    if (errorMessage.includes("not owner")) {
      return {
        type: 'unauthorized',
        message: `Failed: Not owner of token #${tokenId || 'N/A'}`,
        details: { tokenId }
      }
    }
    
    if (errorMessage.includes("already minted") || errorMessage.includes("exists")) {
      return {
        type: 'already_minted',
        message: `Token #${tokenId || 'N/A'} already exists`,
        details: { tokenId }
      }
    }
    
    if (errorMessage.includes("unauthorized") || errorMessage.includes("access")) {
      return {
        type: 'unauthorized',
        message: `Unauthorized: Check wallet permissions`,
        details: { tokenId }
      }
    }
  }
  
  // Network-related errors
  if (errorMessage.includes("wrong network") || errorMessage.includes("chain")) {
    return {
      type: 'other',
      message: `Network Error: Please check your network connection`,
      details: { originalError: error }
    }
  }
  
  if (errorMessage.includes("user rejected") || errorMessage.includes("denied")) {
    return {
      type: 'other',
      message: "Transaction cancelled: User rejected the transaction in wallet",
      details: { originalError: error }
    }
  }
  
  if (errorMessage.includes("insufficient funds")) {
    return {
      type: 'other',
      message: "Insufficient funds: You don't have enough ETH to pay for gas fees",
      details: { originalError: error }
    }
  }
  
  // Contract not found
  if (errorMessage.includes("ENS name not configured") || errorMessage.includes("could not detect network")) {
    return {
      type: 'other',
      message: "Contract Error: Could not connect to contract. Please check the contract address and network",
      details: { originalError: error }
    }
  }
  
  // Fallback to original error
  return {
    type: 'other',
    message: errorMessage.length > 200 ? errorMessage.substring(0, 200) + "..." : errorMessage,
    details: { originalError: error }
  }
}

// Function to check if a token was burned by querying transfer events
export async function checkTokenBurnStatus(
  contract: any,
  tokenId: string
): Promise<{ wasBurned: boolean; burnTxHash?: string }> {
  try {
    // Query Transfer events for this specific token
    const filter = contract.filters.Transfer(null, "0x0000000000000000000000000000000000000000", tokenId)
    const events = await contract.queryFilter(filter)
    
    if (events.length > 0) {
      // Token was burned (transferred to zero address)
      const burnEvent = events[events.length - 1] // Get the most recent burn event
      return {
        wasBurned: true,
        burnTxHash: burnEvent.transactionHash
      }
    }
    
    return { wasBurned: false }
  } catch (error) {
    console.warn("Error checking burn status:", error)
    return { wasBurned: false }
  }
}

// Enhanced error handler that checks for burned tokens
export async function handleErc721ErrorWithBurnCheck(
  error: any,
  functionName: string,
  contract: any,
  tokenId?: string
): Promise<Erc721ErrorResult> {
  // First try to get basic error info
  const basicError = await handleErc721Error(error, functionName, tokenId)
  
  // If it's a non-existent token error, check if it was burned
  if (basicError.type === 'non_existent' && tokenId && contract) {
    try {
      const burnStatus = await checkTokenBurnStatus(contract, tokenId)
      if (burnStatus.wasBurned) {
        return {
          type: 'burned',
          message: `Token #${tokenId} was burned`,
          details: {
            tokenId,
            burnTxHash: burnStatus.burnTxHash
          }
        }
      }
    } catch (burnCheckError) {
      console.warn("Could not check burn status:", burnCheckError)
    }
  }
  
  return basicError
}
