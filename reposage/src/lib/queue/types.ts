/**
 * Typed job catalogue for the RepoSage worker.
 *
 * `name` is the BullMQ job name (used for routing in the worker), and `data`
 * is the payload. Add a new variant to `RepoSageJob` to register a job type;
 * the worker's switch will then fail to compile until a handler is wired up.
 */
export interface IndexRepoJob {
  name: 'index-repo'
  data: { repoId: string }
}

export interface GenerateDocJob {
  name: 'generate-doc'
  data: { repoId: string }
}

export type RepoSageJob = IndexRepoJob | GenerateDocJob

export type RepoSageJobName = RepoSageJob['name']

/** Payload type for a given job name. */
export type JobData<TName extends RepoSageJobName> = Extract<
  RepoSageJob,
  { name: TName }
>['data']

/** Single queue carries every job kind, routed by name. */
export const QUEUE_NAME = 'reposage'
