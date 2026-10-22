// 방문 분석 (익명 · 견적 신청과 별도) — 페이지가 보낸 방문 기록에 지역(지오IP)을 붙여 Supabase zero_방문 테이블에 저장
// anon 키만 사용 — 테이블은 insert만 허용 (조회는 관리자 함수 admin_visits_zero로만 가능)
const SUPABASE_URL = "https://mllbsqnrvhvnqvxkpxof.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sbGJzcW5ydmh2bnF2eGtweG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTQ4MDUsImV4cCI6MjA5NTg3MDgwNX0.X4vB-JwtbrQOUg_It5dSuvTrIWOOFfg7ThIiU8FKhjI";
const TABLE = encodeURIComponent("zero_방문");

// Vercel x-vercel-ip-country-region (ISO 3166-2:KR 코드) → 시·도
const KR_REGION = {
  "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주", "30": "대전", "31": "울산", "50": "세종",
  "41": "경기", "42": "강원", "51": "강원", "43": "충북", "44": "충남", "45": "전북", "52": "전북",
  "46": "전남", "47": "경북", "48": "경남", "49": "제주"
};
const SECTIONS = ["top", "intro", "service", "price", "quote", "faq"];
const DEVICES = ["desktop", "mobile", "tablet"];

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const int = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).end(); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_) { b = null; } }
  if (!b || typeof b !== "object" || !b.session_id) { res.status(400).end(); return; }

  const country = req.headers["x-vercel-ip-country"] || "";
  const code = req.headers["x-vercel-ip-country-region"] || "";
  const region = country === "KR" ? (KR_REGION[code] || "기타") : (country ? "해외" : "기타");

  const row = {
    session_id: str(b.session_id, 64),
    device: DEVICES.includes(b.device) ? b.device : "기타",
    referrer: str(b.referrer, 300),
    duration_sec: int(b.duration_sec, 86400),
    max_scroll: int(b.max_scroll, 100),
    last_section: SECTIONS.includes(b.last_section) ? b.last_section : null,
    form_started: !!b.form_started,
    form_last_field: str(b.form_last_field, 30),
    form_submitted: !!b.form_submitted,
    region
  };

  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(row)
    });
  } catch (err) {
    console.error("track insert failed", err);
  }
  res.status(204).end();
};
