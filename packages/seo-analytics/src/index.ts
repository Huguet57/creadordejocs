export { createGscClient, getTopKeywords, getTopPages, getByCountry, getMonthlyTrend } from "./gsc-client.js"
export {
  formatKeywordsTable,
  formatPagesTable,
  formatCountryTable,
  formatMonthlyTable
} from "./formatters.js"
export type {
  GscClient,
  GscQueryOptions,
  KeywordRow,
  PageRow,
  CountryRow,
  MonthlyRow
} from "./types.js"
