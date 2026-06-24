import { useState } from "react";
import "./App.css";
import CreateRoom from "./CreateRoom.jsx";
import JoinRoom from "./JoinRoom.jsx";
import Dashboard from "./Dashboard.jsx";

function ChooseMode({ onCreate, onJoin, onBack }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#f3f4f6",
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',-apple-system,sans-serif",
    }}>
      <header style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        height: 62, padding: "0 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: 14,
          color: "#6b7280", cursor: "pointer", fontFamily: "inherit",
        }}>← 홈으로</button>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#111" }}>팀가드</span>
        <div style={{ width: 80 }} />
      </header>
      <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px" }}>
        <h1 style={{
          fontSize: 30, fontWeight: 900, color: "#111",
          marginBottom: 8, letterSpacing: -1,
        }}>어떻게 시작할까요?</h1>
        <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 40 }}>
          팀장이라면 방을 만들고, 팀원이라면 초대코드로 참여하세요
        </p>
        <div style={{ display: "flex", gap: 16 }}>
          <button className="choose-card" onClick={onCreate}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🏗️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              방 만들기
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>
              프로젝트 정보와 역할을 설정하고<br />팀원을 초대합니다
            </div>
          </button>
          <button className="choose-card" onClick={onJoin}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🔑</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#111", marginBottom: 8 }}>
              코드로 참여
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.7 }}>
              초대코드를 입력해서 팀원 정보를<br />등록하거나 결과를 확인합니다
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("landing");
  const [roomData, setRoomData] = useState(null);

  if (view === "createRoom") return (
    <CreateRoom
      onBack={() => setView("choose")}
      onDone={(data) => { setRoomData(data); setView("dashboard"); }}
    />
  );
  if (view === "joinRoom") return (
    <JoinRoom
      onBack={() => setView("choose")}
      onDashboard={(data) => { setRoomData(data); setView("dashboard"); }}
    />
  );
  if (view === "dashboard") return (
    <Dashboard roomData={roomData} onBack={() => setView("landing")} />
  );
  if (view === "choose") return (
    <ChooseMode
      onCreate={() => setView("createRoom")}
      onJoin={() => setView("joinRoom")}
      onBack={() => setView("landing")}
    />
  );

  // 랜딩 페이지
  return (
    <div className="page">

      {/* 네비 */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">팀가드</span>
          <div className="nav-right">
            <a href="#features" className="nav-link">기능</a>
            <a href="#how" className="nav-link">사용법</a>
            <button className="nav-cta" onClick={() => setView("choose")}>써보기</button>
          </div>
        </div>
      </nav>

      {/* 히어로 */}
      <section className="hero">
        <div className="hero-content">
          <p className="hero-tag">팀플 할 때마다 이런 거 없었으면 했어서 만들었습니다</p>
          <h1 className="hero-title">
            역할 정하다가<br />
            팀플 망하지 마세요.
          </h1>
          <p className="hero-desc">
            누가 뭘 할지 정하는 데만 한 시간,<br />
            정해놔도 한 명은 아무것도 안 하고, 마감은 다가오고…<br />
            팀가드가 역할 분배부터 리스크 예측까지 대신 합니다.
          </p>
          <div className="hero-actions">
            <button className="btn-main" onClick={() => setView("choose")}>지금 바로 써보기</button>
            <a href="#how" className="btn-sub">어떻게 작동해요?</a>
          </div>
        </div>

        <div className="hero-mockup">
          <div className="mockup-card">
            <div className="mockup-header">
              <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
              <span className="mockup-title">역할 분배 결과</span>
            </div>
            <div className="mockup-body">
              <div className="member-row">
                <span className="member-name">김민준</span>
                <span className="member-role role-dev">백엔드 개발</span>
                <span className="member-time">가능 시간 22h</span>
              </div>
              <div className="member-row">
                <span className="member-name">이서연</span>
                <span className="member-role role-design">UI 디자인</span>
                <span className="member-time">가능 시간 18h</span>
              </div>
              <div className="member-row">
                <span className="member-name">박지호</span>
                <span className="member-role role-plan">기획·문서</span>
                <span className="member-time">가능 시간 14h</span>
              </div>
              <div className="member-row">
                <span className="member-name">최수아</span>
                <span className="member-role role-dev">프론트엔드</span>
                <span className="member-time">가능 시간 20h</span>
              </div>
              <div className="mockup-risk">
                <span className="risk-badge warn">⚠ 마감까지 3일 부족 예상</span>
                <span className="risk-badge ok">✓ 기여도 균형 양호</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 공감 포인트 */}
      <section className="pain-section" id="features">
        <div className="container">
          <h2 className="pain-title">팀플 할 때 이런 상황, 한 번쯤 있었잖아요</h2>
          <div className="pain-grid">
            <div className="pain-card">
              <div className="pain-emoji">😮‍💨</div>
              <h3>"그냥 다들 하고 싶은 거 하면 되지 않아?"</h3>
              <p>역할이 겹치거나 아무도 안 하는 파트가 생기고, 결국 한 명이 다 떠안게 됩니다.</p>
              <div className="pain-solve">→ 역할 자동 분배로 해결</div>
            </div>
            <div className="pain-card">
              <div className="pain-emoji">😤</div>
              <h3>"저 사람은 도대체 뭘 하는 거야..."</h3>
              <p>기여도가 눈에 보이지 않으니 무임승차가 생겨도 말 꺼내기가 어렵습니다.</p>
              <div className="pain-solve">→ 기여도 분석으로 해결</div>
            </div>
            <div className="pain-card">
              <div className="pain-emoji">😰</div>
              <h3>"이 속도면 마감 못 맞추는 거 아니야?"</h3>
              <p>느낌으로만 알다가 마감 3일 전에 패닉. 미리 알았더라면 대비할 수 있었을 텐데.</p>
              <div className="pain-solve">→ 지연 리스크 예측으로 해결</div>
            </div>
          </div>
        </div>
      </section>

      {/* 사용법 */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="how-head">
            <h2>쓰는 방법은 간단해요</h2>
            <p>복잡한 설정 없이 팀원 정보만 넣으면 됩니다</p>
          </div>
          <div className="how-steps">
            <div className="how-step">
              <div className="step-circle">1</div>
              <h3>팀장이 방 만들기</h3>
              <p>프로젝트명, 역할, 마감일을 설정하면 초대코드가 생성됩니다.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-step">
              <div className="step-circle">2</div>
              <h3>팀원이 코드로 참여</h3>
              <p>각자 역량과 선호도를 직접 입력합니다. 서로 눈치 볼 필요 없이.</p>
            </div>
            <div className="how-arrow">→</div>
            <div className="how-step">
              <div className="step-circle">3</div>
              <h3>AI가 최적 배정</h3>
              <p>역할 배정 + 업무 관리 + AI 리포트까지 한 번에.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="cta">
        <div className="container">
          <div className="cta-inner">
            <h2>팀플 시작 전에 한 번만 써보세요</h2>
            <p>역할 정하는 시간 아끼고, 나중에 후회하는 일 줄이세요.</p>
            <button className="btn-main btn-lg" onClick={() => setView("choose")}>
              팀가드 시작하기 →
            </button>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="footer">
        <div className="container">
          <span className="nav-logo">팀가드</span>
          <span className="footer-copy">팀플 갈등 없는 세상을 꿈꿉니다 🙂</span>
        </div>
      </footer>

    </div>
  );
}
