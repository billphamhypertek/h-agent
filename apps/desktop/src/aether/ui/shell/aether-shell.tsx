// apps/desktop/src/aether/ui/shell/aether-shell.tsx
import { useStore } from '@nanostores/react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { $bootDone } from '@/aether/domain/boot/boot-store'
import { useBootProgress } from '@/aether/domain/boot/use-boot-progress'
import { useConnectionStatus } from '@/aether/domain/connection/use-connection-status'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { AetherCanvas } from '@/aether/ui/motion/aether-canvas'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'
import { AgentsScreen } from '@/aether/ui/screens/agents-screen'
import { ArtifactsScreen } from '@/aether/ui/screens/artifacts-screen'
import { BootSequence } from '@/aether/ui/screens/boot-sequence'
import { ChatScreen } from '@/aether/ui/screens/chat-screen'
import { CommandCenter } from '@/aether/ui/screens/command-center'
import { ContentScreen } from '@/aether/ui/screens/content-screen'
import { CronScreen } from '@/aether/ui/screens/cron-screen'
import { DevScreen } from '@/aether/ui/screens/dev-screen'
import { InboxScreen } from '@/aether/ui/screens/inbox-screen'
import { MemoryScreen } from '@/aether/ui/screens/memory-screen'
import { MessagingScreen } from '@/aether/ui/screens/messaging-screen'
import { MorningBrief } from '@/aether/ui/screens/morning-brief'
import { OpsScreen } from '@/aether/ui/screens/ops-screen'
import { ProfilesScreen } from '@/aether/ui/screens/profiles-screen'
import { SettingsScreen } from '@/aether/ui/screens/settings-screen'
import { SkillsScreen } from '@/aether/ui/screens/skills-screen'
import { StubScreen } from '@/aether/ui/screens/stub-screen'
import { VoiceScreen } from '@/aether/ui/screens/voice-screen'
import { CommandPalette } from '@/app/command-palette'
import { ARTIFACTS_ROUTE, BRIEF_ROUTE, COMMAND_CENTER_ROUTE, CONTENT_ROUTE, DEV_ROUTE, HUD_ROUTE, INBOX_ROUTE, MEMORY_ROUTE, MESSAGING_ROUTE, NEW_CHAT_ROUTE, OPS_ROUTE, PROFILES_ROUTE, VOICE_ROUTE } from '@/app/routes'
import { openCommandPalette } from '@/store/command-palette'

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
      <NavRail activeRoute={location.pathname} onNavigate={r => navigate(r)} />
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col p-[var(--ae-page-t)_var(--ae-page-x)_var(--ae-page-b)]">
        <TopBar title={title} />
        <div className="relative mt-3 min-h-0 flex-1">
          <PageTransition routeKey={location.pathname}>
            <Routes location={location}>
              <Route element={<ChatScreen chatView={chatView} />} index />
              <Route element={<ChatScreen chatView={chatView} />} path=":sessionId" />
              <Route element={<CommandCenter onCommandPalette={openCommandPalette} />} path={HUD_ROUTE.slice(1)} />
              <Route element={<MorningBrief />} path={BRIEF_ROUTE.slice(1)} />
              <Route element={<AgentsScreen />} path="agents" />
              <Route element={<ArtifactsScreen />} path={ARTIFACTS_ROUTE.slice(1)} />
              <Route element={<StubScreen title="Command Center" />} path={COMMAND_CENTER_ROUTE.slice(1)} />
              <Route element={<CronScreen />} path="cron" />
              <Route element={<DevScreen />} path={DEV_ROUTE.slice(1)} />
              <Route element={<InboxScreen />} path={INBOX_ROUTE.slice(1)} />
              <Route element={<MemoryScreen />} path={MEMORY_ROUTE.slice(1)} />
              <Route element={<MessagingScreen />} path={MESSAGING_ROUTE.slice(1)} />
              <Route element={<OpsScreen />} path={OPS_ROUTE.slice(1)} />
              <Route element={<ContentScreen />} path={CONTENT_ROUTE.slice(1)} />
              <Route element={<VoiceScreen />} path={VOICE_ROUTE.slice(1)} />
              <Route element={<ProfilesScreen />} path={PROFILES_ROUTE.slice(1)} />
              <Route element={<SettingsScreen />} path="settings" />
              <Route element={<SkillsScreen />} path="skills" />
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
      <CommandPalette />
    </div>
  )
}
