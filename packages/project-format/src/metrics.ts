import type { ProjectV1 } from "./schema-v1.js"

export type CounterMetricKey = "appStart" | "projectLoad" | "runtimeErrors"

export function incrementMetric(project: ProjectV1, metric: CounterMetricKey): ProjectV1 {
  return {
    ...project,
    metrics: {
      ...project.metrics,
      [metric]: project.metrics[metric] + 1
    }
  }
}

export function setTimeToFirstPlayableFunMs(project: ProjectV1, elapsedMs: number): ProjectV1 {
  if (project.metrics.timeToFirstPlayableFunMs !== null) {
    return project
  }

  return {
    ...project,
    metrics: {
      ...project.metrics,
      timeToFirstPlayableFunMs: elapsedMs
    }
  }
}
