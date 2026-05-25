export default function Page() {
  return (
    <section className="relative px-6 py-20 md:px-8 md:py-28">
      <div className="absolute inset-0 veil-mid" />
      <div className="relative mx-auto max-w-6xl">
        <div className="label-mark mb-6">RepoSage app</div>
        <h1
          className="rs-serif rs-fg mb-6"
          style={{ fontSize: "clamp(48px, 8vw, 112px)", lineHeight: 0.95 }}
        >
          Your repos, <em className="italic rs-accent">ready to read.</em>
        </h1>
        <p
          className="rs-fg-dim max-w-2xl"
          style={{ fontSize: "17px", lineHeight: 1.6 }}
        >
          This protected area is ready for the real indexing workflow.
        </p>
      </div>
    </section>
  );
}
