import * as React from "react"
import { cn } from "../../lib/utils.js"

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("rounded-lg border border-slate-200 bg-white shadow-sm", className)} {...props} />
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("flex flex-col space-y-1.5 p-4", className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>): React.JSX.Element {
  return <h3 className={cn("text-sm font-semibold leading-none tracking-tight", className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("p-4 pt-0", className)} {...props} />
}
