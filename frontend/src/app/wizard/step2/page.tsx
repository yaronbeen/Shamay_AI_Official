'use client'

import { redirect } from 'next/navigation'

export default function Step2Page() {
  redirect('/wizard?step=2')
}
