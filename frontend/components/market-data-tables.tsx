"use client"

import { useEffect, useState } from 'react'
import { listUserUploads, decryptStrategyFromCid, signAuthMessageWithWallet, LighthouseUpload } from '@/lib/lighthouse'

type StrategyRow = {
  cid: string
  strategy: any
}

function StrategyList() {
  const [rows, setRows] = useState<StrategyRow[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      console.log('🚀 Starting strategy load process...')
      
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        console.log('❌ No ethereum provider found')
        return
      }
      
      const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      const account = accounts?.[0]
      console.log('👤 Connected account:', account)
      if (!account) return

      // Get a session signature for decryption
      console.log('🔐 Getting signed message for decryption...')
      const signedMessage = await signAuthMessageWithWallet(account)

      const apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY as string | undefined
      console.log('🔑 API Key available:', !!apiKey)
      if (!apiKey) return
      
      console.log('📋 Fetching all uploads...')
      const uploads: LighthouseUpload[] = await listUserUploads(apiKey)
      console.log('📁 Total uploads found:', uploads.length)
      
      console.log('🔍 All upload details:')
      uploads.forEach((u, i) => {
        console.log(`  File ${i + 1}:`, {
          cid: u.cid,
          publicKey: u.publicKey,
          encrypted: u.encryption,
          matchesWallet: u.publicKey?.toLowerCase() === account.toLowerCase(),
          currentWallet: account.toLowerCase()
        })
      })
      
      // Note: Lighthouse's file list `publicKey` reflects the API key owner's address,
      // not necessarily the wallet that has decryption rights. Attempt decryption with
      // the connected wallet for any encrypted file instead of filtering by publicKey.
      const encryptedUploads = uploads.filter(u => u.encryption)
      console.log('🔒 Encrypted uploads (will attempt decryption with current wallet):', encryptedUploads.length)
      console.log('📝 Encrypted upload details:', encryptedUploads.map(u => ({ cid: u.cid, publicKey: u.publicKey, encrypted: u.encryption })))

      const results: StrategyRow[] = []
      for (const u of encryptedUploads) {
        console.log(`🔓 Attempting to decrypt CID: ${u.cid}`)
        const data = await decryptStrategyFromCid(u.cid, { publicKey: account, signedMessage })
        console.log(`📊 Decrypted data for ${u.cid}:`, data)
        
        if (data && (data as any).symbol && (data as any).liquidityLevel) {
          console.log(`✅ Valid strategy found for CID: ${u.cid}`)
          results.push({ cid: u.cid, strategy: data })
        } else {
          console.log(`❌ Invalid or missing strategy data for CID: ${u.cid}`)
        }
      }

      console.log('📈 Final results:', results.length, 'strategies')
      // newest first
      setRows(results.reverse())
    } catch (error) {
      console.error('💥 Error in load function:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const handler = () => load()
    window.addEventListener('strategy-stored', handler as any)
    return () => window.removeEventListener('strategy-stored', handler as any)
  }, [])

  if (loading) {
    return <div className="text-xs text-gray-400">Loading strategies…</div>
  }

  if (!rows.length) {
    return <div className="text-xs text-gray-500">No strategies yet. Build one to get started.</div>
  }

  return (
    <div className="space-y-2">
      {rows.map(({ cid, strategy }, idx) => (
        <div key={cid} className="rounded-md border border-[#1f2937] bg-[#0e0e0e] p-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>#{rows.length - idx}</span>
            <a href={`https://gateway.lighthouse.storage/ipfs/${cid}`} target="_blank" className="text-blue-400 underline">CID</a>
          </div>
          {(() => {
            const pairLabel = strategy.tradingPair?.label ?? strategy.tokenPair?.label ?? strategy.symbol
            const timeframe = strategy.timeframe ?? '—'
            return (
              <div className="mt-1 text-sm text-white/90">
                {pairLabel} • {timeframe}
              </div>
            )
          })()}
          <div className="text-xs text-gray-400">{strategy.liquidityLevel.type} @ {strategy.liquidityLevel.price}</div>
          <div className="text-xs text-gray-500">RR: {strategy.riskRewardRatio} • Indicators: {strategy.indicators?.map((i:any)=>i.name).join(', ') || '—'}</div>
          {strategy.execution && (
            <div className="text-[11px] text-gray-500 mt-1">
              Auto-Trading: {strategy.execution.enabled ? 'On' : 'Off'} •
              {' '}
              Size: {strategy.execution.positionSize?.type === 'percentage'
                ? `${strategy.execution.positionSize?.value}%`
                : `$${strategy.execution.positionSize?.value}`}
              {' '}• Slippage: {strategy.execution.slippageTolerance}% • Gas ≤ {strategy.execution.maxGasFee} MATIC
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function MarketDataTables() {
  return (
    <div className="bg-[#0a0a0a] border-t border-[#1a1a1a]">
      <div className="p-4 space-y-2">
        <div className="text-white/90 text-sm font-semibold">Your Stored Strategies</div>
        <StrategyList />
      </div>
    </div>
  )
}
