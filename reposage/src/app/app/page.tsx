import { currentUser } from '@clerk/nextjs/server'

import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'
import { WorkbenchHome } from '@/components/workbench/home'

export default async function AppPage() {
  const user = await currentUser()

  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-2 sm:px-6">
          <p className="text-muted-foreground mb-3 font-mono text-xs tracking-[0.18em] uppercase">
            Workbench
          </p>
          <h1 className="text-4xl font-semibold">
            Welcome,{' '}
            <span className="font-serif font-normal italic">
              {user?.firstName ?? 'reader'}.
            </span>
          </h1>
        </section>
        <WorkbenchHome />
      </main>
      <SiteFooter />
    </>
  )
}
