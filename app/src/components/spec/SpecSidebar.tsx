import { useState } from 'react'
import { BookmarkCheck, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import type { SpecSession, SpecMessage, SpecPhase, ElicitedSummaryJsonb } from '../../types/spec'

// ── Phase Guide content ──────────────────────────────────────────────────────

type PhaseGuideEntry = {
  goal: string
  agentDoes: string[]
  youShouldProvide: string[]
  endsWhen: string
  next: SpecPhase | null
}

const PHASE_GUIDE: Record<SpecPhase, PhaseGuideEntry> = {
  discovery: {
    goal: 'Understand who, what, and why — identify the key actors, business goals, and high-level feature areas.',
    agentDoes: [
      'Asks open-ended questions about your business problem',
      'Identifies the primary users and stakeholders',
      'Maps out the high-level feature areas',
      'Does not propose technical solutions yet',
    ],
    youShouldProvide: [
      'Who will use the system (roles, personas)',
      'The core problem you are solving',
      'The 3–5 most important things the system must do',
      'Any known constraints (budget, timeline, technology)',
    ],
    endsWhen: 'At least 3 actors and 5 functional areas are captured, or you move to Deep Dive.',
    next: 'deep_dive',
  },
  deep_dive: {
    goal: 'Capture detailed EARS-format requirements for each functional area and BDD acceptance criteria.',
    agentDoes: [
      'Asks targeted questions per feature area',
      'Formats requirements as WHEN [trigger], the system SHALL [response]',
      'Asks for Given/When/Then acceptance scenarios',
      'Presents captured requirements and asks for corrections',
    ],
    youShouldProvide: [
      'Specific rules and logic for each feature',
      'Error and edge case behaviour',
      'Business rules and validation constraints',
      'Performance expectations per feature',
    ],
    endsWhen: 'All identified functional areas have at least one requirement captured.',
    next: 'gap_analysis',
  },
  gap_analysis: {
    goal: 'Identify what is missing — authentication, error paths, integrations, scalability, and compliance.',
    agentDoes: [
      'Reviews all requirements captured so far',
      'Asks targeted gap-closing questions (auth model, error handling, integrations)',
      'Surfaces non-functional requirements (performance, availability, security)',
      'Identifies missing actors or flows',
    ],
    youShouldProvide: [
      'Authentication and authorisation model',
      'How the system handles errors and failures',
      'External integrations (APIs, services, payment)',
      'Data retention, privacy, and compliance needs',
    ],
    endsWhen: 'All standard gaps are addressed and the requirements set feels complete.',
    next: 'confirmation',
  },
  confirmation: {
    goal: 'Review the complete structured requirements summary and give final approval before generation.',
    agentDoes: [
      'Presents the full requirements organised by category',
      'Lists: Functional, Non-Functional, Constraints, Actors, Key Flows',
      'Asks for corrections or additions',
      'When you confirm, outputs READY_FOR_GENERATION to unlock the Generate button',
    ],
    youShouldProvide: [
      'Confirmation that the summary is accurate',
      'Any final corrections before spec generation',
    ],
    endsWhen: 'You confirm the summary is correct.',
    next: 'completed',
  },
  completed: {
    goal: 'The requirements elicitation is complete. Generate the 22-document spec package.',
    agentDoes: [
      'Remains available to answer clarifying questions',
      'Will not add new requirements to this session',
      'The Generate Spec button is now enabled',
    ],
    youShouldProvide: [
      'Click "Generate Spec" to produce the 22-document package',
      'Use the result as input for your AI coder agent',
    ],
    endsWhen: 'You generate the spec package.',
    next: null,
  },
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RequirementsTab({ session }: { session: SpecSession }) {
  const { theme } = useTheme()
  const jsonb = session.elicitedSummaryJsonb

  if (!jsonb) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-2 px-4 text-center`}>
        <p className={`text-sm font-black ${theme.text}`}>No requirements captured yet</p>
        <p className={`text-xs ${theme.textMuted}`}>
          Requirements are extracted when you save a checkpoint. Chat with the Spec Agent and click "Checkpoint" to capture what's been gathered.
        </p>
      </div>
    )
  }

  const sections: { key: keyof ElicitedSummaryJsonb; label: string; color: string }[] = [
    { key: 'functional',    label: 'Functional',        color: 'bg-sky-400' },
    { key: 'nonfunctional', label: 'Non-Functional',    color: 'bg-violet-400' },
    { key: 'constraints',   label: 'Constraints',       color: 'bg-orange-400' },
    { key: 'actors',        label: 'Actors',            color: 'bg-pink-400' },
    { key: 'flows',         label: 'Key Flows',         color: 'bg-lime-400' },
  ]

  const total = sections.reduce((sum, s) => sum + (jsonb[s.key]?.length ?? 0), 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className={`px-3 py-2 border-b-2 ${theme.border} ${theme.panelAlt} flex items-center justify-between`}>
        <span className={`text-xs font-black ${theme.text}`}>Elicited Requirements</span>
        <span className={`text-[10px] px-1.5 py-0.5 border ${theme.border} font-bold ${theme.textMuted}`}>
          {total} items
        </span>
      </div>

      <div className="divide-y-2" style={{ borderColor: 'inherit' }}>
        {sections.map(({ key, label, color }) => {
          const items = jsonb[key] ?? []
          if (items.length === 0) return null
          return (
            <CollapsibleSection key={key} label={label} color={color} count={items.length}>
              <ul className="space-y-1 py-2 px-3">
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${color}`} />
                    <span className={`text-xs ${theme.text} leading-snug`}>{item}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )
        })}

        {total === 0 && (
          <div className={`px-3 py-4 text-xs ${theme.textMuted}`}>
            All requirement categories are empty. Run a checkpoint to extract requirements from the conversation.
          </div>
        )}
      </div>
    </div>
  )
}

