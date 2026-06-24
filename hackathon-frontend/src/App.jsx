import { useEffect, useState } from "react";

function App() {
    const [status, setStatus] = useState("연결 중");

    useEffect(() => {
        fetch(`${import.meta.env.VITE_API_URL}/api/health`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return response.json();
            })
            .then((data) => setStatus(data.status))
            .catch((error) => {
                console.error(error);
                setStatus("연결 실패");
            });
    }, []);

    return (
        <main>
            <h1>해커톤</h1>
            <p>백엔드 상태: {status}</p>
        </main>
    );
}

export default App;