/**
 * dsh-roadmap-board — Host half (v0.1, parameterized for publishing).
 *
 * Register via cordis_define as code.host, or wrap into an agent preset
 * (see preset/roadmap-board). File access only through ctx.get('fs').
 *
 * CONFIG (see docs/portability.md):
 *  - defaultRoot:      null (auto) or an absolute project root
 *  - discoverRoots:    null | string[] — root dirs to scan for projects
 *  - presetSkillRoots: string[]        — extra skill roots (deployment presets)
 *  - configFile:       null | absolute path of the project-switch config
 */
const CONFIG = {
  defaultRoot: null,
  discoverRoots: null,
  presetSkillRoots: [],
  configFile: null,
}

const LIMITS = { lanes: 40, steps: 80, branches: 80 }
const STATES = ['todo', 'doing', 'done', 'fix', 'blocked']

let seq = 0
let S = null
let loadP = null
let root = ''
const fsS = { ready: false, fs: null, lastRaw: null, lastWriteRaw: null, failed: false }
let skillCache = null
let skillCacheAt = 0

const nid = (p) => (seq += 1) + p + seq + '-' + Date.now().toString(36)
const clean = (v, cap) => (typeof v === 'string' ? (v.trim().length > cap ? v.trim().slice(0, cap) : v.trim()) : '')
const toState = (v) => (STATES.indexOf(v) >= 0 ? v : 'todo')
const vId = (v, p) => (typeof v === 'string' && v.length >= 1 && v.length <= 48 ? v : nid(p))
const fnum = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : d)
const fbool = (v, d) => (typeof v === 'boolean' ? v : d)
const finite = (v, d) => (typeof v === 'number' && isFinite(v) ? Math.round(v) : d)
const normPanel = (raw) => { const p = raw && typeof raw === 'object' ? raw : {}; return { x: fnum(p.x, 0), y: fnum(p.y, 0), open: fbool(p.open, true), w: fnum(p.w, 1280), h: fnum(p.h, 840) } }
const makeLane = (title) => ({ id: nid('L'), title: clean(title, 60) || '未命名阶段', steps: [] })
const normPath = (p) => (typeof p === 'string' ? p.replace(/\\/g, '/') : '')
const withSlash = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '')
const boardAbsOf = (r) => withSlash(r) + '/.progress/roadmap.json'
const skillsAbsOf = (r) => withSlash(r) + '/.agents/skills'

function normStep(raw) {
  if (!raw || typeof raw !== 'object') return null
  const text = clean(raw.text, 300)
  if (!text) return null
  const step = { id: vId(raw.id, 'S'), text, state: toState(raw.state), skill: clean(raw.skill, 40), branches: [] }
  if (Array.isArray(raw.branches)) {
    for (const b of raw.branches.slice(0, LIMITS.branches)) {
      if (!b || typeof b !== 'object') continue
      const bt = clean(b.text, 200)
      if (!bt) continue
      step.branches.push({ id: vId(b.id, 'B'), text: bt, state: toState(b.state) })
    }
  }
  return step
}

function normalizeGlobals(raw) {
  const out = []
  if (Array.isArray(raw && raw.globals)) {
    for (const g of raw.globals) {
      const n = clean(g, 40)
      if (n && out.indexOf(n) < 0 && out.length < 12) out.push(n)
    }
  }
  return out
}

function normalizeState(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = { title: clean(src.title, 80) || '项目路线', note: clean(src.note, 300), panel: normPanel(src.panel), globals: normalizeGlobals(src), lanes: [] }
  if (Array.isArray(src.lanes)) {
    for (const l of src.lanes.slice(0, LIMITS.lanes)) {
      if (!l || typeof l !== 'object') continue
      const lane = { id: vId(l.id, 'L'), title: clean(l.title, 60) || '未命名阶段', steps: [] }
      if (Array.isArray(l.steps)) {
        for (const s of l.steps.slice(0, LIMITS.steps)) {
          const step = normStep(s)
          if (step) lane.steps.push(step)
        }
      }
      out.lanes.push(lane)
    }
  }
  if (!out.lanes.length) out.lanes.push(makeLane('主线'))
  return out
}

