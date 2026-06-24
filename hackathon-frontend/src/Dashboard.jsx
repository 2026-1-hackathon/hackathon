import { useState, useEffect, useCallback } from "react";
import "./Dashboard.css";
import { api } from "./api.js";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function Dashboard({ roomData, onBack }) {
  const {
    roomId, inviteCode, title, topic,
    roles = [],
    deadline: roomDeadline,
    skillWeight = 0, timeWeight = 0, preferenceWeight = 0,
  } = roomData;

  const totalW = (skillWeight + timeWeight + preferenceWeight) || 1;
  const wPct = (v) => Math.round((v / totalW) * 100);

  const defaultDeadline = roomDeadline ? roomDeadline.slice(0, 16) : "";

  const daysLeft = roomDeadline
    ? Math.ceil((new Date(roomDeadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const [members, setMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [aiReport, setAiReport] = useState("");
  const [tab, setTab] = useState("info");
  const [assigning, setAssigning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [copied, setCopied] = useState(false);
  const [taskForm, setTaskForm] = useState({
    roleId: roles[0]?.roleId ?? "",
    title: "",
    deadline: defaultDeadline,
  });

  // 각 API 독립적으로 로드 — 하나 실패해도 나머지는 정상 동작
  const loadAll = useCallback(async () => {
    const [m, a, t] = await Promise.all([
      api(`/api/rooms/${roomId}/members`).catch(() => []),
      api(`/api/rooms/${roomId}/assignments`).catch(() => []),
      api(`/api/rooms/${roomId}/tasks`).catch(() => []),
    ]);
    setMembers(m);
    setAssignments(a);
    setTasks(t);
  }, [roomId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // 배정 전까지 5초마다 폴링
  useEffect(() => {
    if (assignments.length > 0) return;
    const id = setInterval(loadAll, 5000);
    return () => clearInterval(id);
  }, [assignments.length, loadAll]);

  const runAssignment = async () => {
    setAssigning(true);
    setError("");
    try {
      const result = await api(`/api/rooms/${roomId}/assignments`, { method: "POST" });
      setAssignments(result);
      setTab("assignments");
    } catch (e) {
      setError(e.message);
    } finally {
      setAssigning(false);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    setTaskError("");
    if (!taskForm.title.trim()) { setTaskError("업무 제목을 입력해주세요."); return; }
    if (!taskForm.roleId)       { setTaskError("역할을 선택해주세요."); return; }
    if (!taskForm.deadline)     { setTaskError("기한을 선택해주세요."); return; }
    setTaskLoading(true);
    try {
      const deadline = taskForm.deadline.length === 16
        ? taskForm.deadline + ":00"
        : taskForm.deadline;
      const t = await api(`/api/rooms/${roomId}/roles/${taskForm.roleId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskForm.title,
          description: "",
          estimatedHours: 1,
          deadline,
        }),
      });
      setTasks((prev) => [...prev, t]);
      setTaskForm((p) => ({ ...p, title: "" }));
    } catch (err) {
      setTaskError(err.message);
    } finally {
      setTaskLoading(false);
    }
  };

  const changeStatus = async (taskId, next) => {
    try {
      const updated = await api(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? updated : t));
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await api(`/api/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    } catch (e) {
      setError(e.message);
    }
  };

  const generateAI = async () => {
    setAiLoading(true);
    setError("");
    try {
      const assignText = assignments
        .map((a) => `${a.memberName} → ${a.roleName} (적합도: ${Math.round(a.totalScore)}점)`)
        .join(", ");
      const total = tasks.length;
      const done = tasks.filter((t) => t.status === "DONE").length;
      const overdue = tasks.filter((t) => t.overdue).length;
      const taskText = total > 0
        ? tasks.map((t) => `[${t.roleName ?? ""}] ${t.title}: ${t.status}${t.overdue ? "(지연)" : ""}`).join(", ")
        : "등록된 업무 없음";

      const prompt = `팀 프로젝트 "${title}"의 현황을 분석해주세요.

역할 배정 결과: ${assignText}

업무 현황 (${done}/${total} 완료, 지연 ${overdue}건):
${taskText}

위 데이터를 바탕으로 다음을 한국어로 작성해주세요:
1. 팀 역할 배정의 강점과 개선할 점
2. 업무 진행 상황 평가 및 리스크
3. 마감 달성을 위한 구체적인 액션 아이템 2~3가지

자연스러운 3~4문단 분량으로 작성해주세요.`;

      const res = await api("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: prompt }),
      });
      setAiReport(res.reply ?? res);
      setTab("ai");
    } catch (e) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 역할별 업무 그룹
  const tasksByRole = {};
  roles.forEach((r) => { tasksByRole[r.name] = []; });
  tasks.forEach((t) => {
    const key = t.roleName ?? "기타";
    if (!tasksByRole[key]) tasksByRole[key] = [];
    tasksByRole[key].push(t);
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "DONE").length;
  const overdueCount = tasks.filter((t) => t.overdue && t.status !== "DONE").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const TABS = [
    { id: "info",        label: "프로젝트 정보" },
    { id: "members",     label: `팀원 (${members.length})` },
    { id: "assignments", label: `역할 배정${assignments.length > 0 ? " ✓" : ""}` },
    { id: "tasks",       label: `업무 관리 (${doneTasks}/${totalTasks})` },
    { id: "ai",          label: "AI 리포트" },
  ];

  return (
    <div className="db-page">
      {/* 헤더 */}
      <header className="db-header">
        <button className="db-back" onClick={onBack}>← 홈</button>
        <div className="db-header-center">
          <span className="db-title">{title}</span>
          <button className="db-code-chip" onClick={copyCode}>
            초대코드: <strong>{inviteCode}</strong> {copied ? "✓" : ""}
          </button>
        </div>
        <button
          className="db-ai-btn"
          onClick={generateAI}
          disabled={aiLoading || assignments.length === 0}
        >
          {aiLoading ? "분석 중…" : "✨ AI 리포트"}
        </button>
      </header>

      {/* 통계 바 */}
      <div className="db-stats">
        <div className="db-stat">
          <span className="db-stat-num">{members.length}</span>
          <span className="db-stat-lbl">팀원</span>
        </div>
        <div className="db-stat">
          <span className="db-stat-num">{roles.length}</span>
          <span className="db-stat-lbl">역할</span>
        </div>
        <div className="db-stat">
          <span className="db-stat-num" style={{ color: assignments.length > 0 ? "#16a34a" : "#f59e0b" }}>
            {assignments.length > 0 ? "완료" : "대기"}
          </span>
          <span className="db-stat-lbl">역할 배정</span>
        </div>
        <div className="db-stat">
          <span className="db-stat-num">{totalTasks > 0 ? `${progress}%` : "—"}</span>
          <span className="db-stat-lbl">진행률</span>
        </div>
        {overdueCount > 0 && (
          <div className="db-stat">
            <span className="db-stat-num" style={{ color: "#dc2626" }}>{overdueCount}</span>
            <span className="db-stat-lbl">지연</span>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="db-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`db-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="db-error">{error}</div>}

      <div className="db-body">

        {/* ── 프로젝트 정보 탭 ── */}
        {tab === "info" && (
          <div className="db-info-grid">
            {/* 기본 정보 */}
            <div className="db-info-card">
              <div className="db-info-card-title">📋 프로젝트 개요</div>
              <div className="db-info-row">
                <span className="db-info-label">주제</span>
                <span className="db-info-value">{topic || "—"}</span>
              </div>
              <div className="db-info-row">
                <span className="db-info-label">마감일</span>
                <span className="db-info-value">
                  {roomDeadline
                    ? new Date(roomDeadline).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
                    : "—"}
                </span>
              </div>
              {daysLeft !== null && (
                <div className={`db-deadline-badge ${daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warn" : "ok"}`}>
                  {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? "오늘 마감" : `D+${Math.abs(daysLeft)} 초과`}
                </div>
              )}
            </div>

            {/* 배정 가중치 */}
            <div className="db-info-card">
              <div className="db-info-card-title">⚖️ 역할 배정 가중치</div>
              {[
                { label: "🎯 역량", value: skillWeight, pct: wPct(skillWeight) },
                { label: "⏰ 가능 시간", value: timeWeight, pct: wPct(timeWeight) },
                { label: "⭐ 선호도", value: preferenceWeight, pct: wPct(preferenceWeight) },
              ].map(({ label, pct }) => (
                <div key={label} className="db-weight-row">
                  <span className="db-weight-label">{label}</span>
                  <div className="db-weight-bar">
                    <div style={{ width: `${pct}%`, background: "#2563eb" }} />
                  </div>
                  <span className="db-weight-pct">{pct}%</span>
                </div>
              ))}
              {(skillWeight + timeWeight + preferenceWeight) === 0 && (
                <div style={{ fontSize: 13, color: "#9ca3af" }}>가중치 정보가 없습니다</div>
              )}
            </div>

            {/* 역할 목록 */}
            <div className="db-info-card" style={{ gridColumn: "1 / -1" }}>
              <div className="db-info-card-title">🗂 역할 목록</div>
              <div className="db-role-chips">
                {roles.map((r, i) => (
                  <div key={r.roleId} className="db-role-chip" style={{ borderColor: COLORS[i % COLORS.length], color: COLORS[i % COLORS.length] }}>
                    {r.name}
                    {r.workload ? <span className="db-role-chip-sub"> · {r.workload}h</span> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 팀원 탭 ── */}
        {tab === "members" && (
          <div>
            <div className="db-sec-head">
              <div>
                <div className="db-sec-title">팀원 현황</div>
                <div className="db-sec-sub">팀원이 코드로 참여하면 자동으로 추가됩니다 (5초마다 갱신)</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="db-btn-ghost" onClick={loadAll}>새로고침</button>
                {members.length >= roles.length && (
                  <button className="db-btn-primary" disabled={assigning} onClick={runAssignment}>
                    {assigning ? "배정 중…" : "역할 배정 실행 →"}
                  </button>
                )}
              </div>
            </div>

            {members.length === 0 ? (
              <div className="db-empty">
                팀원 대기 중… 초대코드 <strong>{inviteCode}</strong>를 공유하세요
              </div>
            ) : (
              <div className="db-member-grid">
                {members.map((m, i) => (
                  <div key={m.memberId} className="db-member-card">
                    <div className="db-member-top">
                      <div className="db-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="db-member-name">{m.name}</div>
                        <div className="db-member-meta">주 {m.availableHours}시간 가능</div>
                      </div>
                    </div>
                    <div className="db-skill-chips">
                      {(m.skills ?? []).map((s) => (
                        <div key={s.skillName} className="db-skill-chip">
                          <span>{s.skillName}</span>
                          <span className="db-skill-stars">{"★".repeat(s.level)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {members.length > 0 && members.length < roles.length && (
              <div className="db-warn">
                역할 배정 실행에는 팀원 {roles.length}명 이상이 필요합니다 (현재 {members.length}명)
              </div>
            )}

            {assignments.length > 0 && (
              <div className="db-reassign-notice">
                💡 <strong>재배정이 필요하다면</strong> 팀원들이 초대코드 <strong>{inviteCode}</strong>로 다시 참여해 정보를 업데이트한 뒤, 역할 배정 탭에서 재배정하세요.
              </div>
            )}
          </div>
        )}

        {/* ── 역할 배정 탭 ── */}
        {tab === "assignments" && (
          <div>
            <div className="db-sec-head">
              <div>
                <div className="db-sec-title">역할 배정 결과</div>
                <div className="db-sec-sub">역량·시간·선호도를 가중 합산한 자동 배정 결과입니다</div>
              </div>
              <button className="db-btn-ghost" onClick={() => setTab("members")}>
                팀원 정보 확인 후 재배정
              </button>
            </div>

            {assignments.length === 0 ? (
              <div className="db-empty">팀원 탭에서 역할 배정을 실행하세요</div>
            ) : (
              <div className="db-assign-list">
                {assignments.map((a, i) => (
                  <div key={a.assignmentId} className="db-assign-card">
                    <div className="db-avatar" style={{ background: COLORS[i % COLORS.length] }}>
                      {a.memberName.charAt(0)}
                    </div>
                    <div className="db-assign-info">
                      <div className="db-assign-name">{a.memberName}</div>
                      <div
                        className="db-assign-role"
                        style={{ background: COLORS[i % COLORS.length] + "22", color: COLORS[i % COLORS.length] }}
                      >
                        {a.roleName}
                      </div>
                      <div className="db-assign-scores">
                        <span>역량 {Math.round(a.skillScore)}</span>
                        <span>시간 {Math.round(a.timeScore)}</span>
                        <span>선호 {Math.round(a.preferenceScore)}</span>
                      </div>
                    </div>
                    <div className="db-assign-score-col">
                      <div className="db-assign-total" style={{ color: COLORS[i % COLORS.length] }}>
                        {Math.round(a.totalScore)}
                      </div>
                      <div className="db-assign-score-lbl">적합도</div>
                      <div className="db-score-bar">
                        <div style={{ width: `${a.totalScore}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 업무 관리 탭 ── */}
        {tab === "tasks" && (
          <div>
            {/* 전체 진행률 */}
            {totalTasks > 0 && (
              <div className="db-overall-prog">
                <div className="db-op-left">
                  <div className="db-op-label">전체 진행률</div>
                  <div className="db-op-bar">
                    <div style={{ width: `${progress}%` }} />
                  </div>
                  <div className="db-op-sub">{doneTasks}개 완료 / {totalTasks}개 전체</div>
                </div>
                <div className="db-op-pct">{progress}%</div>
              </div>
            )}

            {/* 업무 추가 폼 */}
            <form className="db-task-form" onSubmit={addTask} noValidate>
              <select
                className="db-task-select"
                value={taskForm.roleId}
                onChange={(e) => setTaskForm((p) => ({ ...p, roleId: e.target.value }))}
              >
                {roles.map((r) => (
                  <option key={r.roleId} value={r.roleId}>{r.name}</option>
                ))}
              </select>
              <input
                className="db-task-input"
                placeholder="업무 제목을 입력하세요"
                value={taskForm.title}
                onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))}
              />
              <input
                className="db-task-input db-task-date"
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((p) => ({ ...p, deadline: e.target.value }))}
              />
              <button type="submit" className="db-btn-primary" disabled={taskLoading}>
                {taskLoading ? "…" : "+ 추가"}
              </button>
            </form>
            {taskError && <div className="db-task-error">{taskError}</div>}

            {/* 역할별 업무 목록 */}
            {totalTasks === 0 ? (
              <div className="db-empty">위 폼으로 첫 번째 업무를 추가하세요</div>
            ) : (
              Object.entries(tasksByRole)
                .filter(([, ts]) => ts.length > 0)
                .map(([roleName, roleTasks], ri) => {
                  const dc = roleTasks.filter((t) => t.status === "DONE").length;
                  const pct = Math.round((dc / roleTasks.length) * 100);
                  return (
                    <div key={roleName} className="db-task-group">
                      <div className="db-task-group-head">
                        <div className="db-task-group-dot" style={{ background: COLORS[ri % COLORS.length] }} />
                        <span className="db-task-group-name">{roleName}</span>
                        <span className="db-task-group-cnt">{dc}/{roleTasks.length}</span>
                        <div className="db-task-prog-wrap">
                          <div className="db-task-prog-bar">
                            <div style={{ width: `${pct}%`, background: COLORS[ri % COLORS.length] }} />
                          </div>
                          <span className="db-task-prog-pct">{pct}%</span>
                        </div>
                      </div>

                      <div className="db-task-list">
                        {roleTasks.map((t) => (
                          <div
                            key={t.taskId}
                            className={`db-task-item${t.status === "DONE" ? " done" : ""}${t.overdue && t.status !== "DONE" ? " overdue" : ""}`}
                          >
                            <select
                              className={`db-status-select st-${t.status?.toLowerCase()}`}
                              value={t.status}
                              onChange={(e) => changeStatus(t.taskId, e.target.value)}
                            >
                              <option value="TODO">○ 미완료</option>
                              <option value="IN_PROGRESS">→ 진행중</option>
                              <option value="DONE">✓ 완료</option>
                            </select>
                            <span className="db-task-title">{t.title}</span>
                            {t.overdue && t.status !== "DONE" && (
                              <span className="db-task-overdue">지연!</span>
                            )}
                            <button
                              className="db-task-del"
                              onClick={() => deleteTask(t.taskId)}
                              type="button"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ── AI 리포트 탭 ── */}
        {tab === "ai" && (
          <div>
            <div className="db-sec-head">
              <div>
                <div className="db-sec-title">AI 팀 분석 리포트</div>
                <div className="db-sec-sub">배정 결과와 업무 현황을 종합해 AI가 분석합니다</div>
              </div>
              <button
                className="db-btn-primary"
                onClick={generateAI}
                disabled={aiLoading || assignments.length === 0}
              >
                {aiLoading ? "분석 중…" : "리포트 생성"}
              </button>
            </div>
            {!aiReport ? (
              <div className="db-empty">
                {assignments.length === 0
                  ? "역할 배정 후 AI 리포트를 생성할 수 있습니다"
                  : "상단의 '리포트 생성' 버튼을 눌러주세요"}
              </div>
            ) : (
              <div className="db-ai-report">{aiReport}</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
