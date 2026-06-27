import { useStore } from '@nanostores/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { AetherShell } from '@/aether'
import { $bootDone } from '@/aether/domain/boot/boot-store'
import { loadBriefing } from '@/aether/domain/briefing/briefing-store'
import { useVoiceSession } from '@/aether/domain/voice/use-voice-session'
import { AetherOnboarding } from '@/aether/ui/screens/onboarding-screen'
import { useTheme } from '@/themes/context'
import { useSkinCommand } from '@/themes/use-skin-command'

import { getCronJobs, getSessionMessages, listAllProfileSessions, type SessionInfo } from '../aether-api'
import { formatRefValue } from '../components/assistant-ui/directive-text'
import { type ChatMessage, chatMessageText, preserveLocalAssistantErrors, toChatMessages } from '../lib/chat-messages'
import { storedSessionIdForNotification } from '../lib/session-ids'
import {
  isMessagingSource,
  LOCAL_SESSION_SOURCE_IDS,
  MESSAGING_SESSION_SOURCE_IDS
} from '../lib/session-source'
import { latestSessionTodos } from '../lib/todos'
import { setCronJobs } from '../store/cron'
import {
  $panesFlipped,
  $pinnedSessionIds,
  $sessionsLimit,
  pinSession,
  unpinSession
} from '../store/layout'
import { respondToApprovalAction } from '../store/native-notifications'
import { setPetActivity } from '../store/pet'
import { setPetOverlayOpenAppHandler, setPetOverlaySubmitHandler } from '../store/pet-overlay'
import { $filePreviewTarget, $previewTarget, closeActiveRightRailTab } from '../store/preview'
import {
  $activeGatewayProfile,
  $freshSessionRequest,
  $profileScope,
  ALL_PROFILES,
  normalizeProfileKey,
  refreshActiveProfile
} from '../store/profile'
import {
  $activeSessionId,
  $attentionSessionIds,
  $currentCwd,
  $freshDraftReady,
  $gatewayState,
  $messages,
  $resumeExhaustedSessionId,
  $resumeFailedSessionId,
  $selectedStoredSessionId,
  $sessions,
  $workingSessionIds,
  CRON_SECTION_LIMIT,
  getRecentlySettledSessionIds,
  mergeSessionPage,
  MESSAGING_SECTION_LIMIT,
  sessionPinId,
  setAwaitingResponse,
  setBusy,
  setCronSessions,
  setMessages,
  setMessagingSessions,
  setMessagingTruncated,
  setSessionProfileTotals,
  setSessions,
  setSessionsLoading,
  setSessionsTotal
} from '../store/session'
import { onSessionsChanged } from '../store/session-sync'
import { clearSessionTodos, setSessionTodos, todoListActive } from '../store/todos'
import { openUpdatesWindow, startUpdatePoller, stopUpdatePoller } from '../store/updates'
import { isSecondaryWindow } from '../store/windows'

import { applyAetherDefaultOnce } from './apply-aether-default'
import { ChatView } from './chat'
import { requestComposerFocus, requestComposerInsert } from './chat/composer/focus'
import { useComposerActions } from './chat/hooks/use-composer-actions'
import { useGatewayBoot } from './gateway/hooks/use-gateway-boot'
import { useGatewayRequest } from './gateway/hooks/use-gateway-request'
import { useKeybinds } from './hooks/use-keybinds'
import { $terminalTakeover } from './right-sidebar/store'
import { routeSessionId, sessionRoute } from './routes'
import { useAetherConfig } from './session/hooks/use-aether-config'
import { useContextSuggestions } from './session/hooks/use-context-suggestions'
import { useCwdActions } from './session/hooks/use-cwd-actions'
import { useMessageStream } from './session/hooks/use-message-stream'
import { useModelControls } from './session/hooks/use-model-controls'
import { usePreviewRouting } from './session/hooks/use-preview-routing'
import { usePromptActions } from './session/hooks/use-prompt-actions'
import { useRouteResume } from './session/hooks/use-route-resume'
import { useSessionActions } from './session/hooks/use-session-actions'
import { useSessionStateCache } from './session/hooks/use-session-state-cache'
import { useOverlayRouting } from './shell/hooks/use-overlay-routing'
import { useStatusSnapshot } from './shell/hooks/use-status-snapshot'
import { useStatusbarItems } from './shell/hooks/use-statusbar-items'
import { ModelMenuPanel } from './shell/model-menu-panel'
import type { StatusbarItem } from './shell/statusbar-controls'
import { useGroupRegistry } from './shell/use-group-registry'