const fresh = () => Object.assign({ rev: 0 }, normalizeState({ title: '项目路线', note: '', lanes: [] }))
const stepTotal = (st) => { let n = 0; for (const l of st.lanes) n += l.steps.length; return n }
const parseObj = (content) => { try { const o = JSON.parse(content); return o && typeof o === 'object' ? o : null } catch (e) { return null } }
const fsMode = () => (!fsS.fs ? (fsS.ready ? 'no-fs' : 'init') : fsS.failed ? 'readonly' : 'file')

function canon() {
  const st = S
  return {
    rev: typeof st.rev === 'number' ? st.rev : 0,
    title: st.title, note: st.note, mode: fsMode(), abs: boardAbsOf(root || '.progress/roadmap.json'),
    file: fsMode() === 'file',
    globals: (st.globals || []).slice(),
    panel: { x: finite(st.panel.x, 0), y: finite(st.panel.y, 0), open: !!st.panel.open, w: finite(st.panel.w, 1280), h: finite(st.panel.h, 840) },
    lanes: st.lanes.map((l) => ({ id: l.id, title: l.title, steps: l.steps.map((s) => ({ id: s.id, text: s.text, state: s.state, skill: s.skill || '', branches: s.branches.map((b) => ({ id: b.id, text: b.text, state: b.state })) })) })),
  }
}

async function fsListDirEntries(fs, absPath) {
  try {
    const t = await fs.resolve(absPath)
    const entries = await fs.listDir(t)
    if (!Array.isArray(entries)) return []
    const out = []
    for (const e of entries) {
      const nm = e && typeof e.name === 'string' ? e.name : ''
      const tp = e && e.type ? e.type : 'file'
      const dp = e && e.target && typeof e.target.displayPath === 'string' ? e.target.displayPath : ''
      out.push({ name: nm, type: tp, path: dp })
    }
    return out
  } catch (e) { return [] }
}

async function readAbs(fs, absPath) {
  try { const t = await fs.resolve(absPath); return await fs.readText(t) } catch (e) { return null }
}

async function writeAbs(fs, absPath, content) {
  try { const t = await fs.resolve(absPath); await fs.writeText(t, content); return true } catch (e) { return false }
}

function parseSkillMeta(content) {
  let name = ''; let desc = ''
  const lines = typeof content === 'string' ? content.split(/\r?\n/) : []
  if (lines.length && lines[0].trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      const ln = lines[i]
      if (ln.trim() === '---') break
      const m = ln.match(/^([a-zA-Z]+):\s*(.*)$/)
      if (!m) continue
      if (m[1] === 'name' && !name) name = m[2].trim()
      else if (m[1] === 'description' && !desc) desc = m[2].trim()
    }
  }
  return { name, desc }
}

