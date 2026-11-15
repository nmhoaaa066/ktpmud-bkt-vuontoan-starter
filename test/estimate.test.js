'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../server/estimate');

// Bảng Phụ lục A (REQUIREMENTS): [a, op, b, đáp án, lo, hi, ước lượng tiêu biểu]
const TABLE = [
  [48, '×', 6, 288, 231, 345, 300], [52, '×', 4, 208, 167, 249, 200],
  [19, '×', 7, 133, 107, 159, 140], [63, '×', 5, 315, 252, 378, 300],
  [87, '×', 3, 261, 209, 313, 270], [24, '×', 8, 192, 154, 230, 160],
  [91, '×', 2, 182, 146, 218, 180], [38, '×', 6, 228, 183, 273, 240],
  [252, ':', 6, 42, 34, 50, 40],    [175, ':', 5, 35, 28, 42, 30],
  [328, ':', 4, 82, 66, 98, 80],    [144, ':', 6, 24, 20, 28, 20]
];

test('T-UNIT-01: computeEstimateBand(288)', () => {
  assert.deepEqual(E.computeEstimateBand(288), { lo: 231, hi: 345 });
});

test('T-UNIT-02: 12 fixture khớp bảng và ước lượng tiêu biểu nằm trong dải', () => {
  assert.equal(TABLE.length, 12);
  for (const [a, op, b, exact, lo, hi, typical] of TABLE) {
    assert.equal(E.exactOf(op, a, b), exact, `${a} ${op} ${b}`);
    assert.deepEqual(E.computeEstimateBand(exact), { lo, hi }, `dải của ${exact}`);
    assert.ok(E.isReasonableEstimate(String(typical), `${lo}-${hi}`), `ước lượng ${typical} cho ${a} ${op} ${b}`);
  }
});

test('T-UNIT-03/04: biên của dải', () => {
  assert.ok(E.isReasonableEstimate('231', '231-345'));
  assert.ok(E.isReasonableEstimate('345', '231-345'));
  assert.ok(!E.isReasonableEstimate('230', '231-345'));
  assert.ok(!E.isReasonableEstimate('346', '231-345'));
});

test('T-UNIT-05: đầu vào không hợp lệ không ném lỗi và bị chấm sai', () => {
  for (const bad of ['', null, undefined, 'abc', '4.5', '-3', '1e3', '0x10', '5 0', {}, [], NaN, 4.5, -3, Infinity]) {
    assert.equal(E.isReasonableEstimate(bad, '0-999'), false, `giá trị ${String(bad)}`);
  }
  assert.equal(E.isReasonableEstimate('  50 ', '40-60'), true); // trim
  assert.equal(E.isReasonableEstimate(50, '40-60'), true);      // số nguyên
});

test('T-UNIT-06: parseBand', () => {
  assert.deepEqual(E.parseBand('231-345'), { lo: 231, hi: 345 });
  for (const bad of ['345-231', 'a-b', '231', '', null, undefined, '1-2-3', '-5-10']) {
    assert.equal(E.parseBand(bad), null, String(bad));
  }
  assert.equal(E.isReasonableEstimate('5', 'hỏng'), false); // dải hỏng -> sai, không ném lỗi
});

test('T-UNIT-07: chuỗi số rất dài bị chấm sai, không treo', () => {
  assert.equal(E.isReasonableEstimate('9'.repeat(30), '0-999'), false);
  assert.equal(E.isReasonableEstimate('9'.repeat(10), '0-999999999999'), false); // > MAX_DIGITS
});

test('T-UNIT-08: tất định', () => {
  const first = JSON.stringify([E.computeEstimateBand(288), E.isReasonableEstimate('300', '231-345')]);
  for (let i = 0; i < 1000; i++) {
    assert.equal(JSON.stringify([E.computeEstimateBand(288), E.isReasonableEstimate('300', '231-345')]), first);
  }
});

test('T-UNIT-09: classifyFeedback cho 4 tổ hợp có 4 mã và 4 thông điệp khác nhau', () => {
  const r = [[true, true], [true, false], [false, true], [false, false]].map(([a, b]) => E.classifyFeedback(a, b));
  assert.equal(new Set(r.map(x => x.code)).size, 4);
  assert.equal(new Set(r.map(x => x.message)).size, 4);
  assert.equal(r[0].code, 'BOTH_OK');
  assert.equal(r[3].code, 'BOTH_WRONG');
});

test('Biên số học của computeEstimateBand', () => {
  assert.deepEqual(E.computeEstimateBand(0), { lo: 0, hi: 0 });
  assert.deepEqual(E.computeEstimateBand(1), { lo: 1, hi: 1 });   // ceil(0.8)=1, floor(1.2)=1
  assert.deepEqual(E.computeEstimateBand(5), { lo: 4, hi: 6 });
  assert.deepEqual(E.computeEstimateBand(100), { lo: 80, hi: 120 });
  assert.throws(() => E.computeEstimateBand(-1), RangeError);
  assert.throws(() => E.computeEstimateBand(4.5), RangeError);
  assert.throws(() => E.computeEstimateBand('12'), RangeError);
});

test('Mọi đáp án 0..2000: lo ≤ exact ≤ hi và khớp công thức ceil/floor', () => {
  for (let x = 0; x <= 2000; x++) {
    const { lo, hi } = E.computeEstimateBand(x);
    assert.ok(lo <= x && x <= hi, `x=${x}`);
    assert.equal(lo, Math.ceil(Math.round(x * 80) / 100));
    assert.equal(hi, Math.floor(Math.round(x * 120) / 100));
  }
});

test('Nhập đúng đáp án chính xác vào ô ước lượng vẫn hợp lý (ADR-003, trường hợp đặc biệt)', () => {
  for (const [, , , exact, lo, hi] of TABLE) {
    assert.ok(E.isReasonableEstimate(String(exact), `${lo}-${hi}`));
  }
});

test('exactOf: phép chia phải chia hết', () => {
  assert.equal(E.exactOf(':', 252, 6), 42);
  assert.throws(() => E.exactOf(':', 10, 3), RangeError);
  assert.throws(() => E.exactOf(':', 10, 0), RangeError);
  assert.throws(() => E.exactOf('+', 1, 1), RangeError);
});
