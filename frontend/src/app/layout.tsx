import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SHAMAY.AI - פלטפורמת הערכת נדל"ן',
  description: 'פלטפורמת הערכת נדל"ן מבוססת בינה מלאכותית',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="hebrew-font">
        {children}
      </body>
    </html>
  )
}
