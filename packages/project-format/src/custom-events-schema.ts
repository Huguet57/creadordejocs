export type CustomEventTriggerConfig = {
  eventName: string
  sourceObjectId: string | null
}

export type EmitCustomEventActionFields = {
  eventName: string
  payload: number | string | boolean
}

export const CUSTOM_EVENT_DEFAULTS: CustomEventTriggerConfig = {
  eventName: "event",
  sourceObjectId: null
}

export const EMIT_CUSTOM_EVENT_DEFAULTS: EmitCustomEventActionFields = {
  eventName: "event",
  payload: 0
}
