const URLS = {
  auth: "https://functions.poehali.dev/1cb1e2c2-96fd-48eb-b63c-45c90eb95bd1",
  spots: "https://functions.poehali.dev/8dcc408a-219b-4f63-aff8-b5fac79b1701",
  records: "https://functions.poehali.dev/64599585-c2c5-4e7d-82e9-84f82bdef212",
};

function getToken() {
  return localStorage.getItem("auth_token") || "";
}

async function parseResponse(res: Response) {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    // Бэкенд иногда возвращает body как строку (двойной JSON) — парсим ещё раз
    if (typeof parsed === "string") return JSON.parse(parsed);
    return parsed;
  } catch {
    return text;
  }
}

async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Auth-Token": getToken() },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}

async function get(url: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`${url}${q ? "?" + q : ""}`, {
    headers: { "X-Auth-Token": getToken() },
  });
  return parseResponse(res);
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  register: (email: string, nickname: string, password: string) =>
    post(URLS.auth, { action: "register", email, nickname, password }),

  login: (email: string, password: string) =>
    post(URLS.auth, { action: "login", email, password }),

  verify: (token: string) =>
    post(URLS.auth, { action: "verify", token }),

  me: () =>
    get(URLS.auth, { action: "me" }),

  logout: () =>
    post(URLS.auth, { action: "logout" }),

  resend: (email: string) =>
    post(URLS.auth, { action: "resend", email }),
};

// ─── Spots ───────────────────────────────────────────────────────────────────
export const spots = {
  list: () =>
    get(URLS.spots, { action: "list" }),

  checkin: (qr: string) =>
    get(URLS.spots, { action: "checkin", qr }),

  myRecord: (spot_id: number, user_id: number) =>
    get(URLS.spots, { action: "my-record", spot_id: String(spot_id), user_id: String(user_id) }),

  create: (name: string, address: string, lat: number, lng: number) =>
    post(URLS.spots, { action: "create", name, address, lat, lng }),
};

// ─── Records ─────────────────────────────────────────────────────────────────
export const records = {
  save: (spot_id: number, max_reps: number, total_reps: number, mode: string, sets: number[]) =>
    post(URLS.records, { action: "save", spot_id, max_reps, total_reps, mode, sets }),

  leaderboard: (spot_id: number) =>
    get(URLS.records, { action: "leaderboard", spot_id: String(spot_id) }),

  rating: () =>
    get(URLS.records, { action: "rating" }),

  my: (spot_id?: number) =>
    get(URLS.records, { action: "my", ...(spot_id ? { spot_id: String(spot_id) } : {}) }),
};