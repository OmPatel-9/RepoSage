import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { AuthSync } from "@/components/auth-sync";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { ShaderBackground } from "@/components/shader-background";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepoSage",
  description: "Talk to any GitHub repo.",
};

const clerkAppearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorBackground: "var(--bg)",
    colorText: "var(--fg)",
    colorTextSecondary: "var(--fg-dim)",
    colorInputBackground: "rgba(10, 10, 13, 0.7)",
    colorInputText: "var(--fg)",
    colorNeutral: "var(--fg-dim)",
    borderRadius: "6px",
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-mono)",
  },
  elements: {
    card: {
      backgroundColor: "rgba(10, 10, 13, 0.94)",
      border: "1px solid var(--border-strong)",
      boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
      backdropFilter: "blur(20px)",
    },
    headerTitle: {
      color: "var(--fg)",
      fontFamily: "var(--font-instrument-serif)",
      fontWeight: "400",
    },
    headerSubtitle: {
      color: "var(--fg-dim)",
    },
    socialButtonsBlockButton: {
      backgroundColor: "rgba(10, 10, 13, 0.7)",
      borderColor: "var(--border-strong)",
      color: "var(--fg)",
    },
    formButtonPrimary: {
      backgroundColor: "var(--accent)",
      color: "var(--bg)",
      fontFamily: "var(--font-geist-mono)",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
    },
    footerActionLink: {
      color: "var(--accent)",
    },
    formFieldInput: {
      backgroundColor: "rgba(10, 10, 13, 0.7)",
      borderColor: "var(--border-strong)",
      color: "var(--fg)",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={clerkAppearance}
    >
      <html
        lang="en"
        className={`${instrumentSerif.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <body>
          <AuthSync />
          <ShaderBackground />
          <div className="grain" />
          <div className="rs-page">
            <Nav />
            <main>{children}</main>
            <Footer />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
