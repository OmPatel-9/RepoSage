'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

/**
 * Editorial toast styling: dark panel, mono text, hairline border, square-ish
 * corners (no rounded-full bubble). Icons intentionally omitted to keep the
 * terminal-like aesthetic.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="bottom-right"
      style={
        {
          '--normal-bg': 'var(--primary)',
          '--normal-text': 'var(--primary-foreground)',
          '--normal-border': 'color-mix(in oklch, var(--primary), white 14%)',
          '--border-radius': '0.25rem',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'cn-toast !rounded-[0.25rem] !border !font-mono !text-xs !tracking-wide',
          title: '!font-mono !text-xs !font-medium',
          description: '!font-mono !text-[11px] !opacity-80',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
