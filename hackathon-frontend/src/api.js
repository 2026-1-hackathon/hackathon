const BASE = import.meta.env.VITE_API_URL;

export async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch { data = text; }
  }
  if (!res.ok) throw new Error(data?.message || data?.error || `${res.status} ${res.statusText}`);
  return data;
}
