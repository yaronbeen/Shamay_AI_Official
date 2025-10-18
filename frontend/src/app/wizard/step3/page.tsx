'use client'

import { redirect } from 'next/navigation'

export default function Step3Page() {
  redirect('/wizard?step=3')
}
