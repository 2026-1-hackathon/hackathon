import { useState } from "react";
import "./Analyze.css";
import TaskManagement from "./TaskManagement.jsx";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:8080";

const STEPS = [
  "프로젝트 정보",
  "역할 설정",
  "팀원 입력",
  "분석 결과",
];

const COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
];

// ── API 공통 함수 ────────────────────────────────────────────────

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `${response.status} ${response.statusText}`,
    );
  }

  return data;
}

function toDeadline(date) {
  if (!date) {
    return null;
  }

  return `${date}T23:59:00`;
}

// ── 리스크 계산 ──────────────────────────────────────────────────

function analyzeRisks(
  assignments,
  roles,
  members,
) {
  const skillGaps = [];
  const workloads = {};

  const roleMemberCounts = assignments.reduce(
    (counts, assignment) => {
      counts[assignment.role] =
        (counts[assignment.role] ?? 0) + 1;

      return counts;
    },
    {},
  );

  for (const assignment of assignments) {
    const role = roles.find(
      (item) => item.name === assignment.role,
    );

    const member = members.find(
      (item) => item.name === assignment.member,
    );

    if (!role || !member) {
      continue;
    }

    const skill =
      member.skills[assignment.role] ?? 0;

    if (skill < role.requiredSkill) {
      skillGaps.push(
        `${assignment.member} → ${assignment.role} ` +
          `(역량 ${skill}/${role.requiredSkill})`,
);
}

const assignedCount =
    roleMemberCounts[assignment.role] ?? 1;

const dividedWorkload =
    role.workload / assignedCount;

workloads[assignment.member] =
    (workloads[assignment.member] ?? 0) +
    dividedWorkload;
}

const mismatches = assignments
    .filter((assignment) => {
      const member = members.find(
          (item) => item.name === assignment.member,
      );

      return (
          member?.preferredRole &&
          member.preferredRole !== assignment.role
      );
    })
    .map((assignment) => {
      const member = members.find(
          (item) => item.name === assignment.member,
      );

      return (
          `${assignment.member} ` +
          `(선호: ${member.preferredRole} → ` +
          `배정: ${assignment.role})`
      );
    });

const totalWorkload = Object.values(
    workloads,
).reduce(
    (sum, workload) => sum + workload,
    0,
);

let topMember = null;
let topPct = 0;

for (const [name, workload] of Object.entries(
    workloads,
)) {
  const percentage =
      totalWorkload > 0
          ? (workload / totalWorkload) * 100
          : 0;

  if (percentage > topPct) {
    topPct = percentage;
    topMember = name;
  }
}

const totalCapacity = members.reduce(
    (sum, member) =>
        sum + member.availableHours,
    0,
);

const totalRequiredHours = roles.reduce(
    (sum, role) => sum + role.workload,
    0,
);

const shortage =
    totalRequiredHours - totalCapacity;

const riskScore =
    skillGaps.length +
    mismatches.length +
    (topPct > 50 ? 1 : 0) +
    (shortage > 0 ? 2 : 0);

return {
  skillGaps,
  mismatches,

  concentrated: topPct > 50,
  topMember,
  topPct: Math.round(topPct),

  short: shortage > 0,
  shortageH: Math.max(shortage, 0),

  riskScore,

  riskLevel:
      riskScore <= 2
          ? "낮음"
          : riskScore <= 4
              ? "보통"
              : "높음",
};
}

function buildPrompt(
    projectName,
    assignments,
    risks,
) {
  let prompt =
      "팀 프로젝트 분석 결과야. 팀장이 이해하기 쉽게 " +
      "핵심 리스크와 개선 방안을 3~5문장으로 설명해줘. " +
      "한국어로.\n";

  prompt += `프로젝트: ${projectName}\n`;

  prompt +=
      "역할 배정: " +
      assignments
          .map(
              (assignment) =>
                  `${assignment.member}→` +
                  `${assignment.role}` +
                  `(${assignment.score}점)`,
          )
          .join(", ") +
      "\n";

  if (risks.skillGaps.length) {
    prompt +=
        `역량 부족: ${risks.skillGaps.join(", ")}\n`;
  }

  if (risks.mismatches.length) {
    prompt +=
        `선호 불일치: ${risks.mismatches.join(", ")}\n`;
  }

  if (risks.concentrated) {
    prompt +=
        `업무 집중: ${risks.topMember} ` +
        `(${risks.topPct}%)\n`;
  }

  if (risks.short) {
    prompt +=
        `일정 부족: ${Math.round(
            risks.shortageH,
        )}시간\n`;
  }

  return prompt;
}

