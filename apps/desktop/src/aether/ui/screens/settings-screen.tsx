import { useState } from 'react'

import { GlassSlab } from '@/aether/ui/components/glass-slab'

import { EnvTab } from './settings/env-tab'
import { ModelTab } from './settings/model-tab'
import { ProvidersTab } from './settings/providers-tab'
import { ToolsTab } from './settings/tools-tab'

type TabId = 'appearance' | 'env' | 'model' | 'providers' | 'tools'

const TABS: { id: TabId; label: string }[] = [
  { id: 'model', label: 'Mô hình' },
  { id: 'providers', label: 'Providers/OAuth' },
  { id: 'env', label: 'Khóa môi trường' },
  { id: 'tools', label: 'Công cụ' },
  { id: 'appearance', label: 'Giao diện' }
]

function Soon({ label }: { label: string }) {
  return (
    <GlassSlab size="md">
      <div className="text-[12px] text-[color:var(--ae-dim)]">{label} — sắp ra mắt.</div>
    </GlassSlab>
  )
}

export function SettingsScreen() {
  const [tab, setTab] = useState<TabId>('model')

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <GlassSlab className="flex flex-wrap gap-1.5" size="sm">
          {TABS.map(t => (
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition"
              key={t.id}
              onClick={() => setTab(t.id)}
              style={
                tab === t.id
                  ? { background: 'var(--ae-azure)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--ae-azure-soft)' }
              }
              type="button"
            >
              {t.label}
            </button>
          ))}
        </GlassSlab>
        <div className="min-h-0 flex-1 overflow-auto">
          {tab === 'model' && <ModelTab />}
          {tab === 'providers' && <ProvidersTab />}
          {tab === 'env' && <EnvTab />}
          {tab === 'tools' && <ToolsTab />}
          {tab === 'appearance' && <Soon label="Giao diện" />}
        </div>
      </div>
    </div>
  )
}