// Latest cron-job sessions surfaced in the collapsed "Cron jobs" section. The
// Cron sessions are written by a background scheduler tick (the desktop
// backend), so no user action signals the UI. Poll the bounded cron list on
// this cadence while the app is open + visible so new runs surface promptly
// instead of waiting for the next user-triggered refreshSessions().
const CRON_POLL_INTERVAL_MS = 30_000
// The recents list is local-only: cron rows have their own section, and each
// messaging platform (telegram, discord, …) is fetched separately into its own
// self-managed sidebar section (refreshMessagingSessions). Excluding both here
// keeps "Load more" paging through interactive local chats instead of
// interleaving gateway threads that bury them.
const SIDEBAR_EXCLUDED_SOURCES = ['cron', 'subagent', 'tool', ...MESSAGING_SESSION_SOURCE_IDS]
// The messaging slice is the inverse: drop cron + every local source so only
// external-platform conversations remain, then split per platform in the UI.
const MESSAGING_EXCLUDED_SOURCES = ['cron', ...LOCAL_SESSION_SOURCE_IDS]

// Cheap signature compare so the poll only swaps the atom (and re-renders the
// sidebar) when the visible cron rows actually changed.
function sameCronSignature(a: SessionInfo[], b: SessionInfo[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  return a.every((session, i) => session.id === b[i]?.id && session.title === b[i]?.title)
}

// Rows a session refresh must preserve even if the aggregator omits them:
// in-flight first turns (message_count 0), pinned rows aged off the page, the
// actively-viewed chat (its "working" flag clears a beat before the aggregator
// sees the persisted row), and sessions whose turn just settled (same race, but
// for a chat the user has already navigated away from). Pass `scope` to only
// keep the active row when it belongs to the profile being paged.
function sessionsToKeep(scope?: string): Set<string> {
  const keep = new Set<string>([
    ...$workingSessionIds.get(),
    ...$pinnedSessionIds.get(),
    ...getRecentlySettledSessionIds()
  ])

  const active = $selectedStoredSessionId.get()

  if (active) {
    const session = scope ? $sessions.get().find(s => s.id === active) : null

    if (!scope || !session || normalizeProfileKey(session.profile) === scope) {
      keep.add(active)
    }
  }

  return keep
}

export function DesktopController() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()

  const busyRef = useRef(false)
  const creatingSessionRef = useRef(false)
  const refreshSessionsRequestRef = useRef(0)

  const gatewayState = useStore($gatewayState)
  const activeSessionId = useStore($activeSessionId)
  const currentCwd = useStore($currentCwd)
  const freshDraftReady = useStore($freshDraftReady)
  const resumeFailedSessionId = useStore($resumeFailedSessionId)
  const resumeExhaustedSessionId = useStore($resumeExhaustedSessionId)
  const filePreviewTarget = useStore($filePreviewTarget)
  const previewTarget = useStore($previewTarget)
  const selectedStoredSessionId = useStore($selectedStoredSessionId)
  const terminalTakeover = useStore($terminalTakeover)
  const panesFlipped = useStore($panesFlipped)
  const profileScope = useStore($profileScope)
  // Drives the first-run onboarding gate below. AetherShell owns the boot
  // screen (BootSequence) until $bootDone flips; only after that do we let the
  // onboarding overlay evaluate readiness, so the two never stack.
  const bootDone = useStore($bootDone)

  const routedSessionId = routeSessionId(location.pathname)
  const routeToken = `${location.pathname}:${location.search}:${location.hash}`
  const routeTokenRef = useRef(routeToken)
  routeTokenRef.current = routeToken
  const getRouteToken = useCallback(() => routeTokenRef.current, [])

  const {
    agentsOpen,
    chatOpen,
    closeOverlayToPreviousRoute,
    commandCenterInitialSection,
    commandCenterOpen,
    cronOpen,
    currentView,
    openAgents,
    openCommandCenterSection,
    profilesOpen,
    settingsOpen,
    toggleCommandCenter
  } = useOverlayRouting()

  const statusbarItemGroups = useGroupRegistry<StatusbarItem>()

  const {
    activeSessionIdRef,
    ensureSessionState,
    runtimeIdByStoredSessionIdRef,
    selectedStoredSessionIdRef,
    sessionStateByRuntimeIdRef,
    syncSessionStateToView,
    updateSessionState
  } = useSessionStateCache({
    activeSessionId,
    busyRef,
    selectedStoredSessionId,
    setAwaitingResponse,
    setBusy,
    setMessages
  })

  const { connectionRef, gatewayRef, requestGateway } = useGatewayRequest()

  // First run paints AETHER + Light "Arctic Glass" as the default appearance,
  // then records that it did so — so a later explicit user theme choice is never
  // overridden. The decision lives in a pure, unit-tested helper.
  const { themeName, setTheme, setMode } = useTheme()
  useEffect(() => {
    applyAetherDefaultOnce({ themeName, setTheme, setMode })
  }, [themeName, setTheme, setMode])

  useEffect(() => {
    window.aetherDesktop?.setPreviewShortcutActive?.(Boolean(chatOpen && (filePreviewTarget || previewTarget)))
  }, [chatOpen, filePreviewTarget, previewTarget])

  useEffect(() => {
    startUpdatePoller()
    const unsubscribe = window.aetherDesktop?.onOpenUpdatesRequested?.(() => openUpdatesWindow())

    return () => {
      unsubscribe?.()
      stopUpdatePoller()
    }
  }, [])

  // Notification click: the main process already focused the window; jump to its
  // session. Notifications are tagged with the gateway *runtime* session id, but
  // the chat route is keyed by the *stored* id — navigating with the runtime id
  // resumes a non-existent stored session ("session not found") and strands the
  // user. Translate runtime -> stored before navigating.
  useEffect(() => {
    const unsubscribe = window.aetherDesktop?.onFocusSession?.(sessionId => {
      if (sessionId) {
        navigate(sessionRoute(storedSessionIdForNotification(sessionId, runtimeIdByStoredSessionIdRef.current)))
      }
    })

    return () => unsubscribe?.()
  }, [navigate, runtimeIdByStoredSessionIdRef])

  // Notification action button (Approve/Reject) — resolve in place, no navigation.
  useEffect(() => {
    const unsubscribe = window.aetherDesktop?.onNotificationAction?.(({ actionId, sessionId }) => {
      void respondToApprovalAction(sessionId ?? null, actionId)
    })

    return () => unsubscribe?.()
  }, [])

  // aether:// deep links (e.g. a docs "Send to App" button for an automation blueprint).
  // Build the equivalent /blueprint slash command from the payload and drop
  // it into the composer — the user reviews/edits, then sends; the agent (or
  // the shared command handler) creates the job. Signal readiness so a link
  // that arrived during boot is flushed exactly once.
  useEffect(() => {
    const unsubscribe = window.aetherDesktop?.onDeepLink?.(payload => {
      if (!payload || payload.kind !== 'blueprint' || !payload.name) {
        return
      }

      const slots = Object.entries(payload.params || {})
        .map(([k, v]) => {
          const sval = /\s/.test(v) ? `"${v.replace(/"/g, '\\"')}"` : v

          return `${k}=${sval}`
        })
        .join(' ')

      const command = `/blueprint ${payload.name}${slots ? ' ' + slots : ''}`
      requestComposerInsert(command, { mode: 'block', target: 'main' })
      requestComposerFocus('main')
    })

    // Tell the main process the renderer is ready to receive deep links.
    void window.aetherDesktop?.signalDeepLinkReady?.()

    return () => unsubscribe?.()
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!$filePreviewTarget.get() && !$previewTarget.get()) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        event.stopPropagation()
        closeActiveRightRailTab()
      }
    }

    const unsubscribe = window.aetherDesktop?.onClosePreviewRequested?.(closeActiveRightRailTab)

    window.addEventListener('keydown', onKeyDown, { capture: true })

    return () => {
      unsubscribe?.()
      window.removeEventListener('keydown', onKeyDown, { capture: true })
    }
  }, [])

  // Cron-job sessions as their own list (latest N). Independent of the recents
  // page so the two never compete for slots. Cheap + bounded. Kept (even though
  // the sidebar now lists cron *jobs*, not run sessions) so a pinned cron run
  // still resolves into the Pinned section via sessionByAnyId.
  const refreshCronSessions = useCallback(async () => {
    try {
      const { sessions } = await listAllProfileSessions(CRON_SECTION_LIMIT, 1, 'exclude', 'recent', 'all', {
        source: 'cron'
      })

      setCronSessions(prev => (sameCronSignature(prev, sessions) ? prev : sessions))
    } catch {
      // Non-fatal: the cron section just stays empty/stale.
    }
  }, [])

  // Messaging-platform sessions as their own slice, fetched separately from
  // local recents so each platform renders a self-managed section and never
  // competes with local chats for the recents page budget. One combined fetch
  // seeds every platform; the sidebar splits the rows per source.
  const refreshMessagingSessions = useCallback(async () => {
    try {
      const result = await listAllProfileSessions(MESSAGING_SECTION_LIMIT, 1, 'exclude', 'recent', 'all', {
        excludeSources: MESSAGING_EXCLUDED_SOURCES
      })

      // Drop any non-messaging source the broad exclude didn't catch (custom
      // sources) — those stay in local recents, not a platform section.
      const rows = result.sessions.filter(s => isMessagingSource(s.source))

      setMessagingSessions(prev => (sameCronSignature(prev, rows) ? prev : rows))
      // Hit the cap → at least one platform may have more on disk than loaded,
      // so platform sections offer their own per-platform "load more".
      setMessagingTruncated(result.sessions.length >= MESSAGING_SECTION_LIMIT)
    } catch {
      // Non-fatal: the messaging sections just stay empty/stale.
    }
  }, [])

  // Cron *jobs* drive the sidebar "Cron jobs" section. Jobs are created
  // synchronously (agent tool call or the cron UI), so refreshing here right
  // after an agent turn surfaces a new job immediately; the interval poll keeps
  // next-run/state fresh as the scheduler advances them.
  const refreshCronJobs = useCallback(async () => {
    try {
      const jobs = await getCronJobs()

      setCronJobs(jobs)
    } catch {
      // Non-fatal: the cron section just keeps its last-known jobs.
    }
  }, [])

  const refreshSessions = useCallback(async () => {
    const requestId = refreshSessionsRequestRef.current + 1
    refreshSessionsRequestRef.current = requestId
    setSessionsLoading(true)

    try {
      const limit = $sessionsLimit.get()

      // Require at least one message so abandoned/empty "Untitled" drafts (one
      // was created per TUI/desktop launch before the lazy-create fix) don't
      // clutter the sidebar.
      // Unified cross-profile list (served read-only off each profile's
      // state.db; no per-profile backend is spawned). Single-profile users get
      // the same rows tagged profile="default". Cron sessions are excluded here
      // and fetched separately (refreshCronSessions) so the scheduler's
      // always-newest rows can't consume the recents page budget.
      // Scope the fetch to the active profile (not always 'all') so a profile
      // with few recent sessions isn't windowed out of the cross-profile
      // recency page — the empty-history-on-profile-switch bug.
      const sessionProfile = profileScope === ALL_PROFILES ? 'all' : profileScope

      const result = await listAllProfileSessions(limit, 1, 'exclude', 'recent', sessionProfile, {
        excludeSources: SIDEBAR_EXCLUDED_SOURCES
      })

      if (refreshSessionsRequestRef.current === requestId) {
        setSessions(prev => mergeSessionPage(prev, result.sessions, sessionsToKeep()))
        setSessionsTotal(typeof result.total === 'number' ? result.total : result.sessions.length)
        setSessionProfileTotals(result.profile_totals ?? {})
      }
    } finally {
      if (refreshSessionsRequestRef.current === requestId) {
        setSessionsLoading(false)
      }
    }

    void refreshCronSessions()
    void refreshCronJobs()
    void refreshMessagingSessions()
  }, [profileScope, refreshCronSessions, refreshCronJobs, refreshMessagingSessions])

  // Another window mutated the shared session list (e.g. a chat started in the
  // pop-out). Re-pull so the sidebar reflects it. Pop-outs have no sidebar, so
  // only real windows bother.
  useEffect(() => {
    if (isSecondaryWindow()) {
      return
    }

    return onSessionsChanged(() => void refreshSessions().catch(() => undefined))
  }, [refreshSessions])

  const toggleSelectedPin = useCallback(() => {
    const sessionId = $selectedStoredSessionId.get()

    if (!sessionId) {
      return
    }

    // Pin on the durable lineage-root id so the pin survives auto-compression.
    const session = $sessions.get().find(s => s.id === sessionId || s._lineage_root_id === sessionId)
    const pinId = session ? sessionPinId(session) : sessionId

    if ($pinnedSessionIds.get().includes(pinId)) {
      unpinSession(pinId)
    } else {
      pinSession(pinId)
    }
  }, [])

  const { gatewayLogLines, inferenceStatus, statusSnapshot } = useStatusSnapshot(gatewayState, requestGateway)

  const updateActiveSessionRuntimeInfo = useCallback(
    (info: { branch?: string; cwd?: string }) => {
      const sessionId = activeSessionIdRef.current

      if (!sessionId) {
        return
      }

      updateSessionState(sessionId, state => ({
        ...state,
        branch: info.branch ?? state.branch,
        cwd: info.cwd ?? state.cwd
      }))
    },
    [activeSessionIdRef, updateSessionState]
  )

  const { refreshProjectBranch } = useCwdActions({
    activeSessionId,
    activeSessionIdRef,
    onSessionRuntimeInfo: updateActiveSessionRuntimeInfo,
    requestGateway
  })

  const { refreshAetherConfig, sttEnabled, voiceMaxRecordingSeconds } = useAetherConfig({
    activeSessionIdRef,
    refreshProjectBranch
  })

  const { refreshCurrentModel, selectModel, updateModelOptionsCache } = useModelControls({
    activeSessionId,
    queryClient,
    requestGateway
  })

  const modelMenuContent = useMemo(
    () =>
      gatewayState === 'open' ? (
        <ModelMenuPanel
          gateway={gatewayRef.current || undefined}
          onSelectModel={selectModel}
          requestGateway={requestGateway}
        />
      ) : null,
    [gatewayRef, gatewayState, requestGateway, selectModel]
  )

  useContextSuggestions({
    activeSessionId,
    activeSessionIdRef,
    currentCwd,
    gatewayState,
    requestGateway
  })

  const hydrateFromStoredSession = useCallback(
    async (
      attempts = 1,
      storedSessionId = selectedStoredSessionIdRef.current,
      runtimeSessionId = activeSessionIdRef.current
    ) => {
      if (!storedSessionId || !runtimeSessionId) {
        return
      }

      const storedProfile = $sessions
        .get()
        .find(session => session.id === storedSessionId || session._lineage_root_id === storedSessionId)?.profile

      for (let index = 0; index < Math.max(1, attempts); index += 1) {
        try {
          const latest = await getSessionMessages(storedSessionId, storedProfile)
          const messages = toChatMessages(latest.messages)
          updateSessionState(
            runtimeSessionId,
            state => ({
              ...state,
              messages: preserveLocalAssistantErrors(messages, state.messages)
            }),
            storedSessionId
          )

          // Seed the status stack's todo group from history — but only while
          // the plan is still in flight, so reopening an old chat doesn't pin
          // its finished todo list above the composer forever.
          const todos = latestSessionTodos(messages)

          if (todos && todoListActive(todos)) {
            setSessionTodos(runtimeSessionId, todos)
          } else {
            clearSessionTodos(runtimeSessionId)
          }

          return
        } catch {
          // Best-effort fallback when live stream payloads are empty.
        }

        if (index < attempts - 1) {
          await new Promise(resolve => window.setTimeout(resolve, 250))
        }
      }
    },
    [activeSessionIdRef, selectedStoredSessionIdRef, updateSessionState]
  )

  const { handleGatewayEvent } = useMessageStream({
    activeSessionIdRef,
    hydrateFromStoredSession,
    queryClient,
    refreshAetherConfig,
    refreshSessions,
    sessionStateByRuntimeIdRef,
    updateSessionState
  })

  const { handleDesktopGatewayEvent } = usePreviewRouting({
    activeSessionIdRef,
    baseHandleGatewayEvent: handleGatewayEvent,
    currentCwd,
    currentView,
    requestGateway,
    routedSessionId,
    selectedStoredSessionId
  })

  const {
    branchCurrentSession,
    createBackendSessionForSend,
    removeSession,
    resumeSession,
    startFreshSessionDraft
  } = useSessionActions({
    activeSessionId,
    activeSessionIdRef,
    busyRef,
    creatingSessionRef,
    ensureSessionState,
    getRouteToken,
    navigate,
    requestGateway,
    runtimeIdByStoredSessionIdRef,
    selectedStoredSessionId,
    selectedStoredSessionIdRef,
    sessionStateByRuntimeIdRef,
    syncSessionStateToView,
    updateSessionState
  })

  // Single global listener for every rebindable hotkey (incl. profile switching)
  // plus the on-screen keybind editor's capture mode.
  useKeybinds({
    startFreshSession: startFreshSessionDraft,
    toggleCommandCenter,
    toggleSelectedPin
  })

  // A profile switch/create drops to a fresh new-session draft so the previously
  // open session doesn't bleed across contexts. Skip the initial value.
  const freshSessionRequest = useStore($freshSessionRequest)
  const lastFreshRef = useRef(freshSessionRequest)

  useEffect(() => {
    if (freshSessionRequest === lastFreshRef.current) {
      return
    }

    lastFreshRef.current = freshSessionRequest
    startFreshSessionDraft()
  }, [freshSessionRequest, startFreshSessionDraft])

  // Swapping the live gateway to another profile must re-pull that profile's
  // global model + active-profile pill. Both are nanostores, so the blanket
  // invalidateQueries() the profile store fires on swap doesn't touch them —
  // without this the statusbar keeps showing the previous profile's model
  // (the "forgets the LLM setting" report). gatewayState stays 'open' across a
  // swap (background sockets persist), so the open→open effect won't re-run.
  const activeGatewayProfile = useStore($activeGatewayProfile)
  const lastGatewayProfileRef = useRef(activeGatewayProfile)

  useEffect(() => {
    if (activeGatewayProfile === lastGatewayProfileRef.current) {
      return
    }

    lastGatewayProfileRef.current = activeGatewayProfile
    // Force: the new profile has its own default, so reseed even if the composer
    // already shows the previous profile's model.
    void refreshCurrentModel(true)
    void refreshActiveProfile()
  }, [activeGatewayProfile, refreshCurrentModel])

  const composer = useComposerActions({
    activeSessionId,
    currentCwd,
    requestGateway
  })

  const branchInNewChat = useCallback(
    async (messageId?: string) => {
      const branched = await branchCurrentSession(messageId)

      if (branched) {
        await refreshSessions().catch(() => undefined)
      }

      return branched
    },
    [branchCurrentSession, refreshSessions]
  )

  // Clear a failed turn's red error banner from the transcript. Errors are
  // renderer-local state (never persisted), so dismissing is purely a view +
  // session-cache edit. A message that errored before emitting any visible
  // text is a bare error placeholder → drop it entirely; one that streamed
  // partial output then failed keeps its content and just sheds the error.
  // Both the per-runtime cache AND the live $messages view must be updated:
  // `preserveLocalAssistantErrors` re-grafts any still-errored message it
  // finds in the view onto the next session.info flush, so clearing only the
  // cache would let the heartbeat resurrect the banner.
  const dismissError = useCallback(
    (messageId: string) => {
      const runtimeSessionId = activeSessionIdRef.current

      if (!runtimeSessionId) {
        return
      }

      const clearErrorIn = (messages: ChatMessage[]): ChatMessage[] =>
        messages.flatMap(message => {
          if (message.id !== messageId || !message.error) {
            return [message]
          }

          if (!chatMessageText(message).trim() && !message.parts.some(part => part.type !== 'text')) {
            return []
          }

          return [{ ...message, error: undefined, pending: false }]
        })

      // View first: the flush below reads $messages as the "current" baseline
      // for error preservation, so the banner must be gone from it before the
      // cache update triggers a re-sync.
      setMessages(clearErrorIn($messages.get()))

      updateSessionState(runtimeSessionId, state => ({
        ...state,
        messages: clearErrorIn(state.messages)
      }))
    },
    [activeSessionIdRef, updateSessionState]
  )

  const handleSkinCommand = useSkinCommand()

  const {
    cancelRun,
    editMessage,
    handleThreadMessagesChange,
    reloadFromMessage,
    restoreToMessage,
    steerPrompt,
    submitText,
    transcribeVoiceAudio
  } = usePromptActions({
    activeSessionId,
    activeSessionIdRef,
    branchCurrentSession: branchInNewChat,
    busyRef,
    createBackendSessionForSend,
    handleSkinCommand,
    refreshSessions,
    requestGateway,
    resumeStoredSession: resumeSession,
    selectedStoredSessionIdRef,
    startFreshSessionDraft,
    sttEnabled,
    updateSessionState
  })

  // SP-3: run the hands-free voice loop app-globally so the /voice screen can be
  // pure presentation. submitText/transcribeVoiceAudio come from usePromptActions
  // above; the loop only runs while $voiceActive is set by the Voice screen.
  useVoiceSession({ submitText, transcribeVoiceAudio })

  // The popped-out pet drives two actions back into the app: send a prompt, and
  // open the most recent thread. Both are registered ONCE through refs that track
  // the latest callbacks — re-registering on every `submitText`/`resumeSession`
  // identity change left a brief window where the handler was nulled (cleanup
  // before re-register), which could drop a submit fired from the overlay (e.g.
  // creating a session from the new-session screen). The ref form keeps a stable,
  // always-current handler. Primary window only — it owns the overlay.
  const submitTextRef = useRef(submitText)
  submitTextRef.current = submitText
  const resumeSessionRef = useRef(resumeSession)
  resumeSessionRef.current = resumeSession

  useEffect(() => {
    if (isSecondaryWindow()) {
      return
    }

    setPetOverlaySubmitHandler(text => void submitTextRef.current(text))
    // Mail icon: $sessions is ordered most-recent-first; the pet is global (not
    // per session) so "most recent" is the right target. main.cjs already raised
    // the window before forwarding this.
    setPetOverlayOpenAppHandler(() => {
      const recent = $sessions.get()[0]

      if (recent?.id) {
        void resumeSessionRef.current(recent.id)
      }
    })

    return () => {
      setPetOverlaySubmitHandler(null)
      setPetOverlayOpenAppHandler(null)
    }
  }, [])

  // Mirror "a session is blocked on the user" (clarify/approval) into the pet's
  // awaitingInput flag so it shows the `waiting` pose. Lives on $petActivity so
  // it rides the same atom the pop-out overlay mirrors — no session list needed
  // there. Every window keeps its own in-window pet in sync.
  useEffect(() => {
    const sync = () => setPetActivity({ awaitingInput: $attentionSessionIds.get().length > 0 })

    sync()

    return $attentionSessionIds.listen(sync)
  }, [])

  useGatewayBoot({
    handleGatewayEvent: handleDesktopGatewayEvent,
    onConnectionReady: c => {
      connectionRef.current = c
    },
    onGatewayReady: g => {
      gatewayRef.current = g
    },
    refreshAetherConfig,
    refreshSessions
  })

  useEffect(() => {
    if (gatewayState === 'open') {
      void refreshCurrentModel()
      void refreshActiveProfile()
      void refreshSessions().catch(() => undefined)
      void loadBriefing()
    }
  }, [gatewayState, refreshCurrentModel, refreshSessions])

  // Keep the cron jobs section live without a user action: the scheduler ticks
  // in the background (advancing next-run/state and creating runs), so poll the
  // job list on an interval (and on tab re-focus) while connected.
  useEffect(() => {
    if (gatewayState !== 'open') {
      return
    }

    const tick = () => {
      if (document.visibilityState === 'visible') {
        void refreshCronJobs()
      }
    }

    const intervalId = window.setInterval(tick, CRON_POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', tick)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [gatewayState, refreshCronJobs])

  useEffect(() => {
    if (gatewayState === 'open' && !activeSessionId && freshDraftReady) {
      void refreshCurrentModel()
      void refreshAetherConfig()
    }
  }, [activeSessionId, freshDraftReady, gatewayState, refreshCurrentModel, refreshAetherConfig])

  useRouteResume({
    activeSessionId,
    activeSessionIdRef,
    creatingSessionRef,
    currentView,
    freshDraftReady,
    gatewayState,
    locationPathname: location.pathname,
    resumeSession,
    resumeFailedSessionId,
    resumeExhaustedSessionId,
    routedSessionId,
    runtimeIdByStoredSessionIdRef,
    selectedStoredSessionId,
    selectedStoredSessionIdRef,
    startFreshSessionDraft
  })

  const { leftStatusbarItems, statusbarItems } = useStatusbarItems({
    agentsOpen,
    chatOpen,
    commandCenterOpen,
    extraLeftItems: statusbarItemGroups.flat.left,
    extraRightItems: statusbarItemGroups.flat.right,
    gatewayLogLines,
    gatewayState,
    inferenceStatus,
    openAgents,
    freshDraftReady,
    openCommandCenterSection,
    requestGateway,
    statusSnapshot,
    toggleCommandCenter
  })

  const chatView = (
    <ChatView
      gateway={gatewayRef.current}
      maxVoiceRecordingSeconds={voiceMaxRecordingSeconds}
      modelMenuContent={modelMenuContent}
      onAddContextRef={composer.addContextRefAttachment}
      onAddUrl={url => composer.addContextRefAttachment(`@url:${formatRefValue(url)}`, url)}
      onAttachDroppedItems={composer.attachDroppedItems}
      onAttachImageBlob={composer.attachImageBlob}
      onBranchInNewChat={branchInNewChat}
      onCancel={cancelRun}
      onDeleteSelectedSession={() => {
        if (selectedStoredSessionId) {
          void removeSession(selectedStoredSessionId)
        }
      }}
      onDismissError={dismissError}
      onEdit={editMessage}
      onPasteClipboardImage={() => void composer.pasteClipboardImage()}
      onPickFiles={() => void composer.pickContextPaths('file')}
      onPickFolders={() => void composer.pickContextPaths('folder')}
      onPickImages={() => void composer.pickImages()}
      onReload={reloadFromMessage}
      onRemoveAttachment={id => void composer.removeAttachment(id)}
      onRestoreToMessage={restoreToMessage}
      onRetryResume={sessionId => void resumeSession(sessionId, true)}
      onSteer={steerPrompt}
      onSubmit={submitText}
      onThreadMessagesChange={handleThreadMessagesChange}
      onToggleSelectedPin={toggleSelectedPin}
      onTranscribeAudio={transcribeVoiceAudio}
    />
  )

  return (
    <>
      <AetherShell chatView={chatView} />
      {/* First-run / no-provider gate. The new AetherShell render tree dropped
          this overlay when it replaced the legacy controller shell, so a fresh
          install booted straight into an empty shell with no way to configure a
          provider. Mount it once the boot sequence is done (so it never stacks
          over BootSequence); it self-dismisses when a provider is already
          configured and surfaces the picker otherwise. */}
      {bootDone && !isSecondaryWindow() && (
        <AetherOnboarding
          enabled={gatewayState === 'open'}
          onCompleted={() => {
            void refreshAetherConfig()
            void refreshCurrentModel()
            void queryClient.invalidateQueries({ queryKey: ['model-options'] })
          }}
          requestGateway={requestGateway}
        />
      )}
    </>
  )
}
