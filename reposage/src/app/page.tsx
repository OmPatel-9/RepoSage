import { HomePage } from '@/components/marketing/home'
import { SiteFooter } from '@/components/site-footer'
import { SiteNav } from '@/components/site-nav'

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        <HomePage />
      </main>
      <SiteFooter />
    </>
  )
}
