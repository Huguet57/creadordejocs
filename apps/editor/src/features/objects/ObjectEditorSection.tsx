import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { OBJECT_EVENT_TYPES, type ObjectEventType } from "../editor-state/types.js"
import { Button } from "../../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js"
import { Input } from "../../components/ui/input.js"
import { Label } from "../../components/ui/label.js"

type ObjectEditorSectionProps = {
  controller: EditorController
}

export function ObjectEditorSection({ controller }: ObjectEditorSectionProps) {
  const [objectName, setObjectName] = useState("Objecte nou")
  const [eventType, setEventType] = useState<ObjectEventType>("Create")
  const [actionDraftByEvent, setActionDraftByEvent] = useState<Record<string, string>>({})

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const selectedObject = controller.selectedObject

  return (
    <Card className="mvp15-object-editor-panel">
      <CardHeader>
        <CardTitle>Object editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="object-name-input">Object name</Label>
          <div className="flex gap-2">
            <Input
              id="object-name-input"
              data-testid="object-name-input"
              value={objectName}
              onKeyDown={blockUndoShortcuts}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setObjectName(event.target.value)}
            />
            <Button
              data-testid="add-object-button"
              onClick={() => {
                controller.addObject(objectName)
                setObjectName("Objecte nou")
              }}
            >
              + Objecte
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">Objects list</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {controller.project.objects.map((objectEntry) => (
              <button
                key={objectEntry.id}
                type="button"
                className={`mvp15-object-chip rounded border px-2 py-1 text-xs ${
                  controller.activeObjectId === objectEntry.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-slate-100"
                }`}
                onClick={() => controller.setActiveObjectId(objectEntry.id)}
              >
                {objectEntry.name}
              </button>
            ))}
          </div>
        </div>

        {!selectedObject ? (
          <p className="text-sm text-slate-500">Selecciona un objecte per programar-lo.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>x</Label>
                <Input
                  data-testid="inspector-x-input"
                  type="number"
                  value={selectedObject.x}
                  onKeyDown={blockUndoShortcuts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    controller.updateSelectedObjectProperty("x", Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>y</Label>
                <Input
                  type="number"
                  value={selectedObject.y}
                  onKeyDown={blockUndoShortcuts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    controller.updateSelectedObjectProperty("y", Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>speed</Label>
                <Input
                  type="number"
                  value={selectedObject.speed}
                  onKeyDown={blockUndoShortcuts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    controller.updateSelectedObjectProperty("speed", Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>direction</Label>
                <Input
                  type="number"
                  value={selectedObject.direction}
                  onKeyDown={blockUndoShortcuts}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    controller.updateSelectedObjectProperty("direction", Number(event.target.value))
                  }
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-600">Listeners (GM-like core)</p>
              <div className="mt-2 flex gap-2">
                <select
                  data-testid="object-event-type-select"
                  className="mvp15-object-event-select h-9 rounded border border-slate-300 px-2 text-sm"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as ObjectEventType)}
                >
                  {OBJECT_EVENT_TYPES.map((eventOption) => (
                    <option key={eventOption} value={eventOption}>
                      {eventOption}
                    </option>
                  ))}
                </select>
                <Button data-testid="add-object-event-button" onClick={() => controller.addObjectEvent(eventType)}>
                  + Add listener
                </Button>
              </div>

              <ul className="mt-3 space-y-2">
                {selectedObject.events.length === 0 && (
                  <li className="text-xs text-slate-500">No listeners yet. Add one from the selector.</li>
                )}
                {selectedObject.events.map((eventEntry) => (
                  <li key={eventEntry.id} className="mvp15-object-event-row rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{eventEntry.type}</p>
                      <Button variant="outline" size="sm" onClick={() => controller.removeObjectEvent(eventEntry.id)}>
                        Remove
                      </Button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="ex: move x by speed"
                        value={actionDraftByEvent[eventEntry.id] ?? ""}
                        onKeyDown={blockUndoShortcuts}
                        onChange={(event: ChangeEvent<HTMLInputElement>) =>
                          setActionDraftByEvent((previous) => ({
                            ...previous,
                            [eventEntry.id]: event.target.value
                          }))
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          controller.addObjectEventAction(eventEntry.id, actionDraftByEvent[eventEntry.id] ?? "")
                          setActionDraftByEvent((previous) => ({ ...previous, [eventEntry.id]: "" }))
                        }}
                      >
                        + Action
                      </Button>
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-xs text-slate-600">
                      {eventEntry.actions.length === 0 && <li>Placeholder sense accions encara.</li>}
                      {eventEntry.actions.map((actionText, index) => (
                        <li key={`${eventEntry.id}-${index}`}>{actionText}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>

            <Button data-testid="delete-object-button" variant="outline" onClick={() => controller.deleteSelectedObject()}>
              Delete selected object
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
