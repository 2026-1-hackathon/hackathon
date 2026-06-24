import { useState } from "react";
import "./Analyze.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const STEPS = ["프로젝트 정보", "역할 설정", "팀원 입력", "분석 결과"];
const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

// ── 계산 로직 ────────────────────────────────────────────────────

function assignRoles(roles, members, weights) {
  const maxHours = Math.max(...members.map((m) => m.weeklyHours), 1);
  const entries = [];
  members.forEach((m, mi) => {
    roles.forEach((r, ri) => {
      const fitness =
        ((m.skills[r.name] ?? 0) / 5) * weights.skill +
        (m.weeklyHours / maxHours) * weights.time +
        (m.preferredRole === r.name ? 1 : 0) * weights.preference;
      entries.push({ mi, ri, fitness });
    });
  });
  entries.sort((a, b) => b.fitness - a.fitness);
  const memberDone = new Array(members.length).fill(false);
  const roleCount = new Array(roles.length).fill(0);
  const result = [];
  for (const e of entries) {
    if (memberDone[e.mi]) continue;
    if (roleCount[e.ri] >= roles[e.ri].requiredCount) continue;
    memberDone[e.mi] = true;
    roleCount[e.ri]++;
    result.push({ member: members[e.mi].name, role: roles[e.ri].name, score: Math.round(e.fitness * 100) });
  }
  return result;
}

function analyzeRisks(assignments, roles, members, deadline) {
  const skillGaps = [];
  const workloads = {};
  for (const a of assignments) {
    const role = roles.find((r) => r.name === a.role);
    const member = members.find((m) => m.name === a.member);
    if (!role || !member) continue;
    const sk = member.skills[a.role] ?? 0;
    if (sk < role.requiredSkill) skillGaps.push(`${a.member} → ${a.role} (역량 ${sk}/${role.requiredSkill})`);
    workloads[a.member] = role.workload;
  }
  const mismatches = assignments
    .filter((a) => {
      const m = members.find((m) => m.name === a.member);
      return m?.preferredRole && m.preferredRole !== a.role;
    })
    .map((a) => {
      const m = members.find((m) => m.name === a.member);
      return `${a.member} (선호: ${m.preferredRole} → 배정: ${a.role})`;
    });
  const total = Object.values(workloads).reduce((s, v) => s + v, 0);
  let topMember = null, topPct = 0;
  for (const [name, wl] of Object.entries(workloads)) {
    const p = total > 0 ? (wl / total) * 100 : 0;
    if (p > topPct) { topPct = p; topMember = name; }
  }
  const weeks = deadline ? Math.max((new Date(deadline) - new Date()) / 604800000, 0.1) : 2;
  const capacity = members.reduce((s, m) => s + m.weeklyHours, 0) * weeks;
  const required = roles.reduce((s, r) => s + r.workload * r.requiredCount, 0);
  const shortage = required - capacity;
  const riskScore = skillGaps.length + mismatches.length + (topPct > 50 ? 1 : 0) + (shortage > 0 ? 2 : 0);
  return {
    skillGaps, mismatches,
    concentrated: topPct > 50, topMember, topPct: Math.round(topPct),
    short: shortage > 0, shortageH: Math.max(shortage, 0),
    riskScore, riskLevel: riskScore <= 2 ? "낮음" : riskScore <= 4 ? "보통" : "높음",
  };
}

function buildPrompt(projectName, assignments, r) {
  let p = `팀 프로젝트 분석 결과야. 팀장이 이해하기 쉽게 핵심 리스크와 개선 방안을 3~5문장으로 설명해줘. 한국어로.\n`;
  p += `프로젝트: ${projectName}\n역할 배정: ${assignments.map((a) => `${a.member}→${a.role}(${a.score}점)`).join(", ")}\n`;
  if (r.skillGaps.length) p += `역량 부족: ${r.skillGaps.join(", ")}\n`;
  if (r.mismatches.length) p += `선호 불일치: ${r.mismatches.join(", ")}\n`;
  if (r.concentrated) p += `업무 집중: ${r.topMember} (${r.topPct}%)\n`;
  if (r.short) p += `일정 부족: ${Math.round(r.shortageH)}시간\n`;
  return p;
}

// ── 공용 컴포넌트 ────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" className={`star ${n <= value ? "on" : ""}`} onClick={() => onChange(n)}>
          ★
        </button>
      ))}
    </div>
  );
}

