import type { NextClerkProviderProps } from '@clerk/nextjs/types'

type ClerkAppearance = NonNullable<NextClerkProviderProps['appearance']>

/**
 * Editorial Clerk theme matching globals.css design tokens.
 *
 * Clerk `variables` must be parseable colors (it derives alpha shades), so
 * these are hex equivalents of the oklch tokens. `elements` is plain CSS,
 * so it can reference the CSS variables directly.
 *
 * Note: the site is light (paper background), so no dark baseTheme —
 * we theme from scratch on the light palette instead.
 */
export const clerkAppearance: ClerkAppearance = {
  variables: {
    colorBackground: '#fefefb', // --card
    colorText: '#0b1014', // --foreground
    colorPrimary: '#14202c', // --primary
    colorInputBackground: '#faf9f5', // --background
    colorInputText: '#0b1014',
    colorTextSecondary: '#4f565e', // --muted-foreground
    colorDanger: '#cc342d', // --destructive
    borderRadius: '0.25rem',
    fontFamily: 'var(--font-geist-sans), sans-serif',
    fontSize: '14px',
  },
  elements: {
    card: {
      background: 'transparent',
      boxShadow: 'none',
      border: '1px solid var(--border)',
    },
    cardBox: {
      boxShadow: 'none',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    },
    formButtonPrimary: {
      background: 'var(--accent)',
      color: 'var(--accent-foreground)',
      borderRadius: '0.25rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontSize: '12px',
      fontFamily: 'var(--font-geist-mono), monospace',
      fontWeight: 600,
      boxShadow: 'none',
      border: 'none',
      '&:hover': {
        background: 'color-mix(in oklch, var(--accent), black 8%)',
      },
    },
    headerTitle: {
      fontFamily: 'var(--font-instrument-serif), serif',
      fontWeight: 400,
      fontSize: '30px',
    },
    headerSubtitle: {
      fontFamily: 'var(--font-geist-mono), monospace',
      fontSize: '12px',
    },
    socialButtonsBlockButton: {
      borderRadius: '0.25rem',
      boxShadow: 'none',
      border: '1px solid var(--border)',
    },
    formFieldInput: {
      borderRadius: '0.25rem',
      boxShadow: 'none',
      border: '1px solid var(--input)',
    },
    formFieldLabel: {
      fontFamily: 'var(--font-geist-mono), monospace',
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
    footer: {
      background: 'transparent',
    },
  },
}
