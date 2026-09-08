'use client'

import { useEffect, useState } from 'react'
import PinGate from '@/components/commissioner/PinGate'
import CommissionerApp from '@/components/commissioner/CommissionerApp'

export default function Page() {
  const [unlocked, setUnlocked] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('commissioner') === '1') setUnlocked(true)
    setChecking(false)
  }, [])

  if (checking) return null

  return unlocked ? <CommissionerApp /> : <PinGate onUnlock={() => setUnlocked(true)} />
}
