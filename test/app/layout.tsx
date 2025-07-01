import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '風化促進CO2除去・廃水処理システム',
  description: '鉱山廃水における風化促進による二酸化炭素除去と廃水処理事業管理システム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}