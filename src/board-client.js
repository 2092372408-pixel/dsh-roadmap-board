/**
 * dsh-roadmap-board — Client half (v0.1).
 * Register via cordis_define as code.client (plain JavaScript, no JSX/TS).
 * Renders: title header, status bar (current doing step), legend with project
 * switcher, horizontal phase lanes with steps (skills on second line), and a
 * right "修复/完善" side panel. Polls board.get every ~1.5s for live sync.
 */
return {
  inject: ['timer'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const SEED_RAW = '{"title":"项目执行路线","note":"新项目看板：把目标拆成 阶段→步骤（可绑技能/调序/挂返工）","panel":{"x":0,"y":0,"open":true},"globals":[],"lanes":[{"id":"L0","title":"阶段1 · 起步","steps":[{"id":"S10","text":"明确目标与验收标准","state":"todo","skill":"","branches":[]},{"id":"S11","text":"拆分执行步骤","state":"todo","skill":"","branches":[]}]},{"id":"L1","title":"阶段2 · 执行","steps":[{"id":"S20","text":"逐条推进，状态实时点亮","state":"todo","skill":"","branches":[]}]},{"id":"L2","title":"阶段3 · 收尾","steps":[{"id":"S30","text":"复盘与记录","state":"todo","skill":"","branches":[]}]}]}'

    const h = React.createElement
    const ORDER = ['todo', 'doing', 'done', 'fix', 'blocked']
    const LANE_COLORS = ['#2563eb', '#7c3aed', '#0d9488', '#d97706', '#dc2626', '#0ea5e9', '#65a30d', '#9333ea']
    const STATE_COLOR = { todo: '#9aa3b5', doing: '#2563eb', done: '#1e8e4e', fix: '#d97706', blocked: '#d64545' }
    const STATE_G = { todo: '○', doing: '▶', done: '✓', fix: '↻', blocked: '⊘' }
    const STATE_T = { todo: '待办', doing: '进行中', done: '完成', fix: '修改中', blocked: '受阻' }
    const C = { txt: '#1f2430', mut: '#6a7282', soft: '#9aa3b5', line: '#d8dce6', line2: '#c2c9d6', card: '#ffffff', shadow: '0 8px 26px rgba(31,45,90,.16)', note: '#8a5b00', ok: '#1e8e4e', err: '#d64545', dim: '#aeb5c4', sideBg: '#f7f8fc' }
    const BOX = { background: C.card, color: C.txt, border: '1px solid ' + C.line, borderRadius: 14, fontSize: 13, fontFamily: 'system-ui, sans-serif', boxShadow: C.shadow }
    const btnIcon = { background: 'transparent', border: '1px solid transparent', color: C.mut, borderRadius: 6, cursor: 'pointer', fontSize: 15, padding: '0 8px', lineHeight: '26px' }
    const isStale = (s) => { const txt = String((s && s.title) || '') + ' ' + String((s && s.note) || ''); return /[（(]?v\d{1,2}[)）]?/.test(txt) || txt.indexOf('路线 v') >= 0 }
    const START_X = 16, PH_H = 38, PH_GAP = 20
    const LANE_PW = 232
    const STEP_W = 248, STEP_H = 48, STEP_H2 = 70, STEP_GAP = 14
    const ADDH = 30

    function buildFlow(snap) {
      const lanes = (snap && Array.isArray(snap.lanes)) ? snap.lanes : []
      const has = lanes.some((l) => (l.steps || []).length)
      const nodes = []; const edges = []; const branches = []; const laneSlots = []
      const topCy = 44
      let maxBottom = topCy + PH_H / 2 + 10
      let prevRight = 0
      let lastRight = 0
      let laneX = START_X
      lanes.forEach((lane, i) => {
        const color = LANE_COLORS[i % LANE_COLORS.length]
        const px = laneX
        laneX = px + LANE_PW + PH_GAP
        lastRight = px + LANE_PW
        const py = topCy - PH_H / 2
        const allTodo = (lane.steps || []).every((s) => s.state === 'todo') && (lane.steps || []).length > 0
        const btot = lane.steps.reduce((n, s) => n + (s.branches || []).length, 0)
        nodes.push({ id: lane.id, kind: 'lane', x: px, y: py, w: LANE_PW, h: PH_H, label: lane.title, color, branches: btot, delOk: allTodo })
        if (i > 0) edges.push({ d: 'M ' + prevRight + ' ' + topCy + ' L ' + px + ' ' + topCy, color, arrow: true })
        prevRight = px + LANE_PW
        const pBottom = py + PH_H
        const pMid = px + LANE_PW / 2
        let cursorY = pBottom + 26
        let prevBottom = null
        lane.steps.forEach((s, si) => {
          const hh = s.skill ? STEP_H2 : STEP_H
          const stepX = px + 6
          nodes.push({ id: s.id, kind: 'step', x: stepX, y: cursorY, w: STEP_W, h: hh, label: s.text, state: s.state, color: STATE_COLOR[s.state], bcnt: (s.branches || []).length, skill: s.skill || '' })
          if (si === 0) edges.push({ d: 'M ' + pMid + ' ' + pBottom + ' C ' + pMid + ' ' + (pBottom + 12) + ' ' + (stepX + STEP_W / 2) + ' ' + (cursorY - 12) + ' ' + (stepX + STEP_W / 2) + ' ' + cursorY, color })
          else edges.push({ d: 'M ' + (stepX + STEP_W / 2) + ' ' + prevBottom + ' L ' + (stepX + STEP_W / 2) + ' ' + cursorY, color: '#a7b0c0', down: true })
          prevBottom = cursorY + hh
          cursorY += hh + STEP_GAP
          for (const b of (s.branches || [])) branches.push({ id: b.id, text: b.text, state: b.state, color: STATE_COLOR[b.state], step: s.text, stepId: s.id })
        })
        laneSlots.push({ id: lane.id, x: px + 6, y: cursorY - STEP_GAP + 2, w: STEP_W, color })
        maxBottom = Math.max(maxBottom, cursorY + ADDH + 8)
      })
      if (!has) return { totalW: START_X + 60, totalH: maxBottom, edges, nodes, branches, laneSlots }
      return { totalW: Math.max(lastRight + 10, 260), totalH: maxBottom + 12, edges, nodes, branches, laneSlots }
    }

    function Board() {
      const [snap, setSnap] = React.useState(null)
      const [open, setOpen] = React.useState(true)
      const [edit, setEdit] = React.useState(false)
      const [editingId, setEditingId] = React.useState(null)
      const [editText, setEditText] = React.useState('')
      const [skillEditId, setSkillEditId] = React.useState(null)
      const [skillSel, setSkillSel] = React.useState('')
      const [gSel, setGSel] = React.useState('')
      const [skillOpts, setSkillOpts] = React.useState([])
      const [projects, setProjects] = React.useState(null)
      const [customOpen, setCustomOpen] = React.useState(false)
      const [customRoot, setCustomRoot] = React.useState('')
      const [addFor, setAddFor] = React.useState(null)
      const [addText, setAddText] = React.useState('')
      const [newLane, setNewLane] = React.useState('')
      const [pillPos, setPillPos] = React.useState(null)
      const [pDrag, setPDrag] = React.useState(null)
      const [rsz, setRsz] = React.useState(null)
      const [size, setSize] = React.useState(null)
      const [err, setErr] = React.useState('')
      const seenSteps = { n: -1 }

      const stepCount = (s) => { if (!s || !Array.isArray(s.lanes)) return 0; let n = 0; for (const l of s.lanes) n += (l.steps || []).length; return n }
      const findDoing = (s) => { if (!s || !Array.isArray(s.lanes)) return null; for (const l of s.lanes) for (const st of (l.steps || [])) if (st.state === 'doing') return st; return null }
      const applySnap = (s) => {
        if (!(s && typeof s === 'object' && typeof s.rev === 'number')) return
        setSnap(s); setErr('')
        if (stepCount(s) === 0 && seenSteps.n > 0) { host.call('board.seed', { content: SEED_RAW }).then(applySnap).catch(() => {}) }
        seenSteps.n = stepCount(s)
      }
      const call = (payload) => host.call('board.mutate', payload).then(applySnap).catch(() => setErr('保存失败'))
      const refresh = () => host.call('board.get', {}).then(applySnap).catch(() => setErr('连接失败'))
      const seedIfNeeded = (s) => { if (!s || stepCount(s) === 0 || isStale(s)) return host.call('board.seed', { content: SEED_RAW }).then(applySnap).catch(() => {}) ; return Promise.resolve() }
      const fetchProjects = () => { host.call('board.projects', {}).then((p) => { if (p && Array.isArray(p.list)) setProjects(p) }).catch(() => {}) }
      const fetchSkills = () => { host.call('board.skills', {}).then((arr) => { if (Array.isArray(arr)) setSkillOpts(arr) }).catch(() => {}) }
      const skillDesc = (v) => { const k = skillOpts.find((x) => x.name === (v || '')); return k ? (k.desc || '') : '' }

      React.useEffect(() => { host.call('board.get', {}).then((s) => { if (s && typeof s === 'object' && typeof s.rev === 'number') seedIfNeeded(s) }).catch(() => setErr('连接失败')); fetchSkills(); fetchProjects() }, [])
      React.useEffect(() => {
        let alive = true; let cur = null
        const tick = () => { if (!alive) return; refresh().then(() => { if (alive) cur = ctx.timeout(tick, 1500) }).catch(() => { if (alive) cur = ctx.timeout(tick, 1500) }) }
        cur = ctx.timeout(tick, 700)
        return () => { alive = false; if (cur) cur() }
      }, [])

      const panel = (snap && snap.panel) || { x: 0, y: 0, open: true, w: 1280, h: 840 }
      const isOpen = open && panel.open
      const iw = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1600
      const ih = (typeof window !== 'undefined' && window.innerHeight) ? window.innerHeight : 900
      const w = Math.min(size ? size.w : (panel.w || 1280), iw - 24)
      const hh = Math.min(size ? size.h : (panel.h || 840), ih - 56)
      const title = (snap && snap.title) || '执行路线图'
      const rootName = (snap && snap.abs) ? String(snap.abs).replace(/\\/g, '/').replace(/\.progress\/roadmap\.json$/, '').split('/').filter(Boolean).pop() || snap.abs : (projects ? projects.current : '')
      const fileMode = (snap && snap.mode) || 'init'
      const flow = snap ? buildFlow(snap) : null
      const branchList = flow ? flow.branches : []
      const doing = snap ? findDoing(snap) : null
      const globals = (snap && Array.isArray(snap.globals)) ? snap.globals : []
      const anchor = pillPos || { x: Math.max(12, Math.round(iw / 2 - 160)), y: Math.max(12, ih - 150) }

      const pStart = (e) => { if (e.button !== 0) return; try { e.currentTarget.setPointerCapture(e.pointerId) } catch (ign) {}; const r = e.currentTarget.getBoundingClientRect(); setPDrag({ sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false }) }
      const pMove = (e) => {
        if (!pDrag) return
        const dx = e.clientX - pDrag.sx; const dy = e.clientY - pDrag.sy
        if (!pDrag.moved && Math.abs(dx) + Math.abs(dy) > 6) setPDrag(Object.assign({}, pDrag, { moved: true }))
        if (pDrag.moved) setPillPos({ x: Math.max(0, Math.round(pDrag.ox + dx)), y: Math.max(0, Math.round(pDrag.oy + dy)) })
      }
      const pUp = (e) => {
        if (!pDrag) return
        const moved = pDrag.moved
        setPDrag(null)
        if (!moved) { setOpen(true); call({ op: 'panel', open: true }) }
      }
      const rszStart = (e, mode) => { if (e.button !== 0) return; e.stopPropagation(); try { e.currentTarget.setPointerCapture(e.pointerId) } catch (ign) {}; setRsz({ mode, sx: e.clientX, sy: e.clientY, w, h: hh }) }
      const rszMove = (e) => { if (!rsz) return; let nw = rsz.w, nh = rsz.h; if (rsz.mode.indexOf('e') >= 0) nw = Math.max(780, rsz.w + e.clientX - rsz.sx); if (rsz.mode.indexOf('s') >= 0) nh = Math.max(420, rsz.h + e.clientY - rsz.sy); setSize({ w: Math.round(nw), h: Math.round(nh) }) }
      const rszEnd = (e) => { if (!rsz) return; let nw = rsz.w, nh = rsz.h; if (rsz.mode.indexOf('e') >= 0) nw = Math.max(780, rsz.w + e.clientX - rsz.sx); if (rsz.mode.indexOf('s') >= 0) nh = Math.max(420, rsz.h + e.clientY - rsz.sy); setRsz(null); setSize({ w: Math.round(nw), h: Math.round(nh) }); call({ op: 'panel', w: Math.round(nw), h: Math.round(nh) }) }
      const zone = (mode, zStyle, cursor) => h('div', { style: Object.assign({ position: 'absolute', zIndex: 5 }, zStyle, { cursor, touchAction: 'none' }), onPointerDown: (e) => rszStart(e, mode), onPointerMove: rszMove, onPointerUp: rszEnd })

      const beginEdit = (n) => { setEditingId(n.id); setEditText(n.label) }
      const commitEdit = (kind) => { const v = editText.trim(); const id = editingId; setEditingId(null); setEditText(''); if (v && id) call({ op: kind === 'lane' ? 'lane-rename' : 'step-rename', id, text: v }) }
      const commitSkill = () => { const v = skillSel; const id = skillEditId; setSkillEditId(null); setSkillSel(''); if (id) call({ op: 'step-skill', id, skill: v }) }
      const addGlobal = () => { const v = gSel; if (v) { call({ op: 'global-add', skill: v }); setGSel('') } }
      const moveStep = (id, dir) => call({ op: 'step-move', id, dir })
      const switchProject = (root) => { host.call('board.setProject', { root }).then((s) => { if (s && typeof s === 'object' && typeof s.rev === 'number') { setSnap(s); setErr(''); fetchProjects(); fetchSkills(); setCustomOpen(false) } else { setErr('项目为空或不可读，可手动新建') } }).catch(() => setErr('切换失败：无法读取该目录')) }
      const miniBtn = (txt, titleText, fn, color, bg) => h('button', { style: { background: bg || 'transparent', border: 'none', color: color || C.mut, cursor: 'pointer', fontSize: 12, padding: '0 3px', flex: 'none', lineHeight: '14px' }, title: titleText, onClick: (e) => { e.stopPropagation(); fn() } }, txt)
      const chip = (txt, titleText, bg, fg, bd) => h('span', { style: { flex: 'none', fontSize: 10, color: fg, background: bg, border: '1px solid ' + bd, borderRadius: 999, padding: '0 5px', fontWeight: 600, lineHeight: '15px', maxWidth: 148, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: titleText }, txt)

      if (!isOpen) {
        return h('button', {
          style: { position: 'fixed', left: anchor.x, top: anchor.y, width: 'max-content', maxWidth: '70vw', zIndex: 2147483000, background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: 999, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'grab', boxShadow: '0 6px 20px rgba(37,99,235,.30)', fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', touchAction: 'none', userSelect: 'none' },
          onPointerDown: pStart, onPointerMove: pMove, onPointerUp: pUp,
          title: '拖动移动；点击展开执行路线图',
        }, '📋 ' + title + ' ›')
      }

      const head = h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid ' + C.line, background: '#eff6ff', borderTopLeftRadius: 14, borderTopRightRadius: 14 } },
        h('div', { style: { flex: 1, minWidth: 0 } },
          h('div', { style: { fontWeight: 800, fontSize: 17, color: '#1e3a8a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, title }, title + (edit ? ' · 编辑中' : doing ? ' · 执行中' : '')),
          h('div', { style: { fontSize: 11, color: C.mut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, '项目：' + (rootName || '…') + ' · 阶段 → 步骤 → 返工侧栏'),
        ),
        h('button', { style: btnIcon, title: '编辑模式', onClick: () => { const nx = !edit; setEdit(nx); setEditingId(null); setAddFor(null); setSkillEditId(null); if (nx) { fetchSkills(); fetchProjects() } } }, edit ? '✓ 完成' : '✎ 编辑'),
        h('button', { style: btnIcon, title: '刷新', onClick: refresh }, '↻'),
        h('button', { style: btnIcon, title: '收起为胶囊', onClick: () => call({ op: 'panel', open: false }) }, '—'),
      )

      const statusBar = h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '5px 14px', fontSize: 12, borderBottom: '1px solid ' + C.line, background: doing ? '#eff6ff' : '#fbfcfe', flexWrap: 'wrap' } },
        doing
          ? h('span', { style: { color: '#2563eb', fontWeight: 600 } }, '▶ 当前执行：' + doing.text)
          : h('span', { style: { color: C.mut } }, '⏳ ' + ((snap && snap.note) || '暂无进行中步骤')),
        globals.length ? h('span', { style: { marginLeft: 'auto', color: C.mut, fontSize: 11 } }, '全局技能：' + globals.join('、')) : null,
      )

      const globalsBar = edit ? h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderBottom: '1px solid ' + C.line, background: '#fbfcfe', flexWrap: 'wrap', fontSize: 11 } },
        h('span', { style: { color: C.mut } }, '全局技能：'),
        globals.map((g) => h('span', { key: g, style: { display: 'inline-flex', alignItems: 'center', gap: 2, background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 999, padding: '0 4px 0 7px' } }, '⚙' + g, miniBtn('✕', '移除', () => call({ op: 'global-remove', skill: g })))),
        h('select', { style: { background: '#fff', border: '1px solid ' + C.line2, borderRadius: 6, fontSize: 11, padding: '2px 4px', color: C.txt }, value: gSel, onChange: (e) => setGSel(e.target.value) },
          h('option', { value: '' }, '＋ 添加全局技能…'),
          skillOpts.filter((k) => globals.indexOf(k.name) < 0).map((k) => h('option', { key: k.name, value: k.name }, k.name)),
        ),
        gSel ? h('button', { style: { border: 'none', background: '#1d4ed8', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '2px 8px' }, onClick: addGlobal }, '添加') : null,
      ) : null

      const legend = h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '5px 14px', fontSize: 12, color: C.mut, borderBottom: '1px solid ' + C.line, flexWrap: 'wrap', background: '#fbfcfe' } },
        ORDER.map((k) => h('span', { key: k, style: { color: STATE_COLOR[k] } }, STATE_G[k] + ' ' + STATE_T[k])),
        h('span', { style: { marginLeft: 'auto', color: C.dim, fontSize: 11 } }, '项目：'),
        customOpen
          ? h('span', { style: { display: 'inline-flex', gap: 4, alignItems: 'center' } },
              h('input', { style: { width: 240, background: '#fff', border: '1px solid ' + C.line2, borderRadius: 6, padding: '2px 6px', fontSize: 11, fontFamily: 'inherit' }, placeholder: '项目根目录，如 /path/to/project', value: customRoot, autoFocus: true, onChange: (e) => setCustomRoot(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') switchProject(customRoot.trim()) } }),
              h('button', { style: { border: 'none', background: '#1d4ed8', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }, onClick: () => switchProject(customRoot.trim()) }, '打开'),
              h('button', { style: { border: '1px solid ' + C.line2, background: '#fff', color: C.mut, borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 8px' }, onClick: () => setCustomOpen(false) }, '取消'),
            )
          : h('select', { style: { background: '#fff', border: '1px solid ' + C.line2, borderRadius: 6, fontSize: 11, padding: '2px 6px', color: C.txt, maxWidth: 260 }, title: '切换项目看板', value: '', onChange: (e) => { const v = e.target.value; if (v === '__custom__') { setCustomOpen(true); setCustomRoot('') } else if (v) switchProject(v) } },
              h('option', { value: '' }, rootName || '…'),
              (projects && Array.isArray(projects.list) ? projects.list : []).filter((p) => p.root !== (snap && snap.abs)).map((p) => h('option', { key: p.root, value: p.root }, (p.has ? '' : '（空）') + p.name)),
              h('option', { value: '__custom__' }, '＋ 手动输入项目路径…'),
            ),
      )

      const edgeEls = (flow ? flow.edges : []).map((e, i) => h('g', { key: 'e' + i },
        h('path', { d: e.d, fill: 'none', stroke: e.color, strokeWidth: 1.8, strokeLinecap: 'round', opacity: 0.8 }),
        e.arrow ? h('path', { d: arrowHead(e.d, 0), fill: e.color }) : null,
        e.down ? h('path', { d: arrowHead(e.d, 1), fill: '#a7b0c0' }) : null,
      ))
      const nodeEls = (flow ? flow.nodes : []).map((n) => {
        const kind = n.kind
        const color = n.color
        const label = n.label
        const fs = 14
        const isEditing = editingId === n.id
        const canEdit = edit && (kind === 'lane' ? n.delOk : n.state !== 'done')
        const hasSkill = kind === 'step' && !!n.skill
        const body = isEditing
          ? h('input', { style: { flex: 1, minWidth: 0, border: '1px solid ' + color, borderRadius: 6, padding: '2px 5px', fontSize: fs - 1, fontFamily: 'inherit', boxSizing: 'border-box' }, value: editText, autoFocus: true, onChange: (e) => setEditText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') commitEdit(kind); if (e.key === 'Escape') setEditingId(null) }, onBlur: () => commitEdit(kind) })
          : h('span', { style: { flex: 1, minWidth: 0, overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '17px', textAlign: kind === 'lane' ? 'center' : 'left' } }, label)
        const orderBtns = [miniBtn('▲', '上移', () => moveStep(n.id, 'up'), '#64748b'), miniBtn('▼', '下移', () => moveStep(n.id, 'down'), '#64748b')]
        let inner = null
        if (hasSkill) {
          const row2 = []
          row2.push(h('span', { style: { flex: '0 1 auto', minWidth: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: '#1d4ed8', fontWeight: 700 }, title: skillDesc(n.skill) || '执行本步前加载技能 ' + n.skill }, '⚙ ' + n.skill))
          if (canEdit && !isEditing) {
            row2.push(miniBtn('▲', '上移', () => moveStep(n.id, 'up'), '#64748b'))
            row2.push(miniBtn('▼', '下移', () => moveStep(n.id, 'down'), '#64748b'))
            row2.push(miniBtn('✎', '重命名', () => beginEdit(n)))
            row2.push(miniBtn('⚙', '已绑定技能 ' + n.skill + '（点击更换）', () => { fetchSkills(); setSkillEditId(n.id); setSkillSel(n.skill || '') }, '#1d4ed8', '#bfdbfe'))
            row2.push(miniBtn('✕', '删除', () => call({ op: 'step-remove', id: n.id })))
          }
          inner = h('div', { style: { width: n.w - 2, height: n.h - 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '2px 8px', boxSizing: 'border-box', overflow: 'hidden', background: '#eff6ff', border: '1px solid #93c5fd', borderLeft: '3px solid #2563eb', borderRadius: 10, fontSize: fs, color: C.txt } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, width: '100%' } },
              h('span', { style: { color, fontSize: fs - 1, flex: 'none' } }, STATE_G[n.state] + ' '),
              body,
              (n.bcnt && !isEditing) ? chip('↻' + n.bcnt, '返工/完善 ' + n.bcnt + ' 条', '#fef3c7', '#b45309', '#fde68a') : null,
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 3, width: '100%', minWidth: 0 } }, row2),
          )
        } else {
          const kids = []
          if (kind === 'step') kids.push(h('span', { style: { color, fontSize: fs - 1, flex: 'none' } }, STATE_G[n.state] + ' '))
          kids.push(body)
          if (kind === 'lane' && n.branches) kids.push(h('span', { style: { flex: 'none', fontSize: 10, color: C.mut } }, '(' + n.branches + ')'))
          if (kind === 'step' && n.bcnt && !isEditing) kids.push(chip('↻' + n.bcnt, '返工/完善 ' + n.bcnt + ' 条（见右侧栏）', '#fef3c7', '#b45309', '#fde68a'))
          if (canEdit && !isEditing) {
            if (kind === 'step') kids.push.apply(kids, orderBtns)
            kids.push(miniBtn('✎', '重命名', () => beginEdit(n)))
            if (kind === 'step') kids.push(miniBtn('⚙', '绑定技能', () => { fetchSkills(); setSkillEditId(n.id); setSkillSel(n.skill || '') }, '#1d4ed8', 'transparent'))
            kids.push(miniBtn('✕', '删除', () => call({ op: kind === 'lane' ? 'lane-remove' : 'step-remove', id: n.id })))
          }
          inner = h('div', { style: { width: n.w - 2, height: n.h - 2, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', boxSizing: 'border-box', overflow: 'hidden', background: kind === 'lane' ? '#f3f5fb' : '#ffffff', border: '1px solid ' + color, borderLeft: '3px solid ' + color, borderRadius: 10, fontSize: fs, fontWeight: kind === 'lane' ? 700 : 400, color: C.txt, flexDirection: 'row', justifyContent: 'center' } }, kids)
        }
        return h('foreignObject', { key: n.id, x: n.x, y: n.y, width: n.w, height: n.h }, h('div', { style: { width: '100%', height: '100%' }, title: label + (n.state ? '（' + STATE_T[n.state] + '）' : '') + (n.skill ? '；技能：' + n.skill : '') }, inner))
      })

      const skillEls = edit && flow ? flow.nodes.filter((n) => n.kind === 'step' && skillEditId === n.id).map((n) => {
        return h('foreignObject', { key: 'sk' + n.id, x: n.x, y: n.y + n.h + 2, width: n.w, height: 30 },
          h('div', { style: { display: 'flex', gap: 4, alignItems: 'center', width: n.w, height: 28 } },
            h('select', { style: { flex: 1, minWidth: 0, background: '#fff', border: '1px solid #93c5fd', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit', color: C.txt }, value: skillSel, autoFocus: true, onChange: (e) => setSkillSel(e.target.value) },
              h('option', { value: '' }, '（不绑定技能）'),
              skillOpts.map((k) => h('option', { key: k.name, value: k.name }, k.name)),
            ),
            h('button', { style: { border: 'none', background: '#1d4ed8', color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 7px' }, onClick: commitSkill }, '绑定'),
            h('button', { style: { border: '1px solid ' + C.line2, background: '#fff', color: C.mut, borderRadius: 6, cursor: 'pointer', fontSize: 11, padding: '3px 7px' }, onClick: () => { call({ op: 'step-skill', id: n.id, skill: '' }); setSkillEditId(null); setSkillSel('') } }, '清除'),
          ))
      }) : []

      const addEls = edit && flow ? flow.laneSlots.map((ls) => {
        if (addFor === ls.id) {
          const commit = () => { const v = addText.trim(); setAddFor(null); setAddText(''); if (v) call({ op: 'step-add', laneId: ls.id, text: v }) }
          return h('foreignObject', { key: 'add' + ls.id, x: ls.x, y: ls.y, width: ls.w, height: ADDH }, h('div', { style: { display: 'flex', gap: 4, alignItems: 'center', width: ls.w, height: ADDH } },
            h('input', { style: { flex: 1, minWidth: 0, background: '#fff', border: '1px dashed ' + ls.color, borderRadius: 8, padding: '3px 7px', fontSize: 12, fontFamily: 'inherit' }, placeholder: '新步骤内容…', value: addText, autoFocus: true, onChange: (e) => setAddText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAddFor(null) } }),
            h('button', { style: { border: 'none', background: ls.color, color: '#fff', borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '3px 8px' }, onClick: commit }, '加'),
          ))
        }
        return h('foreignObject', { key: 'add' + ls.id, x: ls.x, y: ls.y, width: ls.w, height: ADDH }, h('div', { style: { width: ls.w - 4, height: ADDH - 4, border: '1px dashed ' + ls.color, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ls.color, fontSize: 12, cursor: 'pointer', background: 'rgba(255,255,255,.4)' }, onClick: () => { setAddFor(ls.id); setAddText('') } }, '+ 添加步骤'))
      }) : []

      const sideEl = branchList.length ? h('div', { style: { width: 236, flex: 'none', borderLeft: '1px solid ' + C.line, background: C.sideBg, display: 'flex', flexDirection: 'column', overflow: 'hidden' } },
        h('div', { style: { padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#1f2430', borderBottom: '1px solid ' + C.line } }, '修复 / 完善（' + branchList.length + '）'),
        h('div', { style: { flex: 1, overflowY: 'auto', padding: '6px 10px' } }, branchList.map((b) => h('div', { key: b.id, style: { marginBottom: 8 } },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 5, fontSize: 12, color: '#4a5160', overflowWrap: 'break-word', wordBreak: 'break-word' } },
            h('span', { style: { color: b.color, flex: 'none' } }, STATE_G[b.state]),
            h('span', { style: { flex: 1 } }, b.text),
            edit ? miniBtn('✕', '删除', () => call({ op: 'branch-remove', id: b.id })) : null,
          ),
          h('div', { style: { margin: '3px 0 0 17px', fontSize: 10, color: C.dim, overflowWrap: 'break-word', wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, '所属：' + b.step),
        ))),
      ) : null

      const foot = h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderTop: '1px solid ' + C.line, background: '#fbfcfe', minHeight: 20 } },
        h('span', { style: { fontSize: 12, color: fileMode === 'file' ? C.ok : C.note } }, fileMode === 'file' ? '● 已同步（看板 ↔ 智能体共享）' : '○ 仅当前会话'),
        edit ? h('input', { style: { flex: 1, minWidth: 60, background: '#fff', border: '1px solid ' + C.line2, borderRadius: 6, padding: '2px 8px', fontSize: 12, fontFamily: 'inherit' }, placeholder: '新增阶段名…', value: newLane, onChange: (e) => setNewLane(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') { const v = newLane.trim(); if (v) { call({ op: 'lane-add', text: v }); setNewLane('') } } } }) : null,
        edit ? h('button', { style: btnIcon, onClick: () => { const v = newLane.trim(); if (v) { call({ op: 'lane-add', text: v }); setNewLane('') } } }, '＋ 阶段') : null,
        h('span', { style: { fontSize: 11, color: C.dim, marginLeft: 'auto' } }, '右下角缩放 · 收起回到胶囊'),
      )

      const bodyRow = h('div', { style: { flex: 1, display: 'flex', minHeight: 0 } },
        h('div', { style: { flex: 1, overflow: 'auto', padding: 8, background: '#fbfcfe' } },
          flow ? h('svg', { width: flow.totalW, height: flow.totalH, style: { display: 'block' } }, edgeEls.concat(nodeEls).concat(skillEls).concat(addEls)) : h('div', { style: { color: C.mut, fontSize: 13, padding: 8 } }, '（暂无路线）'),
        ),
        sideEl,
      )

      const rz = {
        right: zone('e', { right: -1, top: 0, bottom: 24, width: 8 }, 'ew-resize'),
        bottom: zone('s', { left: 0, right: 24, bottom: -1, height: 8 }, 'ns-resize'),
        corner: zone('se', { right: -3, bottom: -3, width: 28, height: 28 }, 'nwse-resize'),
      }
      const sizeLabel = rsz ? h('div', { style: { position: 'absolute', bottom: 32, right: 15, background: 'rgba(255,255,255,.95)', border: '1px solid ' + C.line2, color: C.mut, borderRadius: 6, padding: '2px 8px', fontSize: 11, pointerEvents: 'none' } }, w + ' × ' + hh) : null

      return h('div', { style: Object.assign({}, BOX, { position: 'fixed', left: '50%', top: '50%', margin: 0, transform: 'translate(-50%, -50%)', width: w, maxWidth: 'calc(100vw - 24px)', height: hh, maxHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 2147483000 }) },
        head, statusBar, globalsBar, legend,
        err ? h('div', { style: { color: C.err, fontSize: 12, padding: '4px 14px' } }, err) : null,
        bodyRow, foot,
        rz.corner, rz.right, rz.bottom, sizeLabel,
      )
    }

    function arrowHead(d, dir) {
      const m = d.match(/L (\S+) (\S+)/)
      if (!m) return 'M0 0'
      const x = parseFloat(m[1]); const y = parseFloat(m[2])
      if (dir === 1) return 'M ' + x + ' ' + y + ' L ' + (x - 4.5) + ' ' + (y - 8) + ' L ' + (x + 4.5) + ' ' + (y - 8) + ' Z'
      return 'M ' + x + ' ' + y + ' L ' + (x - 8) + ' ' + (y - 4.5) + ' L ' + (x - 8) + ' ' + (y + 4.5) + ' Z'
    }

    slots.inject('shell.overlay', () => slots.register(
      { name: 'shell.overlay', id: 'project-progress' },
      () => React.createElement(Board),
    ))
  },
}
