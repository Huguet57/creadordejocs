import type { searchconsole_v1 } from "googleapis"

export type GscClient = searchconsole_v1.Searchconsole

export type GscQueryOptions = {
  siteUrl: string
  days: number
  limit: number
}

export type KeywordRow = {
  keyword: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type PageRow = {
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type CountryRow = {
  country: string
  clicks: number
  impressions: number
}

export type MonthlyRow = {
  month: string
  clicks: number
  impressions: number
}
