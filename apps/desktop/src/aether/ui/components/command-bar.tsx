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
        style={{ background: 'radial-gradient(circle at 35% 30%,#d7f4ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
        <svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
          <rect fill="#06283c" height={11} rx={3} width={6} x={9} y={3} />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="#06283c" strokeLinecap="round" strokeWidth={1.8} />
        </svg>
      </div>
      <span className="flex-1 text-sm text-[#A9CFE8]">{placeholder}</span>
      <span
        aria-disabled="true"
        title="Sắp ra mắt"
        className="cursor-not-allowed rounded-[var(--ae-radius-sm)] border border-[color:var(--ae-line)] bg-[rgba(120,200,255,.06)] px-[11px] py-1.5 font-mono text-xs text-[color:var(--ae-dim)] opacity-60"
      >
        ⌘K
      </span>
    </div>
  )
}
