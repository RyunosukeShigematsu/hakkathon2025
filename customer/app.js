// ===============================
// localStorage keys
// ===============================
const KEY_SESSION = "hk_session_v1";
const KEY_USERDATA = "hk_userdata_v1";
const KEY_SHARED_POOL = "hk_shared_coupon_pool_v1"; // ★追加：店側と共有するキー

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
// Session
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
  if (!getUserId()) {
    location.replace("../index.html");
  }
}

// -------------------------------
// User data (AI分析を意識したデータ構造)
// -------------------------------
const DEFAULT_USER_DATA = {
  profile: { name: "", age: null, gender: "", preferences: [], memo: "" },
  receipt: { store: "", total: 0, visitTime: "", imageDataUrl: null },
  candidates: [],
  couponsOwned: [],
  logs: [],
  retries: 0,
  isRetryActive: false // ★このフラグが true の間だけやり直し可能
};

function loadAllUserData() {
  return loadJSON(KEY_USERDATA, {});
}

function loadMyData() {
  const userId = getUserId();
  if (!userId) return null;
  const all = loadAllUserData();
  return all[userId] ?? structuredClone(DEFAULT_USER_DATA);
}

function saveMyData(patchFn) {
  const userId = getUserId();
  if (!userId) throw new Error("Not logged in");
  const all = loadAllUserData();
  const current = all[userId] ?? structuredClone(DEFAULT_USER_DATA);
  const updated = patchFn(structuredClone(current));
  all[userId] = updated;
  saveJSON(KEY_USERDATA, all);
  return updated;
}

// -------------------------------
// Coupons (店側から取得してスコアリング)
// -------------------------------

/**
 * 店側が保存したクーポン一覧を取得する
 */
function getSharedCouponPool() {
  const shared = loadJSON(KEY_SHARED_POOL, []);
  
  // もし店側が一つも作っていない場合のデフォルト表示
  if (shared.length === 0) {
    return [
      { id: "default1", title: "中野レンガ坂へようこそ！", off: 0, tags: ["共通"], target: { gender: "all", age_max: 99 } }
    ];
  }
  return shared;
}

/**
 * ユーザー属性とレシート内容に基づいてクーポンをスコアリングし、上位3つを返す
 */
function generateCandidates(isRetry = false) {
  const data = loadMyData();
  
  // やり直し時のバリデーション
  if (isRetry && (!data.isRetryActive || data.retries <= 0)) {
    throw new Error("やり直しの有効期限が切れたか、回数が足りません");
  }

  const profile = data.profile || {};
  const receipt = data.receipt || {};
  const pool = getSharedCouponPool(); // ★固定値ではなく店側のデータを取得

  // スコア計算ロジック
  let scored = pool.map(c => {
    let score = 0;

    // 1. 性別マッチ (+10)
    if (c.target.gender === "all" || c.target.gender === profile.gender) score += 10;
    
    // 2. 年齢レンジマッチ (+10)
    // ユーザーの年齢が最小〜最大の範囲内なら加点
    const userAge = profile.age || 0;
    const min = c.target.age_min || 0;
    const max = c.target.age_max || 99;
    
    if (userAge >= min && userAge <= max) {
        score += 10;
    }
        
    // 3. 好み(Preferences)マッチ (+15)
    const userPrefs = profile.preferences || [];
    if (userPrefs.some(p => c.tags.includes(p))) score += 15;

    // 4. レシート店名マッチ (+20)
    if (receipt.store && c.tags.some(tag => receipt.store.includes(tag))) {
      score += 20;
    }

    // やり直しのたびに順位が変わるよう、ランダム要素(0~10)を加算
    const finalScore = score + (Math.random() * 10);
    
    return { ...c, score: finalScore, id: crypto.randomUUID() };
  });

  // スコア順にソートして上位3つを取得
  const candidates = scored.sort((a, b) => b.score - a.score).slice(0, 3);
  
  saveMyData(d => {
    d.candidates = candidates;
    if (isRetry) {
      d.retries -= 1;
    } else {
      d.isRetryActive = true; 
    }
    return d;
  });
  
  return candidates;
}

/**
 * クーポン確定時の処理
 */
function selectCandidate(candidateId) {
  return saveMyData(d => {
    const selected = d.candidates.find(x => x.id === candidateId);
    if (!selected) throw new Error("候補が見つかりません");

    // ★店側の共有プールから該当クーポンの在庫を減らす処理
    const sharedPool = JSON.parse(localStorage.getItem(KEY_SHARED_POOL)) || [];
    const targetInPool = sharedPool.find(c => c.title === selected.title); // タイトル等で特定
    
    if (targetInPool) {
      if (targetInPool.remainingStock <= 0) {
        throw new Error("タッチの差でクーポンが終了しました。やり直してください。");
      }
      targetInPool.remainingStock -= 1; // 在庫を減らす
      localStorage.setItem(KEY_SHARED_POOL, JSON.stringify(sharedPool));
    }

    d.couponsOwned.unshift({ ...selected, selectedAt: Date.now() });
    
    // ...（中略：やり直しフラグのリセットやログ記録など）...
    
    return d;
  });
}