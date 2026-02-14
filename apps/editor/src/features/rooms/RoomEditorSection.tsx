import { useState, type ChangeEvent, type KeyboardEvent } from "react"
import type { EditorController } from "../editor-state/use-editor-controller.js"
import { Button } from "../../components/ui/button.js"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card.js"
import { Input } from "../../components/ui/input.js"
import { Label } from "../../components/ui/label.js"

const ROOM_WIDTH = 560
const ROOM_HEIGHT = 320

type RoomEditorSectionProps = {
  controller: EditorController
}

export function RoomEditorSection({ controller }: RoomEditorSectionProps) {
  const [roomName, setRoomName] = useState("Sala nova")

  const blockUndoShortcuts = (event: KeyboardEvent<HTMLInputElement>): void => {
    if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
      event.preventDefault()
    }
  }

  return (
    <Card className="mvp15-room-editor-panel">
      <CardHeader>
        <CardTitle>Room editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="room-name-input">Create room</Label>
          <div className="flex gap-2">
            <Input
              id="room-name-input"
              value={roomName}
              onKeyDown={blockUndoShortcuts}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setRoomName(event.target.value)}
            />
            <Button
              onClick={() => {
                controller.addRoom(roomName)
                setRoomName("Sala nova")
              }}
            >
              + Sala
            </Button>
          </div>
        </div>

        <div className="mvp15-room-controls flex items-center gap-2">
          <Label>Sala activa</Label>
          <select
            className="mvp15-room-select h-9 rounded border border-slate-300 px-2 text-sm"
            value={controller.activeRoom?.id ?? ""}
            onChange={(event) => controller.setActiveRoomId(event.target.value)}
          >
            {controller.project.rooms.map((roomEntry) => (
              <option key={roomEntry.id} value={roomEntry.id}>
                {roomEntry.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => controller.addInstanceToActiveRoom()}
            disabled={!controller.activeRoom || !controller.selectedObject}
          >
            + Instància
          </Button>
        </div>

        <div
          className="mvp15-room-canvas relative rounded-md border border-dashed border-slate-300 bg-white"
          style={{ width: ROOM_WIDTH, height: ROOM_HEIGHT }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            if (!controller.activeRoom) return
            const instanceId = event.dataTransfer.getData("text/plain")
            const rect = event.currentTarget.getBoundingClientRect()
            const x = Math.max(0, Math.min(ROOM_WIDTH - 32, event.clientX - rect.left - 16))
            const y = Math.max(0, Math.min(ROOM_HEIGHT - 32, event.clientY - rect.top - 16))
            controller.moveInstance(instanceId, x, y)
          }}
        >
          {controller.activeRoom?.instances.map((instanceEntry) => {
            const objectEntry = controller.project.objects.find((entry) => entry.id === instanceEntry.objectId)
            return (
              <div
                key={instanceEntry.id}
                className="mvp15-room-instance absolute flex h-8 w-8 cursor-move items-center justify-center rounded bg-blue-500 text-[10px] text-white"
                style={{ left: instanceEntry.x, top: instanceEntry.y }}
                draggable
                onDragStart={(event) => event.dataTransfer.setData("text/plain", instanceEntry.id)}
                title={
                  objectEntry
                    ? `${objectEntry.name} (${Math.round(instanceEntry.x)}, ${Math.round(instanceEntry.y)})`
                    : "Instance"
                }
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
