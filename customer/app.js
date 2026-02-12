// ===============================
// localStorage keys
// ===============================
const KEY_SESSION = "hk_session_v1"; // ログイン中ユーザー（デモ用）
const KEY_USERDATA = "hk_userdata_v1"; // userIdごとのデータ（デモ用）

// -------------------------------
// Helpers
// -------------------------------
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return [...document.querySelectorAll(sel)]; }
function on(sel, ev, fn) { const el = qs(sel); if (el) el.addEventListener(ev, fn); }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// -------------------------------
// Session (デモ用ログイン)
// -------------------------------
function loginDemo(userId) {
  saveJSON(KEY_SESSION, { userId, at: Date.now() });
}
function logoutDemo() {
  localStorage.removeItem(KEY_SESSION);
}
function getSession() {
  return loadJSON(KEY_SESSION, null);
}
function getUserId() {
  return getSession()?.userId ?? null;
}
function requireLoginFromPages() {
  // pages/*.html から呼ぶ想定（indexへ戻す）
  if (!getUserId()) {
    alert("ログインしてください（デモ）");
    location.href = "../index.html";
  }
}

// -------------------------------
// User data (デモ用DB)
// -------------------------------
function loadAllUserData() {
  return loadJSON(KEY_USERDATA, {});
}
function loadMyData() {
  const userId = getUserId();
  if (!userId) return null;
  const all = loadAllUserData();
  return all[userId] ?? {
    profile: null,
    receipt: null,
    candidates: [],
    couponsOwned: [],
  };
}
function saveMyData(patchFn) {
  const userId = getUserId();
  if (!userId) throw new Error("Not logged in");
  const all = loadAllUserData();
  const current = all[userId] ?? {
    profile: null,
    receipt: null,
    candidates: [],
    couponsOwned: [],
  };
  const updated = patchFn(structuredClone(current));
  all[userId] = updated;
  saveJSON(KEY_USERDATA, all);
  return updated;
}

// -------------------------------
// Coupons (デモ用)
// -------------------------------
const COUPON_POOL = [
  { title: "おにぎり", off: 50, tags: ["食品"] },
  { title: "コーヒー", off: 80, tags: ["飲料"] },
  { title: "チョコ", off: 30, tags: ["お菓子"] },
  { title: "カップ麺", off: 70, tags: ["食品"] },
  { title: "日用品10%OFF", off: 100, tags: ["日用品"] },
  { title: "弁当", off: 120, tags: ["食品"] },
  { title: "スイーツ", off: 60, tags: ["お菓子"] },
  { title: "ドリンク", off: 40, tags: ["飲料"] },
];

function pick3RandomCoupons() {
  const pool = structuredClone(COUPON_POOL);
  // シャッフル
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // 3つ + id付与
  return pool.slice(0, 3).map(c => ({
    id: crypto.randomUUID(),
    ...c,
    createdAt: Date.now(),
  }));
}

function generateCandidates() {
  const candidates = pick3RandomCoupons();
  saveMyData(d => {
    d.candidates = candidates;
    return d;
  });
  return candidates;
}

function selectCandidate(candidateId) {
  return saveMyData(d => {
    const c = d.candidates.find(x => x.id === candidateId);
    if (!c) throw new Error("候補が見つかりません");
    d.couponsOwned.unshift({ ...c, selectedAt: Date.now() });
    d.candidates = []; // 選んだら候補は消す（仕様は好みで）
    return d;
  });
}