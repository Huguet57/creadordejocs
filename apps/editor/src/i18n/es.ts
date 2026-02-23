import type { caMessages } from "./ca.js"

export const esMessages: Record<keyof typeof caMessages, string> = {
  // ── App ──────────────────────────────────────────────────────
  appBrandName: "CreadorDeJocs",
  appSaving: "Guardando…",
  appSaved: "Guardado",
  appSaveError: "Error",
  appUndoTitle: "Deshacer",
  appRedoTitle: "Rehacer",
  appSaveTitle: "Guardar",

  // ── Editor sidebar ──────────────────────────────────────────
  sidebarTitle: "Secciones del editor",
  sidebarSprites: "Sprites",
  sidebarObjects: "Objetos",
  sidebarRooms: "Salas",
  sidebarGlobals: "Globales",
  sidebarRun: "Ejecutar",

  // ── Editor topbar ──────────────────────────────────────────
  topbarTitle: "Editor UI",
  topbarSaveStatusPrefix: "Estado:",
  topbarRun: "Ejecutar",
  topbarReset: "Reiniciar",
  topbarUndo: "Deshacer",
  topbarRedo: "Rehacer",
  topbarSaveLocal: "Guardar local",
  topbarLoadLocal: "Cargar local",
  topbarLoadTemplate: "Cargar plantilla Coin Dash",

  // ── Play page ────────────────────────────────────────────────
  playLoading: "Cargando juego compartido...",
  playErrorDefault: "No se ha podido cargar el juego compartido.",
  playBackToHome: "Volver al inicio",
  playCtaPrefix: "Crea tu propio juego con",

  // ── Sprite frame timeline ────────────────────────────────────
  spriteFrameLabel: "Fotograma {index}",
  spriteFrameAdd: "Añadir fotograma",
  spriteFrameDuplicate: "Duplicar fotograma",
  spriteFrameDelete: "Eliminar fotograma",

  // ── Sprite tool options ──────────────────────────────────────
  spriteToolColor: "Color",
  spriteToolPalette: "Paleta",
  spriteToolTransparent: "Transparente",
  spriteToolFromImage: "Desde imagen",
  spriteToolNoOptions: "Esta herramienta no tiene opciones.",
  spriteToolToleranceLabel: "Tolerancia: {value}",
  spriteToolHoverPreview: "Vista previa al pasar",
  spriteToolEraserSize: "Tamaño",
  spriteToolOpacity: "Opacidad: {value}%",

  // ── Sprite editor section ────────────────────────────────────
  spriteEditorGrid: "Cuadrícula",
  spriteEditorZoom: "Zoom",
  spriteEditorFit: "Ajustar",
  spriteEditorSelectToStart: "Selecciona un sprite para empezar a editar",
  spriteDeleteBlockedByObjects:
    "No se puede eliminar este sprite porque está siendo usado por: {objects}",

  // ── Sprite list panel ────────────────────────────────────────
  spriteListNewSprite: "Nuevo sprite",
  spriteListEmptyFolder: "Carpeta vacía",
  spriteListNewFolderPlaceholder: "Nueva carpeta",
  spriteListEmptyHint: "Haz clic derecho o pulsa + para añadir",
  spriteListEmpty: "vacío",
  spriteListMoreObjects: "+{count} más",
  spriteListCopyNameSuffix: "(copia)",
  spriteListExpandTitle: "Expandir lista de sprites",
  spriteListCollapseTitle: "Contraer lista de sprites",
  spriteListAddSpriteTitle: "Añadir sprite",
  spriteListNewFolderTitle: "Nueva carpeta",
  spriteListCancelTitle: "Cancelar",
  spriteListCtxOpen: "Abrir",
  spriteListCtxOpenNewTab: "Abrir en nueva pestaña",
  spriteListCtxRename: "Renombrar",
  spriteListCtxDuplicate: "Duplicar",
  spriteListCtxDelete: "Eliminar",
  spriteListCtxRenameFolder: "Renombrar",
  spriteListCtxNewSubfolder: "Nueva subcarpeta",
  spriteListCtxNewSpriteHere: "Nuevo sprite aquí",
  spriteListCtxDeleteFolder: "Eliminar carpeta",
  spriteListCtxNewSprite: "Nuevo sprite",
  spriteListCtxNewFolder: "Nueva carpeta",

  // ── Instance debug panel ─────────────────────────────────────
  debugLabel: "Debug",
  debugEnableTitle: "Activar debug",
  debugDisableTitle: "Desactivar debug",
  debugSelectNone: "-- Ninguno --",
  debugObjectLabel: "Objeto",
  debugVariablesLabel: "Variables",

  // ── Block selector panel ─────────────────────────────────────
  blockSelectorTitle: "Añadir bloque",
  blockSelectorCancel: "Cancelar",
  blockOptionIf: "If / Condición",
  blockOptionRepeat: "Repetir",
  blockOptionForEachList: "Para cada (lista)",
  blockOptionForEachMap: "Para cada (mapa)",

  // ── Action selector panel ────────────────────────────────────
  actionSelectorTitle: "Añadir acción",
  actionSelectorCancel: "Cancelar",
  actionCategoryLists: "Listas",
  actionCategoryMaps: "Mapas",

  // ── Templates section ────────────────────────────────────────
  templatesTitle: "Plantillas",
  templatesSubtitle: "Carga un juego preconstruido para aprender o remezclar.",
  templatesStarter: "Plantillas iniciales",
  templatesIntermediate: "Plantillas de dificultad intermedia",
  templatesAdvanced: "Plantillas avanzadas",
  templatesLoadButton: "Cargar plantilla",

  // ── Import dropdown ──────────────────────────────────────────
  importGameLabel: "Juego",
  importProjectsLabel: "Proyectos",
  importCreateBlank: "Crear juego en blanco...",
  importJsonLabel: "Importar juego (.json)",
  importJsonAsNew: "Como proyecto nuevo",
  importJsonReplace: "Sobrescribir proyecto activo",
  importExport: "Exportar juego actual",
  importErrorExport: "No se ha podido exportar el juego. Inténtalo de nuevo.",
  importStatusImporting: "Importando juego...",
  importStatusImported: "Juego importado correctamente.",
  importErrorImport: "No se ha podido importar el archivo.",
  importPromptProjectName: "Nombre del proyecto",
  importConfirmDelete: "¿Quieres borrar el proyecto activo?",

  // ── Share dropdown ───────────────────────────────────────────
  shareDropdownTrigger: "Compartir",
  shareDropdownLabel: "Compartir juego",
  shareDropdownPublishing: "Publicando...",
  shareDropdownPublish: "Publicar juego",
  shareDropdownCopied: "¡Copiado!",
  shareDropdownCopyLink: "Copiar enlace",
  shareDropdownOpenLink: "Ir al enlace",
  shareDropdownCopyError: "No se ha podido copiar el enlace.",

  // ── Account dropdown ─────────────────────────────────────────
  accountLabel: "Cuenta",
  accountTriggerLabel: "Cuenta",
  accountSignIn: "Iniciar sesión",
  accountSignOut: "Cerrar sesión",
  accountSyncing: "Subiendo...",
  accountSyncError: "Error de sincronización",
  accountSyncErrorDetail: "No se ha podido sincronizar.",
  accountCloudUpload: "Subir a la nube",
  accountCloudUploadTime: "Subir a la nube · {time}",
  accountErrorSignIn: "No se ha podido iniciar sesión.",
  accountErrorSignUp: "No se ha podido crear la cuenta.",
  accountErrorGoogleSignIn: "No se ha podido iniciar sesión con Google.",
  accountErrorSignOut: "No se ha podido cerrar la sesión.",
  accountTimeAgo10s: "Hace 10 segundos",
  accountTimeAgo30s: "Hace 30 segundos",
  accountTimeAgo1Min: "Hace 1 minuto",
  accountTimeAgoMins: "Hace {count} minutos",
  accountTimeAgo1Hour: "Hace 1 hora",
  accountTimeAgoHours: "Hace {count} horas",
  accountTimeAgo1Day: "Hace 1 día",
  accountTimeAgoDays: "Hace {count} días",

  // ── Auth password modal ──────────────────────────────────────
  authTitleSignUp: "Crea una cuenta",
  authTitleSignIn: "Inicia sesión",
  authSubtitleSignUp: "Regístrate para guardar tus juegos.",
  authSubtitleSignIn: "Entra para guardar y compartir tus juegos.",
  authGoogleButton: "Continuar con Google",
  authEmailDivider: "o con correo electrónico",
  authEmailLabel: "Correo electrónico",
  authEmailPlaceholder: "nombre@ejemplo.com",
  authPasswordLabel: "Contraseña",
  authPasswordPlaceholderSignUp: "Mínimo 6 caracteres",
  authPasswordPlaceholderSignIn: "Tu contraseña",
  authSubmitCreating: "Creando cuenta...",
  authSubmitSigningIn: "Entrando...",
  authSubmitCreate: "Crear cuenta",
  authSubmitSignIn: "Entrar",
  authToggleHasAccount: "¿Ya tienes una cuenta?",
  authToggleNoAccount: "¿No tienes cuenta?",
  authToggleToSignIn: "Inicia sesión",
  authToggleToSignUp: "Crea una",
  authCancel: "Cancelar",

  // ── Share section ────────────────────────────────────────────
  shareTitle: "Compartir",
  shareStatusPublishing: "Publicando juego...",
  shareStatusPublished: "Enlace listo. Ya puedes compartirlo.",
  shareStatusError: "No se ha podido publicar el juego. Inténtalo de nuevo.",
  shareStatusIdle: "Publica el juego y comparte el enlace con tus amigos.",
  shareBadgePublishing: "Publicando",
  shareBadgePublished: "Compartido",
  shareBadgeError: "Error",
  shareBadgeIdle: "No compartido",
  shareExplainerTitle: "¿Qué significa compartir?",
  shareExplainerPublish:
    "Al publicar, se crea una versión del juego accesible con una URL única.",
  shareExplainerPlayOnly:
    "Tus amigos abrirán esta URL en modo jugar (solo lectura), no en modo editar.",
  shareExplainerRepublish:
    "Si haces cambios al juego, deberás volver a publicar para generar un enlace nuevo con la versión actualizada.",
  sharePublishButtonPublishing: "Publicando...",
  sharePublishButton: "Publicar juego",
  shareCopyLinkButton: "Copiar enlace",
  sharePermalinkLabel: "Permalink",
  sharePermalinkPlaceholder: "https://creadordejocs.com/play/...",
  shareNotPublished: "Este juego aún no se ha compartido.",
  sharePublishedNote:
    "Este es el último enlace publicado. Guárdalo o compártelo directamente.",
  shareCopied: "Enlace copiado.",
  shareCopyError: "No se ha podido copiar el enlace.",

  // ── Run section ──────────────────────────────────────────────
  runLabel: "Ejecutar",
  runResetButton: "Reiniciar",
  runRunButton: "Ejecutar",
  runStatusLabel: "Estado",
  runRoomLabel: "Sala",
  runScoreLabel: "Puntuación",
  runStateLabel: "Estado",
  runGameOver: "El juego ha terminado",
  runRunning: "Ejecutando",
  runGlobalVarsLabel: "Variables globales",
  runNoGlobals: "No hay globales definidas",
  runMouseLabel: "Ratón",
  runPreviewLabel: "Vista previa:",
  runPlaying: "Jugando",
  runStopped: "Detenido",
  runNoRoom: "Crea una sala primero para ejecutar el juego",
  runStartPrompt: "Pulsa cualquier tecla para empezar",
  runStartHint: "También puedes hacer clic con el ratón",

  // ── Control block ────────────────────────────────────────────
  controlBlockIf: "IF",
  controlBlockRepeat: "REPETIR",
  controlBlockEachList: "CADA LISTA",
  controlBlockEachMap: "CADA MAPA",
  controlBlockRemoveTitle: "Eliminar bloque",
  controlBlockAddElse: "Añadir else",
  controlBlockHideElse: "Ocultar else",
  controlBlockNoActions: "Ninguna acción definida",
  controlBlockAddAction: "Añadir acción",
  controlBlockAddBlock: "Añadir bloque",
  controlBlockAddCondition: "Añadir condición AND/OR",
  controlBlockAddConditionSimple: "Añadir condición",
  controlBlockRemoveCondition: "Quitar condición",
  controlBlockCtxCopy: "Copiar bloque",
  controlBlockCtxPaste: "Pegar después",
  controlBlockCtxDelete: "Eliminar bloque",
  controlBlockPickerIf: "If",
  controlBlockPickerRepeat: "Repetir",
  controlBlockPickerEachList: "Cada lista",
  controlBlockPickerEachMap: "Cada mapa",

  // ── Action block ─────────────────────────────────────────────
  actionBlockReorderTitle: "Reordenar acción",
  actionBlockRemoveTitle: "Eliminar acción",
  actionBlockCtxCopy: "Copiar acción",
  actionBlockCtxPaste: "Pegar después",
  actionBlockCtxDelete: "Eliminar acción",
  actionBlockTransitionNone: "Ninguna",
  actionBlockTransitionFade: "Fade",
  actionBlockTransitionSlideLeft: "Deslizar izquierda",
  actionBlockTransitionSlideRight: "Deslizar derecha",
  actionBlockMoveTowardObject: "Objeto",
  actionBlockMoveTowardMouse: "Ratón",
  actionBlockNoObjects: "Sin objetos",
  actionBlockSpawnAbsolute: "Absoluto",
  actionBlockSpawnRelative: "Relativo",
  actionBlockRoomUnavailable: "Sala no disponible",
  actionBlockNoRooms: "Ninguna sala disponible",
  actionBlockRestartRoom: "Sala actual",
  actionBlockEmitNameLabel: "Nombre",
  actionBlockEmitTypeLabel: "Tipo",

  // ── Editor controller ────────────────────────────────────────
  controllerConfirmLegacyImport:
    "Se han detectado proyectos locales antiguos. ¿Quieres importarlos a la cuenta actual?",
  controllerConfirmOverwrite: "Esto sobrescribirá el juego actual. ¿Quieres continuar?",
  controllerDefaultProjectName: "Primer juego autónomo",
  controllerBlankProjectName: "Nuevo juego",
  controllerDefaultRoomName: "Sala principal",

  // ── Template descriptions ────────────────────────────────────
  templateCoinDashDesc:
    "Recoge la moneda y esquiva enemigos. Ideal para aprender puntuación y colisiones.",
  templateSpaceShooterDesc:
    "Mueve tu nave y dispara asteroides con Espacio. Lo básico del arcade.",
  templateLaneCrosserDesc: "Cruza carriles de tráfico y llega a la zona objetivo.",
  templateSwitchVaultDesc:
    "Activa el interruptor y viaja a la bóveda solo cuando esté desbloqueada.",
  templateCursorCourierDesc:
    "Guía entregas con el ratón y usa ráfagas de velocidad manteniendo pulsado.",
  templatePokemonExplorerDesc:
    "Explora un mundo con múltiples salas, hierba aleatoria y batallas. Proyecto avanzado completo.",

  // ── Sprite import crop modal ────────────────────────────────
  spriteImportCropTitle: "Recorte y ajuste de importación",
  spriteImportCropInstructions:
    "Resultado: {width} x {height} px — Arrastra las esquinas para redimensionar, el centro para mover",
  spriteImportCropOriginal: "Imagen original",
  spriteImportCropExpected: "Resultado esperado",
  spriteImportCropCancel: "Cancelar",
  spriteImportCropConfirm: "Confirmar e importar",
  spriteImportCropReset: "Reiniciar recorte",

  // ── Sprite picker modal ────────────────────────────────────
  spritePickerCloseAriaLabel: "Cerrar modal de sprites",
  spritePickerTitle: "Sprite para {objectName}",
  spritePickerSubtitle:
    "Selecciona un sprite ({width} x {height}) o uno de ratio compatible para escalarlo.",
  spritePickerSidebarTitle: "Sprites y carpetas",
  spritePickerNoSprites: "No hay sprites aún",
  spritePickerSelectHint: "Selecciona un sprite para ver su vista previa.",
  spritePickerNewButton: "+ Nuevo Sprite",
  spritePickerEditButton: "Editar Sprite",
  spritePickerSelectButton: "Seleccionar",
  spritePickerEmpty: "· vacío",
  spritePickerMore: "+{count} más",
  spritePickerIncompatible: "· no compatible",

  // ── Object list panel ────────────────────────────────────
  objectListNewPlaceholder: "Nuevo objeto",

  // ── Variable pickers ─────────────────────────────────────
  variablePickerGlobalSection: "Global",
  variablePickerObjectSection: "Objeto",

  // ── Object variables panel ────────────────────────────────
  objectVarsAddItem: "Añadir elemento",
  objectVarsAddEntry: "Añadir entrada",
  objectVarsRemoveEntry: "Quitar entrada",

  // ── Global variables section ─────────────────────────────
  globalVarsAddItem: "Añadir elemento",
  globalVarsAddEntry: "Añadir entrada",
  globalVarsRemoveEntry: "Quitar entrada",

  // ── Sprite toolbar ───────────────────────────────────────
  spriteToolbarToolOptions: "Opciones de herramienta",
  spriteToolbarTransform: "Transformar",
  spriteToolbarFlipH: "Invertir horizontal",
  spriteToolbarFlipV: "Invertir vertical",
  spriteToolbarRotateCW: "Rotar 90° horario",
  spriteToolbarRotateCCW: "Rotar 90° antihorario",

  // ── Right value picker ─────────────────────────────────────
  rightValueValueSection: "Valor",
  rightValueAttributesSection: "Atributos",
  rightValueInternalSection: "Variables internas",
  rightValueRandomStep: "·paso",

  // ── Global Variables Section ─────────────────────────────────
  globalVarsTitle: "Variables globales",
  globalVarsSubtitle: "Variables compartidas entre todas las instancias de objetos.",
  globalVarsDeleteTitle: "Eliminar variable",
  globalVarsNoVarsYet: "Aún no hay variables",
  globalVarsAddSectionLabel: "Añadir variable global",
  globalVarsCancelTitle: "Cancelar",
  globalVarsCancelAriaLabel: "Cancelar añadir variable",
  globalVarsAddBtnTitle: "Añadir variable",
  globalVarsNameLabel: "Nombre",
  globalVarsTypeLabel: "Tipo",
  globalVarsItemTypeLabel: "Tipo de elemento",
  globalVarsInitialValueLabel: "Valor inicial",
  globalVarsAddConfirm: "Añadir",
  globalVarsNamePlaceholder: "p.ej. puntos, vidas, nivel",
  globalVarsRemoveItemTitle: "Eliminar elemento",

  // ── Object Variables Panel ────────────────────────────────────
  objectVarsAttributesLabel: "Atributos",
  objectVarsVariablesLabel: "Variables",
  objectVarsCancelTitle: "Cancelar",
  objectVarsCancelAriaLabel: "Cancelar añadir variable",
  objectVarsAddTitle: "Añadir variable",
  objectVarsAddAriaLabel: "Añadir variable",
  objectVarsNameLabel: "Nombre",
  objectVarsNamePlaceholder: "p.ej. salud, velocidad, puntos",
  objectVarsTypeLabel: "Tipo",
  objectVarsInitialValueLabel: "Valor inicial",
  objectVarsValuePlaceholder: "Valor",
  objectVarsAddConfirm: "Añadir",
  objectVarsDeleteTitle: "Eliminar variable",
  objectVarsNoVarsYet: "Aún no hay variables",
  objectVarsRemoveItemTitle: "Eliminar elemento",
  objectVarsWidthLabel: "anchura",
  objectVarsHeightLabel: "altura",
  objectVarsLayerLabel: "capa",

  // ── Object Card ───────────────────────────────────────────────
  objectCardSpriteTitle: "Selecciona o edita el sprite",
  objectCardVisibleLabel: "visible",
  objectCardSolidLabel: "sólido",

  // ── Sprite Toolbar (tool labels) ──────────────────────────────
  spriteToolbarToolsLabel: "Herramientas",
  spriteToolbarFlipHLabel: "Gira H",
  spriteToolbarFlipVLabel: "Gira V",
  spriteToolbarRotateCWLabel: "Rot +90°",
  spriteToolbarRotateCCWLabel: "Rot -90°",

  // ── Room Object Picker Panel ──────────────────────────────────
  roomPickerModeLabel: "Modo",
  roomPickerModeObjects: "Objetos",
  roomPickerModePaint: "Pintar",
  roomPickerNoObjects: "Sin objetos",
  roomPickerAttributesLabel: "Atributos",
  roomPickerWidthLabel: "Anchura",
  roomPickerHeightLabel: "Altura",
  roomPickerNoSprites: "Sin sprites",
  roomPickerToolsLabel: "Herramientas",
  roomPickerBackgroundLabel: "Fondo",
  roomPickerNoBackground: "Sin fondo",
  roomPickerEraserLabel: "Goma",
  roomPickerStampsCount: "{count} sellos",
  roomPickerAddObjTitle: "Añadir {name} a la sala",
  roomPickerPaintWithTitle: "Pintar con {name}",

  // ── Room Editor Section ───────────────────────────────────────
  roomEditorGrid: "Cuadrícula",
  roomEditorZoom: "Zoom",
  roomEditorRemoveInstance: "Eliminar instancia",
  roomEditorLayerDown: "Bajar capa",
  roomEditorLayerUp: "Subir capa",

  // ── Room List Panel ───────────────────────────────────────────
  roomListNewFolderPlaceholder: "Nueva carpeta",
  roomListNewRoomPlaceholder: "Nueva sala",
  roomListExpandTitle: "Expandir lista de salas",
  roomListAddRoomTitle: "Añadir sala",
  roomListNewFolderTitle: "Nueva carpeta",
  roomListCollapseTitle: "Contraer lista de salas",
  roomListEmptyHint: "Haz clic derecho o pulsa + para añadir",
  roomListCtxOpen: "Abrir",
  roomListCtxOpenNewTab: "Abrir en nueva pestaña",
  roomListCtxRename: "Renombrar",
  roomListCtxDelete: "Eliminar",
  roomListCtxNewSubfolder: "Nueva subcarpeta",
  roomListCtxNewRoomHere: "Nueva sala aquí",
  roomListCtxDeleteFolder: "Eliminar carpeta",
  roomListCtxNewRoom: "Nueva sala",
  roomListCtxNewFolder: "Nueva carpeta",

  // ── Object List Panel ─────────────────────────────────────────
  objectListExpandTitle: "Expandir lista de objetos",
  objectListAddObjTitle: "Añadir objeto",
  objectListNewFolderTitle: "Nueva carpeta",
  objectListCollapseTitle: "Contraer lista de objetos",
  objectListEmptyHint: "Haz clic derecho o pulsa + para añadir",
  objectListNewFolderPlaceholder: "Nueva carpeta",
  objectListEmptyFolder: "Carpeta vacía",
  objectListCtxOpen: "Abrir",
  objectListCtxOpenNewTab: "Abrir en nueva pestaña",
  objectListCtxDuplicate: "Duplicar",
  objectListCtxRename: "Renombrar",
  objectListCtxDelete: "Eliminar",
  objectListCtxNewSubfolder: "Nueva subcarpeta",
  objectListCtxNewObjHere: "Nuevo objeto aquí",
  objectListCtxDeleteFolder: "Eliminar carpeta",
  objectListCtxNewObj: "Nuevo objeto",
  objectListCtxNewFolder: "Nueva carpeta",

  // ── Event List Panel ──────────────────────────────────────────
  eventListTitle: "Eventos",
  eventListNoEvents: "Sin eventos definidos",
  eventListAddEvent: "Añadir evento",
  eventListNewEventLabel: "Nuevo evento",
  eventListConfiguringLabel: "Configurando...",
  eventListCancelTitle: "Cancelar",
  eventListCancelNewEventAria: "Cancelar nuevo evento",

  // ── Event Selector Panel ──────────────────────────────────────
  eventSelectorTitle: "Añadir evento",
  eventSelectorNameLabel: "Nombre",
  eventSelectorAddKeyboardTitle: "Añadir teclado",
  eventSelectorKeyLabel: "Tecla",
  eventSelectorAnyKey: "Cualquier tecla",
  eventSelectorModeLabel: "Modo",
  eventSelectorHeld: "Mantenido",
  eventSelectorPressed: "Pulsado",
  eventSelectorReleased: "Liberado",
  eventSelectorAddTimerTitle: "Añadir temporizador",
  eventSelectorIntervalLabel: "Intervalo (ms)",
  eventSelectorAddMouseTitle: "Añadir ratón",
  eventSelectorAddCustomEventTitle: "Añadir evento personalizado",
  eventSelectorAddConfirm: "Añadir",
  eventSelectorCancelTitle: "Cancelar",
  eventSelectorCancelAriaLabel: "Cancelar añadir evento",
  eventSelectorConfirmTitle: "Añadir evento",
  eventSelectorConfirmAriaLabel: "Confirmar añadir evento",

  // ── Sounds ────────────────────────────────────────────────────
  soundsTitle: "Sonidos",
  soundsNoSounds: "Aún no hay sonidos",
  soundsNoSource: "sin fuente",
  soundsNamePlaceholder: "Nombre...",
  soundsAddTitle: "Añadir sonido",
  soundsAddBtn: "Añadir sonido",
  soundsAssetSourcesTitle: "Fuentes de activos",
  soundsAddSourceHint: "Añade un sonido para configurar su fuente",
  soundsStatusReady: "listo",
  soundsStatusNotConnected: "no conectado",
  soundsAssetPlaceholder: "/assets/sound.wav",
  soundsUploading: "Subiendo...",
  soundsImport: "Importar",
  soundsInvalidFormat: "Formato inválido. Usa WAV, MP3 u OGG.",

  // ── Action Editor Panel ───────────────────────────────────────
  actionEditorNoActionsYet: "Aún no hay acciones.",
  actionEditorAddActionHint: "Añade una acción abajo para definir qué ocurre.",

  // ── Sprite Picker Modal ───────────────────────────────────────
  spritePickerPreviewLabel: "Vista previa",

  // ── Sprite Import Crop Modal ──────────────────────────────────
  spriteImportCropZoom: "Zoom",

  // ── Variable Pickers ──────────────────────────────────────────
  variablePickerNoSprite: "Ningún sprite disponible",
  variablePickerNoCollectionVar: "Ninguna variable {type} disponible",
  variablePickerNoVar: "Ninguna variable disponible",

  // ── Landing page ─────────────────────────────────────────────
  landingNavHow: "Cómo funciona",
  landingNavGameTypes: "Tipos de juegos",
  landingNavFaq: "FAQ",
  landingNavEditor: "Editor",
  landingNavMainLabel: "Navegación principal",
  landingNavFooterLabel: "Navegación al pie",
  landingHeaderCta: "Abrir editor",
  landingBadge: "Editor de juegos online — gratuito y en el navegador",
  landingHeroTitle: "Creador de videojuegos: crea tu juego desde el navegador",
  landingHeroDescription:
    "Un editor visual donde defines objetos, les asignas comportamientos — colisiones, movimiento, puntuación — y pruebas el resultado al instante. Todo en el navegador, sin instalar nada.",
  landingHeroCta: "Ir al editor",
  landingHeroSubCta: "¿Tienes una idea de juego? Hazla realidad en minutos.",
  landingScreenshotTitlebar: "CreadorDeJocs — Editor",
  landingScreenshotAlt:
    "Captura del editor de juegos CreadorDeJocs: objetos, eventos, acciones y condicionales",
  landingStepsTitle: "Cómo crear un juego en tres pasos",
  landingStep1Title: "1. Define objetos y escenarios",
  landingStep1Desc:
    "Crea los elementos del juego — personajes, obstáculos, coleccionables — asígnales sprites y colócalos en las salas con el editor visual.",
  landingStep2Title: "2. Asigna comportamientos",
  landingStep2Desc:
    "Conecta eventos (teclado, colisión, temporizador) con acciones (mover, destruir, cambiar sala, sumar puntos) sin escribir código.",
  landingStep3Title: "3. Prueba e itera al instante",
  landingStep3Desc:
    "Ejecuta el juego en el navegador, detecta qué hay que cambiar y ajústalo en segundos. El ciclo crear-probar es inmediato.",
  landingGameTypesTitle: "Qué tipos de juegos puedes crear",
  landingGameTypesSubtitle:
    "El editor incluye plantillas para empezar rápido con diferentes estilos de juego.",
  landingGameType1Title: "Acción y arcade",
  landingGameType1Desc:
    "Dispara, recoge objetos o esquiva obstáculos con el teclado. Con puntuación, vidas y velocidad configurable.",
  landingGameType2Title: "Puzles y exploración",
  landingGameType2Desc:
    "Salas interconectadas, interruptores, condiciones y objetivos. Diseña recorridos con lógica y variables.",
  landingGameType3Title: "Prototipos y experimentos",
  landingGameType3Desc:
    "Prueba mecánicas nuevas rápidamente: controles con ratón, interacciones entre objetos, reglas personalizadas.",
  landingFaqTitle: "Preguntas frecuentes",
  landingFaq1Q: "¿CreadorDeJocs es gratuito?",
  landingFaq1A:
    "Sí. El editor es completamente gratuito y no pide registro. Abres la página y empiezas a crear directamente.",
  landingFaq2Q: "¿Necesito saber programar para crear un juego?",
  landingFaq2A:
    "No. El sistema funciona con eventos y acciones visuales. Por ejemplo: «cuando colisiona con un enemigo → destrúyelo y suma 10 puntos». Sin código.",
  landingFaq3Q: "¿Qué tipos de juegos puedo hacer?",
  landingFaq3A:
    "Juegos 2D: arcade, puzles, aventuras con múltiples salas y juegos controlados con ratón. Cada sala mide 560×320 píxeles con objetos de 32×32.",
  landingFaq4Q: "¿Puedo jugar al juego directamente en el navegador?",
  landingFaq4A:
    "Sí. El juego se ejecuta dentro del mismo editor. Haces clic en «Ejecutar», lo pruebas, y vuelves a editar al instante.",
  landingFinalCtaTitle: "Crea tu primer juego ahora",
  landingFinalCtaDesc:
    "Abre el editor y empieza con una plantilla o un proyecto en blanco. Sin cuenta ni instalación.",
  landingFinalCtaButton: "Abrir el editor",
  landingFooterTagline: "Editor de juegos online — gratuito y sin registro."
} as const
