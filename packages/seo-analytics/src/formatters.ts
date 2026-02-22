import type { KeywordRow, PageRow, CountryRow, MonthlyRow } from "./types.js"

const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const CYAN = "\x1b[36m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

function pad(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + " ".repeat(len - str.length)
}

function padNum(n: number, len: number): string {
  const s = String(n)
  return s.length >= len ? s : " ".repeat(len - s.length) + s
}

function header(title: string): string {
  return `\n${BOLD}${CYAN}━━━ ${title} ━━━${RESET}\n`
}

function separator(len: number): string {
  return `${DIM}${"─".repeat(len)}${RESET}`
}

export function formatKeywordsTable(rows: KeywordRow[]): string {
  if (rows.length === 0) return header("TOP KEYWORDS") + "  Cap dada disponible.\n"

  const lines: string[] = [header("TOP KEYWORDS")]
  lines.push(
    `  ${DIM}${pad("Keyword", 40)} ${padNum("Clics" as unknown as number, 8)} ${padNum("Impr." as unknown as number, 8)} ${padNum("CTR%" as unknown as number, 7)} ${padNum("Pos." as unknown as number, 6)}${RESET}`
  )
  lines.push(`  ${separator(71)}`)

  for (const row of rows) {
    const ctr = (row.ctr * 100).toFixed(1) + "%"
    const pos = row.position.toFixed(1)
    lines.push(
      `  ${GREEN}${pad(row.keyword, 40)}${RESET} ${padNum(row.clicks, 8)} ${padNum(row.impressions, 8)} ${YELLOW}${pad(ctr, 7)}${RESET} ${pad(pos, 6)}`
    )
  }
  return lines.join("\n") + "\n"
}

export function formatPagesTable(rows: PageRow[]): string {
  if (rows.length === 0) return header("TOP PÀGINES") + "  Cap dada disponible.\n"

  const lines: string[] = [header("TOP PÀGINES")]
  lines.push(
    `  ${DIM}${pad("Pàgina", 55)} ${padNum("Clics" as unknown as number, 8)} ${padNum("Impr." as unknown as number, 8)} ${padNum("CTR%" as unknown as number, 7)}${RESET}`
  )
  lines.push(`  ${separator(80)}`)

  for (const row of rows) {
    const ctr = (row.ctr * 100).toFixed(1) + "%"
    const shortPage = row.page.replace(/^https?:\/\/[^/]+/, "")
    lines.push(
      `  ${GREEN}${pad(shortPage || "/", 55)}${RESET} ${padNum(row.clicks, 8)} ${padNum(row.impressions, 8)} ${YELLOW}${pad(ctr, 7)}${RESET}`
    )
  }
  return lines.join("\n") + "\n"
}

export function formatCountryTable(rows: CountryRow[]): string {
  if (rows.length === 0) return header("PER PAÍS") + "  Cap dada disponible.\n"

  const lines: string[] = [header("PER PAÍS")]
  lines.push(
    `  ${DIM}${pad("País", 20)} ${padNum("Clics" as unknown as number, 10)} ${padNum("Impressions" as unknown as number, 12)}${RESET}`
  )
  lines.push(`  ${separator(44)}`)

  for (const row of rows) {
    lines.push(
      `  ${GREEN}${pad(row.country.toUpperCase(), 20)}${RESET} ${padNum(row.clicks, 10)} ${padNum(row.impressions, 12)}`
    )
  }
  return lines.join("\n") + "\n"
}

export function formatMonthlyTable(rows: MonthlyRow[]): string {
  if (rows.length === 0) return header("EVOLUCIÓ MENSUAL") + "  Cap dada disponible.\n"

  const lines: string[] = [header("EVOLUCIÓ MENSUAL")]
  lines.push(
    `  ${DIM}${pad("Mes", 12)} ${padNum("Clics" as unknown as number, 10)} ${padNum("Impressions" as unknown as number, 12)}  Tendència${RESET}`
  )
  lines.push(`  ${separator(55)}`)

  const maxImpressions = Math.max(...rows.map((r) => r.impressions), 1)

  for (const row of rows) {
    const barLen = Math.round((row.impressions / maxImpressions) * 20)
    const bar = `${CYAN}${"█".repeat(barLen)}${"░".repeat(20 - barLen)}${RESET}`
    lines.push(
      `  ${GREEN}${pad(row.month, 12)}${RESET} ${padNum(row.clicks, 10)} ${padNum(row.impressions, 12)}  ${bar}`
    )
  }
  return lines.join("\n") + "\n"
}
