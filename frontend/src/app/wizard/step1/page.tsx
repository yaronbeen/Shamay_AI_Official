'use client'

import { redirect } from 'next/navigation'

export default function Step1Page() {
  redirect('/wizard?step=1')
}