// ── 공용 컴포넌트 ────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((number) => (
            <button
                key={number}
                type="button"
                className={`star ${
                    number <= value ? "on" : ""
                }`}
                onClick={() => onChange(number)}
            >
              ★
            </button>
        ))}
      </div>
  );
}

function StepBar({ current }) {
  return (
      <div className="stepbar">
        {STEPS.map((label, index) => {
          const number = index + 1;

          return (
              <div
                  key={number}
                  className="stepbar-item"
              >
                <div
                    className={
                        `stepbar-circle ` +
                        `${
                            number < current
                                ? "done"
                                : number === current
                                    ? "active"
                                    : ""
                        }`
                    }
                >
                  {number < current ? "✓" : number}
                </div>

                <div
                    className={
                        `stepbar-label ` +
                        `${
                            number === current
                                ? "active"
                                : ""
                        }`
                    }
                >
                  {label}
                </div>

                {index < STEPS.length - 1 && (
                    <div
                        className={
                            `stepbar-line ` +
                            `${number < current ? "done" : ""}`
                        }
                    />
                )}
              </div>
          );
        })}
      </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────

function Step1({
                 project,
                 setProject,
                 onNext,
               }) {
  const weights = project.weights;

  const total =
      weights.skill +
      weights.time +
      weights.preference || 1;

  const setWeight = (key, value) => {
    setProject((previous) => ({
      ...previous,
      weights: {
        ...previous.weights,
        [key]: Number(value) || 1,
      },
    }));
  };

  return (
      <div className="az-card">
        <div className="az-card-head">
          <div className="az-card-emoji">
            📌
          </div>

          <div>
            <h2 className="az-card-title">
              어떤 팀플인가요?
            </h2>

            <p className="az-card-desc">
              기본 정보와 역할 배정 시 우선순위를
              설정합니다
            </p>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label className="field-label">
              프로젝트명
            </label>

            <input
                className="field-input"
                type="text"
                value={project.name}
                onChange={(event) =>
                    setProject((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                }
                placeholder="예: 캡스톤 디자인 2팀"
            />
          </div>

          <div className="field">
            <label className="field-label">
              마감일
            </label>

            <input
                className="field-input"
                type="date"
                value={project.deadline}
                onChange={(event) =>
                    setProject((previous) => ({
                      ...previous,
                      deadline: event.target.value,
                    }))
                }
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label">
            프로젝트 주제
          </label>

          <input
              className="field-input"
              type="text"
              value={project.topic}
              onChange={(event) =>
                  setProject((previous) => ({
                    ...previous,
                    topic: event.target.value,
                  }))
              }
              placeholder="예: 팀 역할 자동 분배 서비스"
          />
        </div>

        <div className="weight-section">
          <label className="field-label">
            역할 배정 우선순위{" "}
            <span className="hint">
            (슬라이더로 조정 · 자동 정규화)
          </span>
          </label>

          <div className="weight-cards">
            {[
              {
                key: "skill",
                label: "역량",
                emoji: "🎯",
                value: weights.skill,
              },
              {
                key: "time",
                label: "가능 시간",
                emoji: "⏰",
                value: weights.time,
              },
              {
                key: "preference",
                label: "선호도",
                emoji: "💙",
                value: weights.preference,
              },
            ].map(
                ({
                   key,
                   label,
                   emoji,
                   value,
                 }) => (
                    <div
                        key={key}
                        className="weight-card"
                    >
                      <div className="weight-card-top">
                  <span>
                    {emoji} {label}
                  </span>

                        <span className="weight-pct">
                    {Math.round(
                        (value / total) * 100,
                    )}
                          %
                  </span>
                      </div>

                      <input
                          type="range"
                          min={1}
                          max={10}
                          value={value}
                          onChange={(event) =>
                              setWeight(
                                  key,
                                  event.target.value,
                              )
                          }
                      />

                      <div
                          className="weight-bar"
                          style={{
                            width: `${(value / 10) * 100}%`,
                          }}
                      />
                    </div>
                ),
            )}
          </div>
        </div>

        <div className="az-actions">
          <button
              className="btn-next"
              onClick={onNext}
              disabled={
                  !project.name.trim() ||
                  !project.topic.trim() ||
                  !project.deadline
              }
          >
            다음 단계 →
          </button>
        </div>
      </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────

function Step2({
                 roles,
                 setRoles,
                 onNext,
                 onBack,
               }) {
  const [form, setForm] = useState({
    name: "",
    workload: 20,
    requiredSkill: 3,
  });

  const add = () => {
    const roleName = form.name.trim();

    if (
        !roleName ||
        roles.some(
            (role) => role.name === roleName,
        )
    ) {
      return;
    }

    setRoles((previous) => [
      ...previous,
      {
        ...form,
        name: roleName,
      },
    ]);

    setForm({
      name: "",
      workload: 20,
      requiredSkill: 3,
    });
  };

  return (
      <div className="az-card">
        <div className="az-card-head">
          <div className="az-card-emoji">
            🗂
          </div>

          <div>
            <h2 className="az-card-title">
              어떤 역할이 필요한가요?
            </h2>

            <p className="az-card-desc">
              역할마다 최소 한 명이 배정되며,
              남은 팀원은 적합한 역할로 배정됩니다
            </p>
          </div>
        </div>

        <div className="add-box">
          <div className="field-row">
            <div className="field flex2">
              <label className="field-label">
                역할명
              </label>

              <input
                  className="field-input"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                  }
                  placeholder="예: 백엔드 개발"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add();
                    }
                  }}
              />
            </div>

            <div className="field">
              <label className="field-label">
                업무량 (h)
              </label>

              <input
                  className="field-input"
                  type="number"
                  min={1}
                  value={form.workload}
                  onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        workload: Number(
                            event.target.value,
                        ),
                      }))
                  }
              />
            </div>
          </div>

          <div className="field-row align-end">
            <div className="field flex2">
              <label className="field-label">
                요구 역량 수준
              </label>

              <StarRating
                  value={form.requiredSkill}
                  onChange={(value) =>
                      setForm((previous) => ({
                        ...previous,
                        requiredSkill: value,
                      }))
                  }
              />
            </div>

            <button
                type="button"
                className="btn-add"
                onClick={add}
            >
              + 역할 추가
            </button>
          </div>
        </div>

        {roles.length > 0 ? (
            <div className="role-cards">
              {roles.map((role, index) => (
                  <div
                      key={`${role.name}-${index}`}
                      className="role-card"
                      style={{
                        borderLeftColor:
                            COLORS[index % COLORS.length],
                      }}
                  >
                    <div className="role-card-top">
                <span className="role-card-name">
                  {role.name}
                </span>

                      <button
                          type="button"
                          className="del-btn"
                          onClick={() =>
                              setRoles((previous) =>
                                  previous.filter(
                                      (_, roleIndex) =>
                                          roleIndex !== index,
                                  ),
                              )
                          }
                      >
                        ×
                      </button>
                    </div>

                    <div className="role-card-meta">
                      <span>👥 최소 1명</span>

                      <span>
                  ⏱ {role.workload}h
                </span>

                      <span>
                  {"★".repeat(
                      role.requiredSkill,
                  )}

                        {"☆".repeat(
                            5 - role.requiredSkill,
                        )}
                </span>
                    </div>
                  </div>
              ))}
            </div>
        ) : (
            <div className="empty-box">
              역할을 추가하면 여기에 표시됩니다
            </div>
        )}

        <div className="az-actions">
          <button
              className="btn-back"
              onClick={onBack}
          >
            ← 이전
          </button>

          <button
              className="btn-next"
              onClick={onNext}
              disabled={roles.length === 0}
          >
            다음 단계 →
          </button>
        </div>
      </div>
  );
}

