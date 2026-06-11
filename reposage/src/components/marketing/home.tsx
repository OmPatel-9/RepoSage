import {
  ArrowRight,
  Braces,
  Database,
  GitBranch,
  Search,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PipelineStep {
  label: string
  value: string
  icon: LucideIcon
}

const pipeline: PipelineStep[] = [
  {
    label: 'Clone',
    value: 'queued',
    icon: GitBranch,
  },
  {
    label: 'Map',
    value: 'AST graph',
    icon: Braces,
  },
  {
    label: 'Index',
    value: 'vector store',
    icon: Database,
  },
  {
    label: 'Review',
    value: 'policy pass',
    icon: ShieldCheck,
  },
]

const observations: string[] = [
  'Auth boundary spans middleware, webhook sync, and app shell.',
  'Database access should stay behind server actions or route handlers.',
  'README references deployment before local service bootstrapping.',
]

export function HomePage() {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <div className="border-b pb-8">
          <Badge className="bg-accent text-accent-foreground hover:bg-accent mb-5">
            editorial technical system
          </Badge>
          <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-balance sm:text-5xl">
            Read a repository like a field guide,
            <span className="font-serif font-normal italic">
              {' '}
              not a file tree.
            </span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-7">
            Paste a repo URL, build the dependency map, and turn architecture
            questions into traceable answers.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Repository intake</CardTitle>
            <CardDescription>
              Start with a public or connected private repository.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="https://github.com/acme/core"
                />
              </div>
              <Button size="lg">
                Analyze
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map">Map</TabsTrigger>
            <TabsTrigger value="review">Review</TabsTrigger>
            <TabsTrigger value="ask">Ask</TabsTrigger>
          </TabsList>
          <TabsContent value="map">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {pipeline.map((item) => (
                <Card key={item.label} size="sm">
                  <CardHeader>
                    <item.icon className="text-primary size-4" />
                    <CardTitle>{item.label}</CardTitle>
                    <CardDescription>{item.value}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <CardTitle>Review lanes</CardTitle>
                <CardDescription>
                  Security, maintainability, and onboarding checks share the
                  same source graph.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          <TabsContent value="ask">
            <Card>
              <CardHeader>
                <CardTitle>Traceable answers</CardTitle>
                <CardDescription>
                  Every answer should point back to files, commits, and symbols.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Run ledger</CardTitle>
            <CardDescription>
              Local services are ready for Postgres + Redis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3 font-mono text-xs">
              <span className="text-muted-foreground">postgres</span>
              <span>pgvector:pg16</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3 font-mono text-xs">
              <span className="text-muted-foreground">redis</span>
              <span>7-alpine</span>
            </div>
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground">env</span>
              <span>typed by zod</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Early observations</CardTitle>
            <CardDescription>
              The interface favors evidence over theater.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {observations.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6">
                  <TerminalSquare className="text-primary mt-1 size-4 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </section>
  )
}
