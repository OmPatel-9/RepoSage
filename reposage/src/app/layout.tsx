import { ClerkProvider } from '@clerk/nextjs'
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import './globals.css'

import { ShaderBackground } from '@/components/shader-background'
import { clerkAppearance } from '@/lib/clerk-appearance'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'RepoSage',
  description: 'Repository intelligence workbench for codebase analysis.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en" className="h-full">
        <body
          className={`${instrumentSerif.variable} ${geistSans.variable} ${geistMono.variable} flex min-h-full flex-col`}
        >
          <ShaderBackground />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
