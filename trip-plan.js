/* 行程计划联动：出发/返程日期、行程天数、占位日、"N 天"文案同步。
   单一数据源 window.TravelTripPlan；变更后派发 travel-plan-updated 事件。 */
(function () {
  'use strict';

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function children(root, sel) {
    return Array.prototype.filter.call(root.children, function (el) {
      return !sel || (el.matches ? el.matches(sel) : false);
    });
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var NUMWORD = { 1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE', 6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN' };
  var CNWORD = { 1: '一天', 2: '两天', 3: '三天', 4: '四天', 5: '五天', 6: '六天', 7: '七天', 8: '八天', 9: '九天', 10: '十天' };
  var MAXDAYS = 30;

  function parseDate(str) {
    var m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(2026, 8, 19);
  }
  function fmtISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtShort(d) { return pad(d.getMonth() + 1) + '.' + pad(d.getDate()); }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }

  var journeyBlocks = $$('#route .journey-block');
  var REAL = journeyBlocks.length || 2;
  var container = journeyBlocks.length ? journeyBlocks[0].parentNode : null;
  var firstDateEl = $('#route .day summary small');
  var STATE = { start: parseDate(firstDateEl ? firstDateEl.textContent : ''), days: REAL };

  try {
    var saved = JSON.parse(localStorage.getItem('travel-handbook-plan') || 'null');
    if (saved && saved.start) {
      STATE.start = parseDate(saved.start);
      STATE.days = Math.max(1, Math.min(MAXDAYS, saved.days || REAL));
    }
  } catch (e) {}

  function dateStr(i) { return fmtISO(addDays(STATE.start, i)); }
  function rangeText() {
    if (STATE.days <= 1) return fmtShort(STATE.start);
    var end = addDays(STATE.start, STATE.days - 1);
    if (STATE.start.getMonth() === end.getMonth() && STATE.start.getFullYear() === end.getFullYear()) {
      return fmtShort(STATE.start) + '—' + pad(end.getDate());
    }
    return fmtShort(STATE.start) + '—' + fmtShort(end);
  }

  function placeholderBlockHTML(index) {
    return '<div class="journey-block is-pending"><p class="journey-label">DAY ' + pad(index + 1) + '</p><h3>待编排</h3>'
      + '<div class="days"><details class="day is-pending"><summary><span class="day-index">' + pad(index + 1) + '</span>'
      + '<span><small>' + dateStr(index) + ' · </small><b>待编排</b>'
      + '<em>这一天还没有安排，打开右上角“调整”，从指南景点里添加。</em></span><i>＋</i></summary>'
      + '<div class="day-detail"><strong>待编排</strong><p><b>还没有行程</b>'
      + '<span>打开右上角“调整”，选择固定景点加入这一天，返回后这里会跟进。</span></p></div></details></div></div>';
  }

  function ensureBlocks() {
    if (!container) return;
    var real = $$('#route .journey-block:not(.is-pending)');
    $$('#route .journey-block.is-pending').forEach(function (el) { el.remove(); });
    real.forEach(function (el, i) {
      if (i < STATE.days) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
    var anchor = real[real.length - 1] || null;
    for (var i = REAL; i < STATE.days; i++) {
      var wrap = document.createElement('div');
      wrap.innerHTML = placeholderBlockHTML(i);
      var node = wrap.firstChild;
      if (anchor) { anchor.insertAdjacentElement('afterend', node); anchor = node; }
      else container.appendChild(node);
    }
  }

  function paintBlocks() {
    $$('#route .journey-block').forEach(function (block, i) {
      var lab = $('.journey-label', block); if (lab) lab.textContent = 'DAY ' + pad(i + 1);
      var day = $('.day', block);
      if (day) {
        var idx = $('.day-index', day); if (idx) idx.textContent = pad(i + 1);
        var sm = $('summary small', day); if (sm) sm.textContent = dateStr(i) + ' · ';
      }
      if (!block.classList.contains('is-pending')) return;
      var h = $('h3', block); if (h) h.textContent = '待编排';
      var draft = window.TravelItineraryDraft;
      var places = (draft && draft[i] && draft[i].places) ? draft[i].places : null;
      var det = $('.day-detail', block);
      if (!det) return;
      if (places && places.length) {
        det.innerHTML = '<strong>已加入 ' + places.length + ' 个地点</strong>' + places.map(function (p) {
          return '<p><b>' + esc(p.name) + '</b><span>' + esc(p.arrival || '时间待定') + (p.dwell ? ' · 逗留 ' + esc(p.dwell) : '') + '</span></p>';
        }).join('');
      } else {
        det.innerHTML = '<strong>待编排</strong><p><b>还没有行程</b><span>打开右上角“调整”，选择固定景点加入这一天。</span></p>';
      }
    });
  }

  function updateTexts() {
    var kicker = $('.jungle-cover-kicker');
    if (kicker) kicker.textContent = 'ZHONGSHAN · ' + (NUMWORD[STATE.days] || STATE.days) + ' DAY' + (STATE.days > 1 ? 'S' : '');
    var lede = $('.hero .lede');
    if (lede && /^[一二三四五六七八九十两]天/.test(lede.textContent)) {
      lede.textContent = (CNWORD[STATE.days] || (STATE.days + '天')) + lede.textContent.replace(/^[一二三四五六七八九十两]天/, '');
    }
    var rh = $('#route .section-heading h2');
    if (rh) rh.textContent = STATE.days + ' 天行程';
    $$('[data-plan-days]').forEach(function (el) { el.textContent = STATE.days; });
    var si = $('[data-plan-start]'), ei = $('[data-plan-end]');
    if (si) si.value = dateStr(0);
    if (ei) ei.value = dateStr(STATE.days - 1);
    try { localStorage.setItem('travel-handbook-plan', JSON.stringify({ start: dateStr(0), days: STATE.days })); } catch (e) {}
  }

  function dispatch() {
    var e;
    try { e = new CustomEvent('travel-plan-updated'); }
    catch (err) { e = document.createEvent('Event'); e.initEvent('travel-plan-updated', true, true); }
    document.dispatchEvent(e);
  }

  // 距离出发：用户选定的出发日期与今天的差值（实时）
  function updateCountdown() {
    var status = $('.pulse-status'); if (!status) return;
    var small = $('small', status), strong = $('strong', status);
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var s0 = new Date(STATE.start.getFullYear(), STATE.start.getMonth(), STATE.start.getDate());
    var endD = addDays(STATE.start, STATE.days - 1);
    var e0 = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate());
    if (today < s0) {
      var diff = Math.round((s0 - today) / 86400000);
      if (small) small.textContent = '距离出发';
      if (strong) strong.textContent = diff + ' 天';
    } else if (today > e0) {
      if (small) small.textContent = '旅程已完成';
      if (strong) strong.textContent = STATE.days + ' 天';
    } else {
      var day = Math.round((today - s0) / 86400000) + 1;
      if (small) small.textContent = '旅行进行中 · DAY ' + String(day).padStart(2, '0');
      if (strong) strong.textContent = '第 ' + day + ' 天';
    }
  }

  function apply() { ensureBlocks(); paintBlocks(); updateTexts(); updateCountdown(); dispatch(); }

  function buildBar() {
    var host = $('.jungle-cover-dates') || $('header.hero') || $('#top');
    if (!host || $('#trip-plan-bar')) return;
    host.id = 'trip-plan-bar';
    host.innerHTML = '<label class="hero-date"><span>出发</span><input type="date" data-plan-start></label>'
      + '<i class="hero-date-arrow">→</i>'
      + '<label class="hero-date"><span>返程</span><input type="date" data-plan-end></label>'
      + '<span class="hero-days">共 <b data-plan-days>' + STATE.days + '</b> 天</span>';
    var si = $('[data-plan-start]', host), ei = $('[data-plan-end]', host);
    si.value = dateStr(0); ei.value = dateStr(STATE.days - 1);
    function clampDays(n) { return Math.max(1, Math.min(MAXDAYS, n)); }
    function diffDays(a, b) { return Math.round((b - a) / 86400000) + 1; }
    // 改开始日期：起止都自由；若开始被推到结束之后，则按原天数顺延结束
    function readStart() {
      var s = parseDate(si.value), en = parseDate(ei.value), len = Math.max(1, STATE.days);
      if (s > en) { en = addDays(s, len - 1); ei.value = fmtISO(en); }
      STATE.start = s; STATE.days = clampDays(diffDays(s, en));
      apply();
    }
    // 改结束日期：以起止自动算天数；若结束早于开始，则把开始前移到结束
    function readEnd() {
      var s = parseDate(si.value), en = parseDate(ei.value);
      if (en < s) { s = en; si.value = fmtISO(en); }
      STATE.start = s; STATE.days = clampDays(diffDays(s, en));
      apply();
    }
    si.onchange = readStart; ei.onchange = readEnd;
  }

  function buildStepper() {
    var status = $('.pulse-status');
    if (!status || $('.trip-plan-stepper', status)) return;
    var strong = $('strong', status);
    var box = document.createElement('div');
    box.className = 'trip-plan-stepper';
    box.innerHTML = '<button type="button" data-plan-minus aria-label="减少一天">−</button>'
      + '<span class="trip-plan-stepper__val"><b data-plan-days>' + STATE.days + '</b> 天</span>'
      + '<button type="button" data-plan-plus aria-label="增加一天">＋</button>';
    if (strong && strong.parentNode) strong.parentNode.insertBefore(box, strong.nextSibling);
    else status.appendChild(box);
    $('[data-plan-minus]', box).onclick = function () { if (STATE.days > 1) { STATE.days--; apply(); } };
    $('[data-plan-plus]', box).onclick = function () { if (STATE.days < MAXDAYS) { STATE.days++; apply(); } };
  }

  window.TravelTripPlan = {
    get start() { return dateStr(0); },
    get days() { return STATE.days; },
    dates: function () { var a = []; for (var i = 0; i < STATE.days; i++) a.push(dateStr(i)); return a; },
    refresh: function () { paintBlocks(); },
    apply: apply
  };

  function init() {
    buildBar();
    buildStepper();
    apply();
    document.addEventListener('travel-itinerary-updated', function () { paintBlocks(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
