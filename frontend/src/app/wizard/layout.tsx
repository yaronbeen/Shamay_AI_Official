import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SHAMAY.AI - הערכת שווי נכסים',
  description: 'פלטפורמה מתקדמת להערכת שווי נכסים עם בינה מלאכותית',
}

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
