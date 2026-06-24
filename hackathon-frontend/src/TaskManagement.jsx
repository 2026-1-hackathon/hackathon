
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import "./TaskManagement.css";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:8080";

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

export default function TaskManagement({
  roomId,
  inviteCode,
  roles = [],
  onBack,
}) {
  const [tasks, setTasks] = useState([]);

  const [taskForm, setTaskForm] = useState({
    roleId: roles[0]?.roleId ?? "",
    title: "",
    description: "",
    estimatedHours: 1,
    deadline: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(
    async (showMessage = false) => {
      if (!roomId) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const result = await apiRequest(
          `/api/rooms/${roomId}/tasks`,
);

setTasks(result ?? []);

if (showMessage) {
    setMessage("업무 목록을 새로고침했습니다.");
}
} catch (requestError) {
    setError(requestError.message);
} finally {
    setLoading(false);
}
},
[roomId],
);

useEffect(() => {
    loadTasks();
}, [loadTasks]);

useEffect(() => {
    if (roles.length === 0) {
        return;
    }

    const currentRoleExists = roles.some(
        (role) =>
            String(role.roleId) ===
            String(taskForm.roleId),
    );

    if (!currentRoleExists) {
        setTaskForm((previous) => ({
            ...previous,
            roleId: roles[0].roleId,
        }));
    }
}, [roles, taskForm.roleId]);

const groupedTasks = useMemo(() => {
    return roles.map((role) => ({
        role,
        tasks: tasks.filter(
            (task) =>
                String(task.roleId) ===
                String(role.roleId),
        ),
    }));
}, [roles, tasks]);

const updateTaskForm = (field, value) => {
    setTaskForm((previous) => ({
        ...previous,
        [field]: value,
    }));
};

const createTask = async (event) => {
    event.preventDefault();

    if (!roomId) {
        setError("방 정보가 없습니다.");
        return;
    }

    if (!taskForm.roleId) {
        setError("역할을 선택하세요.");
        return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
        await apiRequest(
            `/api/rooms/${roomId}/roles/${taskForm.roleId}/tasks`,
            {
                method: "POST",
                body: JSON.stringify({
                    title: taskForm.title.trim(),
                    description:
                        taskForm.description.trim(),
                    estimatedHours: Number(
                        taskForm.estimatedHours,
                    ),
                    deadline: taskForm.deadline,
                }),
            },
        );

        setTaskForm((previous) => ({
            roleId: previous.roleId,
            title: "",
            description: "",
            estimatedHours: 1,
            deadline: "",
        }));

        await loadTasks();
        setMessage("업무가 추가되었습니다.");
    } catch (requestError) {
        setError(requestError.message);
    } finally {
        setLoading(false);
    }
};

const updateTaskStatus = async (
    taskId,
    status,
) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
        const updatedTask = await apiRequest(
            `/api/tasks/${taskId}/status`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    status,
                }),
            },
        );

        setTasks((previous) =>
            previous.map((task) =>
                task.taskId === taskId
                    ? updatedTask
                    : task,
            ),
        );

        setMessage("업무 상태가 변경되었습니다.");
    } catch (requestError) {
        setError(requestError.message);
    } finally {
        setLoading(false);
    }
};

const deleteTask = async (taskId) => {
    const confirmed = window.confirm(
        "이 업무를 삭제하시겠습니까?",
    );

    if (!confirmed) {
        return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
        await apiRequest(`/api/tasks/${taskId}`, {
            method: "DELETE",
        });

        setTasks((previous) =>
            previous.filter(
                (task) => task.taskId !== taskId,
            ),
        );

        setMessage("업무가 삭제되었습니다.");
    } catch (requestError) {
        setError(requestError.message);
    } finally {
        setLoading(false);
    }
};

if (!roomId) {
    return (
        <div className="task-page">
            <button
                type="button"
                className="task-back-button"
                onClick={onBack}
            >
                ← 분석 결과로
            </button>

            <div className="task-empty-room">
                먼저 분석을 완료해 방을 생성하세요.
            </div>
        </div>
    );
}

