import type { ReactNode } from "react"

type EditorSidebarLayoutProps = {
  classNamePrefix: string
  className?: string
  isCollapsed?: boolean
  expandedWidthClass: string
  collapsedWidthClass?: string
  header: ReactNode
  body: ReactNode
  footer?: ReactNode
  overlay?: ReactNode
}

export function EditorSidebarLayout({
  classNamePrefix,
  className,
  isCollapsed = false,
  expandedWidthClass,
  collapsedWidthClass = "w-10",
  header,
  body,
  footer,
  overlay
}: EditorSidebarLayoutProps) {
  return (
    <aside
      className={`${classNamePrefix}-container flex shrink-0 flex-col overflow-hidden bg-slate-50 transition-[width] duration-200 ease-in-out ${
        isCollapsed ? collapsedWidthClass : expandedWidthClass
      } ${className ?? ""}`}
    >
      {header}
      {!isCollapsed && body}
      {!isCollapsed && footer}
      {overlay}
    </aside>
  )
}
