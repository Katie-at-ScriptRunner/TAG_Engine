import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { sdk } from 'adapta-dev-pack'

// ── Types ──────────────────────────────────────────────────────────────────

type Product    = 'Jira' | 'Confluence' | 'Both' | 'Unsure'
type Deployment = 'Cloud' | 'Data Center' | 'Unsure'
type Screen     = 'platform' | 'problem' | 'results'
interface Message  { role: 'user' | 'assistant'; content: string }
interface Artifact { id: string; lang: string; code: string; label: string; msgIndex: number }

// ── Constants ──────────────────────────────────────────────────────────────

const LOADING_PHRASES = [
  'Ada is reading the brief…',
  'Ada is searching product knowledge…',
  'Ada is checking deployment compatibility…',
  'Ada is matching to Adaptavist products…',
  'Ada is weighing up the options…',
  'Ada is preparing a recommendation…',
  'Ada is thinking this through…',
  'Ada is consulting the docs…',
]

const CODE_LANGS = new Set([
  'groovy','javascript','js','typescript','ts','python','py','java','kotlin','kt',
  'sql','bash','sh','xml','json','yaml','yml','css','html','ruby','rb','go','rust',
  'c','cpp','csharp','cs','scala','php','swift','r',
])

const LANG_EXT: Record<string, string> = {
  groovy:'groovy', javascript:'js', js:'js', typescript:'ts', ts:'ts',
  python:'py', py:'py', sql:'sql', java:'java', kotlin:'kt', kt:'kt',
  bash:'sh', sh:'sh', markdown:'md', md:'md', xml:'xml', json:'json',
  yaml:'yml', yml:'yml', css:'css', html:'html', ruby:'rb', rb:'rb',
}

const LANG_LABEL: Record<string, string> = {
  groovy:'Groovy Script', javascript:'JavaScript', js:'JavaScript',
  typescript:'TypeScript', ts:'TypeScript', python:'Python Script', py:'Python Script',
  sql:'SQL Query', java:'Java', kotlin:'Kotlin', bash:'Shell Script', sh:'Shell Script',
  markdown:'Guide', md:'Guide', xml:'XML', json:'JSON', yaml:'YAML', yml:'YAML',
}

// ── Helpers ────────────────────────────────────────────────────────────────

function inferTitle(lang: string, code: string): string {
  const m = code.match(/Purpose:\s*([^\n*]+)/)
  if (m) return m[1].replace(/[*]/g, '').trim()
  return LANG_LABEL[lang.toLowerCase()] || 'Script'
}

function langExt(lang: string): string {
  return LANG_EXT[lang.toLowerCase()] || 'txt'
}

function isCode(lang: string): boolean {
  return CODE_LANGS.has(lang.toLowerCase())
}

function parseMessage(content: string): { prose: string; options: string[] } {
  const options: string[] = []
  const prose = content
    .replace(/\[\[(.+?)\]\]/g, (_, o) => { options.push(o.trim()); return '' })
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { prose, options }
}

function extractArtifacts(content: string, msgIndex: number): Artifact[] {
  const results: Artifact[] = []
  const re = /```(\w*)\n?([\s\S]*?)```/g
  let match, bi = 0
  while ((match = re.exec(content)) !== null) {
    const lang = match[1] || 'text'
    const code = match[2].trim()
    if (code.split('\n').length < 5) continue          // must be 5+ lines
    results.push({ id: `${msgIndex}-${bi}`, lang, code, label: inferTitle(lang, code), msgIndex })
    bi++
  }
  return results
}