return (
    <div className="task-page">
        <header className="task-page-header">
            <div>
                <button
                    type="button"
                    className="task-back-button"
                    onClick={onBack}
                >
                    ← 분석 결과로
                </button>

                <h1 className="task-page-title">
                    역할별 업무 관리
                </h1>

                <p className="task-page-description">
                    역할별 업무와 기한, 진행 상태를
                    관리합니다.
                </p>

                {inviteCode && (
                    <p className="task-invite-code">
                        초대 코드:{" "}
                        <strong>{inviteCode}</strong>
                    </p>
                )}
            </div>

            <button
                type="button"
                className="task-refresh-button"
                disabled={loading}
                onClick={() => loadTasks(true)}
            >
                새로고침
            </button>
        </header>

        {message && (
            <div className="task-message">
                {message}
            </div>
        )}

        {error && (
            <div className="task-error">
                {error}
            </div>
        )}

        <section className="task-card">
            <div className="task-section-heading">
                <div>
                    <h2>업무 추가</h2>
                    <p>
                        역할과 예상 작업시간, 업무 기한을
                        입력하세요.
                    </p>
                </div>
            </div>

            <form
                className="task-create-form"
                onSubmit={createTask}
            >
                <div className="task-form-row">
                    <label className="task-field">
                        <span>역할</span>

                        <select
                            required
                            value={taskForm.roleId}
                            onChange={(event) =>
                                updateTaskForm(
                                    "roleId",
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">
                                역할 선택
                            </option>

                            {roles.map((role) => (
                                <option
                                    key={role.roleId}
                                    value={role.roleId}
                                >
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="task-field task-field-wide">
                        <span>업무명</span>

                        <input
                            required
                            type="text"
                            placeholder="예: 로그인 API 구현"
                            value={taskForm.title}
                            onChange={(event) =>
                                updateTaskForm(
                                    "title",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <label className="task-field">
                        <span>예상 작업시간</span>

                        <div className="task-hours-input">
                            <input
                                required
                                type="number"
                                min="1"
                                value={taskForm.estimatedHours}
                                onChange={(event) =>
                                    updateTaskForm(
                                        "estimatedHours",
                                        event.target.value,
                                    )
                                }
                            />

                            <span>h</span>
                        </div>
                    </label>
                </div>

                <div className="task-form-row">
                    <label className="task-field task-field-wide">
                        <span>업무 설명</span>

                        <textarea
                            placeholder="업무 내용을 입력하세요."
                            value={taskForm.description}
                            onChange={(event) =>
                                updateTaskForm(
                                    "description",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <label className="task-field">
                        <span>업무 기한</span>

                        <input
                            required
                            type="datetime-local"
                            value={taskForm.deadline}
                            onChange={(event) =>
                                updateTaskForm(
                                    "deadline",
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                </div>

                <button
                    type="submit"
                    className="task-submit-button"
                    disabled={
                        loading || roles.length === 0
                    }
                >
                    {loading
                        ? "처리 중..."
                        : "+ 업무 추가"}
                </button>
            </form>
        </section>

        <div className="task-role-list">
            {groupedTasks.map(
                ({ role, tasks: roleTasks }) => (
                    <section
                        className="task-card"
                        key={role.roleId}
                    >
                        <div className="task-role-heading">
                            <div>
                                <h2>{role.name}</h2>

                                <p>
                                    역할에 등록된 업무를 관리합니다.
                                </p>
                            </div>

                            <span className="task-count">
                  {roleTasks.length}개
                </span>
                        </div>

                        {roleTasks.length === 0 ? (
                            <div className="task-empty">
                                등록된 업무가 없습니다.
                            </div>
                        ) : (
                            <div className="task-items">
                                {roleTasks.map((task) => (
                                    <article
                                        className={`task-item task-status-${task.status.toLowerCase()}`}
                                        key={task.taskId}
                                    >
                                        <div className="task-item-content">
                                            <div className="task-item-title-row">
                                                <h3>{task.title}</h3>

                                                {task.overdue &&
                                                    task.status !==
                                                    "DONE" && (
                                                        <span className="task-overdue">
                                기한 지남
                              </span>
                                                    )}
                                            </div>

                                            <p className="task-item-description">
                                                {task.description ||
                                                    "업무 설명이 없습니다."}
                                            </p>

                                            <div className="task-item-meta">
                          <span>
                            예상 작업시간{" "}
                              <strong>
                              {task.estimatedHours}h
                            </strong>
                          </span>

                                                <span>
                            기한{" "}
                                                    <strong>
                              {new Date(
                                  task.deadline,
                              ).toLocaleString(
                                  "ko-KR",
                              )}
                            </strong>
                          </span>
                                            </div>
                                        </div>

                                        <div className="task-item-actions">
                                            <select
                                                className="task-status-select"
                                                value={task.status}
                                                disabled={loading}
                                                onChange={(event) =>
                                                    updateTaskStatus(
                                                        task.taskId,
                                                        event.target.value,
                                                    )
                                                }
                                            >
                                                <option value="TODO">
                                                    아직 안 함
                                                </option>

                                                <option value="IN_PROGRESS">
                                                    하는 중
                                                </option>

                                                <option value="DONE">
                                                    완료
                                                </option>
                                            </select>

                                            <button
                                                type="button"
                                                className="task-delete-button"
                                                disabled={loading}
                                                onClick={() =>
                                                    deleteTask(task.taskId)
                                                }
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                ),
            )}
        </div>
    </div>
);
}