function CollapsibleSection({
  label, color, count, children,
}: {
  label: string; color: string; count: number; children: React.ReactNode
}) {
  const { theme } = useTheme()
  const [open, setOpen] = useState(true)

  return (
    <div className={`border-b-2 ${theme.border}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${theme.surface} ${theme.text} hover:opacity-80 text-left`}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
        <span className="text-xs font-black uppercase">{label}</span>
        <span className={`ml-auto text-[10px] px-1 py-0.5 border ${theme.border} font-bold ${theme.textMuted}`}>
          {count}
        </span>
      </button>
      {open && children}
    </div>
  )
}

function PhaseGuideTab({ phase }: { phase: SpecPhase }) {
  const { theme } = useTheme()
  const guide = PHASE_GUIDE[phase]

  const phaseOrder: SpecPhase[] = ['discovery', 'deep_dive', 'gap_analysis', 'confirmation', 'completed']
  const currentIdx = phaseOrder.indexOf(phase)

  return (
    <div className="h-full overflow-y-auto">
      {/* Phase progress stepper */}
      <div className={`px-3 py-3 border-b-2 ${theme.border} ${theme.panelAlt}`}>
        <div className="flex items-center gap-1">
          {phaseOrder.map((p, i) => {
            const isDone = i < currentIdx
            const isCurrent = i === currentIdx
            const labels: Record<SpecPhase, string> = {
              discovery: 'Disc', deep_dive: 'Deep', gap_analysis: 'Gap',
              confirmation: 'Conf', completed: 'Done',
            }
            return (
              <div key={p} className="flex items-center flex-1 min-w-0">
                <div className={`flex-shrink-0 w-5 h-5 flex items-center justify-center border-2 border-black text-[9px] font-black ${
                  isDone ? 'bg-lime-400 text-black' :
                  isCurrent ? 'bg-pink-400 text-black' :
                  `${theme.surface} ${theme.textMuted}`
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < phaseOrder.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-0.5 ${isDone ? 'bg-lime-400' : 'bg-zinc-300'}`} />
                )}
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1 px-0.5">
          {phaseOrder.map((p) => {
            const labels: Record<SpecPhase, string> = {
              discovery: 'Disc', deep_dive: 'Deep', gap_analysis: 'Gap',
              confirmation: 'Conf', completed: 'Done',
            }
            return (
              <span key={p} className={`text-[9px] font-bold ${p === phase ? theme.text : theme.textMuted}`}>
                {labels[p]}
              </span>
            )
          })}
        </div>
      </div>

      {/* Guide content */}
      <div className="p-3 space-y-4">
        <div>
          <p className={`text-[10px] font-black uppercase ${theme.textMuted} mb-1`}>Goal</p>
          <p className={`text-xs ${theme.text} leading-snug`}>{guide.goal}</p>
        </div>

        <div>
          <p className={`text-[10px] font-black uppercase ${theme.textMuted} mb-1`}>The Agent Will</p>
          <ul className="space-y-1">
            {guide.agentDoes.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className={`text-xs ${theme.text} leading-snug`}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className={`text-[10px] font-black uppercase ${theme.textMuted} mb-1`}>You Should Provide</p>
          <ul className="space-y-1">
            {guide.youShouldProvide.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                <span className={`text-xs ${theme.text} leading-snug`}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`border-2 ${theme.border} p-2`}>
          <p className={`text-[10px] font-black uppercase ${theme.textMuted} mb-1`}>Phase Ends When</p>
          <p className={`text-xs ${theme.text} leading-snug`}>{guide.endsWhen}</p>
        </div>

        {guide.next && (
          <div className={`text-[11px] ${theme.textMuted}`}>
            Next phase: <span className="font-black capitalize">{guide.next.replace('_', ' ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryTab({
  messages,
  checkpointLoading,
  onRunCheckpoint,
}: {
  messages: SpecMessage[]
  checkpointLoading: boolean
  onRunCheckpoint: () => void
}) {
  const { theme } = useTheme()
  const checkpoints = messages.filter(m => m.messageType === 'checkpoint')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Save checkpoint button */}
      <div className={`flex-shrink-0 px-3 py-2 border-b-2 ${theme.border} ${theme.surface}`}>
        <button
          onClick={onRunCheckpoint}
          disabled={checkpointLoading}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border-2 ${theme.buttonGhost} disabled:opacity-40`}
        >
          {checkpointLoading ? <Loader2 size={12} className="animate-spin" /> : <BookmarkCheck size={12} />}
          <span className="font-black">Save Checkpoint Now</span>
        </button>
        <p className={`text-[10px] mt-1 text-center ${theme.textMuted}`}>
          Captures & merges all requirements from the conversation
        </p>
      </div>

      {/* Checkpoint list */}
      <div className="flex-1 overflow-y-auto">
        {checkpoints.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-2 px-4 text-center`}>
            <p className={`text-xs ${theme.textMuted}`}>No checkpoints saved yet.</p>
            <p className={`text-[10px] ${theme.textMuted}`}>Checkpoints extract and preserve requirements from the conversation into a structured format.</p>
          </div>
        ) : (
          <div className="divide-y-2" style={{ borderColor: 'inherit' }}>
            {checkpoints.map((msg, i) => (
              <div key={msg.id} className={`p-3 ${theme.surface}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0 bg-sky-400" />
                  <span className={`text-[10px] font-black uppercase ${theme.textMuted}`}>
                    Checkpoint {i + 1}
                  </span>
                  <span className={`ml-auto text-[10px] ${theme.textMuted}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className={`text-xs ${theme.text} leading-snug line-clamp-4`}>{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

type SidebarTab = 'requirements' | 'guide' | 'history'

type Props = {
  session: SpecSession
  messages: SpecMessage[]
  checkpointLoading: boolean
  onRunCheckpoint: () => void
}

export function SpecSidebar({ session, messages, checkpointLoading, onRunCheckpoint }: Props) {
  const { theme } = useTheme()
  const [activeTab, setActiveTab] = useState<SidebarTab>('requirements')

  function tabClass(tab: SidebarTab) {
    const active = activeTab === tab
    return [
      'flex-1 py-1.5 text-[10px] font-black uppercase transition-colors border-r-2 last:border-r-0',
      theme.border,
      active
        ? 'bg-pink-400 text-black'
        : `${theme.surface} ${theme.textMuted} hover:opacity-80`,
    ].join(' ')
  }

  const reqCount = session.elicitedSummaryJsonb
    ? Object.values(session.elicitedSummaryJsonb).reduce((sum, arr) => sum + arr.length, 0)
    : 0

  return (
    <div className={`flex flex-col h-full border-l-4 ${theme.border} ${theme.surface}`}>
      {/* Tab bar */}
      <div className={`flex-shrink-0 flex border-b-2 ${theme.border}`}>
        <button onClick={() => setActiveTab('requirements')} className={tabClass('requirements')}>
          Reqs
          {reqCount > 0 && (
            <span className="ml-0.5 px-1 text-[9px] bg-lime-400 text-black border border-black">{reqCount}</span>
          )}
        </button>
        <button onClick={() => setActiveTab('guide')} className={tabClass('guide')}>
          Guide
        </button>
        <button onClick={() => setActiveTab('history')} className={tabClass('history')}>
          History
          {messages.filter(m => m.messageType === 'checkpoint').length > 0 && (
            <span className="ml-0.5 px-1 text-[9px] bg-sky-400 text-black border border-black">
              {messages.filter(m => m.messageType === 'checkpoint').length}
            </span>
          )}
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'requirements' && <RequirementsTab session={session} />}
        {activeTab === 'guide' && <PhaseGuideTab phase={session.phase} />}
        {activeTab === 'history' && (
          <HistoryTab
            messages={messages}
            checkpointLoading={checkpointLoading}
            onRunCheckpoint={onRunCheckpoint}
          />
        )}
      </div>
    </div>
  )
}
