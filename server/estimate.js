'use strict';
/**
 * Logic ước lượng — hàm thuần, tất định, không phụ thuộc DB/Express.
 * Dải chấp nhận: lo = ceil(E*80/100), hi = floor(E*120/100) (DECISIONS ADR-003).
 */

const TOLERANCE_PCT = 20; // đổi ngưỡng ở đây, rồi sinh lại fixture (tools/gen-estimate-seed.js)
const MAX_DIGITS = 9;     // chặn chuỗi số quá dài (T-UNIT-07)

const FEEDBACK = Object.freeze({
  BOTH_OK: 'Làm tốt cả hai bước: ước lượng hợp lý và tính chính xác đúng!',
  ESTIMATE_OK_EXACT_WRONG: 'Ước lượng của em hợp lý. Hãy kiểm tra lại phép tính chính xác nhé.',
  ESTIMATE_WRONG_EXACT_OK: 'Em tính đúng rồi, nhưng ước lượng còn lệch xa. Thử làm tròn số về hàng chục gần nhất để nhẩm nhé.',
  BOTH_WRONG: 'Em ôn lại cả hai bước nhé: làm tròn số trước để ước lượng, rồi mới tính chính xác.'
});

function assertNonNegInt(n, name) {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new RangeError(`${name} phải là số nguyên không âm`);
  }
}

/** Chia nguyên chính xác bằng số nguyên: trả {q, r} của a / 100. */
function divmod100(a) {
  const r = a % 100;
  return { q: (a - r) / 100, r };
}

/** Dải chấp nhận cho đáp án chính xác `exact`. */
function computeEstimateBand(exact, tolerancePct = TOLERANCE_PCT) {
  assertNonNegInt(exact, 'exact');
  assertNonNegInt(tolerancePct, 'tolerancePct');
  if (tolerancePct > 100) throw new RangeError('tolerancePct phải ≤ 100');
  const low = divmod100(exact * (100 - tolerancePct));
  const high = divmod100(exact * (100 + tolerancePct));
  return { lo: low.q + (low.r > 0 ? 1 : 0), hi: high.q }; // ceil / floor bằng số nguyên
}

/** "231-345" -> {lo:231, hi:345}; sai định dạng hoặc lo > hi -> null. */
function parseBand(str) {
  if (typeof str !== 'string') return null;
  const m = /^(\d{1,15})-(\d{1,15})$/.exec(str.trim());
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = Number(m[2]);
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi) || lo > hi) return null;
  return { lo, hi };
}

function formatBand({ lo, hi }) {
  return `${lo}-${hi}`;
}

/** Đầu vào của học sinh -> số nguyên không âm, hoặc null nếu không hợp lệ. */
function parseEstimateInput(value) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!new RegExp(`^\\d{1,${MAX_DIGITS}}$`).test(s)) return null;
  return Number(s);
}

/** Ước lượng `given` có nằm trong dải `bandStr` ("lo-hi") không? Không bao giờ ném lỗi. */
function isReasonableEstimate(given, bandStr) {
  const n = parseEstimateInput(given);
  const band = parseBand(bandStr);
  if (n === null || band === null) return false;
  return n >= band.lo && n <= band.hi;
}

/** Phân loại phản hồi bốn tổ hợp (ADR-005). */
function classifyFeedback(estimateOk, exactOk) {
  let code;
  if (estimateOk && exactOk) code = 'BOTH_OK';
  else if (estimateOk) code = 'ESTIMATE_OK_EXACT_WRONG';
  else if (exactOk) code = 'ESTIMATE_WRONG_EXACT_OK';
  else code = 'BOTH_WRONG';
  return { code, message: FEEDBACK[code] };
}

/** Đáp án chính xác của phép tính; phép chia phải chia hết. */
function exactOf(op, a, b) {
  assertNonNegInt(a, 'a');
  assertNonNegInt(b, 'b');
  if (op === '×') return a * b;
  if (op === ':') {
    if (b === 0 || a % b !== 0) throw new RangeError('Phép chia phải chia hết và số chia > 0');
    return a / b;
  }
  throw new RangeError('op phải là "×" hoặc ":"');
}

module.exports = {
  TOLERANCE_PCT, MAX_DIGITS, FEEDBACK,
  computeEstimateBand, parseBand, formatBand, parseEstimateInput,
  isReasonableEstimate, classifyFeedback, exactOf
};
