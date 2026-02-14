import * as React from "react"
import { cn } from "../../lib/utils.js"

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element {
  return <label className={cn("text-xs font-medium text-slate-700", className)} {...props} />
}
