'use client'

import { redirect } from 'next/navigation'

export default function Step5Page() {
  redirect('/wizard?step=5')
}
