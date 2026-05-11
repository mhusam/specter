import type { SpecPhase } from '../../types/spec'

const PHASE_CONFIG: Record<SpecPhase, { label: string; bg: string; text: string }> = {
  discovery:    { label: 'Discovery',    bg: 'bg-sky-400',    text: 'text-black' },
  deep_dive:    { label: 'Deep Dive',    bg: 'bg-violet-400', text: 'text-black' },
  gap_analysis: { label: 'Gap Analysis', bg: 'bg-orange-400', text: 'text-black' },
  confirmation: { label: 'Confirmation', bg: 'bg-lime-400',   text: 'text-black' },
  completed:    { label: 'Completed',    bg: 'bg-pink-400',   text: 'text-black' },
}

type Props = {
  phase: SpecPhase
  size?: 'sm' | 'md'
}

export function SpecPhaseBadge({ phase, size = 'md' }: Props) {
  const cfg = PHASE_CONFIG[phase] ?? PHASE_CONFIG.discovery
  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
  return (
    <span className={`${px} font-black border-2 border-black ${cfg.bg} ${cfg.text} uppercase tracking-wide`}>
      {cfg.label}
    </span>
  )
}