function StepBar({ current }) {
  return (
    <div className="stepbar">
      {STEPS.map((label, i) => {
        const n = i + 1;
        return (
          <div key={n} className="stepbar-item">
            <div className={`stepbar-circle ${n < current ? "done" : n === current ? "active" : ""}`}>
              {n < current ? "✓" : n}
            </div>
            <div className={`stepbar-label ${n === current ? "active" : ""}`}>{label}</div>
            {i < STEPS.length - 1 && <div className={`stepbar-line ${n < current ? "done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────
function Step1({ project, setProject, onNext }) {
  const w = project.weights;
  const total = (w.skill + w.time + w.preference) || 1;
  const setW = (k, v) => setProject((p) => ({ ...p, weights: { ...p.weights, [k]: Number(v) || 1 } }));

  return (
    <div className="az-card">
      <div className="az-card-head">
        <div className="az-card-emoji">📌</div>
        <div>
          <h2 className="az-card-title">어떤 팀플인가요?</h2>
          <p className="az-card-desc">기본 정보와 역할 배정 시 우선순위를 설정합니다</p>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">프로젝트명</label>
          <input className="field-input" type="text" value={project.name}
            onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
            placeholder="예: 캡스톤 디자인 2팀" />
        </div>
        <div className="field">
          <label className="field-label">마감일</label>
          <input className="field-input" type="date" value={project.deadline}
            onChange={(e) => setProject((p) => ({ ...p, deadline: e.target.value }))} />
        </div>
      </div>

      <div className="weight-section">
        <label className="field-label">역할 배정 우선순위 <span className="hint">(슬라이더로 조정 · 자동 정규화)</span></label>
        <div className="weight-cards">
          {[
            { key: "skill", label: "역량", emoji: "🎯", val: w.skill },
            { key: "time", label: "가능 시간", emoji: "⏰", val: w.time },
            { key: "preference", label: "선호도", emoji: "💙", val: w.preference },
          ].map(({ key, label, emoji, val }) => (
            <div key={key} className="weight-card">
              <div className="weight-card-top">
                <span>{emoji} {label}</span>
                <span className="weight-pct">{Math.round((val / total) * 100)}%</span>
              </div>
              <input type="range" min={1} max={10} value={val} onChange={(e) => setW(key, e.target.value)} />
              <div className="weight-bar" style={{ width: `${(val / 10) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="az-actions">
        <button className="btn-next" onClick={onNext} disabled={!project.name.trim() || !project.deadline}>
          다음 단계 →
        </button>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────
function Step2({ roles, setRoles, onNext, onBack }) {
  const [form, setForm] = useState({ name: "", requiredCount: 1, workload: 20, requiredSkill: 3 });

  const add = () => {
    if (!form.name.trim() || roles.find((r) => r.name === form.name.trim())) return;
    setRoles((r) => [...r, { ...form, name: form.name.trim() }]);
    setForm({ name: "", requiredCount: 1, workload: 20, requiredSkill: 3 });
  };

  return (
    <div className="az-card">
      <div className="az-card-head">
        <div className="az-card-emoji">🗂</div>
        <div>
          <h2 className="az-card-title">어떤 역할이 필요한가요?</h2>
          <p className="az-card-desc">역할명, 필요 인원, 업무량, 요구 역량을 입력하세요</p>
        </div>
      </div>

      <div className="add-box">
        <div className="field-row">
          <div className="field flex2">
            <label className="field-label">역할명</label>
            <input className="field-input" type="text" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 백엔드 개발"
              onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <div className="field">
            <label className="field-label">필요 인원</label>
            <input className="field-input" type="number" min={1} max={10} value={form.requiredCount}
              onChange={(e) => setForm((f) => ({ ...f, requiredCount: Number(e.target.value) }))} />
          </div>
          <div className="field">
            <label className="field-label">업무량 (h)</label>
            <input className="field-input" type="number" min={1} value={form.workload}
              onChange={(e) => setForm((f) => ({ ...f, workload: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="field-row align-end">
          <div className="field flex2">
            <label className="field-label">요구 역량 수준</label>
            <StarRating value={form.requiredSkill} onChange={(v) => setForm((f) => ({ ...f, requiredSkill: v }))} />
          </div>
          <button className="btn-add" onClick={add}>+ 역할 추가</button>
        </div>
      </div>

      {roles.length > 0 ? (
        <div className="role-cards">
          {roles.map((r, i) => (
            <div key={i} className="role-card" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
              <div className="role-card-top">
                <span className="role-card-name">{r.name}</span>
                <button className="del-btn" onClick={() => setRoles((rs) => rs.filter((_, j) => j !== i))}>×</button>
              </div>
              <div className="role-card-meta">
                <span>👥 {r.requiredCount}명</span>
                <span>⏱ {r.workload}h</span>
                <span>{"★".repeat(r.requiredSkill)}{"☆".repeat(5 - r.requiredSkill)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-box">역할을 추가하면 여기에 표시됩니다</div>
      )}

      <div className="az-actions">
        <button className="btn-back" onClick={onBack}>← 이전</button>
        <button className="btn-next" onClick={onNext} disabled={roles.length === 0}>다음 단계 →</button>
      </div>
    </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────
function Step3({ roles, members, setMembers, onNext, onBack, loading }) {
  const empty = () => ({
    name: "", weeklyHours: 10,
    preferredRole: roles[0]?.name ?? "",
    skills: Object.fromEntries(roles.map((r) => [r.name, 3])),
  });
  const [form, setForm] = useState(empty);

  const add = () => {
    if (!form.name.trim()) return;
    setMembers((m) => [...m, { ...form, name: form.name.trim() }]);
    setForm(empty());
  };

  return (
    <div className="az-card">
      <div className="az-card-head">
        <div className="az-card-emoji">👥</div>
        <div>
          <h2 className="az-card-title">팀원을 소개해주세요</h2>
          <p className="az-card-desc">각 팀원의 가능 시간, 선호 역할, 역할별 역량을 입력하세요</p>
        </div>
      </div>

      <div className="add-box">
        <div className="field-row">
          <div className="field flex2">
            <label className="field-label">이름</label>
            <input className="field-input" type="text" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: 김철수"
              onKeyDown={(e) => e.key === "Enter" && add()} />
          </div>
          <div className="field">
            <label className="field-label">주당 가능 시간</label>
            <div className="hour-input">
              <input className="field-input" type="number" min={1} max={60} value={form.weeklyHours}
                onChange={(e) => setForm((f) => ({ ...f, weeklyHours: Number(e.target.value) }))} />
              <span className="hour-unit">h</span>
            </div>
          </div>
          <div className="field">
            <label className="field-label">선호 역할</label>
            <select className="field-input" value={form.preferredRole}
              onChange={(e) => setForm((f) => ({ ...f, preferredRole: e.target.value }))}>
              {roles.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
            </select>
          </div>
        </div>
        <div className="skill-section">
          <label className="field-label">역할별 역량 수준</label>
          <div className="skill-rows">
            {roles.map((r) => (
              <div key={r.name} className="skill-row">
                <span className="skill-role-name">{r.name}</span>
                <StarRating value={form.skills[r.name] ?? 3}
                  onChange={(v) => setForm((f) => ({ ...f, skills: { ...f.skills, [r.name]: v } }))} />
              </div>
            ))}
          </div>
        </div>
        <button className="btn-add-full" onClick={add}>+ 팀원 추가</button>
      </div>

      {members.length > 0 && (
        <div className="member-cards">
          {members.map((m, i) => (
            <div key={i} className="member-card">
              <div className="member-card-top">
                <div className="member-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                  {m.name[0]}
                </div>
                <div className="member-card-info">
                  <div className="member-card-name">{m.name}</div>
                  <div className="member-card-meta">주당 {m.weeklyHours}h · 선호: {m.preferredRole}</div>
                </div>
                <button className="del-btn" onClick={() => setMembers((ms) => ms.filter((_, j) => j !== i))}>×</button>
              </div>
              <div className="member-skills">
                {roles.map((r) => (
                  <div key={r.name} className="member-skill-chip">
                    <span>{r.name}</span>
                    <span className="skill-stars-sm">{"★".repeat(m.skills[r.name] ?? 0)}{"☆".repeat(5 - (m.skills[r.name] ?? 0))}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {members.length === 0 && <div className="empty-box">팀원을 추가하면 여기에 카드로 표시됩니다</div>}

      <div className="az-actions">
        <button className="btn-back" onClick={onBack}>← 이전</button>
        <button className="btn-next" onClick={onNext} disabled={members.length === 0 || loading}>
          {loading
            ? <span className="loading-dots"><span /><span /><span /> AI 분석 중...</span>
            : "분석 시작 →"}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────
function Step4({ result, projectName, onReset }) {
  const { assignments, risks, aiReport } = result;
  const riskMeta = {
    낮음: { color: "#16a34a", bg: "#f0fdf4", label: "✓ 리스크 낮음" },
    보통: { color: "#d97706", bg: "#fffbeb", label: "⚠ 리스크 보통" },
    높음: { color: "#dc2626", bg: "#fff1f2", label: "🚨 리스크 높음" },
  }[risks.riskLevel];

  return (
    <div className="result-page">
      {/* 요약 배너 */}
      <div className="result-banner" style={{ background: riskMeta.bg, borderColor: riskMeta.color }}>
        <div className="result-banner-left">
          <div className="result-proj-name">{projectName}</div>
          <div className="result-proj-sub">분석 완료 · 총 {assignments.length}명 배정 · 리스크 점수 {risks.riskScore}점</div>
        </div>
        <div className="result-risk-pill" style={{ color: riskMeta.color, borderColor: riskMeta.color }}>
          {riskMeta.label}
        </div>
      </div>

      {/* 역할 배정 */}
      <div className="az-card">
        <h3 className="section-title">📋 역할 배정 결과</h3>
        <p className="section-sub">MCDM(다기준 의사결정) 알고리즘 기반 최적 배정</p>
        <div className="assign-cards">
          {assignments.map((a, i) => (
            <div key={i} className="assign-card">
              <div className="assign-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                {a.member[0]}
              </div>
              <div className="assign-info">
                <div className="assign-name">{a.member}</div>
                <div className="assign-role-tag" style={{ color: COLORS[i % COLORS.length], background: COLORS[i % COLORS.length] + "18" }}>
                  {a.role}
                </div>
              </div>
              <div className="assign-score-wrap">
                <div className="assign-score-num" style={{ color: COLORS[i % COLORS.length] }}>{a.score}</div>
                <div className="assign-score-label">점</div>
                <div className="assign-score-bar">
                  <div style={{ width: `${a.score}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 리스크 분석 */}
      <div className="az-card">
        <h3 className="section-title">⚠️ 리스크 분석</h3>
        <p className="section-sub">규칙 기반 계산 · LLM 판단 없음</p>
        <div className="risk-grid">
          {[
            {
              title: "Skill Gap",
              sub: "역량 부족 분석",
              type: risks.skillGaps.length > 0 ? "warn" : "ok",
              body: risks.skillGaps.length === 0 ? "역량 부족 없음" : risks.skillGaps.join("\n"),
            },
            {
              title: "선호 불일치",
              sub: "Person-Job Fit",
              type: risks.mismatches.length > 0 ? "warn" : "ok",
              body: risks.mismatches.length === 0 ? "전원 선호 역할 배정" : risks.mismatches.join("\n"),
            },
            {
              title: "업무 집중",
              sub: "Workload Balance",
              type: risks.concentrated ? "danger" : "ok",
              body: risks.concentrated ? `${risks.topMember}에게 ${risks.topPct}% 집중` : "업무 균형 양호",
            },
            {
              title: "일정 부족",
              sub: "Capacity Planning",
              type: risks.short ? "danger" : "ok",
              body: risks.short ? `${Math.round(risks.shortageH)}시간 부족` : "일정 여유 있음",
            },
          ].map((item) => (
            <div key={item.title} className={`risk-card rk-${item.type}`}>
              <div className="risk-card-header">
                <span className="risk-card-icon">{item.type === "ok" ? "✓" : item.type === "warn" ? "⚠" : "🚨"}</span>
                <div>
                  <div className="risk-card-title">{item.title}</div>
                  <div className="risk-card-sub">{item.sub}</div>
                </div>
              </div>
              <div className="risk-card-body">{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 리포트 */}
      <div className="az-card ai-report-card">
        <h3 className="section-title">🤖 AI 분석 리포트</h3>
        <p className="section-sub">계산 결과를 바탕으로 AI가 설명·개선안 제안</p>
        <div className="ai-report-body">
          <p>{aiReport}</p>
        </div>
      </div>

      <button className="btn-reset" onClick={onReset}>↺ 새로 분석하기</button>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function Analyze({ onBack }) {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState({ name: "", deadline: "", weights: { skill: 5, time: 3, preference: 2 } });
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const w = project.weights;
    const t = w.skill + w.time + w.preference || 1;
    const weights = { skill: w.skill / t, time: w.time / t, preference: w.preference / t };
    const assignments = assignRoles(roles, members, weights);
    const risks = analyzeRisks(assignments, roles, members, project.deadline);
    let aiReport = "AI 리포트를 불러오는 중 오류가 발생했습니다.";
    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: buildPrompt(project.name, assignments, risks) }),
      });
      const data = await res.json();
      aiReport = data.reply;
    } catch { /* keep default error message */ }
    setResult({ assignments, risks, aiReport });
    setStep(4);
    setLoading(false);
  };

  const reset = () => {
    setStep(1); setResult(null); setRoles([]); setMembers([]);
    setProject({ name: "", deadline: "", weights: { skill: 5, time: 3, preference: 2 } });
  };

  return (
    <div className="az-page">
      <div className="az-header">
        <button className="az-back" onClick={onBack}>← 홈으로</button>
        <span className="az-logo">팀가드</span>
        <div style={{ width: 80 }} />
      </div>
      <div className="az-body">
        <StepBar current={step} />
        {step === 1 && <Step1 project={project} setProject={setProject} onNext={() => setStep(2)} />}
        {step === 2 && <Step2 roles={roles} setRoles={setRoles} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <Step3 roles={roles} members={members} setMembers={setMembers} onNext={run} onBack={() => setStep(2)} loading={loading} />}
        {step === 4 && result && <Step4 result={result} projectName={project.name} onReset={reset} />}
      </div>
    </div>
  );
}
