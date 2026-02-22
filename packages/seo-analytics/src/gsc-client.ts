import { google } from "googleapis"
import type { GscClient, GscQueryOptions, KeywordRow, PageRow, CountryRow, MonthlyRow } from "./types.js"

export function createGscClient(credentialsPath?: string): GscClient {
  const auth = new google.auth.GoogleAuth({
    ...(credentialsPath ? { keyFile: credentialsPath } : {}),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"]
  })
  return google.searchconsole({ version: "v1", auth })
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  end.setDate(end.getDate() - 3) // GSC data has ~3 day delay
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  return { startDate: dateString(start), endDate: dateString(end) }
}

export async function getTopKeywords(
  client: GscClient,
  options: GscQueryOptions
): Promise<KeywordRow[]> {
  const { startDate, endDate } = getDateRange(options.days)
  const res = await client.searchanalytics.query({
    siteUrl: options.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: options.limit,
      type: "web"
    }
  })
  return (res.data.rows ?? []).map((row) => ({
    keyword: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0
  }))
}

export async function getTopPages(
  client: GscClient,
  options: GscQueryOptions
): Promise<PageRow[]> {
  const { startDate, endDate } = getDateRange(options.days)
  const res = await client.searchanalytics.query({
    siteUrl: options.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: options.limit,
      type: "web"
    }
  })
  return (res.data.rows ?? []).map((row) => ({
    page: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0
  }))
}

export async function getByCountry(
  client: GscClient,
  options: GscQueryOptions
): Promise<CountryRow[]> {
  const { startDate, endDate } = getDateRange(options.days)
  const res = await client.searchanalytics.query({
    siteUrl: options.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["country"],
      rowLimit: options.limit,
      type: "web"
    }
  })
  return (res.data.rows ?? []).map((row) => ({
    country: row.keys?.[0] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0
  }))
}

export async function getMonthlyTrend(
  client: GscClient,
  options: GscQueryOptions
): Promise<MonthlyRow[]> {
  const { startDate, endDate } = getDateRange(options.days)
  const res = await client.searchanalytics.query({
    siteUrl: options.siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["date"],
      rowLimit: 5000,
      type: "web"
    }
  })

  const monthlyMap = new Map<string, { clicks: number; impressions: number }>()
  for (const row of res.data.rows ?? []) {
    const date = row.keys?.[0] ?? ""
    const month = date.slice(0, 7) // YYYY-MM
    const existing = monthlyMap.get(month) ?? { clicks: 0, impressions: 0 }
    existing.clicks += row.clicks ?? 0
    existing.impressions += row.impressions ?? 0
    monthlyMap.set(month, existing)
  }

  return [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      clicks: data.clicks,
      impressions: data.impressions
    }))
}
