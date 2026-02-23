import type { caMessages } from "./ca.js"

export const enMessages: Record<keyof typeof caMessages, string> = {
  // ── App ──────────────────────────────────────────────────────
  appBrandName: "GameCreator",
  appSaving: "Saving…",
  appSaved: "Saved",
  appSaveError: "Error",
  appUndoTitle: "Undo",
  appRedoTitle: "Redo",
  appSaveTitle: "Save",

  // ── Editor sidebar ──────────────────────────────────────────
  sidebarTitle: "Editor sections",
  sidebarSprites: "Sprites",
  sidebarObjects: "Objects",
  sidebarRooms: "Rooms",
  sidebarGlobals: "Globals",
  sidebarRun: "Run",

  // ── Editor topbar ──────────────────────────────────────────
  topbarTitle: "Editor UI",
  topbarSaveStatusPrefix: "Save status:",
  topbarRun: "Run",
  topbarReset: "Reset",
  topbarUndo: "Undo",
  topbarRedo: "Redo",
  topbarSaveLocal: "Save local",
  topbarLoadLocal: "Load local",
  topbarLoadTemplate: "Load Coin Dash template",

  // ── Play page ────────────────────────────────────────────────
  playLoading: "Loading shared game...",
  playErrorDefault: "Could not load shared game.",
  playBackToHome: "Back to home",
  playCtaPrefix: "Create your own game with",

  // ── Sprite frame timeline ────────────────────────────────────
  spriteFrameLabel: "Frame {index}",
  spriteFrameAdd: "Add frame",
  spriteFrameDuplicate: "Duplicate frame",
  spriteFrameDelete: "Delete frame",

  // ── Sprite tool options ──────────────────────────────────────
  spriteToolColor: "Color",
  spriteToolPalette: "Palette",
  spriteToolTransparent: "Transparent",
  spriteToolFromImage: "From image",
  spriteToolNoOptions: "This tool has no options.",
  spriteToolToleranceLabel: "Tolerance: {value}",
  spriteToolHoverPreview: "Hover preview",
  spriteToolEraserSize: "Size",
  spriteToolOpacity: "Opacity: {value}%",

  // ── Sprite editor section ────────────────────────────────────
  spriteEditorGrid: "Grid",
  spriteEditorZoom: "Zoom",
  spriteEditorFit: "Fit",
  spriteEditorSelectToStart: "Select a sprite to start editing",
  spriteDeleteBlockedByObjects:
    "Cannot delete this sprite because it is used by: {objects}",

  // ── Sprite list panel ────────────────────────────────────────
  spriteListNewSprite: "New sprite",
  spriteListEmptyFolder: "Empty folder",
  spriteListNewFolderPlaceholder: "New folder",
  spriteListEmptyHint: "Right-click or press + to add",
  spriteListEmpty: "empty",
  spriteListMoreObjects: "+{count} more",
  spriteListCopyNameSuffix: "(copy)",
  spriteListExpandTitle: "Expand sprite list",
  spriteListCollapseTitle: "Collapse sprite list",
  spriteListAddSpriteTitle: "Add sprite",
  spriteListNewFolderTitle: "New folder",
  spriteListCancelTitle: "Cancel",
  spriteListCtxOpen: "Open",
  spriteListCtxOpenNewTab: "Open in a new tab",
  spriteListCtxRename: "Rename",
  spriteListCtxDuplicate: "Duplicate",
  spriteListCtxDelete: "Delete",
  spriteListCtxRenameFolder: "Rename",
  spriteListCtxNewSubfolder: "New subfolder",
  spriteListCtxNewSpriteHere: "New sprite here",
  spriteListCtxDeleteFolder: "Delete folder",
  spriteListCtxNewSprite: "New sprite",
  spriteListCtxNewFolder: "New folder",

  // ── Instance debug panel ─────────────────────────────────────
  debugLabel: "Debug",
  debugEnableTitle: "Enable debug",
  debugDisableTitle: "Disable debug",
  debugSelectNone: "-- None --",
  debugObjectLabel: "Object",
  debugVariablesLabel: "Variables",

  // ── Block selector panel ─────────────────────────────────────
  blockSelectorTitle: "Add block",
  blockSelectorCancel: "Cancel",
  blockOptionIf: "If / Condition",
  blockOptionRepeat: "Repeat",
  blockOptionForEachList: "For each (list)",
  blockOptionForEachMap: "For each (map)",

  // ── Action selector panel ────────────────────────────────────
  actionSelectorTitle: "Add action",
  actionSelectorCancel: "Cancel",
  actionCategoryLists: "Lists",
  actionCategoryMaps: "Maps",

  // ── Templates section ────────────────────────────────────────
  templatesTitle: "Templates",
  templatesSubtitle: "Load a pre-built game to learn or remix.",
  templatesStarter: "Starter templates",
  templatesIntermediate: "Intermediate templates",
  templatesAdvanced: "Advanced templates",
  templatesLoadButton: "Load Template",

  // ── Import dropdown ──────────────────────────────────────────
  importGameLabel: "Game",
  importProjectsLabel: "Projects",
  importCreateBlank: "Create blank game...",
  importJsonLabel: "Import game (.json)",
  importJsonAsNew: "As new project",
  importJsonReplace: "Overwrite active project",
  importExport: "Export current game",
  importErrorExport: "Could not export the game. Please try again.",
  importStatusImporting: "Importing game...",
  importStatusImported: "Game imported successfully.",
  importErrorImport: "Could not import the file.",
  importPromptProjectName: "Project name",
  importConfirmDelete: "Do you want to delete the active project?",

  // ── Share dropdown ───────────────────────────────────────────
  shareDropdownTrigger: "Share",
  shareDropdownLabel: "Share game",
  shareDropdownPublishing: "Publishing...",
  shareDropdownPublish: "Publish game",
  shareDropdownCopied: "Copied!",
  shareDropdownCopyLink: "Copy link",
  shareDropdownOpenLink: "Go to link",
  shareDropdownCopyError: "Could not copy the link.",

  // ── Account dropdown ─────────────────────────────────────────
  accountLabel: "Account",
  accountTriggerLabel: "Account",
  accountSignIn: "Sign in",
  accountSignOut: "Sign out",
  accountSyncing: "Uploading...",
  accountSyncError: "Sync error",
  accountSyncErrorDetail: "Could not sync.",
  accountCloudUpload: "Upload to cloud",
  accountCloudUploadTime: "Upload to cloud · {time}",
  accountErrorSignIn: "Could not sign in.",
  accountErrorSignUp: "Could not create account.",
  accountErrorGoogleSignIn: "Could not sign in with Google.",
  accountErrorSignOut: "Could not sign out.",
  accountTimeAgo10s: "10 seconds ago",
  accountTimeAgo30s: "30 seconds ago",
  accountTimeAgo1Min: "1 minute ago",
  accountTimeAgoMins: "{count} minutes ago",
  accountTimeAgo1Hour: "1 hour ago",
  accountTimeAgoHours: "{count} hours ago",
  accountTimeAgo1Day: "1 day ago",
  accountTimeAgoDays: "{count} days ago",

  // ── Auth password modal ──────────────────────────────────────
  authTitleSignUp: "Create an account",
  authTitleSignIn: "Sign in",
  authSubtitleSignUp: "Sign up to save your games.",
  authSubtitleSignIn: "Sign in to save and share your games.",
  authGoogleButton: "Continue with Google",
  authEmailDivider: "or with email",
  authEmailLabel: "Email",
  authEmailPlaceholder: "name@example.com",
  authPasswordLabel: "Password",
  authPasswordPlaceholderSignUp: "At least 6 characters",
  authPasswordPlaceholderSignIn: "Your password",
  authSubmitCreating: "Creating account...",
  authSubmitSigningIn: "Signing in...",
  authSubmitCreate: "Create account",
  authSubmitSignIn: "Sign in",
  authToggleHasAccount: "Already have an account?",
  authToggleNoAccount: "Don't have an account?",
  authToggleToSignIn: "Sign in",
  authToggleToSignUp: "Create one",
  authCancel: "Cancel",

  // ── Share section ────────────────────────────────────────────
  shareTitle: "Share",
  shareStatusPublishing: "Publishing game...",
  shareStatusPublished: "Link ready. You can now share it.",
  shareStatusError: "Could not publish the game. Please try again.",
  shareStatusIdle: "Publish the game and share the link with your friends.",
  shareBadgePublishing: "Publishing",
  shareBadgePublished: "Shared",
  shareBadgeError: "Error",
  shareBadgeIdle: "Not shared",
  shareExplainerTitle: "What does sharing mean?",
  shareExplainerPublish:
    "When you publish, a version of the game is created accessible via a unique URL.",
  shareExplainerPlayOnly:
    "Your friends will open this URL in play-only mode, not in edit mode.",
  shareExplainerRepublish:
    "If you make changes to the game, you need to republish to generate a new link with the updated version.",
  sharePublishButtonPublishing: "Publishing...",
  sharePublishButton: "Publish game",
  shareCopyLinkButton: "Copy link",
  sharePermalinkLabel: "Permalink",
  sharePermalinkPlaceholder: "https://creadordejocs.com/play/...",
  shareNotPublished: "This game has not been shared yet.",
  sharePublishedNote:
    "This is the last published link. Save it or share it directly.",
  shareCopied: "Link copied.",
  shareCopyError: "Could not copy the link.",

  // ── Run section ──────────────────────────────────────────────
  runLabel: "Run",
  runResetButton: "Reset",
  runRunButton: "Run",
  runStatusLabel: "Status",
  runRoomLabel: "Room",
  runScoreLabel: "Score",
  runStateLabel: "State",
  runGameOver: "Game over",
  runRunning: "Running",
  runGlobalVarsLabel: "Global variables",
  runNoGlobals: "No globals defined",
  runMouseLabel: "Mouse",
  runPreviewLabel: "Preview:",
  runPlaying: "Playing",
  runStopped: "Stopped",
  runNoRoom: "Create a room first to run the game",
  runStartPrompt: "Press any key to start",
  runStartHint: "You can also click with the mouse",

  // ── Control block ────────────────────────────────────────────
  controlBlockIf: "IF",
  controlBlockRepeat: "REPEAT",
  controlBlockEachList: "EACH LIST",
  controlBlockEachMap: "EACH MAP",
  controlBlockRemoveTitle: "Remove block",
  controlBlockAddElse: "Add else",
  controlBlockHideElse: "Hide else",
  controlBlockNoActions: "No actions defined",
  controlBlockAddAction: "Add action",
  controlBlockAddBlock: "Add block",
  controlBlockAddCondition: "Add AND/OR condition",
  controlBlockAddConditionSimple: "Add condition",
  controlBlockRemoveCondition: "Remove condition",
  controlBlockCtxCopy: "Copy block",
  controlBlockCtxPaste: "Paste after",
  controlBlockCtxDelete: "Delete block",
  controlBlockPickerIf: "If",
  controlBlockPickerRepeat: "Repeat",
  controlBlockPickerEachList: "Each list",
  controlBlockPickerEachMap: "Each map",

  // ── Action block ─────────────────────────────────────────────
  actionBlockReorderTitle: "Reorder action",
  actionBlockRemoveTitle: "Remove action",
  actionBlockCtxCopy: "Copy action",
  actionBlockCtxPaste: "Paste after",
  actionBlockCtxDelete: "Delete action",
  actionBlockTransitionNone: "None",
  actionBlockTransitionFade: "Fade",
  actionBlockTransitionSlideLeft: "Slide Left",
  actionBlockTransitionSlideRight: "Slide Right",
  actionBlockMoveTowardObject: "Object",
  actionBlockMoveTowardMouse: "Mouse",
  actionBlockNoObjects: "No objects",
  actionBlockSpawnAbsolute: "Absolute",
  actionBlockSpawnRelative: "Relative",
  actionBlockRoomUnavailable: "Room unavailable",
  actionBlockNoRooms: "No rooms available",
  actionBlockRestartRoom: "Current room",
  actionBlockEmitNameLabel: "Name",
  actionBlockEmitTypeLabel: "Type",

  // ── Editor controller ────────────────────────────────────────
  controllerConfirmLegacyImport:
    "Old local projects detected. Do you want to import them to the current account?",
  controllerConfirmOverwrite: "This will overwrite the current game. Do you want to continue?",
  controllerDefaultProjectName: "First standalone game",
  controllerBlankProjectName: "New game",
  controllerDefaultRoomName: "Main room",

  // ── Template descriptions ────────────────────────────────────
  templateCoinDashDesc:
    "Collect the coin and avoid enemies. Great intro to score and collisions.",
  templateSpaceShooterDesc:
    "Move your ship and shoot asteroids with Space. Arcade action basics.",
  templateLaneCrosserDesc: "Cross traffic lanes and reach the goal zone safely.",
  templateSwitchVaultDesc:
    "Toggle the control switch and travel to the vault only when it is unlocked.",
  templateCursorCourierDesc:
    "Guide deliveries with mouse movement and hold-to-boost bursts.",
  templatePokemonExplorerDesc:
    "Explore a world with multiple rooms, random grass and battles. Complete advanced project.",

  // ── Sprite import crop modal ────────────────────────────────
  spriteImportCropTitle: "Import crop & adjust",
  spriteImportCropInstructions:
    "Result: {width} x {height} px — Drag corners to resize, center to move",
  spriteImportCropOriginal: "Original image",
  spriteImportCropExpected: "Expected result",
  spriteImportCropCancel: "Cancel",
  spriteImportCropConfirm: "Confirm and import",
  spriteImportCropReset: "Reset crop",

  // ── Sprite picker modal ────────────────────────────────────
  spritePickerCloseAriaLabel: "Close sprite modal",
  spritePickerTitle: "Sprite for {objectName}",
  spritePickerSubtitle:
    "Select a sprite ({width} x {height}) or a compatible ratio to scale it.",
  spritePickerSidebarTitle: "Sprites and folders",
  spritePickerNoSprites: "No sprites yet",
  spritePickerSelectHint: "Select a sprite to see its preview.",
  spritePickerNewButton: "+ New Sprite",
  spritePickerEditButton: "Edit Sprite",
  spritePickerSelectButton: "Select",
  spritePickerEmpty: "· empty",
  spritePickerMore: "+{count} more",
  spritePickerIncompatible: "· incompatible",

  // ── Object list panel ────────────────────────────────────
  objectListNewPlaceholder: "New object",

  // ── Variable pickers ─────────────────────────────────────
  variablePickerGlobalSection: "Global",
  variablePickerObjectSection: "Object",

  // ── Object variables panel ────────────────────────────────
  objectVarsAddItem: "Add item",
  objectVarsAddEntry: "Add entry",
  objectVarsRemoveEntry: "Remove entry",

  // ── Global variables section ─────────────────────────────
  globalVarsAddItem: "Add item",
  globalVarsAddEntry: "Add entry",
  globalVarsRemoveEntry: "Remove entry",

  // ── Sprite toolbar ───────────────────────────────────────
  spriteToolbarToolOptions: "Tool options",
  spriteToolbarTransform: "Transform",
  spriteToolbarFlipH: "Flip horizontal",
  spriteToolbarFlipV: "Flip vertical",
  spriteToolbarRotateCW: "Rotate 90° clockwise",
  spriteToolbarRotateCCW: "Rotate 90° counter-clockwise",

  // ── Right value picker ─────────────────────────────────────
  rightValueValueSection: "Value",
  rightValueAttributesSection: "Attributes",
  rightValueInternalSection: "Internal variables",
  rightValueRandomStep: "·step",

  // ── Global Variables Section ─────────────────────────────────
  globalVarsTitle: "Global Variables",
  globalVarsSubtitle: "Variables shared across all object instances.",
  globalVarsDeleteTitle: "Delete variable",
  globalVarsNoVarsYet: "No variables yet",
  globalVarsAddSectionLabel: "Add global variable",
  globalVarsCancelTitle: "Cancel",
  globalVarsCancelAriaLabel: "Cancel add variable",
  globalVarsAddBtnTitle: "Add variable",
  globalVarsNameLabel: "Name",
  globalVarsTypeLabel: "Type",
  globalVarsItemTypeLabel: "Item type",
  globalVarsInitialValueLabel: "Initial value",
  globalVarsAddConfirm: "Add",
  globalVarsNamePlaceholder: "e.g. score, lives, level",
  globalVarsRemoveItemTitle: "Remove item",

  // ── Object Variables Panel ────────────────────────────────────
  objectVarsAttributesLabel: "Attributes",
  objectVarsVariablesLabel: "Variables",
  objectVarsCancelTitle: "Cancel",
  objectVarsCancelAriaLabel: "Cancel add variable",
  objectVarsAddTitle: "Add variable",
  objectVarsAddAriaLabel: "Add variable",
  objectVarsNameLabel: "Name",
  objectVarsNamePlaceholder: "e.g. health, speed, score",
  objectVarsTypeLabel: "Type",
  objectVarsInitialValueLabel: "Initial value",
  objectVarsValuePlaceholder: "Value",
  objectVarsAddConfirm: "Add",
  objectVarsDeleteTitle: "Delete variable",
  objectVarsNoVarsYet: "No variables yet",
  objectVarsRemoveItemTitle: "Remove item",
  objectVarsWidthLabel: "width",
  objectVarsHeightLabel: "height",
  objectVarsLayerLabel: "layer",

  // ── Object Card ───────────────────────────────────────────────
  objectCardSpriteTitle: "Select or edit sprite",
  objectCardVisibleLabel: "visible",
  objectCardSolidLabel: "solid",

  // ── Sprite Toolbar (tool labels) ──────────────────────────────
  spriteToolbarToolsLabel: "Tools",
  spriteToolbarFlipHLabel: "Flip H",
  spriteToolbarFlipVLabel: "Flip V",
  spriteToolbarRotateCWLabel: "Rot +90°",
  spriteToolbarRotateCCWLabel: "Rot -90°",

  // ── Room Object Picker Panel ──────────────────────────────────
  roomPickerModeLabel: "Mode",
  roomPickerModeObjects: "Objects",
  roomPickerModePaint: "Paint",
  roomPickerNoObjects: "No objects",
  roomPickerAttributesLabel: "Attributes",
  roomPickerWidthLabel: "Width",
  roomPickerHeightLabel: "Height",
  roomPickerNoSprites: "No sprites",
  roomPickerToolsLabel: "Tools",
  roomPickerBackgroundLabel: "Background",
  roomPickerNoBackground: "No background",
  roomPickerEraserLabel: "Eraser",
  roomPickerStampsCount: "{count} stamps",
  roomPickerAddObjTitle: "Add {name} to room",
  roomPickerPaintWithTitle: "Paint with {name}",

  // ── Room Editor Section ───────────────────────────────────────
  roomEditorGrid: "Grid",
  roomEditorZoom: "Zoom",
  roomEditorRemoveInstance: "Remove instance",
  roomEditorLayerDown: "Move layer down",
  roomEditorLayerUp: "Move layer up",

  // ── Room List Panel ───────────────────────────────────────────
  roomListNewFolderPlaceholder: "New folder",
  roomListNewRoomPlaceholder: "New room",
  roomListExpandTitle: "Expand room list",
  roomListAddRoomTitle: "Add room",
  roomListNewFolderTitle: "New folder",
  roomListCollapseTitle: "Collapse room list",
  roomListEmptyHint: "Right-click or press + to add",
  roomListCtxOpen: "Open",
  roomListCtxOpenNewTab: "Open in a new tab",
  roomListCtxRename: "Rename",
  roomListCtxDelete: "Delete",
  roomListCtxNewSubfolder: "New subfolder",
  roomListCtxNewRoomHere: "New room here",
  roomListCtxDeleteFolder: "Delete folder",
  roomListCtxNewRoom: "New room",
  roomListCtxNewFolder: "New folder",

  // ── Object List Panel ─────────────────────────────────────────
  objectListExpandTitle: "Expand object list",
  objectListAddObjTitle: "Add object",
  objectListNewFolderTitle: "New folder",
  objectListCollapseTitle: "Collapse object list",
  objectListEmptyHint: "Right-click or press + to add",
  objectListNewFolderPlaceholder: "New folder",
  objectListEmptyFolder: "Empty folder",
  objectListCtxOpen: "Open",
  objectListCtxOpenNewTab: "Open in a new tab",
  objectListCtxDuplicate: "Duplicate",
  objectListCtxRename: "Rename",
  objectListCtxDelete: "Delete",
  objectListCtxNewSubfolder: "New subfolder",
  objectListCtxNewObjHere: "New object here",
  objectListCtxDeleteFolder: "Delete folder",
  objectListCtxNewObj: "New object",
  objectListCtxNewFolder: "New folder",

  // ── Event List Panel ──────────────────────────────────────────
  eventListTitle: "Events",
  eventListNoEvents: "No events defined",
  eventListAddEvent: "Add Event",
  eventListNewEventLabel: "New event",
  eventListConfiguringLabel: "Configuring...",
  eventListCancelTitle: "Cancel",
  eventListCancelNewEventAria: "Cancel new event",

  // ── Event Selector Panel ──────────────────────────────────────
  eventSelectorTitle: "Add event",
  eventSelectorNameLabel: "Name",
  eventSelectorAddKeyboardTitle: "Add keyboard",
  eventSelectorKeyLabel: "Key",
  eventSelectorAnyKey: "Any key",
  eventSelectorModeLabel: "Mode",
  eventSelectorHeld: "Held",
  eventSelectorPressed: "Pressed",
  eventSelectorReleased: "Released",
  eventSelectorAddTimerTitle: "Add timer",
  eventSelectorIntervalLabel: "Interval (ms)",
  eventSelectorAddMouseTitle: "Add mouse",
  eventSelectorAddCustomEventTitle: "Add custom event",
  eventSelectorAddConfirm: "Add",
  eventSelectorCancelTitle: "Cancel",
  eventSelectorCancelAriaLabel: "Cancel add event",
  eventSelectorConfirmTitle: "Add event",
  eventSelectorConfirmAriaLabel: "Confirm add event",

  // ── Sounds ────────────────────────────────────────────────────
  soundsTitle: "Sounds",
  soundsNoSounds: "No sounds yet",
  soundsNoSource: "no source",
  soundsNamePlaceholder: "Name...",
  soundsAddTitle: "Add sound",
  soundsAddBtn: "Add Sound",
  soundsAssetSourcesTitle: "Asset Sources",
  soundsAddSourceHint: "Add a sound to configure its source",
  soundsStatusReady: "ready",
  soundsStatusNotConnected: "not connected",
  soundsAssetPlaceholder: "/assets/sound.wav",
  soundsUploading: "Uploading...",
  soundsImport: "Import",
  soundsInvalidFormat: "Invalid format. Use WAV, MP3 or OGG.",

  // ── Action Editor Panel ───────────────────────────────────────
  actionEditorNoActionsYet: "No actions yet.",
  actionEditorAddActionHint: "Add an action below to define what happens.",

  // ── Sprite Picker Modal ───────────────────────────────────────
  spritePickerPreviewLabel: "Preview",

  // ── Sprite Import Crop Modal ──────────────────────────────────
  spriteImportCropZoom: "Zoom",

  // ── Variable Pickers ──────────────────────────────────────────
  variablePickerNoSprite: "No sprite available",
  variablePickerNoCollectionVar: "No {type} variable available",
  variablePickerNoVar: "No variable available",

  // ── Landing page ─────────────────────────────────────────────
  landingNavHow: "How it works",
  landingNavGameTypes: "Game types",
  landingNavFaq: "FAQ",
  landingNavEditor: "Editor",
  landingNavMainLabel: "Main navigation",
  landingNavFooterLabel: "Footer navigation",
  landingHeaderCta: "Open editor",
  landingBadge: "Online game editor — free and in the browser",
  landingHeroTitle: "Game creator: build your game from the browser",
  landingHeroDescription:
    "A visual editor where you define objects, assign them behaviors — collisions, movement, scoring — and test the result instantly. All in the browser, no installation needed.",
  landingHeroCta: "Go to editor",
  landingHeroSubCta: "Have a game idea? Bring it to life in minutes.",
  landingScreenshotTitlebar: "GameCreator — Editor",
  landingScreenshotAlt:
    "Screenshot of the GameCreator editor: objects, events, actions and conditionals",
  landingStepsTitle: "How to create a game in three steps",
  landingStep1Title: "1. Define objects and scenes",
  landingStep1Desc:
    "Create game elements — characters, obstacles, collectibles — assign them sprites and place them in rooms with the visual editor.",
  landingStep2Title: "2. Assign behaviors",
  landingStep2Desc:
    "Connect events (keyboard, collision, timer) with actions (move, destroy, change room, add points) without writing code.",
  landingStep3Title: "3. Test and iterate instantly",
  landingStep3Desc:
    "Run the game in the browser, spot what needs changing and adjust it in seconds. The create-test cycle is immediate.",
  landingGameTypesTitle: "What types of games you can create",
  landingGameTypesSubtitle:
    "The editor includes templates to get started quickly with different game styles.",
  landingGameType1Title: "Action and arcade",
  landingGameType1Desc:
    "Shoot, collect items or dodge obstacles with the keyboard. With configurable scoring, lives and speed.",
  landingGameType2Title: "Puzzles and exploration",
  landingGameType2Desc:
    "Interconnected rooms, switches, conditions and objectives. Design paths with logic and variables.",
  landingGameType3Title: "Prototypes and experiments",
  landingGameType3Desc:
    "Quickly test new mechanics: mouse controls, object interactions, custom rules.",
  landingFaqTitle: "Frequently asked questions",
  landingFaq1Q: "Is GameCreator free?",
  landingFaq1A:
    "Yes. The editor is completely free and requires no sign-up. Just open the page and start creating.",
  landingFaq2Q: "Do I need to know how to code to create a game?",
  landingFaq2A:
    "No. The system works with visual events and actions. For example: «when it collides with an enemy → destroy it and add 10 points». No code needed.",
  landingFaq3Q: "What types of games can I make?",
  landingFaq3A:
    "2D games: arcade, puzzles, adventures with multiple rooms and mouse-controlled games. Each room is 560×320 pixels with 32×32 objects.",
  landingFaq4Q: "Can I play the game directly in the browser?",
  landingFaq4A:
    "Yes. The game runs inside the editor itself. Click «Run», test it, and go back to editing instantly.",
  landingFinalCtaTitle: "Create your first game now",
  landingFinalCtaDesc:
    "Open the editor and start with a template or a blank project. No account or installation needed.",
  landingFinalCtaButton: "Open the editor",
  landingFooterTagline: "Online game editor — free and no sign-up required."
} as const
