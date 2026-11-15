'use strict';
/**
 * Sinh fixture "Ước lượng trước khi tính đúng" theo định dạng questionSets của data/seed.json.
 * Dùng:  node tools/gen-estimate-seed.js [lessonId]  > data/estimate-questionSets.json
 * Rồi gộp nội dung vào khoá "questionSets" của data/seed.json và chạy `npm run reset-db`.
 */
const { computeEstimateBand, formatBand, exactOf } = require('../server/estimate');

const LESSON_ID = process.argv[2] || 'bai-10'; // ĐỔI cho đúng bài học nhân/chia trong seed.json
const POINTS_ESTIMATE = 3;
const POINTS_EXACT = 5;

const FIXTURES = {
  'uoc-luong-nhan': { title: 'Ước lượng trước khi tính: phép nhân',
    items: [[48, '×', 6], [52, '×', 4], [19, '×', 7], [63, '×', 5], [87, '×', 3], [24, '×', 8], [91, '×', 2], [38, '×', 6]] },
  'uoc-luong-chia': { title: 'Ước lượng trước khi tính: phép chia',
    items: [[252, ':', 6], [175, ':', 5], [328, ':', 4], [144, ':', 6]] }
};

const out = {};
let n = 0;
for (const [setId, { title, items }] of Object.entries(FIXTURES)) {
  const questions = [];
  for (const [a, op, b] of items) {
    n += 1;
    const id = `est-${String(n).padStart(2, '0')}`;
    const exact = exactOf(op, a, b);
    questions.push(
      { id, type: 'estimate', prompt: `Ước lượng: ${a} ${op} ${b} ≈ ?`,
        correctAnswer: formatBand(computeEstimateBand(exact)), points: POINTS_ESTIMATE },
      { id: `${id}-exact`, type: 'input', prompt: `Tính chính xác: ${a} ${op} ${b} = ?`,
        correctAnswer: String(exact), points: POINTS_EXACT }
    );
  }
  out[setId] = { lessonId: LESSON_ID, title, kind: 'exercise', questions };
}
process.stdout.write(JSON.stringify(out, null, 2) + '\n');
