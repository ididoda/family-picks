import { Suspense } from 'react'
import PrintWeek from './PrintWeek'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PrintWeek />
    </Suspense>
  )
}
