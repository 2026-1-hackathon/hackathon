import { useState } from "react";
import "./common.css";
import "./CreateRoom.css";
import { api } from "./api.js";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
const STEPS = ["프로젝트 정보", "역할 설정", "가중치 설정"];

function StepBar({ current }) {
  return (
    <div className="stepbar">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = current > n;
        const active = current === n;
        return (
          <div className="stepbar-item" key={n}>
            {i < STEPS.length - 1 && (
              <div className={`stepbar-line ${done ? "done" : ""}`} />
            )}
            <div className={`stepbar-circle ${active ? "active" : ""} ${done ? "done" : ""}`}>
              {done ? "✓" : n}
            </div>
            <div className={`stepbar-label ${active ? "active" : ""}`}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function CreateRoom({ onBack, onDone }) {
  const [step, setStep] = useState(1);
  const [project, setProject] = useState({ title: "", topic: "", deadline: "" });
  const [roles, setRoles] = useState([
    { name: "백엔드", workload: 20, description: "API 및 DB 개발" },
    { name: "프론트엔드", workload: 15, description: "UI 화면 개발" },
  ]);
  const [roleForm, setRoleForm] = useState({ name: "", workload: 10, description: "" });
  const [weights, setWeights] = useState({ skill: 6, time: 6, preference: 2 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [fullRoomData, setFullRoomData] = useState(null);
  const [copied, setCopied] = useState(false);

  const addRole = () => {
    if (!roleForm.name.trim()) return;
    setRoles((p) => [...p, { ...roleForm }]);
    setRoleForm({ name: "", workload: 10, description: "" });
  };

  const removeRole = (i) => setRoles((p) => p.filter((_, idx) => idx !== i));

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api("/api/rooms", {
        method: "POST",
        body: JSON.stringify({
          title: project.title,
          topic: project.topic,
          deadline: project.deadline,
          skillWeight: weights.skill,
          timeWeight: weights.time,
          preferenceWeight: weights.preference,
          roles: roles.map((r) => ({
            name: r.name,
            workload: Number(r.workload),
            description: r.description,
          })),
        }),
      });
      const roomInfo = await api(`/api/rooms/invite/${res.inviteCode}`);
      setInviteCode(res.inviteCode);
      setFullRoomData(roomInfo);
      setStep(4);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goDashboard = () => {
    onDone({
      roomId: fullRoomData.roomId,
      inviteCode,
      title: fullRoomData.title,
      topic: fullRoomData.topic,
      deadline: fullRoomData.deadline,
      roles: fullRoomData.roles,
    });
  };

  const totalW = weights.skill + weights.time + weights.preference || 1;
  const pct = (v) => Math.round((v / totalW) * 100);

  if (step === 4) {
    return (
      <div className="az-page">
        <header className="az-header">
          <div style={{ width: 80 }} />
          <span className="az-logo">팀가드</span>
          <div style={{ width: 80 }} />
        </header>
        <div className="az-body" style={{ maxWidth: 520 }}>
          <div className="az-card" style={{ textAlign: "center" }}>
            <div className="cr-check">✓</div>
            <h2 className="cr-done-title">방이 만들어졌어요!</h2>
            <p className="cr-done-desc">아래 초대코드를 팀원에게 공유하세요</p>
            <div className="cr-code-wrap">
              <div className="cr-code">{inviteCode}</div>
              <button className="cr-copy" onClick={copyCode}>
                {copied ? "복사됨 ✓" : "복사"}
              </button>
            </div>
            <p className="cr-hint">팀원들이 "코드로 참여"를 눌러 이 코드를 입력하면 됩니다</p>
            <button
              className="btn-next"
              style={{ width: "100%", marginTop: 24 }}
              onClick={goDashboard}
            >
              대시보드로 이동 →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="az-page">
      <header className="az-header">
        <button className="az-back" onClick={onBack}>← 뒤로</button>
        <span className="az-logo">팀가드</span>
        <div style={{ width: 80 }} />
      </header>
      <div className="az-body">
        <StepBar current={step} />

        {/* Step 1: 프로젝트 정보 */}
        {step === 1 && (
          <div className="az-card">
            <div className="az-card-head">
              <div className="az-card-emoji">📋</div>
              <div>
                <div className="az-card-title">프로젝트 정보</div>
                <div className="az-card-desc">기본 정보를 입력해주세요</div>
              </div>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">프로젝트 이름</label>
              <input
                className="field-input"
                placeholder="ex) 캡스톤 디자인 최종 프로젝트"
                value={project.title}
                onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">주제 / 설명</label>
              <input
                className="field-input"
                placeholder="ex) AI 기반 팀 역할 자동 분배 시스템"
                value={project.topic}
                onChange={(e) => setProject((p) => ({ ...p, topic: e.target.value }))}
              />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field-label">마감 기한</label>
              <input
                className="field-input"
                type="datetime-local"
                value={project.deadline}
                onChange={(e) => setProject((p) => ({ ...p, deadline: e.target.value }))}
              />
            </div>
            {error && <div className="cr-error">{error}</div>}
            <div className="az-actions">
              <button
                className="btn-next"
                disabled={!project.title.trim() || !project.deadline}
                onClick={() => setStep(2)}
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 역할 설정 */}
        {step === 2 && (
          <div className="az-card">
            <div className="az-card-head">
              <div className="az-card-emoji">🎭</div>
              <div>
                <div className="az-card-title">역할 설정</div>
                <div className="az-card-desc">프로젝트에 필요한 역할을 추가하세요</div>
              </div>
            </div>

            <div className="role-cards">
              {roles.map((r, i) => (
                <div
                  key={i}
                  className="role-card"
                  style={{ borderLeftColor: COLORS[i % COLORS.length] }}
                >
                  <div className="role-card-top">
                    <span className="role-card-name">{r.name}</span>
                    <button className="del-btn" onClick={() => removeRole(i)}>×</button>
                  </div>
                  <div className="role-card-meta">
                    <span>업무량 {r.workload}h</span>
                    {r.description && <span>{r.description}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="add-box">
              <div className="field-row">
                <div className="field flex2">
                  <label className="field-label">역할명</label>
                  <input
                    className="field-input"
                    placeholder="ex) 백엔드, 기획자, 디자이너"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label">업무량 (h)</label>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    value={roleForm.workload}
                    onChange={(e) => setRoleForm((p) => ({ ...p, workload: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 12 }}>
                <label className="field-label">설명 <span className="hint">(선택)</span></label>
                <input
                  className="field-input"
                  placeholder="역할 설명"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <button className="btn-add-full" onClick={addRole}>+ 역할 추가</button>
            </div>

            {error && <div className="cr-error">{error}</div>}
            <div className="az-actions">
              <button className="btn-back" onClick={() => setStep(1)}>← 이전</button>
              <button
                className="btn-next"
                disabled={roles.length === 0}
                onClick={() => setStep(3)}
              >
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 가중치 설정 */}
        {step === 3 && (
          <div className="az-card">
            <div className="az-card-head">
              <div className="az-card-emoji">⚖️</div>
              <div>
                <div className="az-card-title">가중치 설정</div>
                <div className="az-card-desc">역할 배정 시 무엇을 더 중요하게 볼까요?</div>
              </div>
            </div>

            <div className="weight-cards">
              {[
                { key: "skill", label: "역량", emoji: "💪", desc: "그 역할을 얼마나 잘 하는가" },
                { key: "time", label: "가용시간", emoji: "⏰", desc: "투자 가능한 시간이 많은가" },
                { key: "preference", label: "선호도", emoji: "❤️", desc: "그 역할을 하고 싶어 하는가" },
              ].map(({ key, label, emoji, desc }) => (
                <div className="weight-card" key={key}>
                  <div className="weight-card-top">
                    <span>{emoji} {label}</span>
                    <span className="weight-pct">{pct(weights[key])}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights((p) => ({ ...p, [key]: Number(e.target.value) }))
                    }
                  />
                  <div className="weight-bar" style={{ width: `${pct(weights[key])}%` }} />
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{desc}</div>
                </div>
              ))}
            </div>

            {error && <div className="cr-error">{error}</div>}
            <div className="az-actions" style={{ marginTop: 28 }}>
              <button className="btn-back" onClick={() => setStep(2)}>← 이전</button>
              <button
                className="btn-next"
                disabled={loading || totalW === 0}
                onClick={submit}
              >
                {loading ? (
                  <div className="loading-dots"><span /><span /><span /></div>
                ) : (
                  "방 만들기 →"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
