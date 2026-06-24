import { useState } from "react";
import "./common.css";
import "./Analyze.css";
import TaskManagement from "./TaskManagement.jsx";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const STEPS = ["프로젝트 정보", "역할 설정", "팀원 입력", "분석 결과"];

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = text; }
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `${response.status} ${response.statusText}`);
  }
  return data;
}

function toDeadline(date) {
  if (!date) return null;
  return `${date}T23:59:00`;
}

// ── 공용 컴포넌트 ────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? "on" : ""}`}
          onClick={() => onChange(n)}
        >★</button>
      ))}
    </div>
  );
}

function StepBar({ current }) {
  return (
    <div className="stepbar">
      {STEPS.map((label, index) => {
        const n = index + 1;
        return (
          <div key={n} className="stepbar-item">
            <div className={`stepbar-circle ${n < current ? "done" : n === current ? "active" : ""}`}>
              {n < current ? "✓" : n}
            </div>
            <div className={`stepbar-label ${n === current ? "active" : ""}`}>{label}</div>
            {index < STEPS.length - 1 && (
              <div className={`stepbar-line ${n < current ? "done" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────

function Step1({ project, setProject, onNext }) {
  const weights = project.weights;
  const total = weights.skill + weights.time + weights.preference || 1;

  const setWeight = (key, value) =>
    setProject((p) => ({ ...p, weights: { ...p.weights, [key]: Number(value) || 1 } }));

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
          <input
            className="field-input"
            type="text"
            value={project.name}
            onChange={(e) => setProject((p) => ({ ...p, name: e.target.value }))}
            placeholder="예: 캡스톤 디자인 2팀"
          />
        </div>
        <div className="field">
          <label className="field-label">마감일</label>
          <input
            className="field-input"
            type="date"
            value={project.deadline}
            onChange={(e) => setProject((p) => ({ ...p, deadline: e.target.value }))}
          />
        </div>
      </div>

      <div className="field" style={{ marginBottom: 20 }}>
        <label className="field-label">프로젝트 주제</label>
        <input
          className="field-input"
          type="text"
          value={project.topic}
          onChange={(e) => setProject((p) => ({ ...p, topic: e.target.value }))}
          placeholder="예: 팀 역할 자동 분배 서비스"
        />
      </div>

      <div className="weight-section">
        <label className="field-label">
          역할 배정 우선순위 <span className="hint">(슬라이더로 조정 · 자동 정규화)</span>
        </label>
        <div className="weight-cards">
          {[
            { key: "skill", label: "역량", emoji: "🎯" },
            { key: "time", label: "가능 시간", emoji: "⏰" },
            { key: "preference", label: "선호도", emoji: "⭐" },
          ].map(({ key, label, emoji }) => (
            <div key={key} className="weight-card">
              <div className="weight-card-top">
                <span>{emoji} {label}</span>
                <span className="weight-pct">{Math.round((weights[key] / total) * 100)}%</span>
              </div>
              <input
                type="range" min={1} max={10} value={weights[key]}
                onChange={(e) => setWeight(key, e.target.value)}
              />
              <div className="weight-bar" style={{ width: `${(weights[key] / 10) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="az-actions">
        <button
          className="btn-next"
          onClick={onNext}
          disabled={!project.name.trim() || !project.topic.trim() || !project.deadline}
        >
          다음 단계 →
        </button>
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────

function Step2({ roles, setRoles, onNext, onBack }) {
  const [form, setForm] = useState({ name: "", workload: 20, requiredSkill: 3 });

  const add = () => {
    const name = form.name.trim();
    if (!name || roles.some((r) => r.name === name)) return;
    setRoles((p) => [...p, { ...form, name }]);
    setForm({ name: "", workload: 20, requiredSkill: 3 });
  };

  return (
    <div className="az-card">
      <div className="az-card-head">
        <div className="az-card-emoji">🗂</div>
        <div>
          <h2 className="az-card-title">어떤 역할이 필요한가요?</h2>
          <p className="az-card-desc">역할마다 최소 한 명이 배정되며, 남은 팀원은 적합한 역할로 배정됩니다</p>
        </div>
      </div>

      <div className="add-box">
        <div className="field-row">
          <div className="field flex2">
            <label className="field-label">역할명</label>
            <input
              className="field-input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 백엔드 개발"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
          </div>
          <div className="field">
            <label className="field-label">업무량 (h)</label>
            <input
              className="field-input"
              type="number" min={1} value={form.workload}
              onChange={(e) => setForm((p) => ({ ...p, workload: Number(e.target.value) }))}
            />
          </div>
        </div>
        <div className="field-row align-end">
          <div className="field flex2">
            <label className="field-label">요구 역량 수준</label>
            <StarRating value={form.requiredSkill} onChange={(v) => setForm((p) => ({ ...p, requiredSkill: v }))} />
          </div>
          <button type="button" className="btn-add" onClick={add}>+ 역할 추가</button>
        </div>
      </div>

      {roles.length > 0 ? (
        <div className="role-cards">
          {roles.map((role, i) => (
            <div key={`${role.name}-${i}`} className="role-card" style={{ borderLeftColor: COLORS[i % COLORS.length] }}>
              <div className="role-card-top">
                <span className="role-card-name">{role.name}</span>
                <button type="button" className="del-btn"
                  onClick={() => setRoles((p) => p.filter((_, idx) => idx !== i))}>×</button>
              </div>
              <div className="role-card-meta">
                <span>👥 최소 1명</span>
                <span>⏱ {role.workload}h</span>
                <span>{"★".repeat(role.requiredSkill)}{"☆".repeat(5 - role.requiredSkill)}</span>
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
  const createEmpty = () => ({
    name: "",
    availableHours: 10,
    preferredRole: roles[0]?.name ?? "",
    skills: Object.fromEntries(roles.map((r) => [r.name, 3])),
  });

  const [form, setForm] = useState(createEmpty);

  const add = () => {
    const name = form.name.trim();
    if (!name || members.some((m) => m.name === name)) return;
    setMembers((p) => [...p, { ...form, name }]);
    setForm(createEmpty());
  };

  const enoughMembers = members.length >= roles.length;

  return (
    <div className="az-card">
      <div className="az-card-head">
        <div className="az-card-emoji">👥</div>
        <div>
          <h2 className="az-card-title">팀원을 소개해주세요</h2>
          <p className="az-card-desc">각 팀원의 투자 가능 시간, 선호 역할, 역할별 역량을 입력하세요</p>
        </div>
      </div>

      <div className="add-box">
        <div className="field-row">
          <div className="field flex2">
            <label className="field-label">이름</label>
            <input
              className="field-input"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 김철수"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
          </div>
          <div className="field">
            <label className="field-label">투자 가능 시간</label>
            <div className="hour-input">
              <input
                className="field-input"
                type="number" min={1} max={500} value={form.availableHours}
                onChange={(e) => setForm((p) => ({ ...p, availableHours: Number(e.target.value) }))}
              />
              <span className="hour-unit">h</span>
            </div>
          </div>
          <div className="field">
            <label className="field-label">선호 역할</label>
            <select
              className="field-input"
              value={form.preferredRole}
              onChange={(e) => setForm((p) => ({ ...p, preferredRole: e.target.value }))}
            >
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
                <StarRating
                  value={form.skills[r.name] ?? 3}
                  onChange={(v) => setForm((p) => ({ ...p, skills: { ...p.skills, [r.name]: v } }))}
                />
              </div>
            ))}
          </div>
        </div>

        <button type="button" className="btn-add-full" onClick={add}>+ 팀원 추가</button>
      </div>

      {members.length > 0 ? (
        <div className="member-cards">
          {members.map((m, i) => (
            <div key={`${m.name}-${i}`} className="member-card">
              <div className="member-card-top">
                <div className="member-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                  {m.name[0]}
                </div>
                <div className="member-card-info">
                  <div className="member-card-name">{m.name}</div>
                  <div className="member-card-meta">투자 가능 {m.availableHours}h · 선호: {m.preferredRole}</div>
                </div>
                <button type="button" className="del-btn"
                  onClick={() => setMembers((p) => p.filter((_, idx) => idx !== i))}>×</button>
              </div>
              <div className="member-skills">
                {roles.map((r) => (
                  <div key={r.name} className="member-skill-chip">
                    <span>{r.name}</span>
                    <span className="skill-stars-sm">
                      {"★".repeat(m.skills[r.name] ?? 0)}{"☆".repeat(5 - (m.skills[r.name] ?? 0))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-box">팀원을 추가하면 여기에 카드로 표시됩니다</div>
      )}

      {!enoughMembers && members.length > 0 && (
        <div className="az-inline-warning">
          모든 역할에 최소 한 명이 필요합니다. 현재 역할 {roles.length}개, 팀원 {members.length}명입니다.
        </div>
      )}

      <div className="az-actions">
        <button className="btn-back" onClick={onBack}>← 이전</button>
        <button className="btn-next" onClick={onNext} disabled={!enoughMembers || loading}>
          {loading ? (
            <span className="loading-dots"><span /><span /><span /> 분석 중...</span>
          ) : (
            "분석 시작 →"
          )}
        </button>
      </div>
    </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────

function Step4({ result, projectName, inviteCode, onReset, onReassign, onOpenTasks }) {
  const { assignments, prediction } = result;

  const maxRisk = Math.max(prediction.conflictRisk, prediction.scheduleRisk, prediction.deadlineRisk);
  const riskLabel = maxRisk >= 70 ? "🚨 리스크 높음" : maxRisk >= 40 ? "⚠ 리스크 보통" : "✓ 리스크 낮음";
  const riskColor = maxRisk >= 70 ? "#dc2626" : maxRisk >= 40 ? "#d97706" : "#16a34a";
  const riskBg = maxRisk >= 70 ? "#fff1f2" : maxRisk >= 40 ? "#fffbeb" : "#f0fdf4";

  return (
    <div className="result-page">
      {/* 상단 배너 */}
      <div className="result-banner" style={{ background: riskBg, borderColor: riskColor }}>
        <div className="result-banner-left">
          <div className="result-proj-name">{projectName}</div>
          <div className="result-proj-sub">분석 완료 · 총 {assignments.length}명 배정</div>
          <div className="result-invite-code">초대 코드: <strong>{inviteCode}</strong></div>
        </div>
        <div className="result-risk-pill" style={{ color: riskColor, borderColor: riskColor }}>
          {riskLabel}
        </div>
      </div>

      {/* 역할 배정 결과 */}
      <div className="az-card">
        <h3 className="section-title">📋 역할 배정 결과</h3>
        <p className="section-sub">역량·가능 시간·선호도 가중치 기반 자동 배정</p>
        <div className="assign-cards">
          {assignments.map((a, i) => (
            <div key={a.assignmentId ?? i} className="assign-card">
              <div className="assign-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                {a.member[0]}
              </div>
              <div className="assign-info">
                <div className="assign-name">{a.member}</div>
                <div className="assign-role-tag" style={{
                  color: COLORS[i % COLORS.length],
                  background: COLORS[i % COLORS.length] + "18",
                }}>
                  {a.role}
                </div>
              </div>
              <div className="assign-score-wrap">
                <div className="assign-score-num" style={{ color: COLORS[i % COLORS.length] }}>
                  {a.score}
                </div>
                <div className="assign-score-label">점</div>
                <div className="assign-score-bar">
                  <div style={{ width: `${Math.min(a.score, 100)}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI 리스크 예측 */}
      <div className="az-card">
        <h3 className="section-title">⚠️ AI 리스크 예측</h3>
        <p className="section-sub">배정 결과를 바탕으로 AI가 분석한 리스크 (0 = 안전, 100 = 위험)</p>
        <div className="risk-grid">
          {[
            { label: "팀 갈등 리스크", value: prediction.conflictRisk },
            { label: "일정 리스크", value: prediction.scheduleRisk },
            { label: "마감 리스크", value: prediction.deadlineRisk },
          ].map(({ label, value }) => {
            const cls = value >= 70 ? "rk-danger" : value >= 40 ? "rk-warn" : "rk-ok";
            const barColor = value >= 70 ? "#dc2626" : value >= 40 ? "#f59e0b" : "#16a34a";
            return (
              <div key={label} className={`risk-card ${cls}`}>
                <div className="risk-card-header">
                  <span className="risk-card-icon">
                    {value >= 70 ? "🚨" : value >= 40 ? "⚠" : "✓"}
                  </span>
                  <div className="risk-card-title">{label}</div>
                </div>
                <div className="risk-score-num">{value}</div>
                <div className="risk-score-bar">
                  <div style={{ width: `${value}%`, background: barColor }} />
                </div>
              </div>
            );
          })}

          {prediction.riskFactors?.length > 0 && (
            <div className="risk-card rk-warn" style={{ gridColumn: "1 / -1" }}>
              <div className="risk-card-header">
                <span className="risk-card-icon">⚠</span>
                <div>
                  <div className="risk-card-title">리스크 요인</div>
                  <div className="risk-card-sub">AI가 감지한 주요 위험 요소</div>
                </div>
              </div>
              <div className="risk-card-body">
                {prediction.riskFactors.map((f, i) => <div key={i}>• {f}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI 권고사항 */}
      {prediction.recommendations?.length > 0 && (
        <div className="az-card ai-report-card">
          <h3 className="section-title">💡 AI 권고사항</h3>
          <p className="section-sub">팀 성과를 높이기 위한 AI 제안</p>
          <div className="ai-report-body">
            {prediction.recommendations.map((r, i) => <p key={i}>{i + 1}. {r}</p>)}
          </div>
        </div>
      )}

      <div className="result-bottom-actions">
        <button className="btn-reset" onClick={onReset}>↺ 처음부터</button>
        <button className="btn-reassign" onClick={onReassign}>팀원 정보 수정 후 재배정</button>
        <button className="btn-task-open" onClick={onOpenTasks}>역할별 업무 관리 →</button>
      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────

export default function Analyze({ onBack }) {
  const [step, setStep] = useState(1);
  const [activeView, setActiveView] = useState("analysis");
  const [project, setProject] = useState({
    name: "", topic: "", deadline: "",
    weights: { skill: 5, time: 3, preference: 2 },
  });
  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [result, setResult] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. 방과 역할 생성
      const createdRoom = await apiRequest("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          title: project.name,
          topic: project.topic,
          skillWeight: project.weights.skill,
          timeWeight: project.weights.time,
          preferenceWeight: project.weights.preference,
          deadline: toDeadline(project.deadline),
          roles: roles.map((r) => ({
            name: r.name,
            workload: Number(r.workload),
            description: `요구 역량 ${r.requiredSkill}/5`,
          })),
        }),
      });

      // 2. 생성된 역할 ID 조회
      const roomInfo = await apiRequest(`/api/rooms/invite/${createdRoom.inviteCode}`);

      // 3. 팀원 저장
      await Promise.all(
        members.map((m) =>
          apiRequest(`/api/rooms/invite/${createdRoom.inviteCode}/members`, {
            method: "POST",
            body: JSON.stringify({
              name: m.name,
              availableHours: Number(m.availableHours),
              skills: roomInfo.roles.map((r) => ({
                skillName: r.name,
                level: m.skills[r.name] ?? 3,
              })),
              preferences: roomInfo.roles.map((r) => ({
                roleId: r.roleId,
                score: m.preferredRole === r.name ? 5 : 3,
              })),
            }),
          })
        )
      );

      // 4. 백엔드 역할 자동 분배 (MCDM)
      const backendAssignments = await apiRequest(
        `/api/rooms/${roomInfo.roomId}/assignments`,
        { method: "POST" }
      );

      const assignments = backendAssignments.map((a) => ({
        assignmentId: a.assignmentId,
        member: a.memberName,
        role: a.roleName,
        score: Math.round(a.totalScore),
        skillScore: a.skillScore,
        timeScore: a.timeScore,
        preferenceScore: a.preferenceScore,
      }));

      // 5. 백엔드 AI 리스크 예측
      const prediction = await apiRequest(`/api/rooms/${roomInfo.roomId}/predict`);

      setWorkspace({
        roomId: roomInfo.roomId,
        inviteCode: createdRoom.inviteCode,
        roles: roomInfo.roles,
      });

      setResult({ assignments, prediction });
      setStep(4);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setActiveView("analysis");
    setResult(null);
    setWorkspace(null);
    setRoles([]);
    setMembers([]);
    setError("");
    setProject({ name: "", topic: "", deadline: "", weights: { skill: 5, time: 3, preference: 2 } });
  };

  // 프로젝트·역할 유지, 팀원만 초기화 → 3단계로 이동
  const reAssign = () => {
    setStep(3);
    setMembers([]);
    setResult(null);
    setWorkspace(null);
    setError("");
  };

  return (
    <div className="az-page">
      <div className="az-header">
        <button className="az-back" onClick={onBack}>← 홈으로</button>
        <span className="az-logo">팀가드</span>
        <div style={{ width: 80 }} />
      </div>

      <div className="az-body">
        {activeView === "tasks" && workspace ? (
          <TaskManagement
            roomId={workspace.roomId}
            inviteCode={workspace.inviteCode}
            roles={workspace.roles}
            onBack={() => setActiveView("analysis")}
          />
        ) : (
          <>
            <StepBar current={step} />

            {error && <div className="az-api-error">{error}</div>}

            {step === 1 && (
              <Step1 project={project} setProject={setProject} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <Step2 roles={roles} setRoles={setRoles} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}
            {step === 3 && (
              <Step3
                roles={roles} members={members} setMembers={setMembers}
                onNext={run} onBack={() => setStep(2)} loading={loading}
              />
            )}
            {step === 4 && result && workspace && (
              <Step4
                result={result}
                projectName={project.name}
                inviteCode={workspace.inviteCode}
                onReset={reset}
                onReassign={reAssign}
                onOpenTasks={() => setActiveView("tasks")}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
