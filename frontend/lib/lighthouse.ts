"use client"

import lighthouse from '@lighthouse-web3/sdk'

type UploadResult = {
  cid: string
  url: string
  raw: unknown
}

export async function uploadStrategyEncrypted(
  strategy: unknown,
  opts: {
    apiKey: string
    publicKey: string
    signedMessage: string
    name?: string
  }
): Promise<UploadResult> {
  console.log('🔐 uploadStrategyEncrypted called with:')
  console.log('  - publicKey:', opts.publicKey)
  console.log('  - apiKey:', opts.apiKey.substring(0, 8) + '...')
  console.log('  - signedMessage length:', opts.signedMessage.length)
  
  const text = JSON.stringify(strategy)
  console.log('📝 Strategy JSON length:', text.length)
  
  console.log('🚀 Calling lighthouse.textUploadEncrypted...')
  const response = await lighthouse.textUploadEncrypted(
    text,
    opts.apiKey,
    opts.publicKey,
    opts.signedMessage
  )
  console.log('📋 Lighthouse upload response:', response)

  // Try multiple possible response structures
  const cid = (response as any)?.data?.Hash || 
              (response as any)?.Hash || 
              (response as any)?.data?.[0]?.Hash ||
              (response as any)?.data?.[0]?.hash ||
              (response as any)?.data?.[0]?.cid
  const url = cid ? `https://gateway.lighthouse.storage/ipfs/${cid}` : ''
  console.log('✅ Final result - CID:', cid, 'URL:', url)
  
  if (!cid) {
    console.error('❌ No CID found in response structure:', JSON.stringify(response, null, 2))
  }
  
  return { cid, url, raw: response }
}

export type LighthouseUpload = {
  cid: string
  publicKey?: string
  fileName?: string
  encryption?: boolean
}

export async function listUserUploads(apiKey: string): Promise<LighthouseUpload[]> {
  try {
    console.log('🔍 Listing uploads with API key:', apiKey.substring(0, 8) + '...')
    const res = await lighthouse.getUploads(apiKey)
    console.log('📋 Raw getUploads response:', res)
    const files = (res as any)?.data?.fileList || (res as any)?.fileList || []
    console.log('📁 Files found:', files.length)
    return files.map((f: any) => ({
      cid: f.Hash || f.Cid || f.cid,
      publicKey: f.publicKey,
      fileName: f.fileName,
      encryption: !!f.encryption,
    })).filter((f: any) => !!f.cid)
  } catch (err) {
    console.error('❌ Failed to list Lighthouse uploads:', err)
    return []
  }
}

export async function decryptStrategyFromCid(cid: string, opts: { publicKey: string; signedMessage: string }): Promise<unknown | null> {
  try {
    console.log('🔓 Starting decryption for CID:', cid)
    console.log('🔑 Using publicKey:', opts.publicKey)
    console.log('✍️ Signed message length:', opts.signedMessage.length)
    
    console.log('🔐 Fetching encryption key...')
    const keyRes = await lighthouse.fetchEncryptionKey(cid, opts.publicKey, opts.signedMessage)
    console.log('🗝️ Key response:', keyRes)
    
    const fileEncryptionKey = (keyRes as any)?.data?.key || (keyRes as any)?.data?.encryptionKey
    console.log('🔑 File encryption key:', fileEncryptionKey ? 'Found' : 'Missing')
    
    if (!fileEncryptionKey) return null

    console.log('📥 Decrypting file with key...')
    const blob: Blob | null = (await lighthouse.decryptFile(cid, fileEncryptionKey, 'application/json')) as any
    console.log('📄 Decrypted blob:', blob ? `${blob.size} bytes` : 'null')
    
    if (!blob) return null
    
    console.log('📖 Reading blob as text...')
    const text = await blob.text()
    console.log('📝 Decrypted text:', text.substring(0, 200) + '...')
    
    console.log('🔄 Parsing JSON...')
    return JSON.parse(text)
  } catch (err) {
    console.error('❌ Decrypt failed for CID:', cid, 'Error:', err)
    return null
  }
}

export async function getAuthMessage(publicKey: string): Promise<string> {
  console.log('📝 Getting auth message for:', publicKey)
  const res = await lighthouse.getAuthMessage(publicKey)
  console.log('📨 Auth message response:', res)
  const msg = (res as any)?.data?.message || (res as any)?.data?.Message || (res as any)?.message || (res as any)?.Message
  if (!msg || typeof msg !== 'string') {
    throw new Error('Failed to get Lighthouse auth message')
  }
  console.log('✅ Auth message received:', msg.substring(0, 50) + '...')
  return msg
}

export async function signAuthMessageWithWallet(account: string): Promise<string> {
  console.log('✍️ Signing auth message for account:', account)
  const message = await getAuthMessage(account)
  console.log('📝 Message to sign:', message)
  const signedMessage = await (window as any).ethereum.request({
    method: 'personal_sign',
    params: [message, account]
  })
  console.log('✅ Message signed, signature length:', signedMessage.length)
  return signedMessage
}


