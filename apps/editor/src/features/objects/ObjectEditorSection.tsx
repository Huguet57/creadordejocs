import { useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { ObjectActionDraft } from "@creadordejocs/project-format"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import {
  OBJECT_ACTION_TYPES,
  OBJECT_EVENT_KEYS,
  OBJECT_EVENT_TYPES,
  type ObjectActionType,
  type ObjectEventKey,
  type ObjectEventType
} from "../editor-state/types.js"
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
  const [eventKey, setEventKey] = useState<ObjectEventKey>("ArrowLeft")
  const [actionTypeByEvent, setActionTypeByEvent] = useState<Record<string, ObjectActionType>>({})

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  const selectedObject = controller.selectedObject
  const selectableTargetObjects = useMemo(
    () => controller.project.objects.filter((objectEntry) => objectEntry.id !== selectedObject?.id),
    [controller.project.objects, selectedObject?.id]
  )

  const defaultActionFromType = (type: ObjectActionType): ObjectActionDraft | null => {
    if (type === "move") return { type: "move", dx: 0, dy: 0 }
    if (type === "setVelocity") return { type: "setVelocity", speed: 1, direction: 0 }
    if (type === "clampToRoom") return { type: "clampToRoom" }
    if (type === "destroySelf") return { type: "destroySelf" }
    if (type === "changeScore") return { type: "changeScore", delta: 1 }
    if (type === "endGame") return { type: "endGame", message: "Game over" }
    if (type === "spawnObject") {
      const target = selectableTargetObjects[0]
      if (!target) return null
      return { type: "spawnObject", objectId: target.id, offsetX: 0, offsetY: 0 }
    }
    if (type === "playSound") {
      const sound = controller.project.resources.sounds[0]
      if (!sound) return null
      return { type: "playSound", soundId: sound.id }
    }
    return null
  }

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
                  className="mvp2-object-event-select h-9 rounded border border-slate-300 px-2 text-sm"
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value as ObjectEventType)}
                >
                  {OBJECT_EVENT_TYPES.map((eventOption) => (
                    <option key={eventOption} value={eventOption}>
                      {eventOption}
                    </option>
                  ))}
                </select>
                {eventType === "Keyboard" && (
                  <select
                    className="mvp2-object-event-key-select h-9 rounded border border-slate-300 px-2 text-sm"
                    value={eventKey}
                    onChange={(event) => setEventKey(event.target.value as ObjectEventKey)}
                  >
                    {OBJECT_EVENT_KEYS.map((keyOption) => (
                      <option key={keyOption} value={keyOption}>
                        {keyOption}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  data-testid="add-object-event-button"
                  onClick={() =>
                    controller.addObjectEvent(eventType, eventType === "Keyboard" ? eventKey : null, null)
                  }
                >
                  + Add listener
                </Button>
              </div>

              <ul className="mt-3 space-y-2">
                {selectedObject.events.length === 0 && (
                  <li className="text-xs text-slate-500">No listeners yet. Add one from the selector.</li>
                )}
                {selectedObject.events.map((eventEntry) => (
                  <li key={eventEntry.id} className="mvp2-object-event-row rounded border border-slate-200 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{eventEntry.type}</p>
                      <Button variant="outline" size="sm" onClick={() => controller.removeObjectEvent(eventEntry.id)}>
                        Remove
                      </Button>
                    </div>
                    {eventEntry.type === "Keyboard" && (
                      <div className="mvp2-object-event-config mt-2">
                        <Label className="text-xs">Trigger key</Label>
                        <select
                          className="mvp2-object-event-key-config mt-1 h-8 rounded border border-slate-300 px-2 text-xs"
                          value={eventEntry.key ?? "ArrowLeft"}
                          onChange={(event) =>
                            controller.updateObjectEventConfig(
                              eventEntry.id,
                              event.target.value as ObjectEventKey,
                              eventEntry.targetObjectId
                            )
                          }
                        >
                          {OBJECT_EVENT_KEYS.map((keyOption) => (
                            <option key={keyOption} value={keyOption}>
                              {keyOption}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {eventEntry.type === "Collision" && (
                      <div className="mvp2-object-event-config mt-2">
                        <Label className="text-xs">Collision target</Label>
                        <select
                          className="mvp2-object-event-collision-config mt-1 h-8 rounded border border-slate-300 px-2 text-xs"
                          value={eventEntry.targetObjectId ?? "any"}
                          onChange={(event) =>
                            controller.updateObjectEventConfig(
                              eventEntry.id,
                              eventEntry.key,
                              event.target.value === "any" ? null : event.target.value
                            )
                          }
                        >
                          <option value="any">Any object</option>
                          {selectableTargetObjects.map((objectEntry) => (
                            <option key={objectEntry.id} value={objectEntry.id}>
                              {objectEntry.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="mvp2-object-action-add mt-2 flex gap-2">
                      <select
                        className="mvp2-object-action-type-select h-8 rounded border border-slate-300 px-2 text-xs"
                        value={actionTypeByEvent[eventEntry.id] ?? "move"}
                        onChange={(event) =>
                          setActionTypeByEvent((previous) => ({
                            ...previous,
                            [eventEntry.id]: event.target.value as ObjectActionType
                          }))
                        }
                      >
                        {OBJECT_ACTION_TYPES.map((actionType) => (
                          <option key={actionType} value={actionType}>
                            {actionType}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nextType = actionTypeByEvent[eventEntry.id] ?? "move"
                          const nextAction = defaultActionFromType(nextType)
                          if (!nextAction) return
                          controller.addObjectEventAction(eventEntry.id, nextAction)
                        }}
                      >
                        + Action block
                      </Button>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {eventEntry.actions.length === 0 && (
                        <li className="text-xs text-slate-500">No actions yet. Add one with guided blocks.</li>
                      )}
                      {eventEntry.actions.map((actionEntry, index) => (
                        <li key={actionEntry.id} className="mvp2-object-action-row rounded border border-slate-200 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">{actionEntry.type}</p>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                disabled={index === 0}
                                onClick={() => controller.moveObjectEventAction(eventEntry.id, actionEntry.id, "up")}
                              >
                                Up
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                disabled={index === eventEntry.actions.length - 1}
                                onClick={() => controller.moveObjectEventAction(eventEntry.id, actionEntry.id, "down")}
                              >
                                Down
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => controller.removeObjectEventAction(eventEntry.id, actionEntry.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          {actionEntry.type === "move" && (
                            <div className="mvp2-action-move grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                value={actionEntry.dx}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "move",
                                    dx: Number(event.target.value),
                                    dy: actionEntry.dy
                                  })
                                }
                              />
                              <Input
                                type="number"
                                value={actionEntry.dy}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "move",
                                    dx: actionEntry.dx,
                                    dy: Number(event.target.value)
                                  })
                                }
                              />
                            </div>
                          )}
                          {actionEntry.type === "setVelocity" && (
                            <div className="mvp2-action-set-velocity grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                value={actionEntry.speed}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "setVelocity",
                                    speed: Number(event.target.value),
                                    direction: actionEntry.direction
                                  })
                                }
                              />
                              <Input
                                type="number"
                                value={actionEntry.direction}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "setVelocity",
                                    speed: actionEntry.speed,
                                    direction: Number(event.target.value)
                                  })
                                }
                              />
                            </div>
                          )}
                          {actionEntry.type === "spawnObject" && (
                            <div className="mvp2-action-spawn grid grid-cols-3 gap-2">
                              <select
                                className="h-9 rounded border border-slate-300 px-2 text-sm"
                                value={actionEntry.objectId}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "spawnObject",
                                    objectId: event.target.value,
                                    offsetX: actionEntry.offsetX,
                                    offsetY: actionEntry.offsetY
                                  })
                                }
                              >
                                {selectableTargetObjects.map((objectEntry) => (
                                  <option key={objectEntry.id} value={objectEntry.id}>
                                    {objectEntry.name}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                value={actionEntry.offsetX}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "spawnObject",
                                    objectId: actionEntry.objectId,
                                    offsetX: Number(event.target.value),
                                    offsetY: actionEntry.offsetY
                                  })
                                }
                              />
                              <Input
                                type="number"
                                value={actionEntry.offsetY}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                    type: "spawnObject",
                                    objectId: actionEntry.objectId,
                                    offsetX: actionEntry.offsetX,
                                    offsetY: Number(event.target.value)
                                  })
                                }
                              />
                            </div>
                          )}
                          {actionEntry.type === "changeScore" && (
                            <Input
                              className="mvp2-action-score"
                              type="number"
                              value={actionEntry.delta}
                              onChange={(event) =>
                                controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                  type: "changeScore",
                                  delta: Number(event.target.value)
                                })
                              }
                            />
                          )}
                          {actionEntry.type === "endGame" && (
                            <Input
                              className="mvp2-action-endgame"
                              value={actionEntry.message}
                              onChange={(event) =>
                                controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                  type: "endGame",
                                  message: event.target.value || "Game over"
                                })
                              }
                            />
                          )}
                          {actionEntry.type === "playSound" && (
                            <select
                              className="mvp2-action-sound h-9 rounded border border-slate-300 px-2 text-sm"
                              value={actionEntry.soundId}
                              onChange={(event) =>
                                controller.updateObjectEventAction(eventEntry.id, actionEntry.id, {
                                  type: "playSound",
                                  soundId: event.target.value
                                })
                              }
                            >
                              {controller.project.resources.sounds.map((soundEntry) => (
                                <option key={soundEntry.id} value={soundEntry.id}>
                                  {soundEntry.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </li>
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
