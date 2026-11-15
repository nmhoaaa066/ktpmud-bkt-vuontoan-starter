/* Giao diện hai bước "Ước lượng trước khi tính đúng". Script thường (không ES module).
 * Dùng từ exercise.js:  EstimateStep.render(...), EstimateStep.checkBeforeSubmit(...), EstimateStep.showFeedback(...)
 * Chưa kiểm thử với exercise.js thật — xem HUONG-DAN-GHEP.md, Bước 5. */
(function (global) {
  'use strict';

  var MAX_DIGITS = 9;
  var VALID = new RegExp('^\\d{1,' + MAX_DIGITS + '}$');
  var uid = 0;

  function isValid(v) { return VALID.test(String(v == null ? '' : v).trim()); }

  function make(tag, props, text) {
    var n = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) { n.setAttribute(k, props[k]); });
    if (text) n.textContent = text;
    return n;
  }

  /**
   * Dựng một mục gồm câu ước lượng (estQ) và câu tính chính xác (exactQ).
   * answers: đối tượng {questionId: giá trị} mà exercise.js sẽ gửi lên /api/submissions.
   * onChange(id, value): tuỳ chọn, gọi mỗi khi giá trị đổi.
   */
  function render(container, estQ, exactQ, answers, onChange) {
    uid += 1;
    var p = 'est' + uid;
    var set = function (id, v) { answers[id] = v; if (onChange) onChange(id, v); };

    var box = make('fieldset', { 'data-estimate-pair': estQ.id, 'class': 'estimate-pair' });
    box.appendChild(make('legend', {}, estQ.prompt));

    var estLabel = make('label', { 'for': p + '-est' }, 'Bước 1 — Em ước lượng (số tròn chục):');
    var estInput = make('input', { id: p + '-est', type: 'text', inputmode: 'numeric', autocomplete: 'off',
      'aria-describedby': p + '-msg', maxlength: String(MAX_DIGITS) });
    var okBtn = make('button', { type: 'button' }, 'Xác nhận ước lượng');

    var exLabel = make('label', { 'for': p + '-ex' }, 'Bước 2 — ' + exactQ.prompt);
    var exInput = make('input', { id: p + '-ex', type: 'text', inputmode: 'numeric', autocomplete: 'off',
      disabled: 'disabled', 'aria-describedby': p + '-msg', maxlength: String(MAX_DIGITS) });

    var msg = make('div', { id: p + '-msg', role: 'status', 'aria-live': 'polite', 'class': 'estimate-msg' });
    var fb = make('div', { 'data-feedback-for': estQ.id, role: 'status', 'aria-live': 'polite' });

    [estLabel, estInput, okBtn, exLabel, exInput, msg, fb].forEach(function (n) { box.appendChild(n); });
    container.appendChild(box);

    function confirmEstimate() {
      if (!isValid(estInput.value)) {
        msg.textContent = 'Em hãy nhập một số nguyên không âm (ví dụ 300) trước khi tính chính xác nhé.';
        estInput.setAttribute('aria-invalid', 'true');
        estInput.focus();
        return false;
      }
      estInput.removeAttribute('aria-invalid');
      msg.textContent = 'Đã ghi nhận ước lượng. Bây giờ em tính chính xác nhé.';
      box.setAttribute('data-confirmed', 'true');
      exInput.removeAttribute('disabled');
      exInput.focus();
      return true;
    }

    estInput.addEventListener('input', function () {
      set(estQ.id, estInput.value.trim());
      if (box.getAttribute('data-confirmed') === 'true' && !isValid(estInput.value)) { // sửa thành số sai -> khoá lại bước 2
        box.removeAttribute('data-confirmed');
        exInput.setAttribute('disabled', 'disabled');
        msg.textContent = 'Em hãy nhập lại ước lượng hợp lệ trước khi tính chính xác.';
      }
    });
    estInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); confirmEstimate(); } });
    okBtn.addEventListener('click', confirmEstimate);
    exInput.addEventListener('input', function () { set(exactQ.id, exInput.value.trim()); });
    return box;
  }

  /** Gọi trước khi nộp. Trả false (và đưa focus về ô ước lượng) nếu còn mục chưa ước lượng. */
  function checkBeforeSubmit(root) {
    var pairs = root.querySelectorAll('[data-estimate-pair]');
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i].getAttribute('data-confirmed') !== 'true') {
        var input = pairs[i].querySelector('input');
        pairs[i].querySelector('.estimate-msg').textContent =
          'Em cần ước lượng trước rồi mới nộp bài nhé (bấm "Xác nhận ước lượng").';
        input.setAttribute('aria-invalid', 'true');
        input.focus();
        return false;
      }
    }
    return true;
  }

  /** feedback: mảng {id, code, message} do server trả về (trường estimateFeedback). */
  function showFeedback(root, feedback) {
    (feedback || []).forEach(function (f) {
      var n = root.querySelector('[data-feedback-for="' + f.id + '"]');
      if (n) { n.textContent = f.message; n.setAttribute('data-code', f.code); }
    });
  }

  global.EstimateStep = { render: render, checkBeforeSubmit: checkBeforeSubmit, showFeedback: showFeedback, isValid: isValid };
})(window);
