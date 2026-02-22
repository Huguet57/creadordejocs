export const caMessages = {
  // ── App ──────────────────────────────────────────────────────
  appBrandName: "CreadorDeJocs",

  // ── Editor sidebar ──────────────────────────────────────────
  sidebarTitle: "Editor sections",
  sidebarSprites: "Sprites",
  sidebarObjects: "Objects",
  sidebarRooms: "Rooms",
  sidebarGlobals: "Globals",
  sidebarRun: "Run",

  // ── Editor topbar ──────────────────────────────────────────
  topbarTitle: "MVP 1.5 Editor UI",
  topbarSaveStatusPrefix: "Save status:",
  topbarRun: "Run",
  topbarReset: "Reset",
  topbarUndo: "Undo",
  topbarRedo: "Redo",
  topbarSaveLocal: "Save local",
  topbarLoadLocal: "Load local",
  topbarLoadTemplate: "Load Coin Dash template",

  // ── Play page ────────────────────────────────────────────────
  playLoading: "Carregant joc compartit...",
  playErrorDefault: "Could not load shared game.",
  playBackToHome: "Tornar a l'inici",
  playCtaPrefix: "Crea el teu propi joc amb",

  // ── Sprite frame timeline ────────────────────────────────────
  spriteFrameLabel: "Fotograma {index}",
  spriteFrameAdd: "Afegeix fotograma",
  spriteFrameDuplicate: "Duplica fotograma",
  spriteFrameDelete: "Elimina fotograma",

  // ── Sprite tool options ──────────────────────────────────────
  spriteToolColor: "Color",
  spriteToolPalette: "Paleta",
  spriteToolTransparent: "Transparent",
  spriteToolFromImage: "De la imatge",
  spriteToolNoOptions: "Aquesta eina no té opcions.",
  spriteToolToleranceLabel: "Tolerància: {value}",
  spriteToolHoverPreview: "Hover preview",
  spriteToolEraserSize: "Mida",

  // ── Sprite editor section ────────────────────────────────────
  spriteEditorGrid: "Grid",
  spriteEditorZoom: "Zoom",
  spriteEditorFit: "Fit",
  spriteEditorSelectToStart: "Select a sprite to start editing",
  spriteDeleteBlockedByObjects:
    "No es pot eliminar aquest sprite perquè està sent utilitzat per: {objects}",

  // ── Sprite list panel ────────────────────────────────────────
  spriteListNewSprite: "Sprite nou",
  spriteListEmptyFolder: "Carpeta buida",
  spriteListNewFolderPlaceholder: "New folder",
  spriteListEmptyHint: "Right-click or press + to add",
  spriteListEmpty: "buit",
  spriteListMoreObjects: "+{count} més",
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
  debugEnableTitle: "Activa debug",
  debugDisableTitle: "Desactiva debug",
  debugSelectNone: "-- Cap --",
  debugObjectLabel: "Objecte",
  debugVariablesLabel: "Variables",

  // ── Block selector panel ─────────────────────────────────────
  blockSelectorTitle: "Afegir bloc",
  blockSelectorCancel: "Cancel",
  blockOptionIf: "If / Condició",
  blockOptionRepeat: "Repetir",
  blockOptionForEachList: "Per cada (llista)",
  blockOptionForEachMap: "Per cada (mapa)",

  // ── Action selector panel ────────────────────────────────────
  actionSelectorTitle: "Afegir acció",
  actionSelectorCancel: "Cancel",
  actionCategoryLists: "Llistes",
  actionCategoryMaps: "Mapes",

  // ── Templates section ────────────────────────────────────────
  templatesTitle: "Templates",
  templatesSubtitle: "Load a pre-built game to learn or remix.",
  templatesStarter: "Templates inicials",
  templatesIntermediate: "Templates de dificultat intermitja",
  templatesAdvanced: "Templates avançades",
  templatesLoadButton: "Load Template",

  // ── Import dropdown ──────────────────────────────────────────
  importGameLabel: "Game",
  importProjectsLabel: "Projectes",
  importCreateBlank: "Crear joc en blanc...",
  importJsonLabel: "Importar joc (.json)",
  importJsonAsNew: "Com a projecte nou",
  importJsonReplace: "Sobreescriure projecte actiu",
  importExport: "Exportar joc actual",
  importErrorExport: "No s'ha pogut exportar el joc. Torna-ho a provar.",
  importStatusImporting: "Important joc...",
  importStatusImported: "Joc importat correctament.",
  importErrorImport: "No s'ha pogut importar el fitxer.",
  importPromptProjectName: "Nom del projecte",
  importConfirmDelete: "Vols esborrar el projecte actiu?",

  // ── Share dropdown ───────────────────────────────────────────
  shareDropdownLabel: "Compartir joc",
  shareDropdownPublishing: "Publicant...",
  shareDropdownPublish: "Publicar joc",
  shareDropdownCopied: "Copiat!",
  shareDropdownCopyLink: "Copiar enllaç",
  shareDropdownOpenLink: "Anar a l'enllaç",
  shareDropdownCopyError: "No s'ha pogut copiar l'enllaç.",

  // ── Account dropdown ─────────────────────────────────────────
  accountLabel: "Compte",
  accountTriggerLabel: "Account",
  accountSignIn: "Iniciar sessió",
  accountSignOut: "Tancar sessió",
  accountSyncing: "Pujant...",
  accountSyncError: "Error de sincronització",
  accountSyncErrorDetail: "No s'ha pogut sincronitzar.",
  accountCloudUpload: "Pujar al núvol",
  accountCloudUploadTime: "Pujar al núvol · {time}",
  accountErrorSignIn: "No s'ha pogut iniciar sessió.",
  accountErrorSignUp: "No s'ha pogut crear el compte.",
  accountErrorGoogleSignIn: "No s'ha pogut iniciar sessió amb Google.",
  accountErrorSignOut: "No s'ha pogut tancar la sessió.",
  accountTimeAgo10s: "Fa 10 segons",
  accountTimeAgo30s: "Fa 30 segons",
  accountTimeAgo1Min: "Fa 1 minut",
  accountTimeAgoMins: "Fa {count} minuts",
  accountTimeAgo1Hour: "Fa 1 hora",
  accountTimeAgoHours: "Fa {count} hores",
  accountTimeAgo1Day: "Fa 1 dia",
  accountTimeAgoDays: "Fa {count} dies",

  // ── Auth password modal ──────────────────────────────────────
  authTitleSignUp: "Crea un compte",
  authTitleSignIn: "Inicia sessió",
  authSubtitleSignUp: "Registra't per desar els teus jocs.",
  authSubtitleSignIn: "Entra per desar i compartir els teus jocs.",
  authGoogleButton: "Continua amb Google",
  authEmailDivider: "o bé amb correu",
  authEmailLabel: "Correu electrònic",
  authEmailPlaceholder: "nom@exemple.com",
  authPasswordLabel: "Contrasenya",
  authPasswordPlaceholderSignUp: "Mínim 6 caràcters",
  authPasswordPlaceholderSignIn: "La teva contrasenya",
  authSubmitCreating: "Creant compte...",
  authSubmitSigningIn: "Entrant...",
  authSubmitCreate: "Crear compte",
  authSubmitSignIn: "Entrar",
  authToggleHasAccount: "Ja tens un compte?",
  authToggleNoAccount: "No tens compte?",
  authToggleToSignIn: "Inicia sessió",
  authToggleToSignUp: "Crea'n un",
  authCancel: "Cancela",

  // ── Share section ────────────────────────────────────────────
  shareTitle: "Compartir",
  shareStatusPublishing: "Publicant joc...",
  shareStatusPublished: "Enllaç preparat. Ja el pots compartir.",
  shareStatusError: "No s'ha pogut publicar el joc. Torna-ho a provar.",
  shareStatusIdle: "Publica el joc i comparteix l'enllaç amb els teus amics.",
  shareBadgePublishing: "Publicant",
  shareBadgePublished: "Compartit",
  shareBadgeError: "Error",
  shareBadgeIdle: "No compartit",
  shareExplainerTitle: "Què vol dir compartir?",
  shareExplainerPublish:
    "En publicar, es crea una versió del joc accessible amb una URL única.",
  shareExplainerPlayOnly:
    "Els teus amics obriran aquesta URL en mode jugar (play-only), no en mode editar.",
  shareExplainerRepublish:
    "Si fas canvis al joc, cal tornar a publicar per generar un enllaç nou amb la versió actualitzada.",
  sharePublishButtonPublishing: "Publicant...",
  sharePublishButton: "Publicar joc",
  shareCopyLinkButton: "Copiar enllaç",
  sharePermalinkLabel: "Permalink",
  sharePermalinkPlaceholder: "https://creadordejocs.com/play/...",
  shareNotPublished: "Aquest joc encara no s'ha compartit.",
  sharePublishedNote:
    "Aquest és l'últim enllaç publicat. Guarda'l o comparteix-lo directament.",
  shareCopied: "Enllaç copiat.",
  shareCopyError: "No s'ha pogut copiar l'enllaç.",

  // ── Run section ──────────────────────────────────────────────
  runLabel: "Run",
  runResetButton: "Reset",
  runRunButton: "Run",
  runStatusLabel: "Status",
  runRoomLabel: "Room",
  runScoreLabel: "Score",
  runStateLabel: "State",
  runGameOver: "Ha acabat el joc",
  runRunning: "Running",
  runGlobalVarsLabel: "Global variables",
  runNoGlobals: "No globals defined",
  runMouseLabel: "Mouse",
  runPreviewLabel: "Preview:",
  runPlaying: "Playing",
  runStopped: "Stopped",
  runNoRoom: "Create a room first to run the game",
  runStartPrompt: "Prem qualsevol tecla per començar",
  runStartHint: "També pots clicar amb el mouse",

  // ── Control block ────────────────────────────────────────────
  controlBlockIf: "IF",
  controlBlockRepeat: "REPEAT",
  controlBlockEachList: "EACH LLISTA",
  controlBlockEachMap: "EACH MAPA",
  controlBlockRemoveTitle: "Remove block",
  controlBlockAddElse: "Afegir else",
  controlBlockHideElse: "Amagar else",
  controlBlockNoActions: "Cap acció definida",
  controlBlockAddAction: "Add action",
  controlBlockAddBlock: "Add block",
  controlBlockAddCondition: "Afegir condició AND/OR",
  controlBlockAddConditionSimple: "Afegir condició",
  controlBlockRemoveCondition: "Treure condició",
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
  actionBlockMoveTowardObject: "Objecte",
  actionBlockMoveTowardMouse: "Ratoli",
  actionBlockNoObjects: "No objectes",
  actionBlockSpawnAbsolute: "Absolut",
  actionBlockSpawnRelative: "Relatiu",
  actionBlockRoomUnavailable: "Sala no disponible",
  actionBlockNoRooms: "Cap sala disponible",
  actionBlockRestartRoom: "Sala actual",
  actionBlockEmitNameLabel: "Nom",
  actionBlockEmitTypeLabel: "Tipus",

  // ── Editor controller ────────────────────────────────────────
  controllerConfirmLegacyImport:
    "S'han detectat projectes locals antics. Vols importar-los al compte actual?",
  controllerConfirmOverwrite: "Aixo sobreescriura el joc actual. Vols continuar?",
  controllerDefaultProjectName: "Primer joc autònom",
  controllerBlankProjectName: "Nou joc",
  controllerDefaultRoomName: "Sala principal",

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
    "Explora un món amb múltiples sales, herbes aleatòries i batalles. Projecte avançat complet.",

  // ── Sprite import crop modal ────────────────────────────────
  spriteImportCropTitle: "Crop i ajust d'importació",
  spriteImportCropInstructions:
    "Resultat: {width} x {height} px — Arrossega les cantonades per redimensionar, el centre per moure",
  spriteImportCropOriginal: "Imatge original",
  spriteImportCropExpected: "Resultat esperat",
  spriteImportCropCancel: "Cancel·lar",
  spriteImportCropConfirm: "Confirmar i importar",

  // ── Sprite picker modal ────────────────────────────────────
  spritePickerEmpty: "· buit",
  spritePickerMore: "+{count} més",
  spritePickerIncompatible: "· no compatible",

  // ── Right value picker ─────────────────────────────────────
  rightValueRandomStep: "·pas",

  // ── Landing page ─────────────────────────────────────────────
  landingNavHow: "Com funciona",
  landingNavGameTypes: "Tipus de jocs",
  landingNavFaq: "FAQ",
  landingNavEditor: "Editor",
  landingNavMainLabel: "Navegació principal",
  landingNavFooterLabel: "Navegació al peu",
  landingHeaderCta: "Obrir editor",
  landingBadge: "Editor de jocs online — gratuït i al navegador",
  landingHeroTitle: "Creador de jocs: crea el teu joc des del navegador",
  landingHeroDescription:
    "Un editor visual on defineixes objectes, els hi assignes comportaments — col·lisions, moviment, puntuació — i proves el resultat al moment. Tot al navegador, sense instal·lar res.",
  landingHeroCta: "Ves a l'editor",
  landingHeroSubCta: "Tens una idea de joc? Porta-la a la realitat en minuts.",
  landingScreenshotTitlebar: "CreadorDeJocs — Editor",
  landingScreenshotAlt:
    "Captura de l'editor de jocs CreadorDeJocs: objectes, events, accions i condicionals",
  landingStepsTitle: "Com crear un joc en tres passos",
  landingStep1Title: "1. Defineix objectes i escenaris",
  landingStep1Desc:
    "Crea els elements del joc — personatges, obstacles, col·leccionables — assigna'ls sprites i col·loca'ls a les sales amb l'editor visual.",
  landingStep2Title: "2. Assigna comportaments",
  landingStep2Desc:
    "Connecta events (teclat, col·lisió, temporitzador) amb accions (moure, destruir, canviar sala, sumar punts) sense escriure codi.",
  landingStep3Title: "3. Prova i itera al moment",
  landingStep3Desc:
    "Executa el joc al navegador, detecta què cal canviar i ajusta-ho en segons. El cicle crear-provar és immediat.",
  landingGameTypesTitle: "Quins tipus de jocs pots crear",
  landingGameTypesSubtitle:
    "L'editor inclou plantilles per començar ràpid amb diferents estils de joc.",
  landingGameType1Title: "Acció i arcade",
  landingGameType1Desc:
    "Dispara, recull objectes o esquiva obstacles amb el teclat. Amb puntuació, vides i velocitat configurable.",
  landingGameType2Title: "Puzles i exploració",
  landingGameType2Desc:
    "Sales interconnectades, interruptors, condicions i objectius. Dissenya recorreguts amb lògica i variables.",
  landingGameType3Title: "Prototips i experiments",
  landingGameType3Desc:
    "Prova mecàniques noves ràpidament: controls amb ratolí, interaccions entre objectes, regles personalitzades.",
  landingFaqTitle: "Preguntes freqüents",
  landingFaq1Q: "CreadorDeJocs és gratuït?",
  landingFaq1A:
    "Sí. L'editor és completament gratuït i no demana registre. Obres la pàgina i comences a crear directament.",
  landingFaq2Q: "Necessito saber programar per crear un joc?",
  landingFaq2A:
    "No. El sistema funciona amb events i accions visuals. Per exemple: «quan col·lisiona amb un enemic → destrueix-lo i suma 10 punts». Sense codi.",
  landingFaq3Q: "Quins tipus de jocs puc fer?",
  landingFaq3A:
    "Jocs 2D: arcade, puzles, aventures amb múltiples sales i jocs controlats amb ratolí. Cada sala fa 560×320 píxels amb objectes de 32×32.",
  landingFaq4Q: "Puc jugar al joc directament al navegador?",
  landingFaq4A:
    "Sí. El joc s'executa dins el mateix editor. Fas clic a «Executar», el proves, i tornes a editar al moment.",
  landingFinalCtaTitle: "Crea el teu primer joc ara",
  landingFinalCtaDesc:
    "Obre l'editor i comença amb una plantilla o un projecte en blanc. Sense compte ni instal·lació.",
  landingFinalCtaButton: "Obrir l'editor",
  landingFooterTagline: "Editor de jocs online — gratuït i sense registre."
} as const

export type EditorMessageKey = keyof typeof caMessages
