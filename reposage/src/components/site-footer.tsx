export function SiteFooter() {
  return (
    <footer className="bg-background/85 mt-auto border-t backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <p className="text-muted-foreground font-mono text-xs">
          RepoSage — repository intelligence
        </p>
        <p className="text-muted-foreground font-mono text-xs">
          © {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
