import { useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

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
        const message =
            data?.message ||
            data?.error ||
            `${response.status} ${response.statusText}`;

        throw new Error(message);
    }

    return data;
}

function App() {
    const [roomForm, setRoomForm] = useState({
        title: "",
        topic: "",
        skillWeight: 6,
        timeWeight: 6,
        preferenceWeight: 2,
        deadline: "",
        roles: [
            {
                name: "백엔드",
                workload: 20,
                description: "API와 데이터베이스 구현",
            },
            {
                name: "프론트엔드",
                workload: 15,
                description: "React 화면 구현",
            },
        ],
    });

    const [inviteCode, setInviteCode] = useState("");
    const [room, setRoom] = useState(null);
    const [members, setMembers] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [memberForm, setMemberForm] = useState({
        name: "",
        availableHours: 10,
        roleInputs: {},
    });

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const startAction = () => {
        setLoading(true);
        setMessage("");
        setError("");
    };

    const finishAction = () => {
        setLoading(false);
    };

    const updateRoomField = (field, value) => {
        setRoomForm((previous) => ({
            ...previous,
            [field]: value,
        }));
    };

    const updateRole = (index, field, value) => {
        setRoomForm((previous) => ({
            ...previous,
            roles: previous.roles.map((role, roleIndex) =>
                roleIndex === index
                    ? {
                        ...role,
                        [field]: value,
                    }
                    : role,
            ),
        }));
    };

    const addRole = () => {
        setRoomForm((previous) => ({
            ...previous,
            roles: [
                ...previous.roles,
                {
                    name: "",
                    workload: 10,
                    description: "",
                },
            ],
        }));
    };

    const removeRole = (index) => {
        setRoomForm((previous) => ({
            ...previous,
            roles: previous.roles.filter(
                (_, roleIndex) => roleIndex !== index,
            ),
        }));
    };

    const createRoom = async (event) => {
        event.preventDefault();
        startAction();

        try {
            const payload = {
                title: roomForm.title,
                topic: roomForm.topic,
                skillWeight: Number(roomForm.skillWeight),
                timeWeight: Number(roomForm.timeWeight),
                preferenceWeight: Number(roomForm.preferenceWeight),
                deadline: roomForm.deadline,
                roles: roomForm.roles.map((role) => ({
                    name: role.name,
                    workload: Number(role.workload),
                    description: role.description,
                })),
            };

            const result = await apiRequest("/api/rooms", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            setInviteCode(result.inviteCode);
            setMessage(`방 생성 완료: 초대 코드 ${result.inviteCode}`);

            await loadRoom(result.inviteCode);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            finishAction();
        }
    };

    const initializeMemberRoleInputs = (roles) => {
        return Object.fromEntries(
            roles.map((role) => [
                role.roleId,
                {
                    level: 3,
                    score: 3,
                },
            ]),
        );
    };

    const loadRoom = async (code = inviteCode) => {
        if (!code.trim()) {
            setError("초대 코드를 입력하세요.");
            return;
        }

        startAction();

        try {
            const result = await apiRequest(
                `/api/rooms/invite/${code.trim()}`,
            );

            setInviteCode(code.trim());
            setRoom(result);

            setMemberForm((previous) => ({
                ...previous,
                roleInputs: initializeMemberRoleInputs(result.roles),
            }));

            await Promise.all([
                loadMembers(result.roomId),
                loadAssignments(result.roomId),
            ]);

            setMessage("방 조회 완료");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            finishAction();
        }
    };

    const loadMembers = async (roomId = room?.roomId) => {
        if (!roomId) {
            return;
        }

        const result = await apiRequest(
            `/api/rooms/${roomId}/members`,
        );

        setMembers(result);
    };

    const loadAssignments = async (roomId = room?.roomId) => {
        if (!roomId) {
            return;
        }

        const result = await apiRequest(
            `/api/rooms/${roomId}/assignments`,
        );

        setAssignments(result);
    };

    const updateMemberRoleInput = (roleId, field, value) => {
        setMemberForm((previous) => ({
            ...previous,
            roleInputs: {
                ...previous.roleInputs,
                [roleId]: {
                    ...previous.roleInputs[roleId],
                    [field]: Number(value),
                },
            },
        }));
    };

    const createMember = async (event) => {
        event.preventDefault();

        if (!room) {
            setError("먼저 방을 조회하세요.");
            return;
        }

        startAction();

        try {
            const payload = {
                name: memberForm.name,
                availableHours: Number(memberForm.availableHours),

                // 현재 MVP에서는 역할 이름을 역량 이름으로 사용
                skills: room.roles.map((role) => ({
                    skillName: role.name,
                    level: Number(
                        memberForm.roleInputs[role.roleId]?.level ?? 3,
                    ),
                })),

                preferences: room.roles.map((role) => ({
                    roleId: role.roleId,
                    score: Number(
                        memberForm.roleInputs[role.roleId]?.score ?? 3,
                    ),
                })),
            };

            await apiRequest(
                `/api/rooms/invite/${inviteCode}/members`,
                {
                    method: "POST",
                    body: JSON.stringify(payload),
                },
            );

            setMemberForm({
                name: "",
                availableHours: 10,
                roleInputs: initializeMemberRoleInputs(room.roles),
            });

            await loadMembers(room.roomId);

            setMessage("팀원 등록 완료");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            finishAction();
        }
    };

    const assignRoles = async () => {
        if (!room) {
            setError("먼저 방을 조회하세요.");
            return;
        }

        startAction();

        try {
            const result = await apiRequest(
                `/api/rooms/${room.roomId}/assignments`,
                {
                    method: "POST",
                },
            );

            setAssignments(result);
            setMessage("역할 자동 분배 완료");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            finishAction();
        }
    };

    return (
        <main className="page">
            <header>
                <h1>팀가드 MVP</h1>
                <p>API 서버: {API_URL}</p>
            </header>

            {message && <div className="message success">{message}</div>}
            {error && <div className="message error">{error}</div>}

            <section>
                <h2>1. 방 만들기</h2>

                <form onSubmit={createRoom}>
                    <label>
                        프로젝트명
                        <input
                            required
                            value={roomForm.title}
                            onChange={(event) =>
                                updateRoomField("title", event.target.value)
                            }
                        />
                    </label>

                    <label>
                        프로젝트 주제
                        <input
                            required
                            value={roomForm.topic}
                            onChange={(event) =>
                                updateRoomField("topic", event.target.value)
                            }
                        />
                    </label>

                    <div className="row">
                        <label>
                            역량 가중치
                            <input
                                type="number"
                                min="0"
                                value={roomForm.skillWeight}
                                onChange={(event) =>
                                    updateRoomField(
                                        "skillWeight",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            시간 가중치
                            <input
                                type="number"
                                min="0"
                                value={roomForm.timeWeight}
                                onChange={(event) =>
                                    updateRoomField(
                                        "timeWeight",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>

                        <label>
                            선호도 가중치
                            <input
                                type="number"
                                min="0"
                                value={roomForm.preferenceWeight}
                                onChange={(event) =>
                                    updateRoomField(
                                        "preferenceWeight",
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>

                    <label>
                        마감 기한
                        <input
                            required
                            type="datetime-local"
                            value={roomForm.deadline}
                            onChange={(event) =>
                                updateRoomField("deadline", event.target.value)
                            }
                        />
                    </label>

                    <h3>역할 목록</h3>

                    {roomForm.roles.map((role, index) => (
                        <div className="role-editor" key={index}>
                            <input
                                required
                                placeholder="역할명"
                                value={role.name}
                                onChange={(event) =>
                                    updateRole(index, "name", event.target.value)
                                }
                            />

                            <input
                                required
                                type="number"
                                min="0"
                                placeholder="업무량"
                                value={role.workload}
                                onChange={(event) =>
                                    updateRole(
                                        index,
                                        "workload",
                                        event.target.value,
                                    )
                                }
                            />

                            <input
                                placeholder="설명"
                                value={role.description}
                                onChange={(event) =>
                                    updateRole(
                                        index,
                                        "description",
                                        event.target.value,
                                    )
                                }
                            />

                            <button
                                type="button"
                                onClick={() => removeRole(index)}
                            >
                                삭제
                            </button>
                        </div>
                    ))}

                    <button type="button" onClick={addRole}>
                        역할 추가
                    </button>

                    <button type="submit" disabled={loading}>
                        방 생성
                    </button>
                </form>
            </section>

            <section>
                <h2>2. 초대 코드로 방 조회</h2>

                <div className="row">
                    <input
                        placeholder="초대 코드"
                        value={inviteCode}
                        onChange={(event) =>
                            setInviteCode(event.target.value)
                        }
                    />

                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => loadRoom()}
                    >
                        방 조회
                    </button>
                </div>

                {room && (
                    <div className="result-box">
                        <p>
                            <strong>방 ID:</strong> {room.roomId}
                        </p>
                        <p>
                            <strong>프로젝트명:</strong> {room.title}
                        </p>
                        <p>
                            <strong>주제:</strong> {room.topic}
                        </p>
                        <p>
                            <strong>마감:</strong> {room.deadline}
                        </p>

                        <h3>역할</h3>

                        <ul>
                            {room.roles.map((role) => (
                                <li key={role.roleId}>
                                    {role.name} / 업무량 {role.workload}시간 /{" "}
                                    {role.description}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            {room && (
                <section>
                    <h2>3. 팀원 등록</h2>

                    <form onSubmit={createMember}>
                        <label>
                            이름
                            <input
                                required
                                value={memberForm.name}
                                onChange={(event) =>
                                    setMemberForm((previous) => ({
                                        ...previous,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <label>
                            투자 가능 시간
                            <input
                                required
                                type="number"
                                min="0"
                                value={memberForm.availableHours}
                                onChange={(event) =>
                                    setMemberForm((previous) => ({
                                        ...previous,
                                        availableHours: event.target.value,
                                    }))
                                }
                            />
                        </label>

                        <table>
                            <thead>
                            <tr>
                                <th>역할</th>
                                <th>역량 1~5</th>
                                <th>선호도 1~5</th>
                            </tr>
                            </thead>

                            <tbody>
                            {room.roles.map((role) => (
                                <tr key={role.roleId}>
                                    <td>{role.name}</td>

                                    <td>
                                        <select
                                            value={
                                                memberForm.roleInputs[role.roleId]
                                                    ?.level ?? 3
                                            }
                                            onChange={(event) =>
                                                updateMemberRoleInput(
                                                    role.roleId,
                                                    "level",
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map((score) => (
                                                <option key={score} value={score}>
                                                    {score}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td>
                                        <select
                                            value={
                                                memberForm.roleInputs[role.roleId]
                                                    ?.score ?? 3
                                            }
                                            onChange={(event) =>
                                                updateMemberRoleInput(
                                                    role.roleId,
                                                    "score",
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {[1, 2, 3, 4, 5].map((score) => (
                                                <option key={score} value={score}>
                                                    {score}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>

                        <button type="submit" disabled={loading}>
                            팀원 등록
                        </button>
                    </form>
                </section>
            )}

            {room && (
                <section>
                    <div className="section-header">
                        <h2>4. 팀원 목록</h2>

                        <button
                            type="button"
                            onClick={() => loadMembers(room.roomId)}
                        >
                            새로고침
                        </button>
                    </div>

                    {members.length === 0 ? (
                        <p>등록된 팀원이 없습니다.</p>
                    ) : (
                        <table>
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>이름</th>
                                <th>투자 시간</th>
                                <th>역량</th>
                                <th>선호도</th>
                            </tr>
                            </thead>

                            <tbody>
                            {members.map((member) => (
                                <tr key={member.memberId}>
                                    <td>{member.memberId}</td>
                                    <td>{member.name}</td>
                                    <td>{member.availableHours}시간</td>

                                    <td>
                                        {member.skills
                                            .map(
                                                (skill) =>
                                                    `${skill.skillName}: ${skill.level}`,
                                            )
                                            .join(", ")}
                                    </td>

                                    <td>
                                        {member.preferences
                                            .map(
                                                (preference) =>
                                                    `${preference.roleName}: ${preference.score}`,
                                            )
                                            .join(", ")}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}

            {room && (
                <section>
                    <div className="section-header">
                        <h2>5. 역할 자동 분배</h2>

                        <button
                            type="button"
                            disabled={loading}
                            onClick={assignRoles}
                        >
                            역할 분배 실행
                        </button>
                    </div>

                    {assignments.length === 0 ? (
                        <p>역할 분배 결과가 없습니다.</p>
                    ) : (
                        <table>
                            <thead>
                            <tr>
                                <th>역할</th>
                                <th>배정 팀원</th>
                                <th>역량 점수</th>
                                <th>시간 점수</th>
                                <th>선호 점수</th>
                                <th>최종 점수</th>
                            </tr>
                            </thead>

                            <tbody>
                            {assignments.map((assignment) => (
                                <tr key={assignment.assignmentId}>
                                    <td>{assignment.roleName}</td>
                                    <td>{assignment.memberName}</td>
                                    <td>{assignment.skillScore}</td>
                                    <td>{assignment.timeScore}</td>
                                    <td>{assignment.preferenceScore}</td>
                                    <td>
                                        <strong>{assignment.totalScore}</strong>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}
        </main>
    );
}

export default App;