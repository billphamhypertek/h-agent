export function CommandBar({ placeholder = 'Nói hoặc gõ lệnh cho Aether…', onActivate }: { placeholder?: string; onActivate?: () => void }) {
  return (
    <div
      className="ae-cmd cursor-text"
      onClick={() => onActivate?.()}
      onKeyDown={e => { if (e.key === 'Enter') {onActivate?.()} }}
      role="button"
      tabIndex={0}
    >
      <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]"
        style={{ background: 'radial-gradient(circle at 35% 30%,var(--ae-azure-hi),var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
        <svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
          <rect fill="var(--ae-on-azure)" height={11} rx={3} width={6} x={9} y={3} />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="var(--ae-on-azure)" strokeLinecap="round" strokeWidth={1.8} />
        </svg>
      </div>
      <span className="flex-1 text-sm text-[color:var(--ae-dim)]">{placeholder}</span>
      <span className="rounded-[var(--ae-radius-sm)] border border-[color:var(--ae-line)] bg-[var(--ae-fill)] px-[11px] py-1.5 font-mono text-xs text-[color:var(--ae-dim)]">
        ⌘K
      </span>
    </div>
  )
}
