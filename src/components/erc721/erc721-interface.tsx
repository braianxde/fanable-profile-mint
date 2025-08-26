"use client"

import { useErc721 } from "@/hooks/contract-hooks/useERC721"
import { NetworkTypes } from "@/config/network.config"
import { 
  MintCard, 
  TransferCard, 
  ApproveCard, 
  OwnershipCard, 
  ApprovalCheckCard 
} from "./cards"

interface Erc721InterfaceProps {
  contractAddress: string
  network: NetworkTypes
  onTransactionComplete: (type: string, result: string) => void
}

export function Erc721Interface({ contractAddress, network, onTransactionComplete }: Erc721InterfaceProps) {
  const {
    approve,
    getApproved,
    setApprovalForAll,
    isApprovedForAll,
    balanceOf,
    ownerOf,
    safeTransferFrom,
    transferFrom,
    mint,
    totalSupply,
    tokenURI,
    name,
    symbol,
    isLoading,
    txId
  } = useErc721({ address: contractAddress, network })

  const handleMint = async (toAddress: string, tokenId: string) => {
    try {
      const tokenIdBigInt = BigInt(tokenId)
      const result = await mint(toAddress, tokenIdBigInt)
      onTransactionComplete("mint", `Token ID: ${result}`)
      return result // Return the result to the MintCard
    } catch (error: any) {
      throw error
    }
  }

  const handleTransfer = async (fromAddress: string, toAddress: string, tokenId: string) => {
    try {
      const tokenIdBigInt = BigInt(tokenId)
      await transferFrom(fromAddress, toAddress, tokenIdBigInt)
      onTransactionComplete("transferFrom", `Transferred token #${tokenId}`)
    } catch (error: any) {
      throw error
    }
  }

  const handleApprove = async (toAddress: string, tokenId: string) => {
    try {
      const tokenIdBigInt = BigInt(tokenId)
      await approve(toAddress, tokenIdBigInt)
      onTransactionComplete("approve", `Approved ${toAddress} for token #${tokenId}`)
    } catch (error: any) {
      throw error
    }
  }

  const handleCheckOwnership = async (tokenId: string) => {
    try {
      const tokenIdBigInt = BigInt(tokenId)
      const result = await ownerOf(tokenIdBigInt)
      
      // Check if result is an error
      if (typeof result === 'object' && 'type' in result) {
        const errorResult = result as any
        if (errorResult.type === 'burned') {
          onTransactionComplete("ownerOf", `Burned: ${errorResult.details?.burnTxHash || 'Unknown'}`)
        } else {
          onTransactionComplete("ownerOf", `Error: ${errorResult.message}`)
        }
        return result
      }
      
      // Success case
      onTransactionComplete("ownerOf", `Owner: ${result}`)
      return result
    } catch (error: any) {
      throw error
    }
  }

  const handleCheckApproval = async (tokenId: string) => {
    try {
      const tokenIdBigInt = BigInt(tokenId)
      const result = await getApproved(tokenIdBigInt)
      
      // Check if result is an error
      if (typeof result === 'object' && 'type' in result) {
        const errorResult = result as any
        if (errorResult.type === 'burned') {
          onTransactionComplete("getApproved", `Burned: ${errorResult.details?.burnTxHash || 'Unknown'}`)
        } else {
          onTransactionComplete("getApproved", `Error: ${errorResult.message}`)
        }
        return result
      }
      
      // Success case
      onTransactionComplete("getApproved", `Approved: ${result}`)
      return result
    } catch (error: any) {
      throw error
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <MintCard
        onMint={handleMint}
        isLoading={isLoading}
        defaultToAddress="0xe7cbdd4E7fa9A11E60D6F5590aFD75265245B054"
      />
      
      <TransferCard
        onTransfer={handleTransfer}
        isLoading={isLoading}
        defaultFromAddress="0xa63cce06Adc521ef91a2DB2153dD75d336Cd0004"
      />
      
      <ApproveCard
        onApprove={handleApprove}
        isLoading={isLoading}
      />
      
      <OwnershipCard
        onCheckOwnership={handleCheckOwnership}
        isLoading={isLoading}
      />
      
      <ApprovalCheckCard
        onCheckApproval={handleCheckApproval}
        isLoading={isLoading}
      />
    </div>
  )
}
