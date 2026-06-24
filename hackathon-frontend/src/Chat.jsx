import { useState, useRef, useEffect } from "react";
import "./Chat.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const WELCOME = {
  id: 0,
  role: "ai",
  text: "안녕하세요! 팀가드 AI입니다 👋\n팀원 정보를 알려주시면 최적 역할 분배안과 리스크 분석을 바로 드릴게요.\n\n예시: \"팀원 4명이고 백엔드 2명, 프론트 1명, 기획 1명이야. 마감은 2주 뒤야\"",
};

const QUICK = [
  "팀원 5명 역할 분배해줘",
  "마감 지연 위험 분석해줘",
  "무임승차자 어떻게 대처해?",
  "팀 갈등 해결 방법 알려줘",
];

function formatTime(d) {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
}

export default function Chat({ onBack }) {
  const [messages, setMessages] = useState([{ ...WELCOME, time: formatTime(new Date()) }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickUsed, setQuickUsed] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const send = async (text) => {
    const trimmed = (text ?? input).trim();
    if (!trimmed || loading) return;

    setQuickUsed(true);
    setMessages((p) => [...p, { id: Date.now(), role: "user", text: trimmed, time: formatTime(new Date()) }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((p) => [...p, { id: Date.now() + 1, role: "ai", text: data.reply, time: formatTime(new Date()) }]);
    } catch {
      setMessages((p) => [...p, { id: Date.now() + 1, role: "ai", text: "⚠️ 연결에 실패했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.", time: formatTime(new Date()) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page">
      {/* 헤더 */}
      <div className="chat-header">
        <button className="back-btn" onClick={onBack}>← 돌아가기</button>
        <div className="chat-header-info">
          <span className="chat-logo">팀가드</span>
          <span className="online-dot" />
          <span className="online-text">AI 온라인</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      {/* 메시지 */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`msg-row ${msg.role}`}>
            {msg.role === "ai" && <div className="ai-avatar">TG</div>}
            <div className="msg-col">
              <div className={`bubble ${msg.role}`}>{msg.text}</div>
              {msg.time && <span className="msg-time">{msg.time}</span>}
            </div>
          </div>
        ))}

        {!quickUsed && (
          <div className="quick-btns">
            {QUICK.map((q) => (
              <button key={q} className="quick-btn" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        )}

        {loading && (
          <div className="msg-row ai">
            <div className="ai-avatar">TG</div>
            <div className="msg-col">
              <div className="bubble ai loading">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="chat-input-area">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={(e) => { setInput(e.target.value); autoResize(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="팀원 정보, 역할, 마감일 등을 입력하세요... (Enter 전송)"
          rows={1}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={() => send()}
          disabled={!input.trim() || loading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
