import type { EditorController } from "../features/editor-state/use-editor-controller.js"
import { Button } from "../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.js"

type EditorInspectorPanelProps = {
  controller: EditorController
}

export function EditorInspectorPanel({ controller }: EditorInspectorPanelProps) {
  return (
    <Card className="mvp15-inspector-panel">
      <CardHeader>
        <CardTitle>Inspector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {controller.selectedObject ? (
          <div className="rounded-md border border-slate-200 p-2 text-xs text-slate-600">
            <p className="font-medium text-slate-800">{controller.selectedObject.name}</p>
            <p>
              pos: ({controller.selectedObject.x}, {controller.selectedObject.y})
            </p>
            <p>
              speed/direction: {controller.selectedObject.speed} / {controller.selectedObject.direction}
            </p>
            <p>listeners: {controller.selectedObject.events.length}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Selecciona un objecte per veure detall contextual.</p>
        )}

        <div className="mvp15-snapshots-panel rounded-md border border-slate-200 p-2">
          <p className="text-xs font-semibold text-slate-600">Snapshots locals</p>
          <ul className="mt-2 space-y-1">
            {controller.snapshots.length === 0 && <li className="text-xs text-slate-500">No hi ha snapshots encara.</li>}
            {controller.snapshots.map((snapshotEntry) => (
              <li
                key={snapshotEntry.id}
                className="mvp15-snapshot-row flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate">{snapshotEntry.label}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => controller.restoreSnapshot(snapshotEntry.id)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
