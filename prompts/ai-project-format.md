# Game Creator Project Format -- AI Agent Reference

This document describes the JSON schema for the Game Creator project format (v1). Use it to generate valid, importable `.json` files that the editor can load via **File > Import**.

The editor validates every imported file through Zod (`ProjectSchemaV1.parse()`). Missing required fields or wrong types cause a hard parse failure. Extra fields are silently stripped.

---

## Quick Start -- Minimal Valid Project

A complete, importable project with one sprite, one object, and one room:

```json
{
  "version": 1,
  "metadata": {
    "id": "proj-00000000-0000-4000-8000-000000000001",
    "name": "My Game",
    "locale": "ca",
    "createdAtIso": "2026-01-15T10:00:00.000Z"
  },
  "resources": {
    "sprites": [
      {
        "id": "sprite-00000000-0000-4000-8000-000000000001",
        "name": "player",
        "folderId": null,
        "imagePath": "",
        "assetSource": "",
        "uploadStatus": "notConnected",
        "width": 4,
        "height": 4,
        "pixelsRgba": [
          "#00000000","#3B82F6FF","#3B82F6FF","#00000000",
          "#3B82F6FF","#3B82F6FF","#3B82F6FF","#3B82F6FF",
          "#3B82F6FF","#3B82F6FF","#3B82F6FF","#3B82F6FF",
          "#00000000","#3B82F6FF","#3B82F6FF","#00000000"
        ],
        "frames": [
          {
            "id": "frame-00000000-0000-4000-8000-000000000001",
            "pixelsRgba": [
              "#00000000","#3B82F6FF","#3B82F6FF","#00000000",
              "#3B82F6FF","#3B82F6FF","#3B82F6FF","#3B82F6FF",
              "#3B82F6FF","#3B82F6FF","#3B82F6FF","#3B82F6FF",
              "#00000000","#3B82F6FF","#3B82F6FF","#00000000"
            ]
          }
        ]
      }
    ],
    "sounds": []
  },
  "variables": {
    "global": [],
    "objectByObjectId": {}
  },
  "objects": [
    {
      "id": "object-00000000-0000-4000-8000-000000000001",
      "name": "Player",
      "folderId": null,
      "spriteId": "sprite-00000000-0000-4000-8000-000000000001",
      "x": 0,
      "y": 0,
      "speed": 0,
      "direction": 0,
      "width": 32,
      "height": 32,
      "visible": true,
      "solid": false,
      "events": []
    }
  ],
  "rooms": [
    {
      "id": "room-00000000-0000-4000-8000-000000000001",
      "name": "Room 1",
      "folderId": null,
      "width": 768,
      "height": 512,
      "backgroundSpriteId": null,
      "instances": [
        {
          "id": "instance-00000000-0000-4000-8000-000000000001",
          "objectId": "object-00000000-0000-4000-8000-000000000001",
          "x": 368,
          "y": 240
        }
      ]
    }
  ],
  "scenes": [],
  "metrics": {
    "appStart": 0,
    "projectLoad": 0,
    "runtimeErrors": 0,
    "tutorialCompletion": 0,
    "stuckRate": 0,
    "timeToFirstPlayableFunMs": null
  }
}
```

Key rules:
- `version` must be exactly `1` (number, not string)
- `metadata.locale` must be exactly `"ca"`
- `metadata.createdAtIso` must be a valid ISO 8601 datetime
- `scenes` is always `[]` (backwards compatibility)
- `metrics` must include all six fields shown above

---

## ID Convention

All IDs follow the format `{prefix}-{uuid-v4}`. Every ID must be a non-empty string and unique across the project.

| Entity | Prefix | Example |
|---|---|---|
| Sprite | `sprite` | `sprite-a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d` |
| Sprite frame | `frame` | `frame-...` |
| Object | `object` | `object-...` |
| Event | `event` | `event-...` |
| Item (action wrapper) | `item` | `item-...` |
| Action | `action` | `action-...` |
| Room | `room` | `room-...` |
| Instance | `instance` | `instance-...` |
| Global variable | `globalVar` | `globalVar-...` |
| Object variable | `objectVar` | `objectVar-...` |
| Sound | `sound` | `sound-...` |
| If block | `if` | `if-...` |
| Repeat/forEach block | `block` | `block-...` |
| Sprite folder | `sprite-folder` | `sprite-folder-...` |
| Object folder | `object-folder` | `object-folder-...` |
| Room folder | `room-folder` | `room-folder-...` |

