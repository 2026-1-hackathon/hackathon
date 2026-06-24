import { useState } from "react";
import "./common.css";
import "./JoinRoom.css";
import { api } from "./api.js";

function StarRating({ value, onChange }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? "on" : ""}`}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function JoinRoom({ onBack, onDashboard }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [room, setRoom] = useState(null);
  const [memberName, setMemberName] = useState("");
  const [availableHours, setAvailableHours] = useState(10);
  const [skills, setSkills] = useState({});
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const loadRoom = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await api(`/api/rooms/invite/${code.trim()}`);
      setRoom(data);
      const initS = {}, initP = {};
      data.roles.forEach((r) => {
        initS[r.roleId] = 3;
        initP[r.roleId] = 3;
      });
      setSkills(initS);
      setPrefs(initP);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!memberName.trim()) return;
    setLoading(true);
    setError("");
    try {
      await api(`/api/rooms/invite/${code.trim()}/members`, {
        method: "POST",
        body: JSON.stringify({
          name: memberName,
          availableHours: Number(availableHours),
          skills: room.roles.map((r) => ({
            skillName: r.name,
            level: skills[r.roleId] ?? 3,
          })),
          preferences: room.roles.map((r) => ({
            roleId: r.roleId,
            score: prefs[r.roleId] ?? 3,
          })),
        }),
      });
      setDone(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const goDashboard = () => {
    onDashboard({
      roomId: room.roomId,
      inviteCode: code.trim(),
      title: room.title,
      topic: room.topic,
      deadline: room.deadline,
      roles: room.roles,
    });
  };

  if (done) {
    return (
      <div className="az-page">
        <header className="az-header">
          <div style={{ width: 80 }} />
          <span className="az-logo">팀가드</span>
          <div style={{ width: 80 }} />
        </header>
        <div className="az-body" style={{ maxWidth: 520 }}>
          <div className="az-card" style={{ textAlign: "center" }}>
            <div className="jr-check">✓</div>
            <h2 className="jr-done-title">등록 완료!</h2>
            <p className="jr-done-desc">
              <strong>{memberName}</strong>님의 정보가 등록되었습니다.<br />
              팀장이 역할 배정을 실행하면 결과를 확인할 수 있어요.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button className="btn-back" style={{ flex: 1 }} onClick={onBack}>
                ← 홈으로
              </button>
              <button className="btn-next" style={{ flex: 1 }} onClick={goDashboard}>
                결과 보기 →
              </button>
            </div>
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

      <div className="az-body" style={{ maxWidth: 640 }}>
        {/* Step 1: 초대코드 입력 */}
        {step === 1 && (
          <div className="az-card">
            <div className="az-card-head">
              <div className="az-card-emoji">🔑</div>
              <div>
                <div className="az-card-title">초대코드 입력</div>
                <div className="az-card-desc">팀장에게 받은 8자리 코드를 입력하세요</div>
              </div>
            </div>
            <input
              className="field-input jr-code-input"
              placeholder="초대코드 (예: a1b2c3d4)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadRoom()}
            />
            {error && <div className="jr-error">{error}</div>}
            <div className="az-actions" style={{ marginTop: 20 }}>
              <button
                className="btn-next"
                style={{ width: "100%" }}
                disabled={!code.trim() || loading}
                onClick={loadRoom}
              >
                {loading ? (
                  <div className="loading-dots"><span /><span /><span /></div>
                ) : (
                  "방 찾기 →"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 팀원 정보 입력 */}
        {step === 2 && room && (
          <div className="az-card">
            <div className="az-card-head">
              <div className="az-card-emoji">👤</div>
              <div>
                <div className="az-card-title">내 정보 입력</div>
                <div className="az-card-desc">
                  <strong>{room.title}</strong> 프로젝트에 참여합니다
                </div>
              </div>
            </div>

            <div className="field-row">
              <div className="field flex2">
                <label className="field-label">이름</label>
                <input
                  className="field-input"
                  placeholder="홍길동"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label">주당 가능 시간 <span className="hint">(h)</span></label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={80}
                  value={availableHours}
                  onChange={(e) => setAvailableHours(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="skill-section">
              <div className="field-label" style={{ marginBottom: 14 }}>
                각 역할에 대한 역량과 선호도를 입력해주세요
              </div>
              <div className="jr-role-grid">
                {room.roles.map((r) => (
                  <div key={r.roleId} className="jr-role-card">
                    <div className="jr-role-name">{r.name}</div>
                    <div className="jr-role-row">
                      <span className="jr-role-label">역량</span>
                      <StarRating
                        value={skills[r.roleId] ?? 3}
                        onChange={(v) => setSkills((p) => ({ ...p, [r.roleId]: v }))}
                      />
                    </div>
                    <div className="jr-role-row">
                      <span className="jr-role-label">선호도</span>
                      <StarRating
                        value={prefs[r.roleId] ?? 3}
                        onChange={(v) => setPrefs((p) => ({ ...p, [r.roleId]: v }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="jr-error">{error}</div>}
            <div className="az-actions" style={{ marginTop: 24 }}>
              <button className="btn-back" onClick={() => setStep(1)}>← 이전</button>
              <button
                className="btn-next"
                disabled={!memberName.trim() || loading}
                onClick={submit}
              >
                {loading ? (
                  <div className="loading-dots"><span /><span /><span /></div>
                ) : (
                  "등록하기 →"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