async function scanSkills(fs) {
  const out = []
  const seen = {}
  const bases = []
  if (root) bases.push(skillsAbsOf(root))
  for (const b of (CONFIG.presetSkillRoots || [])) bases.push(withSlash(b))
  for (const base of bases) {
    const entries = await fsListDirEntries(fs, base)
    for (const e of entries) {
      if (!e.name || e.name.charAt(0) === '.') continue
      const dirish = e.type === 'directory' || e.type === 'dir'
      if (dirish) {
        const skillFile = (e.path || (base + '/' + e.name)) + '/SKILL.md'
        const content = await readAbs(fs, skillFile)
        if (content === null) continue
        const meta = parseSkillMeta(content)
        if (meta.name && !seen[meta.name]) { seen[meta.name] = true; out.push({ name: meta.name, desc: meta.desc }) }
      } else if (e.name.endsWith('.md')) {
        const content = await readAbs(fs, e.path || (base + '/' + e.name))
        if (content === null) continue
        const meta = parseSkillMeta(content)
        if (meta.name && !seen[meta.name]) { seen[meta.name] = true; out.push({ name: meta.name, desc: meta.desc }) }
      }
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

async function discoverProjects(fs) {
  const list = []
  const roots = CONFIG.discoverRoots || []
  for (const rb of roots) {
    const entries = await fsListDirEntries(fs, rb)
    for (const e of entries) {
      if (!e.name || (e.type !== 'directory' && e.type !== 'dir') || e.name.charAt(0) === '.') continue
      const p = withSlash(e.path || (withSlash(rb) + '/' + e.name))
      const content = await readAbs(fs, p + '/.progress/roadmap.json')
      const obj = content ? parseObj(content) : null
      list.push({ root: p, name: e.name, has: !!(obj && stepTotal(normalizeState(obj)) > 0) })
      if (list.length >= 60) break
    }
    if (list.length >= 60) break
  }
  list.sort((a, b) => a.name.localeCompare(b.name))
  return { current: boardAbsOf(root || ''), list }
}

async function adoptRaw(content) {
  const obj = parseObj(content)
  if (!obj) return false
  const keepPanel = typeof obj.panel !== 'object'
  const next = normalizeState(obj)
  if (keepPanel && S) next.panel = S.panel
  S = { rev: (S ? S.rev : 0) + 1, ...next }
  fsS.lastRaw = content
  fsS.lastWriteRaw = content
  return true
}

async function loadBoard(fs) {
  S = fresh()
  fsS.lastRaw = fsS.lastWriteRaw = null
  if (!root) return false
  const content = await readAbs(fs, boardAbsOf(root))
  const obj = content ? parseObj(content) : null
  if (obj && stepTotal(normalizeState(obj)) > 0) { await adoptRaw(content); return true }
  const seedC = await readAbs(fs, withSlash(root) + '/.progress/roadmap.seed.json')
  const sobj = seedC ? parseObj(seedC) : null
  if (sobj && stepTotal(normalizeState(sobj)) > 0) { await adoptRaw(seedC); return true }
  return false
}

async function persist() {
  if (!fsS.fs || !root) return
  const json = JSON.stringify({ title: S.title, note: S.note, panel: S.panel, globals: S.globals || [], lanes: S.lanes }, null, 2)
  fsS.failed = !(await writeAbs(fsS.fs, boardAbsOf(root), json))
  if (!fsS.failed) { fsS.lastRaw = json; fsS.lastWriteRaw = json }
}

async function configPath(fs) {
  if (CONFIG.configFile) return CONFIG.configFile
  return null
}

async function resolveRoot(fs, ctx) {
  if (CONFIG.configFile) {
    const cfg = await readAbs(fs, CONFIG.configFile)
    const cobj = cfg ? parseObj(cfg) : null
    if (cobj && typeof cobj.root === 'string' && cobj.root.trim()) return withSlash(cobj.root)
  }
  if (CONFIG.defaultRoot) return withSlash(CONFIG.defaultRoot)
  try {
    const sp = ctx.get('sandboxPolicy')
    if (sp && typeof sp.workspaceRoot === 'string' && sp.workspaceRoot.trim()) return withSlash(sp.workspaceRoot)
  } catch (e) { /* fall through */ }
  return ''
}

async function setRootOf(fs, newRoot) {
  root = withSlash(newRoot)
  const loaded = await loadBoard(fs)
  await persist()
  if (CONFIG.configFile) await writeAbs(fs, CONFIG.configFile, JSON.stringify({ root }, null, 2))
  skillCache = null
  skillCacheAt = 0
  return loaded
}

async function poll() {
  if (!fsS.fs || !S || !root) return
  const content = await readAbs(fsS.fs, boardAbsOf(root))
  if (content === null || content === fsS.lastRaw) return
  fsS.lastRaw = content
  if (content === fsS.lastWriteRaw) return
  const obj = parseObj(content)
  if (obj && stepTotal(normalizeState(obj)) > 0) await adoptRaw(content)
}

async function mutate(args) {
  const a = args && typeof args === 'object' ? args : {}
  const op = typeof a.op === 'string' ? a.op : ''
  const id = typeof a.id === 'string' ? a.id : ''
  const laneId = typeof a.laneId === 'string' ? a.laneId : ''
  const text = typeof a.text === 'string' ? a.text : ''
  const skillArg = typeof a.skill === 'string' ? a.skill : ''
  const dirArg = a.dir === 'up' || a.dir === 'down' ? a.dir : ''
  const findLane = (lid) => S.lanes.find((l) => l.id === lid)
  const findStep = (sid) => { for (const l of S.lanes) { const s = l.steps.find((x) => x.id === sid); if (s) return s } return null }
  const findBranch = (bid) => { for (const l of S.lanes) for (const s of l.steps) { const b = s.branches.find((x) => x.id === bid); if (b) return b } return null }
  let changed = true
  if (op === 'title') { S.title = text.length > 80 ? text.slice(0, 80) : text }
  else if (op === 'note') { S.note = text.length > 300 ? text.slice(0, 300) : text }
  else if (op === 'global-add') { const t = clean(skillArg, 40); if (t && S.globals.indexOf(t) < 0 && S.globals.length < 12) S.globals.push(t); else changed = false }
  else if (op === 'global-remove') { const i = S.globals.indexOf(clean(skillArg, 40)); if (i >= 0) S.globals.splice(i, 1); else changed = false }
  else if (op === 'lane-add') { const t = clean(text, 60); if (t && S.lanes.length < LIMITS.lanes) S.lanes.push(makeLane(t)); else changed = false }
  else if (op === 'lane-remove') { const i = S.lanes.findIndex((l) => l.id === id); if (i >= 0) S.lanes.splice(i, 1); else changed = false }
  else if (op === 'lane-rename') { const l = findLane(id); if (l) l.title = clean(text, 60) || l.title; else changed = false }
  else if (op === 'step-add') { const l = findLane(laneId); const t = clean(text, 300); if (l && t && l.steps.length < LIMITS.steps) l.steps.push({ id: nid('S'), text: t, state: 'todo', skill: '', branches: [] }); else changed = false }
  else if (op === 'step-rename') { const s = findStep(id); if (s) s.text = clean(text, 300) || s.text; else changed = false }
  else if (op === 'step-skill') { const s = findStep(id); const sk = skillArg || text; if (s) s.skill = clean(sk, 40); else changed = false }
  else if (op === 'step-move') {
    let moved = false
    for (const l of S.lanes) {
      const i = l.steps.findIndex((x) => x.id === id)
      if (i < 0) continue
      const j = dirArg === 'up' ? i - 1 : i + 1
      if (j >= 0 && j < l.steps.length) { const t = l.steps[i]; l.steps[i] = l.steps[j]; l.steps[j] = t; moved = true }
      break
    }
    changed = moved
  }
  else if (op === 'step-remove') { let removed = false; for (const l of S.lanes) { const i = l.steps.findIndex((s) => s.id === id); if (i >= 0) { l.steps.splice(i, 1); removed = true; break } } changed = removed }
  else if (op === 'step-state') { const s = findStep(id); if (s) s.state = toState(a.state); else changed = false }
  else if (op === 'branch-add') { const s = findStep(id); const t = clean(text, 200); if (s && t && s.branches.length < LIMITS.branches) s.branches.push({ id: nid('B'), text: t, state: 'todo' }); else changed = false }
  else if (op === 'branch-rename') { const b = findBranch(id); if (b) b.text = clean(text, 200) || b.text; else changed = false }
  else if (op === 'branch-remove') { const b = findBranch(id); let removed = false; if (b) { for (const l of S.lanes) for (const s of l.steps) { const i = s.branches.findIndex((x) => x.id === id); if (i >= 0) { s.branches.splice(i, 1); removed = true; break } } } changed = removed }
  else if (op === 'branch-state') { const b = findBranch(id); if (b) b.state = toState(a.state); else changed = false }
  else if (op === 'panel') { S.panel = { x: fnum(a.x, finite(S.panel.x, 0)), y: fnum(a.y, finite(S.panel.y, 0)), open: fbool(a.open, S.panel.open), w: fnum(a.w, finite(S.panel.w, 1280)), h: fnum(a.h, finite(S.panel.h, 840)) } }
  else if (op === 'reset') { S = fresh() }
  else changed = false
  if (changed) { S.rev += 1; await persist() }
}

function toolResult(op) {
  const lines = []
  lines.push('全局技能：' + ((S.globals && S.globals.length) ? S.globals.join(', ') : '（无）'))
  for (const l of S.lanes) {
    lines.push('阶段「' + l.title + '」')
    for (const s of l.steps) {
      const g = s.state === 'done' ? '[x]' : s.state === 'doing' ? '[>]' : s.state === 'fix' ? '[~]' : s.state === 'blocked' ? '[!]' : '[ ]'
      lines.push('- ' + g + ' ' + s.text + (s.skill ? '（skill: ' + s.skill + '）' : '') + (s.branches.length ? '（分支 ' + s.branches.length + ' 条）' : ''))
      for (const b of s.branches) {
        const bg = b.state === 'done' ? '[x]' : b.state === 'fix' ? '[~]' : '[ ]'
        lines.push('    - ' + bg + ' ' + b.text)
      }
    }
  }
  return { op, rev: S.rev, title: S.title, note: S.note, mode: fsMode(), abs: boardAbsOf(root || '.progress/roadmap.json'), lanes: lines.join('\n') }
}

const renderTool = (args, value) => {
  const v = value && typeof value === 'object' ? value : {}
  const title = typeof v.title === 'string' && v.title ? v.title : '（未命名）'
  const head = (v.op === 'view' ? '当前项目路线「' : '已同步项目路线「') + title + '」' + (typeof v.note === 'string' && v.note ? '：' + v.note : '')
  return [{ type: 'text', text: head + '\n' + (typeof v.lanes === 'string' ? v.lanes : '（空）') }]
}

async function ensureLoaded(ctx) {
  if (S) return
  if (loadP) return loadP
  loadP = (async () => {
    if (!fsS.ready) {
      fsS.ready = true
      const fs = ctx.get('fs')
      if (!fs) { fsS.failed = true; return }
      fsS.fs = fs
      root = await resolveRoot(fs, ctx)
      if (!root) return
      const ok = await loadBoard(fs)
      if (!ok) { S = fresh(); S.rev = 1 }
    }
  })().finally(() => { loadP = null })
  return loadP
}

return {
  apply(ctx) {
    ctx.on('tools/result', async (exec) => {
      try {
        if (!exec || (exec.name !== 'write' && exec.name !== 'edit')) return
        const a = exec.arguments
        if (!a || typeof a !== 'object') return
        const p = normPath(a.file_path)
        if (p.indexOf('.progress/roadmap.json') < 0) return
        let ok = false
        if (exec.name === 'write' && typeof a.content === 'string') {
          ok = await adoptRaw(a.content)
        } else if (fsS.fs && root) {
          const c = await readAbs(fsS.fs, boardAbsOf(root))
          if (c !== null) ok = await adoptRaw(c)
        }
        if (ok) await persist()
      } catch (e) { console.error('progress board: mirror failed', e) }
    })
    ctx.effect(() => harness.handle('board.get', async () => { await ensureLoaded(ctx); await poll(); return canon() }))
    ctx.effect(() => harness.handle('board.mutate', async (args) => { await ensureLoaded(ctx); await mutate(args); return canon() }))
    ctx.effect(() => harness.handle('board.seed', async (args) => {
      await ensureLoaded(ctx)
      const content = args && typeof args.content === 'string' ? args.content : ''
      if (content && stepTotal(normalizeState(parseObj(content) || {})) > 0) { await adoptRaw(content); await persist() }
      return canon()
    }))
    ctx.effect(() => harness.handle('board.projects', async () => { await ensureLoaded(ctx); return await discoverProjects(fsS.fs) }))
    ctx.effect(() => harness.handle('board.setProject', async (args) => {
      await ensureLoaded(ctx)
      const r = args && typeof args.root === 'string' ? withSlash(args.root) : ''
      let loaded = false
      try { if (r) loaded = await setRootOf(fsS.fs, r) } catch (e) { /* keep state */ }
      if (!loaded && root) { S = fresh(); S.rev = (S ? S.rev : 0) + 1; await persist() }
      await poll()
      return canon()
    }))
    ctx.effect(() => harness.handle('board.skills', async () => {
      const now = Date.now()
      if (skillCache && now - skillCacheAt < 5000) return skillCache
      let out = []
      try { const fs = ctx.get('fs'); if (fs) { const arr = await scanSkills(fs); if (arr.length) out = arr } } catch (e) { /* none */ }
      skillCache = out
      skillCacheAt = now
      return out
    }))
    const def = harness.defineTool({
      name: 'project_progress',
      description: '查看或更新当前项目的“执行路线看板”。数据在 <项目根>/.progress/roadmap.json；<项目根>/.agents/skills 为该项目的技能库。AI 执行前先 view 读取（含用户改动、全局技能与步骤 skill 绑定），每步完成 replace 同步。顶层 globals 为全局技能；lanes=[{title, steps:[{text,state,skill?,branches:[{text,state}]}]}]；state∈todo/doing/done/fix/blocked；至多一条 doing；技能须存在否则如实说明；问题挂 fix 分支。',
      parameters: {
        op: { type: 'string', enum: ['view', 'replace', 'reset'], required: true, description: 'view=读当前路线；replace=整体替换（先 view 合并用户改动）；reset=清空' },
        title: { type: 'string', description: '路线图标题（仅 replace）' },
        note: { type: 'string', description: '当前状态/下一步（仅 replace）' },
        globals: { type: 'array', description: '全局技能名（仅 replace 时生效，省略保留现有）', items: { type: 'string' } },
        lanes: { type: 'array', description: '完整阶段数组（仅 replace）', items: { type: 'object', additionalProperties: false, properties: { title: { type: 'string', required: true }, steps: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string', required: true }, state: { type: 'string', enum: ['todo', 'doing', 'done', 'fix', 'blocked'], required: true }, skill: { type: 'string', description: '执行本步需加载的技能名' }, branches: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { text: { type: 'string', required: true }, state: { type: 'string', enum: ['todo', 'doing', 'done', 'fix', 'blocked'], required: true } } } } } } } } } },
      },
      output: { schema: { type: 'json' }, render: renderTool },
      execute: async (args) => {
        await ensureLoaded(ctx)
        const op = args && typeof args.op === 'string' ? args.op : 'view'
        if (op === 'replace') {
          if (args && typeof args.title === 'string') S.title = clean(args.title, 80) || S.title
          if (args && typeof args.note === 'string') S.note = clean(args.note, 300)
          if (Array.isArray(args && args.globals)) S.globals = normalizeGlobals(args)
          if (Array.isArray(args && args.lanes)) {
            const next = normalizeState({ title: S.title, note: S.note, globals: S.globals, lanes: args.lanes, panel: S.panel })
            next.panel = S.panel
            S = { rev: S.rev + 1, ...next }
            await persist()
          }
        } else if (op === 'reset') { S = fresh(); S.rev += 1; await persist() }
        return toolResult(op)
      },
    })
    ctx.effect(() => harness.registerTool(ctx, def))
  },
}
