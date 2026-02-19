import { useMemo } from "react"
import { Bug } from "lucide-react"
import type { ProjectV1 } from "@creadordejocs/project-format"
import type { RuntimeState } from "../editor-state/runtime.js"

type InstanceDebugPanelProps = {
  project: ProjectV1
  runtimeState: RuntimeState
  activeRoom: ProjectV1["rooms"][number] | null
  isRunning: boolean
  debugEnabled: boolean
  onDebugEnabledChange: (enabled: boolean) => void
  selectedInstanceId: string | null
  onSelectedInstanceIdChange: (id: string | null) => void
}

function formatRuntimeVariableValue(
  value: string | number | boolean | (string | number | boolean)[] | Record<string, string | number | boolean> | undefined
): string {
  if (value === undefined) {
    return "–"
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return JSON.stringify(value)
}

export function InstanceDebugPanel({
  project,
  runtimeState,
  activeRoom,
  isRunning,
  debugEnabled,
  onDebugEnabledChange,
  selectedInstanceId,
  onSelectedInstanceIdChange
}: InstanceDebugPanelProps) {
  const selectedInstance = selectedInstanceId !== null && activeRoom
    ? activeRoom.instances.find((inst) => inst.id === selectedInstanceId) ?? null
    : null
  const selectedInstanceObject = selectedInstance
    ? project.objects.find((obj) => obj.id === selectedInstance.objectId) ?? null
    : null

  const selectedInstanceVariableEntries = useMemo(() => {
    if (!selectedInstance || !selectedInstanceObject) return []
    const definitions = project.variables.objectByObjectId[selectedInstanceObject.id] ?? []
    const instanceVars = runtimeState.objectInstanceVariables[selectedInstance.id] ?? {}
    return definitions.map((def) => ({
      id: def.id,
      name: def.name,
      value: instanceVars[def.id]
    }))
  }, [selectedInstance, selectedInstanceObject, project.variables.objectByObjectId, runtimeState.objectInstanceVariables])

  const instanceSelectorOptions = useMemo(() => {
    if (!activeRoom || !isRunning) return []
    const grouped = new Map<string, { instanceId: string; objectName: string; index: number }[]>()
    for (const [index, inst] of activeRoom.instances.entries()) {
      const obj = project.objects.find((o) => o.id === inst.objectId)
      const objectName = obj?.name ?? "???"
      const existing = grouped.get(inst.objectId) ?? []
      existing.push({ instanceId: inst.id, objectName, index })
      grouped.set(inst.objectId, existing)
    }
    return Array.from(grouped.entries()).map(([objectId, instances]) => ({
      objectId,
      objectName: instances[0]?.objectName ?? "???",
      instances
    }))
  }, [activeRoom, isRunning, project.objects])

  return (
    <div className="mvp-run-debug space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Debug</p>
        <button
          type="button"
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
            debugEnabled
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-500"
          }`}
          onClick={() => onDebugEnabledChange(!debugEnabled)}
          title={debugEnabled ? "Desactiva debug" : "Activa debug"}
        >
          <Bug className="h-3 w-3" />
          {debugEnabled ? "ON" : "OFF"}
        </button>
      </div>
      {debugEnabled && isRunning && activeRoom && (
        <>
          <select
            className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
            value={selectedInstanceId ?? ""}
            onChange={(e) => onSelectedInstanceIdChange(e.target.value || null)}
          >
            <option value="">-- Cap --</option>
            {instanceSelectorOptions.map((group) => (
              <optgroup key={group.objectId} label={group.objectName}>
                {group.instances.map((entry) => (
                  <option key={entry.instanceId} value={entry.instanceId}>
                    {entry.objectName} #{entry.index + 1}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedInstance && selectedInstanceObject && (
            <div className="mvp-run-debug-instance space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Objecte</span>
                <span className="text-xs font-medium text-slate-800">{selectedInstanceObject.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">x</span>
                <span className="text-xs font-medium text-slate-800">{Math.round(selectedInstance.x)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">y</span>
                <span className="text-xs font-medium text-slate-800">{Math.round(selectedInstance.y)}</span>
              </div>
              {selectedInstanceVariableEntries.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pt-1">Variables</p>
                  {selectedInstanceVariableEntries.map((entry) => (
                    <div key={entry.id} className="mvp-run-debug-var-row flex items-center justify-between">
                      <span className="text-xs text-slate-500">{entry.name}</span>
                      <span className="text-xs font-medium text-slate-800">
                        {formatRuntimeVariableValue(entry.value)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
