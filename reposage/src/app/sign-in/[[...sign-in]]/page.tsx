import { SignIn } from "@clerk/nextjs";

const appearance = {
  variables: {
    colorPrimary: "var(--accent)",
    colorBackground: "var(--bg)",
    colorText: "var(--fg)",
    colorTextSecondary: "var(--fg-dim)",
    colorInputBackground: "rgba(10, 10, 13, 0.7)",
    colorInputText: "var(--fg)",
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
  },
};

export default function Page() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-28">
      <div className="absolute inset-0 veil-mid" />
      <div className="relative mx-auto flex max-w-6xl justify-center">
        <SignIn
          appearance={appearance}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/app"
        />
      </div>
    </section>
  );
}
