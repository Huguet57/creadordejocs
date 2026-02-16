export type ActionDropTarget = {
  targetIfBlockId?: string
  targetBranch?: "then" | "else"
  targetActionId?: string
  position?: "top" | "bottom"
}
