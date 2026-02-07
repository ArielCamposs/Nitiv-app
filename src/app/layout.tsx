import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nitiv - Bienestar Escolar',
  description: 'Plataforma de acompañamiento socioemocional.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} font-sans antialiased text-[#475569] bg-[#FDFBF7]`}>
        {children}
      </body>
    </html>
  )
}
