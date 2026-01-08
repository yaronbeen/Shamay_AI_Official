'use client'

import { redirect } from 'next/navigation'

export default function Step4Page() {
  redirect('/wizard?step=4')
}
