// apps/desktop/src/aether/ui/shell/aether-shell.tsx
import { useStore } from '@nanostores/react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { $bootDone } from '@/aether/domain/boot/boot-store'
import { useBootProgress } from '@/aether/domain/boot/use-boot-progress'
import { useConnectionStatus } from '@/aether/domain/connection/use-connection-status'
import { AetherCanvas } from '@/aether/ui/motion/aether-canvas'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { BootSequence } from '@/aether/ui/screens/boot-sequence'
import { ChatScreen } from '@/aether/ui/screens/chat-screen'
import { CommandCenter } from '@/aether/ui/screens/command-center'
import { MorningBrief } from '@/aether/ui/screens/morning-brief'
import { SettingsScreen } from '@/aether/ui/screens/settings-screen'
import { StubScreen } from '@/aether/ui/screens/stub-screen'
import { ARTIFACTS_ROUTE, BRIEF_ROUTE, COMMAND_CENTER_ROUTE, HUD_ROUTE, MESSAGING_ROUTE, NEW_CHAT_ROUTE, PROFILES_ROUTE } from '@/app/routes'

import { AETHER_NAV_ITEMS } from './nav-items'
import { NavRail } from './nav-rail'
import { PageTransition } from './page-transition'
import { TopBar } from './top-bar'

const TITLES: Record<string, string> = { [BRIEF_ROUTE]: 'Brief sáng', [HUD_ROUTE]: 'Trang chủ', '/': 'Trò chuyện' }

export function AetherShell({ chatView }: { chatView: React.ReactNode }) {
  useBootProgress()
  const bootDone = useStore($bootDone)
  const status = useConnectionStatus()
  const location = useLocation()
  const navigate = useNavigate()
  const motionEnabled = useMotionEnabled()

  if (!bootDone) { return <BootSequence /> }

  const activeItem = AETHER_NAV_ITEMS.find(i => i.route === location.pathname)
  const title = TITLES[location.pathname] ?? activeItem?.label ?? 'AETHER'

  return (
    <div className="ae-depth-enter relative flex h-screen min-h-0 w-screen overflow-hidden">
      <div className="ae-shell-bg" />
      <AetherCanvas enabled={motionEnabled} />
      <NavRail activeRoute={location.pathname} online={status === 'online'} onNavigate={r => navigate(r)} />
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col p-[var(--ae-page-t)_var(--ae-page-x)_var(--ae-page-b)]">
        <TopBar title={title} />
        <div className="relative mt-3 min-h-0 flex-1">
          <PageTransition routeKey={location.pathname}>
            <Routes location={location}>
              <Route element={<ChatScreen chatView={chatView} />} index />
              <Route element={<ChatScreen chatView={chatView} />} path=":sessionId" />
              <Route element={<CommandCenter onCommandPalette={() => { /* wire ⌘K in a later slice */ }} />} path={HUD_ROUTE.slice(1)} />
              <Route element={<MorningBrief />} path={BRIEF_ROUTE.slice(1)} />
              <Route element={<StubScreen title="Agents" />} path="agents" />
              <Route element={<StubScreen title="Artifacts" />} path={ARTIFACTS_ROUTE.slice(1)} />
              <Route element={<StubScreen title="Command Center" />} path={COMMAND_CENTER_ROUTE.slice(1)} />
              <Route element={<StubScreen title="Cron" />} path="cron" />
              <Route element={<StubScreen title="Memory" />} path="memory" />
              <Route element={<StubScreen title="Messaging" />} path={MESSAGING_ROUTE.slice(1)} />
              <Route element={<StubScreen title="Profiles" />} path={PROFILES_ROUTE.slice(1)} />
              <Route element={<SettingsScreen />} path="settings" />
              <Route element={<StubScreen title="Skills" />} path="skills" />
              <Route element={<Navigate replace to={NEW_CHAT_ROUTE} />} path="*" />
            </Routes>
          </PageTransition>
        </div>
      </div>
      {status === 'paused' && (
        <div className="absolute inset-0 z-[50] grid place-items-center bg-[rgba(2,12,29,.55)] backdrop-blur-sm">
          <GlassSlab className="text-sm text-[color:var(--ae-dim)]" size="md">Mất kết nối — đang thử lại…</GlassSlab>
        </div>
      )}
    </div>
  )
}