// ── Step 3 ────────────────────────────────────────────────────────

function Step3({
                 roles,
                 members,
                 setMembers,
                 onNext,
                 onBack,
                 loading,
               }) {
  const createEmptyMember = () => ({
    name: "",
    availableHours: 10,

    preferredRole:
        roles[0]?.name ?? "",

    skills: Object.fromEntries(
        roles.map((role) => [
          role.name,
          3,
        ]),
    ),
  });

  const [form, setForm] = useState(
      createEmptyMember,
  );

  const add = () => {
    const memberName = form.name.trim();

    if (!memberName) {
      return;
    }

    if (
        members.some(
            (member) =>
                member.name === memberName,
        )
    ) {
      return;
    }

    setMembers((previous) => [
      ...previous,
      {
        ...form,
        name: memberName,
      },
    ]);

    setForm(createEmptyMember());
  };

  const enoughMembers =
      members.length >= roles.length;

  return (
      <div className="az-card">
        <div className="az-card-head">
          <div className="az-card-emoji">
            👥
          </div>

          <div>
            <h2 className="az-card-title">
              팀원을 소개해주세요
            </h2>

            <p className="az-card-desc">
              각 팀원의 투자 가능 시간, 선호 역할,
              역할별 역량을 입력하세요
            </p>
          </div>
        </div>

        <div className="add-box">
          <div className="field-row">
            <div className="field flex2">
              <label className="field-label">
                이름
              </label>

              <input
                  className="field-input"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                  }
                  placeholder="예: 김철수"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      add();
                    }
                  }}
              />
            </div>

            <div className="field">
              <label className="field-label">
                투자 가능 시간
              </label>

              <div className="hour-input">
                <input
                    className="field-input"
                    type="number"
                    min={1}
                    max={500}
                    value={form.availableHours}
                    onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          availableHours: Number(
                              event.target.value,
                          ),
                        }))
                    }
                />

                <span className="hour-unit">
                h
              </span>
              </div>
            </div>

            <div className="field">
              <label className="field-label">
                선호 역할
              </label>

              <select
                  className="field-input"
                  value={form.preferredRole}
                  onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        preferredRole:
                        event.target.value,
                      }))
                  }
              >
                {roles.map((role) => (
                    <option
                        key={role.name}
                        value={role.name}
                    >
                      {role.name}
                    </option>
                ))}
              </select>
            </div>
          </div>

          <div className="skill-section">
            <label className="field-label">
              역할별 역량 수준
            </label>

            <div className="skill-rows">
              {roles.map((role) => (
                  <div
                      key={role.name}
                      className="skill-row"
                  >
                <span className="skill-role-name">
                  {role.name}
                </span>

                    <StarRating
                        value={
                            form.skills[
                                role.name
                                ] ?? 3
                        }
                        onChange={(value) =>
                            setForm((previous) => ({
                              ...previous,

                              skills: {
                                ...previous.skills,
                                [role.name]: value,
                              },
                            }))
                        }
                    />
                  </div>
              ))}
            </div>
          </div>

          <button
              type="button"
              className="btn-add-full"
              onClick={add}
          >
            + 팀원 추가
          </button>
        </div>

        {members.length > 0 && (
            <div className="member-cards">
              {members.map(
                  (member, index) => (
                      <div
                          key={`${member.name}-${index}`}
                          className="member-card"
                      >
                        <div className="member-card-top">
                          <div
                              className="member-avatar"
                              style={{
                                background:
                                    COLORS[
                                    index %
                                    COLORS.length
                                        ],
                              }}
                          >
                            {member.name[0]}
                          </div>

                          <div className="member-card-info">
                            <div className="member-card-name">
                              {member.name}
                            </div>

                            <div className="member-card-meta">
                              투자 가능{" "}
                              {member.availableHours}h ·
                              선호:{" "}
                              {member.preferredRole}
                            </div>
                          </div>

                          <button
                              type="button"
                              className="del-btn"
                              onClick={() =>
                                  setMembers(
                                      (previous) =>
                                          previous.filter(
                                              (
                                                  _,
                                                  memberIndex,
                                              ) =>
                                                  memberIndex !==
                                                  index,
                                          ),
                                  )
                              }
                          >
                            ×
                          </button>
                        </div>

                        <div className="member-skills">
                          {roles.map((role) => (
                              <div
                                  key={role.name}
                                  className="member-skill-chip"
                              >
                      <span>
                        {role.name}
                      </span>

                                <span className="skill-stars-sm">
                        {"★".repeat(
                            member.skills[
                                role.name
                                ] ?? 0,
                        )}

                                  {"☆".repeat(
                                      5 -
                                      (member.skills[
                                          role.name
                                          ] ?? 0),
                                  )}
                      </span>
                              </div>
                          ))}
                        </div>
                      </div>
                  ),
              )}
            </div>
        )}

        {members.length === 0 && (
            <div className="empty-box">
              팀원을 추가하면 여기에 카드로
              표시됩니다
            </div>
        )}

        {!enoughMembers &&
            members.length > 0 && (
                <div className="az-inline-warning">
                  모든 역할에 최소 한 명이 필요합니다.
                  현재 역할 {roles.length}개, 팀원{" "}
                  {members.length}명입니다.
                </div>
            )}

        <div className="az-actions">
          <button
              className="btn-back"
              onClick={onBack}
          >
            ← 이전
          </button>

          <button
              className="btn-next"
              onClick={onNext}
              disabled={
                  !enoughMembers || loading
              }
          >
            {loading ? (
                <span className="loading-dots">
              <span />
              <span />
              <span /> 분석 중...
            </span>
            ) : (
                "분석 시작 →"
            )}
          </button>
        </div>
      </div>
  );
}

