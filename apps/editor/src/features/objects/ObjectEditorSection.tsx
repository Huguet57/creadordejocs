import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from "react"
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
  const [activeEventId, setActiveEventId] = useState<string | null>(null)
  const [selectNewestListener, setSelectNewestListener] = useState(false)

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

  useEffect(() => {
    if (!selectedObject) {
      setActiveEventId(null)
      return
    }

    if (selectNewestListener) {
      setActiveEventId(selectedObject.events[selectedObject.events.length - 1]?.id ?? null)
      setSelectNewestListener(false)
      return
    }

    if (!activeEventId || !selectedObject.events.some((eventEntry) => eventEntry.id === activeEventId)) {
      setActiveEventId(selectedObject.events[0]?.id ?? null)
    }
  }, [selectedObject, activeEventId, selectNewestListener])

  const activeEvent = selectedObject?.events.find((eventEntry) => eventEntry.id === activeEventId) ?? null

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

        <div className="mvp3-object-editor-grid grid gap-3 lg:grid-cols-[220px_240px_1fr]">
          <aside className="mvp3-object-sidebar rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600">Objects</p>
            <div className="mvp3-object-sidebar-list mt-2 flex flex-col gap-2">
              {controller.project.objects.length === 0 && (
                <p className="text-xs text-slate-500">Encara no hi ha objectes.</p>
              )}
              {controller.project.objects.map((objectEntry) => (
                <button
                  key={objectEntry.id}
                  type="button"
                  className={`mvp3-object-sidebar-item rounded border px-2 py-1 text-left text-xs ${
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
            <Button
              data-testid="delete-object-button"
              variant="outline"
              className="mvp3-object-delete-button mt-3 w-full"
              onClick={() => controller.deleteSelectedObject()}
              disabled={!selectedObject}
            >
              Delete selected object
            </Button>
          </aside>

          <aside className="mvp3-listener-sidebar rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600">Listeners</p>
            {!selectedObject ? (
              <p className="mt-2 text-xs text-slate-500">Selecciona un objecte primer.</p>
            ) : (
              <>
                <div className="mvp3-listener-add mt-2 space-y-2">
                  <select
                    data-testid="object-event-type-select"
                    className="mvp3-listener-type-select h-9 w-full rounded border border-slate-300 px-2 text-sm"
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
                      className="mvp3-listener-key-select h-9 w-full rounded border border-slate-300 px-2 text-sm"
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
                    className="mvp3-listener-add-button w-full"
                    onClick={() => {
                      controller.addObjectEvent(eventType, eventType === "Keyboard" ? eventKey : null, null)
                      setSelectNewestListener(true)
                    }}
                  >
                    + Add listener
                  </Button>
                </div>

                <div className="mvp3-listener-sidebar-list mt-3 flex flex-col gap-2">
                  {selectedObject.events.length === 0 && (
                    <p className="text-xs text-slate-500">No listeners yet.</p>
                  )}
                  {selectedObject.events.map((eventEntry) => (
                    <div
                      key={eventEntry.id}
                      className={`mvp2-object-event-row rounded border p-2 ${
                        activeEventId === eventEntry.id ? "border-slate-900 bg-slate-100" : "border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        className="mvp3-listener-select-button w-full text-left text-xs font-semibold"
                        onClick={() => setActiveEventId(eventEntry.id)}
                      >
                        {eventEntry.type}
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mvp3-listener-remove-button mt-2 h-7 w-full px-2"
                        onClick={() => {
                          controller.removeObjectEvent(eventEntry.id)
                          if (activeEventId === eventEntry.id) {
                            setActiveEventId(null)
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>

          <section className="mvp3-action-editor rounded-md border border-slate-200 p-3">
            {!selectedObject ? (
              <p className="text-sm text-slate-500">Selecciona un objecte per programar-lo.</p>
            ) : (
              <div className="space-y-3">
                <div className="mvp3-object-properties grid grid-cols-2 gap-2">
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

                {!activeEvent ? (
                  <p className="text-sm text-slate-500">Selecciona un listener a la sidebar central.</p>
                ) : (
                  <div className="mvp3-listener-editor space-y-3 rounded border border-slate-200 p-3">
                    <p className="text-xs font-semibold text-slate-700">Listener: {activeEvent.type}</p>

                    {activeEvent.type === "Keyboard" && (
                      <div className="mvp3-listener-key-config">
                        <Label className="text-xs">Trigger key</Label>
                        <select
                          className="mvp3-listener-key-config-select mt-1 h-8 rounded border border-slate-300 px-2 text-xs"
                          value={activeEvent.key ?? "ArrowLeft"}
                          onChange={(event) =>
                            controller.updateObjectEventConfig(
                              activeEvent.id,
                              event.target.value as ObjectEventKey,
                              activeEvent.targetObjectId
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

                    {activeEvent.type === "Collision" && (
                      <div className="mvp3-listener-collision-config">
                        <Label className="text-xs">Collision target</Label>
                        <select
                          className="mvp3-listener-collision-config-select mt-1 h-8 rounded border border-slate-300 px-2 text-xs"
                          value={activeEvent.targetObjectId ?? "any"}
                          onChange={(event) =>
                            controller.updateObjectEventConfig(
                              activeEvent.id,
                              activeEvent.key,
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

                    <div className="mvp3-action-add-row flex gap-2">
                      <select
                        className="mvp3-action-type-select h-8 rounded border border-slate-300 px-2 text-xs"
                        value={actionTypeByEvent[activeEvent.id] ?? "move"}
                        onChange={(event) =>
                          setActionTypeByEvent((previous) => ({
                            ...previous,
                            [activeEvent.id]: event.target.value as ObjectActionType
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
                          const nextType = actionTypeByEvent[activeEvent.id] ?? "move"
                          const nextAction = defaultActionFromType(nextType)
                          if (!nextAction) return
                          controller.addObjectEventAction(activeEvent.id, nextAction)
                        }}
                      >
                        + Action block
                      </Button>
                    </div>

                    <ul className="mvp3-action-list space-y-2">
                      {activeEvent.actions.length === 0 && (
                        <li className="text-xs text-slate-500">No actions yet. Add one with guided blocks.</li>
                      )}
                      {activeEvent.actions.map((actionEntry, index) => (
                        <li key={actionEntry.id} className="mvp2-object-action-row rounded border border-slate-200 p-2">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold">{actionEntry.type}</p>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                disabled={index === 0}
                                onClick={() => controller.moveObjectEventAction(activeEvent.id, actionEntry.id, "up")}
                              >
                                Up
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                disabled={index === activeEvent.actions.length - 1}
                                onClick={() => controller.moveObjectEventAction(activeEvent.id, actionEntry.id, "down")}
                              >
                                Down
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => controller.removeObjectEventAction(activeEvent.id, actionEntry.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          {actionEntry.type === "move" && (
                            <div className="mvp3-action-move-fields grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                value={actionEntry.dx}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
                                    type: "move",
                                    dx: actionEntry.dx,
                                    dy: Number(event.target.value)
                                  })
                                }
                              />
                            </div>
                          )}

                          {actionEntry.type === "setVelocity" && (
                            <div className="mvp3-action-velocity-fields grid grid-cols-2 gap-2">
                              <Input
                                type="number"
                                value={actionEntry.speed}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
                                    type: "setVelocity",
                                    speed: actionEntry.speed,
                                    direction: Number(event.target.value)
                                  })
                                }
                              />
                            </div>
                          )}

                          {actionEntry.type === "spawnObject" && (
                            <div className="mvp3-action-spawn-fields grid grid-cols-3 gap-2">
                              <select
                                className="mvp3-action-spawn-object-select h-9 rounded border border-slate-300 px-2 text-sm"
                                value={actionEntry.objectId}
                                onChange={(event) =>
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                                  controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                              className="mvp3-action-change-score-input"
                              type="number"
                              value={actionEntry.delta}
                              onChange={(event) =>
                                controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
                                  type: "changeScore",
                                  delta: Number(event.target.value)
                                })
                              }
                            />
                          )}

                          {actionEntry.type === "endGame" && (
                            <Input
                              className="mvp3-action-endgame-input"
                              value={actionEntry.message}
                              onChange={(event) =>
                                controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
                                  type: "endGame",
                                  message: event.target.value || "Game over"
                                })
                              }
                            />
                          )}

                          {actionEntry.type === "playSound" && (
                            <select
                              className="mvp3-action-sound-select h-9 rounded border border-slate-300 px-2 text-sm"
                              value={actionEntry.soundId}
                              onChange={(event) =>
                                controller.updateObjectEventAction(activeEvent.id, actionEntry.id, {
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
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  )
}