function renderMarkdown(md: string): string {
  let h = md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  h = h.replace(/^### (.+)$/gm,'<h3>$1</h3>')
  h = h.replace(/^## (.+)$/gm,'<h2>$1</h2>')
  h = h.replace(/^# (.+)$/gm,'<h1>$1</h1>')
  h = h.replace(/^---+$/gm,'<hr/>')
  h = h.replace(/((?:^[*\-] .+\n?)+)/gm, b => `<ul>${b.trim().split('\n').map(l=>`<li>${l.replace(/^[*\-] /,'')}</li>`).join('')}</ul>`)
  h = h.replace(/((?:^\d+\. .+\n?)+)/gm, b => `<ol>${b.trim().split('\n').map(l=>`<li>${l.replace(/^\d+\. /,'')}</li>`).join('')}</ol>`)
  h = h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>')
  h = h.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>')
  h = h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
  h = h.replace(/\*(.+?)\*/g,'<em>$1</em>')
  h = h.replace(/`(.+?)`/g,'<code>$1</code>')
  h = h.split(/\n{2,}/).map(b => {
    b = b.trim(); if (!b) return ''
    if (/^<(h[1-3]|ul|ol|blockquote|hr)/.test(b)) return b
    return `<p>${b.replace(/\n/g,'<br/>')}</p>`
  }).join('\n')
  return h
}

// ── TAG Logo ───────────────────────────────────────────────────────────────

function TagLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" rx="14" fill="#FC6C34"/>
      <path d="M50 18L82 74H65L50 46L35 74H18L50 18Z" fill="white"/>
      <path d="M32 58H68V66H32V58Z" fill="white"/>
    </svg>
  )
}

// ── Loading ────────────────────────────────────────────────────────────────

function LoadingMessage() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i+1) % LOADING_PHRASES.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="loading-msg">
      <span className="loading-text">{LOADING_PHRASES[idx]}</span>
      <span className="dot" style={{animationDelay:'0ms'}}/>
      <span className="dot" style={{animationDelay:'150ms'}}/>
      <span className="dot" style={{animationDelay:'300ms'}}/>
    </div>
  )
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function PlatformBadge({ product, deployment }: { product: Product; deployment: Deployment }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="badge badge-product">{product}</span>
      <span className="badge badge-deploy">{deployment}</span>
    </div>
  )
}

function AdaAvatar() {
  return <div className="ada-avatar"><TagLogo size={22}/></div>
}

function SelectionCard({ label, description, selected, onClick }: {
  label: string; description: string; selected: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className={`selection-card ${selected ? 'selection-card-selected' : ''}`}>
      <span className="selection-card-label">{label}</span>
      <span className="selection-card-desc">{description}</span>
    </button>
  )
}