---

## Variables

### Global Variables

Located at `project.variables.global[]`. Five types:

**Number:**
```json
{ "id": "globalVar-...", "name": "score", "type": "number", "initialValue": 0 }
```

**String:**
```json
{ "id": "globalVar-...", "name": "playerName", "type": "string", "initialValue": "" }
```

**Boolean:**
```json
{ "id": "globalVar-...", "name": "isGameOver", "type": "boolean", "initialValue": false }
```

**List** (requires `itemType`):
```json
{
  "id": "globalVar-...", "name": "inventory", "type": "list",
  "itemType": "string", "initialValue": ["sword", "shield"]
}
```

**Map** (requires `itemType`):
```json
{
  "id": "globalVar-...", "name": "stats", "type": "map",
  "itemType": "number", "initialValue": { "hp": 100, "mp": 50 }
}
```

Validation:
- `name` must be non-empty
- `itemType` must be `"number"`, `"string"`, or `"boolean"`
- For `list`: every entry in `initialValue` must match `itemType`
- For `map`: every value in `initialValue` must match `itemType`

### Object-Scoped Variables

Located at `project.variables.objectByObjectId[objectId][]`. Same five types, but ID prefix is `objectVar`. The key must match an existing object's `id`.

```json
"variables": {
  "global": [],
  "objectByObjectId": {
    "object-abc123...": [
      { "id": "objectVar-...", "name": "health", "type": "number", "initialValue": 100 }
    ]
  }
}
```

---

## Sprites

Located at `project.resources.sprites[]`.

```json
{
  "id": "sprite-{uuid}",
  "name": "PlayerSprite",
  "folderId": null,
  "imagePath": "",
  "assetSource": "",
  "uploadStatus": "notConnected",
  "width": 32,
  "height": 32,
  "pixelsRgba": ["#RRGGBBAA", "..."],
  "frames": [
    { "id": "frame-{uuid}", "pixelsRgba": ["#RRGGBBAA", "..."] }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `width`, `height` | positive integer | Minimum 1. Default 32. |
| `pixelsRgba` | `string[]` | `#RRGGBBAA` hex values, row-major order. Length **must** equal `width * height`. |
| `frames` | `SpriteFrame[]` | If omitted, auto-generated from `pixelsRgba`. Each frame's `pixelsRgba` must also have length `width * height`. |
| `imagePath` | `string` | Leave `""` for pixel-art sprites. |
| `assetSource` | `string` | Leave `""` for generated sprites. |
| `uploadStatus` | `string` | Always `"notConnected"` for JSON-imported sprites. |
| `folderId` | `string \| null` | `null` or a valid sprite-folder ID. |

Use `#00000000` for transparent pixels. A 4x4 sprite has 16 pixel entries; a 32x32 sprite has 1024.

---

## Objects

Located at `project.objects[]`.

