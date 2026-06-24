import { useEffect, useState } from "react";

function App() {
    const apiUrl = import.meta.env.VITE_API_URL;

    const [status, setStatus] = useState("연결 중");
    const [error, setError] = useState("");

    useEffect(() => {
        console.log("API URL:", apiUrl);

        fetch(`${apiUrl}/api/health`)
            .then(async (response) => {
                if (!response.ok) {
                    const body = await response.text();
                    throw new Error(`HTTP ${response.status}: ${body}`);
                }

                return response.json();
            })
            .then((data) => setStatus(data.status))
            .catch((err) => {
                console.error("백엔드 연결 오류:", err);
                setStatus("연결 실패");
                setError(err.message);
            });
    }, [apiUrl]);

    return (
        <main>
            <h1>해커톤</h1>
            <p>백엔드 상태: {status}</p>
            <p>API 주소: {String(apiUrl)}</p>
            {error && <p>오류: {error}</p>}
        </main>
    );
}

export default App;