function AdaMessage({ content, isLast, isLoading, hasArtifact, onOption }: {
  content: string; isLast: boolean; isLoading: boolean; hasArtifact: boolean; onOption: (o: string) => void
}) {
  const { prose, options } = parseMessage(content)
  return (
    <div className="msg-bubble msg-bubble-ada">
      <div className="prose-ada" dangerouslySetInnerHTML={{ __html: renderMarkdown(prose) }}/>
      {hasArtifact && (
        <div className="artifact-notice">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Script ready — view in panel →
        </div>
      )}
      {options.length > 0 && (
        <div className="option-row">
          {options.map((opt, i) =>
            isLast && !isLoading
              ? <button key={i} className="option-btn" onClick={() => onOption(opt)}>{opt}</button>
              : <span   key={i} className="option-btn option-btn-used">{opt}</span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Code with line numbers ─────────────────────────────────────────────────

function CodeWithLineNumbers({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <div className="code-with-lines">
      <div className="line-numbers" aria-hidden="true">
        {lines.map((_, i) => <span key={i}>{i + 1}</span>)}
      </div>
      <pre className="code-content"><code>{code}</code></pre>
    </div>
  )
}

// ── Artifact Panel ─────────────────────────────────────────────────────────

function ArtifactPanel({ artifacts, currentIdx, onNavigate, onClose, width }: {
  artifacts: Artifact[]
  currentIdx: number
  onNavigate: (idx: number) => void
  onClose: () => void
  width: number
}) {
  const [copied, setCopied]         = useState(false)
  const [showExport, setShowExport] = useState(false)
  const exportRef                   = useRef<HTMLDivElement>(null)
  const artifact                    = artifacts[currentIdx] ?? null

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return
    function handler(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExport(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExport])

  function copy() {
    if (!artifact) return
    navigator.clipboard.writeText(artifact.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function download(ext: string) {
    if (!artifact) return
    const blob = new Blob([artifact.code], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${artifact.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    setShowExport(false)
  }

  const codeArtifact = isCode(artifact?.lang || '')
  const ext          = langExt(artifact?.lang || '')

  if (!artifact) return null

  return (
    <div className="artifact-panel" style={{ width }}>
      {/* ── Header ── */}
      <div className="artifact-header">
        {/* Left: title + badge + nav */}
        <div className="artifact-header-left">
          <span className="artifact-title" title={artifact.label}>
            {artifact.label.length > 28 ? artifact.label.slice(0,27)+'…' : artifact.label}
          </span>
          {artifact.lang && artifact.lang !== 'text' && (
            <span className="artifact-lang-badge">{artifact.lang.toUpperCase()}</span>
          )}
          {artifacts.length > 1 && (
            <div className="artifact-nav">
              <button className="artifact-nav-btn" onClick={() => onNavigate(currentIdx - 1)} disabled={currentIdx === 0} aria-label="Previous">←</button>
              <span className="artifact-nav-counter">{currentIdx + 1} of {artifacts.length}</span>
              <button className="artifact-nav-btn" onClick={() => onNavigate(currentIdx + 1)} disabled={currentIdx === artifacts.length - 1} aria-label="Next">→</button>
            </div>
          )}
        </div>

        {/* Right: copy, export, close */}
        <div className="artifact-header-right">
          <button className={`artifact-action-btn ${copied ? 'artifact-action-btn-success' : ''}`} onClick={copy}>
            {copied
              ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied!</>
              : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/></svg>Copy</>
            }
          </button>

          <div className="export-wrapper" ref={exportRef}>
            <button className="artifact-action-btn" onClick={() => setShowExport(v => !v)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              Export
            </button>
            {showExport && (
              <div className="export-dropdown">
                <button onClick={() => download('txt')}>Download as .txt</button>
                <button onClick={() => download(ext)}>Download as .{ext}</button>
                <button onClick={() => download('md')}>Download as .md</button>
              </div>
            )}
          </div>

          <button className="artifact-close-btn" onClick={onClose} aria-label="Close panel">✕</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="artifact-body">
        {codeArtifact
          ? <CodeWithLineNumbers code={artifact.code}/>
          : <div className="artifact-prose prose-ada" dangerouslySetInnerHTML={{ __html: renderMarkdown(artifact.code) }}/>
        }
      </div>
    </div>
  )
}

// ── Screen 1 ───────────────────────────────────────────────────────────────

const PRODUCT_CARDS: { label: Product; description: string }[] = [
  { label: 'Jira',       description: 'Issue tracking, project & workflow management' },
  { label: 'Confluence', description: 'Docs, knowledge base & team collaboration' },
  { label: 'Both',       description: 'Touches both Jira and Confluence' },
  { label: 'Unsure',     description: 'Not sure yet — Ada will help narrow it down' },
]
const DEPLOYMENT_CARDS: { label: Deployment; description: string }[] = [
  { label: 'Cloud',       description: 'Atlassian Cloud — hosted by Atlassian' },
  { label: 'Data Center', description: 'Self-managed on your own infrastructure' },
  { label: 'Unsure',      description: 'Not confirmed — Ada will factor in both' },
]

function PlatformScreen({ onStart }: { onStart: (p: Product, d: Deployment) => void }) {
  const [product,    setProduct]    = useState<Product    | null>(null)
  const [deployment, setDeployment] = useState<Deployment | null>(null)
  const ready = product !== null && deployment !== null
  return (
    <div className="screen-center">
      <div className="logo-lockup"><TagLogo size={40}/><div><div className="logo-title">TAG Engine</div><div className="logo-subtitle">Powered by Ada</div></div></div>
      <h1 className="screen-heading">What platform is this for?</h1>
      <p className="screen-subtext">Select the Atlassian product and deployment type to get tailored recommendations.</p>
      <div className="card">
        <div className="selector-group">
          <label className="selector-label">Product</label>
          <div className="card-grid">
            {PRODUCT_CARDS.map(({label,description}) => (
              <SelectionCard key={label} label={label} description={description} selected={product===label} onClick={()=>setProduct(label)}/>
            ))}
          </div>
        </div>
        <div className="selector-divider"/>
        <div className="selector-group">
          <label className="selector-label">Deployment</label>
          <div className="card-grid card-grid-3">
            {DEPLOYMENT_CARDS.map(({label,description}) => (
              <SelectionCard key={label} label={label} description={description} selected={deployment===label} onClick={()=>setDeployment(label)}/>
            ))}
          </div>
        </div>
      </div>
      <button className={`btn-primary ${!ready?'btn-disabled':''}`} disabled={!ready} onClick={()=>ready&&onStart(product!,deployment!)}>Start →</button>
    </div>
  )
}

// ── Screen 2 ───────────────────────────────────────────────────────────────

function ProblemScreen({ product, deployment, onSubmit, onBack }: {
  product: Product; deployment: Deployment; onSubmit: (p: string) => void; onBack: () => void
}) {
  const [problem, setProblem] = useState('')
  const [loading, setLoading] = useState(false)
  const ready = problem.trim().length > 10
  function submit() { if (!ready||loading) return; setLoading(true); onSubmit(problem.trim()) }
  return (
    <div className="screen-center">
      <button onClick={onBack} className="back-btn">← Back</button>
      <div className="logo-lockup logo-lockup-sm"><TagLogo size={28}/><div className="logo-title logo-title-sm">TAG Engine</div></div>
      <div className="mb-4"><PlatformBadge product={product} deployment={deployment}/></div>
      <h2 className="screen-heading">Describe the workflow challenge</h2>
      <p className="screen-subtext">In plain language — Ada will match it to the right Adaptavist product.</p>
      <div className="card card-tight">
        <textarea className="problem-textarea"
          placeholder="e.g. Our team is spending hours manually moving issues between projects after each sprint. We need something that can automate this."
          value={problem} onChange={e=>setProblem(e.target.value)} rows={6} disabled={loading}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}}}/>
      </div>
      <p className="input-hint">Enter to submit · Shift + Enter for a new line</p>
      <button className={`btn-primary ${!ready||loading?'btn-disabled':''}`} disabled={!ready||loading} onClick={submit}>
        {loading?'Finding a solution…':'Find a solution →'}
      </button>
    </div>
  )
}

// ── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Ada, part of the TAG Engine — an internal tool for Adaptavist staff. Your job is to help people understand which Adaptavist products can address a specific workflow challenge, and to support them in taking the next step.

The people using this tool are professionals — CSMs, AEs, Solutions Consultants — who know Jira and Confluence well. Don't over-explain the basics. Engage with the actual problem.

PLATFORM CONTEXT: You'll be told which Atlassian product (Jira / Confluence / Both / Unsure) and deployment type (Cloud / Data Center / Unsure) applies. Only recommend products compatible with that context.

KNOWLEDGE BASE — link to these where genuinely useful:
- All product docs: https://docs.adaptavist.com/
- ScriptRunner: https://www.scriptrunnerhq.com/
- Mosaic: https://www.kolekti.com/
- The Adaptavist Group: https://www.theadaptavistgroup.com/
- Upscale (professional services): https://www.upscale.tech/

PRODUCTS YOU CAN RECOMMEND:
- ScriptRunner for Jira (Cloud & Data Center) — automation, scripted workflows, custom listeners, JQL extensions
- ScriptRunner for Confluence (Cloud & Data Center) — scripted macros, dynamic content, page automation
- ScriptRunner for Bitbucket (Data Center) — repo-level scripting and hooks
- ScriptRunner Connect — integration between Atlassian tools and external systems
- ScriptRunner Migration Suite — Jira/Confluence migration tooling
- ScriptRunner Enhanced Search — advanced search and filtering beyond native JQL
- Mosaic (Cloud & Data Center) — formatting, layouts, branded templates for Confluence. Advanced Mosaic extends this with complex design control and design systems.
- Hierarchy for Jira (Cloud only) — multi-level issue hierarchy visualisation and management

NAMING: The app is "Mosaic". Never say "Kolekti" — that is the business unit. When Mosaic fits, consider whether Advanced Mosaic is also worth mentioning. Never recommend tools outside The Adaptavist Group. Never fabricate capabilities.

════════════════════════════════════════
HOW TO RESPOND
════════════════════════════════════════

REASONING FIRST: Before writing anything, think through the full product catalogue against this specific problem. Don't default to the same products each time.

STRUCTURE RULES:
1. Open with 2–3 sentences that speak directly to the problem. Make it clear you've understood what's going on before recommending anything.
2. Introduce the product recommendation naturally in prose. Bold the product name on first mention only. Never open with a product name. Never use a product name as a heading.
3. If a second product is relevant, weave it in after establishing the primary. Never list multiple products as equal options in a bullet list.
4. Only use a ## heading if the response genuinely covers two or more distinct topics. A single-product response should rarely need one.
5. Only use bullet points for genuinely parallel, non-sequential items. Maximum 5 bullets. More than 5 → summarise in prose.
6. Only use a numbered list when the user has asked for steps. Don't produce one unprompted — offer it via options instead.
7. Never produce a numbered list and a bullet list in the same response unless one is nested for a clear reason.
8. Match the register of the question. Short follow-up = short answer.
9. If the problem is ambiguous, ask one focused clarifying question. Don't guess and hedge simultaneously.
10. If no product fits, say so honestly. Note any native Atlassian workarounds and suggest a feature request to the Product team.
11. Never close with a generic sign-off.

SETUP GUIDES — only when the user has asked:
Numbered steps. For ScriptRunner, include a Groovy script as a fenced code block (the UI renders it in a side panel — no need to introduce it with prose). Script must open with:

\`\`\`groovy
/*
 * ═══════════════════════════════════════════════════
 * TAG Engine — ScriptRunner Artefact
 * ═══════════════════════════════════════════════════
 * Purpose:       [One sentence]
 * Trigger:       [e.g. Post Function / Listener / Scheduled Job]
 * Compatibility: [ScriptRunner for Jira Cloud / Data Center]
 * Prerequisites: [Any fields, configs, or permissions needed]
 * Docs:          https://docs.adaptavist.com/
 * ═══════════════════════════════════════════════════
 */

// [well-commented Groovy code]
\`\`\`

════════════════════════════════════════
INTERACTIVE OPTIONS
════════════════════════════════════════
End every response with 2–3 relevant follow-up options using [[double brackets]], chosen to match what you just said. Place them after all prose and code.

Example options (pick what fits — don't reuse the same ones every time):
[[Tell me more about how this works]]
[[Help me get it set up]]
[[Are there any limitations I should know about?]]
[[Would this work for Data Center too?]]
[[Show me what the script would look like]]
[[Is there another product that could help here?]]
[[What would the demo angle be for this?]]
[[How does this compare to doing it natively?]]

Only use [[...]] for selectable choices. Never for anything else.`

// ── Screen 3 — Results ────────────────────────────────────────────────────

const DEFAULT_PANEL_WIDTH = 480
const MIN_CHAT_WIDTH      = 380
const MIN_PANEL_WIDTH     = 320

function ResultsScreen({ product, deployment, initialProblem, onReset }: {
  product: Product; deployment: Deployment; initialProblem: string; onReset: () => void
}) {
  const [messages,    setMessages]    = useState<Message[]>([])
  const [followUp,    setFollowUp]    = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [panelOpen,   setPanelOpen]   = useState(false)
  const [panelWidth,  setPanelWidth]  = useState(DEFAULT_PANEL_WIDTH)
  const [currentIdx,  setCurrentIdx]  = useState(0)
  const [isMobile,    setIsMobile]    = useState(() => window.innerWidth < 768)

  const bottomRef     = useRef<HTMLDivElement>(null)
  const hasInit       = useRef(false)
  const apiHistoryRef = useRef<Message[]>([])
  const prevArtCount  = useRef(0)
  const dragState     = useRef({ active: false, startX: 0, startWidth: 0 })

  // Derive artifacts from all messages
  const artifacts = useMemo(() => {
    const all: Artifact[] = []
    messages.forEach((m, i) => { if (m.role === 'assistant') all.push(...extractArtifacts(m.content, i)) })
    return all
  }, [messages])

  // Auto-open panel when new artifacts arrive
  useEffect(() => {
    if (artifacts.length > prevArtCount.current) {
      setPanelOpen(true)
      setCurrentIdx(artifacts.length - 1)
    }
    prevArtCount.current = artifacts.length
  }, [artifacts.length])

  // Mobile resize listener
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { if (!hasInit.current) { hasInit.current = true; run() } }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  async function run() {
    const apiMsg = `Platform: ${product} | Deployment: ${deployment}\n\nWorkflow challenge: ${initialProblem}`
    apiHistoryRef.current = [{ role: 'user', content: apiMsg }]
    setMessages([{ role: 'user', content: initialProblem }])
    await fetchAda()
  }

  async function fetchAda() {
    setLoading(true); setError(null)
    try {
      const msgs = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...apiHistoryRef.current.map(m => ({ role: m.role as 'user'|'assistant'|'system', content: m.content })),
      ]
      const { text } = await sdk.ai.generateText({ model: 'anthropic/claude-sonnet-4-5', messages: msgs })
      const msg: Message = { role: 'assistant', content: text }
      apiHistoryRef.current = [...apiHistoryRef.current, msg]
      setMessages(prev => [...prev, msg])
    } catch { setError('Ada hit a snag — please try again.') }
    finally   { setLoading(false) }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const msg: Message = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, msg])
    apiHistoryRef.current = [...apiHistoryRef.current, msg]
    setFollowUp('')
    await fetchAda()
  }

  async function retryLast() {
    setError(null)
    if (apiHistoryRef.current[apiHistoryRef.current.length-1]?.role === 'assistant') {
      apiHistoryRef.current = apiHistoryRef.current.slice(0,-1)
      setMessages(prev => { const i = [...prev].map((m,i)=>({m,i})).reverse().find(x=>x.m.role==='assistant')?.i; return i!=null?prev.slice(0,i):prev })
    }
    await fetchAda()
  }

  // Drag handle
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragState.current = { active: true, startX: e.clientX, startWidth: panelWidth }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(ev: MouseEvent) {
      if (!dragState.current.active) return
      const delta  = dragState.current.startX - ev.clientX           // drag left → panel widens
      const maxW   = window.innerWidth - MIN_CHAT_WIDTH - 4
      const newW   = Math.max(MIN_PANEL_WIDTH, Math.min(dragState.current.startWidth + delta, maxW))
      setPanelWidth(newW)
    }
    function onUp() {
      dragState.current.active = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [panelWidth])

  const lastAssistantIdx  = messages.reduce((acc,m,i) => m.role==='assistant' ? i : acc, -1)
  const artifactMsgIdxSet = useMemo(() => new Set(artifacts.map(a=>a.msgIndex)), [artifacts])

  return (
    <div className="results-wrapper">
      {/* Top bar */}
      <div className="results-topbar">
        <div className="flex items-center gap-3">
          <TagLogo size={28}/>
          <span className="results-title">TAG Engine</span>
          <PlatformBadge product={product} deployment={deployment}/>
        </div>
        <button onClick={onReset} className="reset-btn">↺ Start over</button>
      </div>

      {/* Body */}
      <div className="results-body">

        {/* Conversation */}
        <div className="conversation-side">
          <div className="thread-container">
            <div className="thread-inner">
              {messages.map((msg,i) => (
                <div key={i} className={`msg-row ${msg.role==='user'?'msg-user':'msg-ada'}`}>
                  {msg.role==='assistant' && <AdaAvatar/>}
                  {msg.role==='assistant'
                    ? <AdaMessage content={msg.content} isLast={i===lastAssistantIdx} isLoading={loading} hasArtifact={artifactMsgIdxSet.has(i)} onOption={sendMessage}/>
                    : <div className="msg-bubble msg-bubble-user"><p className="msg-user-text">{msg.content}</p></div>
                  }
                </div>
              ))}
              {loading && <div className="msg-row msg-ada"><AdaAvatar/><div className="msg-bubble msg-bubble-ada"><LoadingMessage/></div></div>}
              {error && <div className="error-banner"><span>{error}</span><button className="retry-btn" onClick={retryLast}>Retry</button></div>}
              <div ref={bottomRef}/>
            </div>
          </div>

          <div className="followup-bar">
            <div className="followup-inner">
              <textarea className="followup-input" placeholder="Ask Ada a follow-up question…" value={followUp} rows={1} disabled={loading}
                onChange={e=>setFollowUp(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(followUp)}}}/>
              <button className={`send-btn ${!followUp.trim()||loading?'send-btn-disabled':''}`} disabled={!followUp.trim()||loading} onClick={()=>sendMessage(followUp)} aria-label="Send">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="followup-hint">Enter to send · Shift + Enter for new line</p>
          </div>
        </div>

        {/* Drag handle — desktop only, when panel open */}
        {panelOpen && !isMobile && (
          <div className="drag-handle" onMouseDown={onDragStart}/>
        )}

        {/* Artifact panel — desktop (animated width) */}
        {!isMobile && (
          <div
            className="artifact-panel-outer"
            style={{
              width: panelOpen ? panelWidth : 0,
              transition: panelOpen ? 'width 200ms ease-out' : 'width 150ms ease-in',
            }}
          >
            {artifacts.length > 0 && (
              <ArtifactPanel
                artifacts={artifacts}
                currentIdx={Math.min(currentIdx, artifacts.length - 1)}
                onNavigate={setCurrentIdx}
                onClose={() => setPanelOpen(false)}
                width={panelWidth}
              />
            )}
          </div>
        )}

        {/* Artifact panel — mobile (full-screen overlay) */}
        {isMobile && panelOpen && artifacts.length > 0 && (
          <div className="artifact-mobile-overlay" onClick={e => { if (e.target === e.currentTarget) setPanelOpen(false) }}>
            <ArtifactPanel
              artifacts={artifacts}
              currentIdx={Math.min(currentIdx, artifacts.length - 1)}
              onNavigate={setCurrentIdx}
              onClose={() => setPanelOpen(false)}
              width={window.innerWidth}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const [screen,     setScreen]     = useState<Screen>('platform')
  const [product,    setProduct]    = useState<Product    | null>(null)
  const [deployment, setDeployment] = useState<Deployment | null>(null)
  const [problem,    setProblem]    = useState<string     | null>(null)

  if (screen==='platform') return <PlatformScreen onStart={(p,d)=>{setProduct(p);setDeployment(d);setScreen('problem')}}/>
  if (screen==='problem')  return <ProblemScreen product={product!} deployment={deployment!} onBack={()=>setScreen('platform')} onSubmit={p=>{setProblem(p);setScreen('results')}}/>
  return <ResultsScreen product={product!} deployment={deployment!} initialProblem={problem!} onReset={()=>{setProduct(null);setDeployment(null);setProblem(null);setScreen('platform')}}/>
}
