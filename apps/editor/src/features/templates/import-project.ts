import { loadProjectV1, type ProjectV1 } from "@creadordejocs/project-format"

type ImportProjectDeps = {
  readText?: (file: File) => Promise<string>
  parseProject?: (source: string) => ProjectV1
}

export function readProjectFileAsText(file: File): Promise<string> {
  return file.text()
}

export async function importProjectFromFile(file: File, deps: ImportProjectDeps = {}): Promise<ProjectV1> {
  const readText = deps.readText ?? readProjectFileAsText
  const parseProject = deps.parseProject ?? loadProjectV1
  const source = await readText(file)
  return parseProject(source)
}