// ── Step 4 ────────────────────────────────────────────────────────

function Step4({
                 result,
                 projectName,
                 inviteCode,
                 onReset,
                 onOpenTasks,
               }) {
  const {
    assignments,
    risks,
    aiReport,
  } = result;

  const riskMeta = {
    낮음: {
      color: "#16a34a",
      bg: "#f0fdf4",
      label: "✓ 리스크 낮음",
    },

    보통: {
      color: "#d97706",
      bg: "#fffbeb",
      label: "⚠ 리스크 보통",
    },

    높음: {
      color: "#dc2626",
      bg: "#fff1f2",
      label: "🚨 리스크 높음",
    },
  }[risks.riskLevel];

  return (
      <div className="result-page">
        <div
            className="result-banner"
            style={{
              background: riskMeta.bg,
              borderColor: riskMeta.color,
            }}
        >
          <div className="result-banner-left">
            <div className="result-proj-name">
              {projectName}
            </div>

            <div className="result-proj-sub">
              분석 완료 · 총{" "}
              {assignments.length}명 배정 ·
              리스크 점수{" "}
              {risks.riskScore}점
            </div>

            <div className="result-invite-code">
              초대 코드:{" "}
              <strong>{inviteCode}</strong>
            </div>
          </div>

          <div
              className="result-risk-pill"
              style={{
                color: riskMeta.color,
                borderColor: riskMeta.color,
              }}
          >
            {riskMeta.label}
          </div>
        </div>

        <div className="az-card">
          <h3 className="section-title">
            📋 역할 배정 결과
          </h3>

          <p className="section-sub">
            역량·가능 시간·선호도 가중치 기반
            자동 배정
          </p>

          <div className="assign-cards">
            {assignments.map(
                (assignment, index) => (
                    <div
                        key={
                            assignment.assignmentId ??
                            `${assignment.member}-${index}`
                        }
                        className="assign-card"
                    >
                      <div
                          className="assign-avatar"
                          style={{
                            background:
                                COLORS[
                                index % COLORS.length
                                    ],
                          }}
                      >
                        {assignment.member[0]}
                      </div>

                      <div className="assign-info">
                        <div className="assign-name">
                          {assignment.member}
                        </div>

                        <div
                            className="assign-role-tag"
                            style={{
                              color:
                                  COLORS[
                                  index %
                                  COLORS.length
                                      ],

                              background:
                                  COLORS[
                                  index %
                                  COLORS.length
                                      ] + "18",
                            }}
                        >
                          {assignment.role}
                        </div>
                      </div>

                      <div className="assign-score-wrap">
                        <div
                            className="assign-score-num"
                            style={{
                              color:
                                  COLORS[
                                  index %
                                  COLORS.length
                                      ],
                            }}
                        >
                          {assignment.score}
                        </div>

                        <div className="assign-score-label">
                          점
                        </div>

                        <div className="assign-score-bar">
                          <div
                              style={{
                                width: `${Math.min(
                                    assignment.score,
                                    100,
                                )}%`,

                                background:
                                    COLORS[
                                    index %
                                    COLORS.length
                                        ],
                              }}
                          />
                        </div>
                      </div>
                    </div>
                ),
            )}
          </div>
        </div>

        <div className="az-card">
          <h3 className="section-title">
            ⚠️ 리스크 분석
          </h3>

          <p className="section-sub">
            규칙 기반 계산
          </p>

          <div className="risk-grid">
            {[
              {
                title: "Skill Gap",
                sub: "역량 부족 분석",

                type:
                    risks.skillGaps.length > 0
                        ? "warn"
                        : "ok",

                body:
                    risks.skillGaps.length === 0
                        ? "역량 부족 없음"
                        : risks.skillGaps.join(
                            "\n",
                        ),
              },

              {
                title: "선호 불일치",
                sub: "Person-Job Fit",

                type:
                    risks.mismatches.length > 0
                        ? "warn"
                        : "ok",

                body:
                    risks.mismatches.length === 0
                        ? "전원 선호 역할 배정"
                        : risks.mismatches.join(
                            "\n",
                        ),
              },

              {
                title: "업무 집중",
                sub: "Workload Balance",

                type: risks.concentrated
                    ? "danger"
                    : "ok",

                body: risks.concentrated
                    ? `${risks.topMember}에게 ` +
                    `${risks.topPct}% 집중`
                    : "업무 균형 양호",
              },

              {
                title: "일정 부족",
                sub: "Capacity Planning",

                type: risks.short
                    ? "danger"
                    : "ok",

                body: risks.short
                    ? `${Math.round(
                        risks.shortageH,
                    )}시간 부족`
                    : "일정 여유 있음",
              },
            ].map((item) => (
                <div
                    key={item.title}
                    className={
                        `risk-card ` +
                        `rk-${item.type}`
                    }
                >
                  <div className="risk-card-header">
                <span className="risk-card-icon">
                  {item.type === "ok"
                      ? "✓"
                      : item.type === "warn"
                          ? "⚠"
                          : "🚨"}
                </span>

                    <div>
                      <div className="risk-card-title">
                        {item.title}
                      </div>

                      <div className="risk-card-sub">
                        {item.sub}
                      </div>
                    </div>
                  </div>

                  <div className="risk-card-body">
                    {item.body}
                  </div>
                </div>
            ))}
          </div>
        </div>

        <div className="az-card ai-report-card">
          <h3 className="section-title">
            🤖 AI 분석 리포트
          </h3>

          <p className="section-sub">
            계산 결과를 바탕으로 AI가 설명·개선안
            제안
          </p>

          <div className="ai-report-body">
            <p>{aiReport}</p>
          </div>
        </div>

        <div className="result-bottom-actions">
          <button
              className="btn-reset"
              onClick={onReset}
          >
            ↺ 새로 분석하기
          </button>

          <button
              className="btn-task-open"
              onClick={onOpenTasks}
          >
            역할별 업무 관리 →
          </button>
        </div>
      </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────

export default function Analyze({ onBack }) {
  const [step, setStep] = useState(1);

  const [activeView, setActiveView] =
      useState("analysis");

  const [project, setProject] = useState({
    name: "",
    topic: "",
    deadline: "",

    weights: {
      skill: 5,
      time: 3,
      preference: 2,
    },
  });

  const [roles, setRoles] = useState([]);
  const [members, setMembers] =
      useState([]);

  const [result, setResult] =
      useState(null);

  const [workspace, setWorkspace] =
      useState(null);

  const [loading, setLoading] =
      useState(false);

  const [error, setError] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");

    try {
      // 1. 방과 역할 생성
      const createdRoom = await apiRequest(
          "/api/rooms",
          {
            method: "POST",

            body: JSON.stringify({
              title: project.name,
              topic: project.topic,

              skillWeight:
              project.weights.skill,

              timeWeight:
              project.weights.time,

              preferenceWeight:
              project.weights.preference,

              deadline: toDeadline(
                  project.deadline,
              ),

              roles: roles.map((role) => ({
                name: role.name,

                workload:
                    Number(role.workload),

                description:
                    `요구 역량 ` +
                    `${role.requiredSkill}/5`,
              })),
            }),
          },
      );

      // 2. 생성된 역할 ID 조회
      const roomInfo = await apiRequest(
          `/api/rooms/invite/` +
          `${createdRoom.inviteCode}`,
      );

      // 3. 팀원 저장
      await Promise.all(
          members.map((member) =>
              apiRequest(
                  `/api/rooms/invite/` +
                  `${createdRoom.inviteCode}` +
                  `/members`,
                  {
                    method: "POST",

                    body: JSON.stringify({
                      name: member.name,

                      availableHours:
                          Number(
                              member.availableHours,
                          ),

                      skills: roomInfo.roles.map(
                          (role) => ({
                            skillName: role.name,

                            level:
                                member.skills[
                                    role.name
                                    ] ?? 3,
                          }),
                      ),

                      preferences:
                          roomInfo.roles.map(
                              (role) => ({
                                roleId: role.roleId,

                                score:
                                    member.preferredRole ===
                                    role.name
                                        ? 5
                                        : 3,
                              }),
                          ),
                    }),
                  },
              ),
          ),
      );

      // 4. 백엔드 역할 자동 분배
      const backendAssignments =
          await apiRequest(
              `/api/rooms/` +
              `${roomInfo.roomId}` +
              `/assignments`,
              {
                method: "POST",
              },
          );

      const assignments =
          backendAssignments.map(
              (assignment) => ({
                assignmentId:
                assignment.assignmentId,

                memberId:
                assignment.memberId,

                member:
                assignment.memberName,

                roleId:
                assignment.roleId,

                role:
                assignment.roleName,

                score: Math.round(
                    assignment.totalScore,
                ),

                skillScore:
                assignment.skillScore,

                timeScore:
                assignment.timeScore,

                preferenceScore:
                assignment.preferenceScore,
              }),
          );

      const risks = analyzeRisks(
          assignments,
          roles,
          members,
      );

      let aiReport =
          "AI 리포트를 불러오지 못했습니다. " +
          "역할 배정 결과와 리스크 분석은 정상적으로 저장되었습니다.";

      try {
        const aiResult = await apiRequest(
            "/api/ai/chat",
            {
              method: "POST",

              body: JSON.stringify({
                message: buildPrompt(
                    project.name,
                    assignments,
                    risks,
                ),
              }),
            },
        );

        aiReport =
            aiResult?.reply ?? aiReport;
      } catch {
        // AI 호출 실패는 전체 분석 실패로 처리하지 않음
      }

      setWorkspace({
        roomId: roomInfo.roomId,

        inviteCode:
        createdRoom.inviteCode,

        roles: roomInfo.roles,
      });

      setResult({
        assignments,
        risks,
        aiReport,
      });

      setStep(4);
    } catch (requestError) {
      console.error(requestError);
      setError(requestError.message);
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

    setProject({
      name: "",
      topic: "",
      deadline: "",

      weights: {
        skill: 5,
        time: 3,
        preference: 2,
      },
    });
  };

  return (
      <div className="az-page">
        <div className="az-header">
          <button
              className="az-back"
              onClick={onBack}
          >
            ← 홈으로
          </button>

          <span className="az-logo">
          팀가드
        </span>

          <div style={{ width: 80 }} />
        </div>

        <div className="az-body">
          {activeView === "tasks" &&
          workspace ? (
              <TaskManagement
                  roomId={workspace.roomId}

                  inviteCode={
                    workspace.inviteCode
                  }

                  roles={workspace.roles}

                  onBack={() =>
                      setActiveView("analysis")
                  }
              />
          ) : (
              <>
                <StepBar current={step} />

                {error && (
                    <div className="az-api-error">
                      {error}
                    </div>
                )}

                {step === 1 && (
                    <Step1
                        project={project}
                        setProject={setProject}
                        onNext={() => setStep(2)}
                    />
                )}

                {step === 2 && (
                    <Step2
                        roles={roles}
                        setRoles={setRoles}
                        onNext={() => setStep(3)}
                        onBack={() => setStep(1)}
                    />
                )}

                {step === 3 && (
                    <Step3
                        roles={roles}
                        members={members}
                        setMembers={setMembers}
                        onNext={run}
                        onBack={() => setStep(2)}
                        loading={loading}
                    />
                )}

                {step === 4 &&
                    result &&
                    workspace && (
                        <Step4
                            result={result}

                            projectName={
                              project.name
                            }

                            inviteCode={
                              workspace.inviteCode
                            }

                            onReset={reset}

                            onOpenTasks={() =>
                                setActiveView("tasks")
                            }
                        />
                    )}
              </>
          )}
        </div>
      </div>
  );
}
