import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320

type RunSectionProps = {
  controller: EditorController
}

export function RunSection({ controller }: RunSectionProps) {
  return (
    <Card className="mvp15-run-panel">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Run preview</CardTitle>
        <div className="flex gap-2">
          <Button onClick={() => controller.run()}>Run</Button>
          <Button variant="secondary" onClick={() => controller.reset()}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-600">
          Previsualització activa de la sala: <strong>{controller.activeRoom?.name ?? "cap"}</strong>
        </p>
        <div
          className="mvp15-run-canvas relative rounded-md border border-dashed border-slate-300 bg-white"
          style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
        >
          {controller.activeRoom?.instances.map((instanceEntry) => {
            const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
            return (
              <div
                key={instanceEntry.id}
                className="mvp15-run-instance absolute flex h-8 w-8 items-center justify-center rounded bg-indigo-500 text-[10px] text-white"
                style={{ left: instanceEntry.x, top: instanceEntry.y }}
              >
                {objectEntry?.name.slice(0, 2).toUpperCase() ?? "??"}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
