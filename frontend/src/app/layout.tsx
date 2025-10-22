import type { Metadata } from 'next'
import { AuthSessionProvider } from '@/components/providers/session-provider'
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
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
      </body>
    </html>
  )
}