```json
{
  "id": "object-{uuid}",
  "name": "Player",
  "folderId": null,
  "spriteId": "sprite-{uuid}",
  "x": 0,
  "y": 0,
  "speed": 0,
  "direction": 0,
  "width": 32,
  "height": 32,
  "visible": true,
  "solid": false,
  "events": []
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `spriteId` | `string \| null` | -- | Reference to a sprite, or `null` for invisible/controller objects. |
| `x`, `y` | `number` | `0` | Initial position. |
| `speed` | `number` | `0` | Initial speed. |
| `direction` | `number` | `0` | Initial direction in degrees. |
| `width`, `height` | `positive int` | `32` | Collision box size. |
| `visible` | `boolean` | `true` | Whether the object renders. |
| `solid` | `boolean` | `false` | Whether other objects collide with it. |

### Events

Each event in `object.events[]`:

```json
{
  "id": "event-{uuid}",
  "type": "Create",
  "key": null,
  "keyboardMode": null,
  "targetObjectId": null,
  "intervalMs": null,
  "items": []
}
```

**10 event types:**

| Type | Required Fields | Description |
|---|---|---|
| `Create` | -- | Fires once when instance is created |
| `Step` | -- | Fires every frame |
| `Collision` | `targetObjectId` (valid object ID) | Fires on collision with target |
| `Keyboard` | `key` | Fires on key input |
| `Mouse` | -- | Fires on mouse click on the instance |
| `OnDestroy` | -- | Fires when instance is destroyed |
| `OutsideRoom` | -- | Fires when instance leaves room bounds |
| `MouseMove` | -- | Fires when mouse moves |
| `Timer` | `intervalMs` (positive number) | Fires on interval (e.g. `1000` = 1s) |
| `CustomEvent` | `eventName` (min 1 char) | Fires when matching `emitCustomEvent` runs |

**Keyboard event keys:** `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"<any>"`

**Keyboard modes:** `"down"` (default -- held), `"press"` (just pressed), `"release"` (just released)

**Mouse modes:** `"down"` (default), `"press"`

**CustomEvent** also accepts optional `sourceObjectId` (filters which objects can emit).

#### Event examples

Keyboard event (move right while key held):
```json
{
  "id": "event-...",
  "type": "Keyboard",
  "key": "ArrowRight",
  "keyboardMode": "down",
  "targetObjectId": null,
  "intervalMs": null,
  "items": [
    {
      "id": "item-...",
      "type": "action",
      "action": { "id": "action-...", "type": "move", "dx": 5, "dy": 0 }
    }
  ]
}
```

Collision event (destroy coin on touch):
```json
{
  "id": "event-...",
  "type": "Collision",
  "key": null,
  "keyboardMode": null,
  "targetObjectId": "object-coin-id",
  "intervalMs": null,
  "items": [
    {
      "id": "item-...",
      "type": "action",
      "action": { "id": "action-...", "type": "destroyOther" }
    }
  ]
}
```

Timer event (spawn enemy every 2 seconds):
```json
{
  "id": "event-...",
  "type": "Timer",
  "key": null,
  "keyboardMode": null,
  "targetObjectId": null,
  "intervalMs": 2000,
  "items": [
    {
      "id": "item-...",
      "type": "action",
      "action": {
        "id": "action-...", "type": "spawnObject",
        "objectId": "object-enemy-id", "offsetX": 0, "offsetY": 0
      }
    }
  ]
}
```

### Event Items (Actions and Control Blocks)

The `items` array is a discriminated union by `type`. Five types:

**Action item:**
```json
{
  "id": "item-{uuid}",
  "type": "action",
  "action": { "id": "action-{uuid}", "type": "move", "dx": 5, "dy": 0 }
}
```

**If block:**
```json
{
  "id": "if-{uuid}",
  "type": "if",
  "condition": {
    "left": { "source": "globalVariable", "variableId": "globalVar-..." },
    "operator": "<=",
    "right": { "source": "literal", "value": 0 }
  },
  "thenActions": [],
  "elseActions": []
}
```

**Repeat block:**
```json
{
  "id": "block-{uuid}",
  "type": "repeat",
  "count": 3,
  "actions": []
}
```

**ForEachList block:**
```json
{
  "id": "block-{uuid}",
  "type": "forEachList",
  "scope": "global",
  "variableId": "globalVar-...",
  "itemLocalVarName": "item",
  "indexLocalVarName": "index",
  "actions": []
}
```

**ForEachMap block:**
```json
{
  "id": "block-{uuid}",
  "type": "forEachMap",
  "scope": "global",
  "variableId": "globalVar-...",
  "keyLocalVarName": "key",
  "valueLocalVarName": "value",
  "actions": []
}
```

`thenActions`, `elseActions`, and `actions` arrays contain the same discriminated union -- recursive nesting is allowed.

---

## Actions Reference

Every action lives inside an action item wrapper: `{ "id": "item-...", "type": "action", "action": { ... } }`.

Fields marked with **V** accept a plain value OR a [ValueSource](#valuesource-dynamic-values) object.

### Movement Actions

**move** -- Move relative to current position
```json
{ "id": "action-...", "type": "move", "dx": 5, "dy": 0 }
```
`dx` **V**, `dy` **V**: pixels to move.

**setVelocity** -- Set continuous velocity
```json
{ "id": "action-...", "type": "setVelocity", "speed": 3, "direction": 90 }
```
`speed` **V**, `direction` **V** (degrees).

**rotate** -- Rotate the instance
```json
{ "id": "action-...", "type": "rotate", "angle": 45, "mode": "add" }
```
`angle` **V**. `mode`: `"set"` (absolute) or `"add"` (relative).

**moveToward** -- Move toward a target
```json
{ "id": "action-...", "type": "moveToward", "targetType": "mouse", "targetObjectId": null, "speed": 2 }
```
`targetType`: `"object"` or `"mouse"`. `targetObjectId`: required if type is `"object"`. `speed` **V**.

**clampToRoom** -- Keep instance within room bounds
```json
{ "id": "action-...", "type": "clampToRoom" }
```

**teleport** -- Teleport to a position
```json
{ "id": "action-...", "type": "teleport", "mode": "position", "x": 100, "y": 200 }
```
`mode`: `"position"`, `"start"` (initial position), or `"mouse"`. `x`, `y`: used when mode is `"position"` (nullable).

### Object Actions

**destroySelf** -- Destroy the current instance
```json
{ "id": "action-...", "type": "destroySelf" }
```

**destroyOther** -- Destroy the other instance (collision context)
```json
{ "id": "action-...", "type": "destroyOther" }
```

**spawnObject** -- Create a new instance
```json
{ "id": "action-...", "type": "spawnObject", "objectId": "object-...", "offsetX": 0, "offsetY": -32 }
```
`objectId`: required. `offsetX` **V**, `offsetY` **V**. Optional `positionMode`: `"absolute"` or `"relative"`.

**changeSprite** -- Change sprite of an instance
```json
{ "id": "action-...", "type": "changeSprite", "spriteId": "sprite-...", "target": "self" }
```
`target`: `"self"` or `"other"`.

**setSpriteSpeed** -- Set animation frame speed
```json
{ "id": "action-...", "type": "setSpriteSpeed", "speedMs": 100, "target": "self" }
```
`speedMs` **V** (milliseconds between frames). `target`: `"self"` or `"other"`.

### Game Actions

**changeScore** -- Add to score
```json
{ "id": "action-...", "type": "changeScore", "delta": 1 }
```
`delta` **V**.

**endGame** -- End the game
```json
{ "id": "action-...", "type": "endGame", "message": "You win!" }
```
`message` **V** (string, min 1 char).

**message** -- Show a temporary message
```json
{ "id": "action-...", "type": "message", "text": "Hello!", "durationMs": 2000 }
```
`text` **V**. `durationMs` **V** (positive integer).

**playSound** -- Play a sound
```json
{ "id": "action-...", "type": "playSound", "soundId": "sound-..." }
```

**emitCustomEvent** -- Emit a custom event
```json
{ "id": "action-...", "type": "emitCustomEvent", "eventName": "playerDied", "payload": 0 }
```
`eventName`: string (min 1 char). `payload` **V** (number, string, or boolean).

### Variable Actions

**changeVariable** -- Set or modify a variable
```json
{
  "id": "action-...", "type": "changeVariable",
  "scope": "global", "variableId": "globalVar-...",
  "operator": "add", "value": 1
}
```
`scope`: `"global"` or `"object"`. `operator`: `"set"`, `"add"`, `"subtract"`, `"multiply"`. `value` **V**.

For object scope, add `"target": "self"` (or `"other"`, `"instanceId"`), optionally `"targetInstanceId"`.

**randomizeVariable** -- Set variable to random value
```json
{
  "id": "action-...", "type": "randomizeVariable",
  "scope": "global", "variableId": "globalVar-...",
  "min": 1, "max": 10
}
```
`min` **V**, `max` **V**. Optional `step` **V** (positive number).

**copyVariable** -- Copy between global and object scope
```json
{
  "id": "action-...", "type": "copyVariable",
  "direction": "globalToObject",
  "globalVariableId": "globalVar-...",
  "objectVariableId": "objectVar-...",
  "instanceTarget": "self", "instanceTargetId": null
}
```
`direction`: `"globalToObject"` or `"objectToGlobal"`. `instanceTarget`: `"self"`, `"other"`, `"instanceId"`.

**listPush** -- Add item to end of list
```json
{
  "id": "action-...", "type": "listPush",
  "scope": "global", "variableId": "globalVar-...",
  "value": "newItem"
}
```

**listSetAt** -- Set item at index
```json
{
  "id": "action-...", "type": "listSetAt",
  "scope": "global", "variableId": "globalVar-...",
  "index": 0, "value": "replaced"
}
```

**listRemoveAt** -- Remove item at index
```json
{
  "id": "action-...", "type": "listRemoveAt",
  "scope": "global", "variableId": "globalVar-...",
  "index": 0
}
```

**listClear** -- Clear all items from list
```json
{
  "id": "action-...", "type": "listClear",
  "scope": "global", "variableId": "globalVar-..."
}
```

**mapSet** -- Set a key-value pair
```json
{
  "id": "action-...", "type": "mapSet",
  "scope": "global", "variableId": "globalVar-...",
  "key": "hp", "value": 100
}
```

**mapDelete** -- Remove a key
```json
{
  "id": "action-...", "type": "mapDelete",
  "scope": "global", "variableId": "globalVar-...",
  "key": "hp"
}
```

**mapClear** -- Clear all entries from map
```json
{
  "id": "action-...", "type": "mapClear",
  "scope": "global", "variableId": "globalVar-..."
}
```

All list/map actions accept optional `"target"` and `"targetInstanceId"` when `scope` is `"object"`.

### Room Actions

**goToRoom** -- Navigate to a different room
```json
{ "id": "action-...", "type": "goToRoom", "roomId": "room-..." }
```

**teleportWindow** -- Teleport the viewport
```json
{ "id": "action-...", "type": "teleportWindow", "mode": "position", "x": 0, "y": 0 }
```
`mode`: `"position"` or `"self"`. `x`, `y`: nullable, used when mode is `"position"`.

**moveWindow** -- Move the viewport
```json
{ "id": "action-...", "type": "moveWindow", "dx": 5, "dy": 0 }
```
`dx` **V**, `dy` **V**.

**restartRoom** -- Restart the current room
```json
{ "id": "action-...", "type": "restartRoom" }
```

### Flow Actions

**wait** -- Pause execution
```json
{ "id": "action-...", "type": "wait", "durationMs": 500 }
```
`durationMs` **V** (positive integer).

> `repeat`, `forEachList`, and `forEachMap` are **control blocks**, not actions. They go directly in `items` arrays, NOT wrapped in `{ "type": "action" }`. See [Event Items](#event-items-actions-and-control-blocks).

---

## ValueSource (Dynamic Values)

Many action fields (marked **V** above) accept either a plain literal value OR a ValueSource object. Seven source types:

```json
{ "source": "literal", "value": 42 }
```

```json
{ "source": "random", "min": 1, "max": 10, "step": 1 }
```

```json
{ "source": "attribute", "target": "self", "attribute": "x" }
```
`attribute`: `"x"`, `"y"`, `"rotation"`, `"instanceCount"`. `target`: `"self"` or `"other"`.

```json
{ "source": "internalVariable", "target": "self", "variableId": "objectVar-..." }
```

```json
{ "source": "globalVariable", "variableId": "globalVar-..." }
```

```json
{ "source": "mouseAttribute", "attribute": "x" }
```
`attribute`: `"x"` or `"y"`.

```json
{ "source": "iterationVariable", "variableName": "item" }
```
Only valid inside `forEachList` / `forEachMap` blocks.

**Note:** Plain values are shorthand for literal sources. `"dx": 5` is equivalent to `"dx": { "source": "literal", "value": 5 }`.

---

## If Conditions

Used in `"if"` event items. Two forms:

### Comparison Condition

```json
{
  "left": { "source": "globalVariable", "variableId": "globalVar-..." },
  "operator": "<=",
  "right": { "source": "literal", "value": 0 }
}
```

**Operators:** `"=="`, `"!="`, `">"`, `">="`, `"<"`, `"<="`

**Left side sources:**
- `{ "source": "attribute", "target": "self", "attribute": "x" }`
- `{ "source": "internalVariable", "target": "self", "variableId": "..." }`
- `{ "source": "globalVariable", "variableId": "..." }`
- `{ "source": "mouseAttribute", "attribute": "x" }`
- `{ "source": "iterationVariable", "variableName": "..." }`

**Right side:** any ValueSource or plain literal value.

### Logical Condition (AND/OR)

```json
{
  "logic": "AND",
  "conditions": [
    { "left": { "source": "attribute", "target": "self", "attribute": "x" }, "operator": ">=", "right": 0 },
    { "left": { "source": "attribute", "target": "self", "attribute": "x" }, "operator": "<", "right": 768 }
  ]
}
```

`conditions` must have at least 2 entries. Can be nested.

---

## Rooms

Located at `project.rooms[]`.

```json
{
  "id": "room-{uuid}",
  "name": "Level 1",
  "folderId": null,
  "width": 768,
  "height": 512,
  "backgroundSpriteId": null,
  "instances": [
    { "id": "instance-{uuid}", "objectId": "object-{uuid}", "x": 100, "y": 200 }
  ]
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `width`, `height` | positive int | `768 x 512` | Room dimensions in pixels. |
| `backgroundSpriteId` | `string \| null` | `null` | Sprite ID for background, or `null`. |
| `instances` | array | `[]` | Placed object instances. |

Each instance:
- `id`: unique instance ID
- `objectId`: must reference an existing object
- `x`, `y`: position in the room (number)
- `rotation`: optional number (degrees)

Multiple instances of the same object can exist in one room.

---

## Complete Example -- Coin Collector Game

A full, valid project with keyboard movement, collision, variables, conditionals, and endgame:

```json
{
  "version": 1,
  "metadata": {
    "id": "proj-11111111-1111-4111-8111-111111111111",
    "name": "Coin Collector",
    "locale": "ca",
    "createdAtIso": "2026-02-19T12:00:00.000Z"
  },
  "resources": {
    "sprites": [
      {
        "id": "sprite-aaaa1111-1111-4111-8111-111111111111",
        "name": "player",
        "folderId": null,
        "imagePath": "",
        "assetSource": "",
        "uploadStatus": "notConnected",
        "width": 4,
        "height": 4,
        "pixelsRgba": [
          "#00000000","#3B82F6FF","#3B82F6FF","#00000000",
          "#3B82F6FF","#60A5FAFF","#60A5FAFF","#3B82F6FF",
          "#3B82F6FF","#60A5FAFF","#60A5FAFF","#3B82F6FF",
          "#00000000","#3B82F6FF","#3B82F6FF","#00000000"
        ],
        "frames": [
          {
            "id": "frame-aaaa1111-1111-4111-8111-111111111111",
            "pixelsRgba": [
              "#00000000","#3B82F6FF","#3B82F6FF","#00000000",
              "#3B82F6FF","#60A5FAFF","#60A5FAFF","#3B82F6FF",
              "#3B82F6FF","#60A5FAFF","#60A5FAFF","#3B82F6FF",
              "#00000000","#3B82F6FF","#3B82F6FF","#00000000"
            ]
          }
        ]
      },
      {
        "id": "sprite-bbbb2222-2222-4222-8222-222222222222",
        "name": "coin",
        "folderId": null,
        "imagePath": "",
        "assetSource": "",
        "uploadStatus": "notConnected",
        "width": 4,
        "height": 4,
        "pixelsRgba": [
          "#00000000","#FBBF24FF","#FBBF24FF","#00000000",
          "#FBBF24FF","#FCD34DFF","#FCD34DFF","#FBBF24FF",
          "#FBBF24FF","#FCD34DFF","#FCD34DFF","#FBBF24FF",
          "#00000000","#FBBF24FF","#FBBF24FF","#00000000"
        ],
        "frames": [
          {
            "id": "frame-bbbb2222-2222-4222-8222-222222222222",
            "pixelsRgba": [
              "#00000000","#FBBF24FF","#FBBF24FF","#00000000",
              "#FBBF24FF","#FCD34DFF","#FCD34DFF","#FBBF24FF",
              "#FBBF24FF","#FCD34DFF","#FCD34DFF","#FBBF24FF",
              "#00000000","#FBBF24FF","#FBBF24FF","#00000000"
            ]
          }
        ]
      }
    ],
    "sounds": []
  },
  "variables": {
    "global": [
      { "id": "globalVar-cccc3333-3333-4333-8333-333333333333", "name": "coinsRemaining", "type": "number", "initialValue": 3 }
    ],
    "objectByObjectId": {}
  },
  "objects": [
    {
      "id": "object-dddd4444-4444-4444-8444-444444444444",
      "name": "Player",
      "folderId": null,
      "spriteId": "sprite-aaaa1111-1111-4111-8111-111111111111",
      "x": 0,
      "y": 0,
      "speed": 0,
      "direction": 0,
      "width": 32,
      "height": 32,
      "visible": true,
      "solid": false,
      "events": [
        {
          "id": "event-1001-1001-4001-8001-100100100101",
          "type": "Keyboard",
          "key": "ArrowUp",
          "keyboardMode": "down",
          "targetObjectId": null,
          "intervalMs": null,
          "items": [
            {
              "id": "item-2001-2001-4001-8001-200100100101",
              "type": "action",
              "action": { "id": "action-3001-3001-4001-8001-300100100101", "type": "move", "dx": 0, "dy": -5 }
            }
          ]
        },
        {
          "id": "event-1002-1002-4002-8002-100200100201",
          "type": "Keyboard",
          "key": "ArrowDown",
          "keyboardMode": "down",
          "targetObjectId": null,
          "intervalMs": null,
          "items": [
            {
              "id": "item-2002-2002-4002-8002-200200100201",
              "type": "action",
              "action": { "id": "action-3002-3002-4002-8002-300200100201", "type": "move", "dx": 0, "dy": 5 }
            }
          ]
        },
        {
          "id": "event-1003-1003-4003-8003-100300100301",
          "type": "Keyboard",
          "key": "ArrowLeft",
          "keyboardMode": "down",
          "targetObjectId": null,
          "intervalMs": null,
          "items": [
            {
              "id": "item-2003-2003-4003-8003-200300100301",
              "type": "action",
              "action": { "id": "action-3003-3003-4003-8003-300300100301", "type": "move", "dx": -5, "dy": 0 }
            }
          ]
        },
        {
          "id": "event-1004-1004-4004-8004-100400100401",
          "type": "Keyboard",
          "key": "ArrowRight",
          "keyboardMode": "down",
          "targetObjectId": null,
          "intervalMs": null,
          "items": [
            {
              "id": "item-2004-2004-4004-8004-200400100401",
              "type": "action",
              "action": { "id": "action-3004-3004-4004-8004-300400100401", "type": "move", "dx": 5, "dy": 0 }
            }
          ]
        },
        {
          "id": "event-1005-1005-4005-8005-100500100501",
          "type": "Step",
          "key": null,
          "keyboardMode": null,
          "targetObjectId": null,
          "intervalMs": null,
          "items": [
            {
              "id": "item-2005-2005-4005-8005-200500100501",
              "type": "action",
              "action": { "id": "action-3005-3005-4005-8005-300500100501", "type": "clampToRoom" }
            }
          ]
        },
        {
          "id": "event-1006-1006-4006-8006-100600100601",
          "type": "Collision",
          "key": null,
          "keyboardMode": null,
          "targetObjectId": "object-eeee5555-5555-4555-8555-555555555555",
          "intervalMs": null,
          "items": [
            {
              "id": "item-2006-2006-4006-8006-200600100601",
              "type": "action",
              "action": { "id": "action-3006-3006-4006-8006-300600100601", "type": "destroyOther" }
            },
            {
              "id": "item-2007-2007-4007-8007-200700100701",
              "type": "action",
              "action": { "id": "action-3007-3007-4007-8007-300700100701", "type": "changeScore", "delta": 1 }
            },
            {
              "id": "item-2008-2008-4008-8008-200800100801",
              "type": "action",
              "action": {
                "id": "action-3008-3008-4008-8008-300800100801",
                "type": "changeVariable",
                "scope": "global",
                "variableId": "globalVar-cccc3333-3333-4333-8333-333333333333",
                "operator": "subtract",
                "value": 1
              }
            },
            {
              "id": "if-4001-4001-4001-8001-400100100101",
              "type": "if",
              "condition": {
                "left": { "source": "globalVariable", "variableId": "globalVar-cccc3333-3333-4333-8333-333333333333" },
                "operator": "<=",
                "right": { "source": "literal", "value": 0 }
              },
              "thenActions": [
                {
                  "id": "item-2009-2009-4009-8009-200900100901",
                  "type": "action",
                  "action": { "id": "action-3009-3009-4009-8009-300900100901", "type": "endGame", "message": "You collected all the coins!" }
                }
              ],
              "elseActions": []
            }
          ]
        }
      ]
    },
    {
      "id": "object-eeee5555-5555-4555-8555-555555555555",
      "name": "Coin",
      "folderId": null,
      "spriteId": "sprite-bbbb2222-2222-4222-8222-222222222222",
      "x": 0,
      "y": 0,
      "speed": 0,
      "direction": 0,
      "width": 32,
      "height": 32,
      "visible": true,
      "solid": false,
      "events": []
    }
  ],
  "rooms": [
    {
      "id": "room-ffff6666-6666-4666-8666-666666666666",
      "name": "Level 1",
      "folderId": null,
      "width": 768,
      "height": 512,
      "backgroundSpriteId": null,
      "instances": [
        { "id": "instance-7001-7001-4001-8001-700100100101", "objectId": "object-dddd4444-4444-4444-8444-444444444444", "x": 368, "y": 240 },
        { "id": "instance-7002-7002-4002-8002-700200100201", "objectId": "object-eeee5555-5555-4555-8555-555555555555", "x": 100, "y": 100 },
        { "id": "instance-7003-7003-4003-8003-700300100301", "objectId": "object-eeee5555-5555-4555-8555-555555555555", "x": 600, "y": 100 },
        { "id": "instance-7004-7004-4004-8004-700400100401", "objectId": "object-eeee5555-5555-4555-8555-555555555555", "x": 350, "y": 400 }
      ]
    }
  ],
  "scenes": [],
  "metrics": {
    "appStart": 0,
    "projectLoad": 0,
    "runtimeErrors": 0,
    "tutorialCompletion": 0,
    "stuckRate": 0,
    "timeToFirstPlayableFunMs": null
  }
}
```

This example demonstrates:
- Two sprites with pixel art (4x4)
- Player object with keyboard movement (4 arrow keys), clampToRoom on Step, and collision handling
- Coin object as a passive collectible
- Global variable `coinsRemaining` tracking remaining coins
- If block checking win condition
- Score tracking and endgame message
- Room with 1 player instance and 3 coin instances

---

## Validation Rules and Common Pitfalls

1. `version` must be exactly `1` (number, not string)
2. `metadata.locale` must be exactly `"ca"`
3. `metadata.createdAtIso` must be a valid ISO 8601 datetime
4. All IDs must be non-empty strings and unique across the project
5. Sprite `pixelsRgba` array length must equal `width * height`
6. Each frame's `pixelsRgba` must also equal `width * height`
7. `pixelsRgba` and frame `pixelsRgba` must both be present and consistent
8. List `initialValue` items must all match `itemType`
9. Map `initialValue` values must all match `itemType`
10. Collision events must set `targetObjectId` to a valid object ID
11. Keyboard events must set `key` to one of: `"ArrowUp"`, `"ArrowDown"`, `"ArrowLeft"`, `"ArrowRight"`, `"Space"`, `"<any>"`
12. Timer events must set `intervalMs` to a positive number
13. CustomEvent events must set `eventName` (min 1 char)
14. Object references (`spriteId`, `objectId`, `roomId`, etc.) must point to entities in the same project
15. Actions need two IDs: the **item** wrapper ID and the inner **action** ID
16. `scenes` must be present (use `[]`)
17. `metrics` must be present with all six fields
18. `repeat`/`forEachList`/`forEachMap` are **event items** (control blocks), NOT action types -- they go directly in `items` arrays
19. Logical conditions (`AND`/`OR`) must have at least 2 conditions
20. `step` in `random` ValueSource must be a positive number

---

## Sounds (Reference)

Since AI agents cannot generate audio binaries, sounds are declared as placeholders:

```json
{
  "id": "sound-{uuid}",
  "name": "jump",
  "audioPath": "",
  "assetSource": "",
  "uploadStatus": "notConnected"
}
```

The user can fill in audio later in the editor.

---

## Folders (Optional)

Organize entities into folders:

```json
"spriteFolders": [{ "id": "sprite-folder-{uuid}", "name": "Characters", "parentId": null }],
"objectFolders": [{ "id": "object-folder-{uuid}", "name": "Enemies", "parentId": null }],
"roomFolders": [{ "id": "room-folder-{uuid}", "name": "World 1", "parentId": null }]
```

Set entity `folderId` to a folder ID. Set folder `parentId` for nesting.
