// ==UserScript==
// @name         ST-Mate
// @namespace    https://github.com/Pocket-Deer/ST-Mate
// @downloadURL  https://raw.githubusercontent.com/Pocket-Deer/ST-Mate/main/ST-Mate.user.js
// @updateURL    https://raw.githubusercontent.com/Pocket-Deer/ST-Mate/main/ST-Mate.user.js
// @version      1.8.1
// @description  Steam-Trader Helper
// @author       Pocket Deer
// @match        https://steam-trader.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand

// ==/UserScript==

(() => {
  'use strict';

  /* ══════════════ 1. Настройки ══════════════ */

  const DEF = {
    tz: 'Europe/Moscow',
    color: '#2196f3',
    format: 'time-date', // 'time-date' | 'date-time'
    blacklist: '',
    ignoreMentions: '0', // '1' | '0'
    colorNicks:     '1'
  };

  const S = new Proxy(load(), {
    set(obj, k, v) { obj[k] = v; GM_setValue(k, v); return true; }
  });

  function load() {
    const res = { ...DEF };
    Object.keys(DEF).forEach(k => {
      const v = GM_getValue(k, '');
      if (v !== '') res[k] = v;
    });
    return res;
  }

  /* ══════════════ 2. Утилиты ══════════════ */

  const TZ_LIST = [
    'Europe/Moscow','Europe/Samara','Asia/Yekaterinburg','Asia/Omsk',
    'Asia/Novosibirsk','Asia/Krasnoyarsk','Asia/Irkutsk',
    'Asia/Yakutsk','Asia/Vladivostok','Europe/Minsk','Europe/Kyiv'
  ];

  const fmtTime = ts => {
    const d = new Date(+ts);
    const t = d.toLocaleTimeString('ru-RU',
      { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:S.tz });
    const D = d.toLocaleDateString('ru-RU',
      { day:'2-digit', month:'2-digit', timeZone:S.tz });
    return S.format === 'time-date' ? `${t} ${D}` : `${D} ${t}`;
  };

  const lighten = c => {
    const n = parseInt(c.slice(1), 16),
          r = Math.min(255, (n>>16)+46),
          g = Math.min(255, (n>>8 &255)+46),
          b = Math.min(255, (n&255)+46);
    return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1);
  };

  const blackArr = () =>
    S.blacklist.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);

    function nickColor(raw){
        let h = 5381;
        for (let i = 0; i < raw.length; i++) h = (h * 33) ^ raw.charCodeAt(i);
        return `hsl(${(h>>>0)%360} 65% 60%)`;   // «телеграмный» цвет
    }

    const mixedRE = /(?=.*[A-Za-z])(?=.*[А-Яа-яЁё])/;            // лат + кир
    const invisRE = /[\u200B-\u200D\u2060\uFEFF]/;               // zero‑width
    function highlightConfusables(nickEl){
        const t = nickEl.textContent;
        if (!mixedRE.test(t) && !invisRE.test(t)) return;
        nickEl.classList.add('nick-sus');                          // красная плашка
    }

  /* ══════════════ 3. Стили (динамич.) ══════════════ */

  const BTN_GRAY = ['#6b6b6b', '#8a8a8a']; 

  const styleTag = document.head.appendChild(document.createElement('style'));
  const drawCSS = () => styleTag.textContent = `
    #chat .body p{position:relative;margin:0;padding-right:120px}
    #chat .body p .msg-time{
      position:absolute;right:14px;top:0;width:100px;text-align:right;
      font:500 12px/16px "Roboto Mono","Consolas","Liberation Mono",monospace;
      color:${S.color};text-shadow:0 0 1px #000a;user-select:none;white-space:nowrap;z-index:1
    }

    #stm-gear{position:fixed;top:12px;left:12px;z-index:10000;width:30px;height:30px;
      border-radius:6px;background:${S.color}cc;display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:.2s}
    #stm-gear:hover{background:${lighten(S.color)}}
    #stm-gear svg{width:18px;height:18px;fill:#fff}

    #stm-panel{position:fixed;right:30px;top:30px;z-index:9999;width:300px;
      background:#1e1e1e;border:1px solid #555;border-radius:8px;padding:20px;
      color:#eaeaea;font:14px/18px Arial,Helvetica,sans-serif;box-shadow:0 4px 12px #000a}
    #stm-panel h2{margin:0 0 14px;font-size:17px;text-align:center}
    #stm-panel label{display:block;margin-bottom:10px;font-weight:700;cursor:pointer}
    #stm-panel select,#stm-panel input[type=text],#stm-panel input[type=color]{
      width:100%;padding:6px 7px;margin-top:4px;margin-bottom:12px;
      background:#2d2d2d;border:1px solid #666;color:#fff;border-radius:4px}
    #stm-panel button{padding:7px 14px;width:100%;border:none;border-radius:4px;
      background:${BTN_GRAY[0]};color:#fff;font-weight:700;cursor:pointer;transition:.2s}
    #stm-panel button:hover{background:${BTN_GRAY[1]}}
    #stm-panel .close{position:absolute;right:10px;top:10px;cursor:pointer;font-weight:700;color:#888}
    #stm-panel .close:hover{color:#fff}

    /* toggle */
    #stm-panel .toggle{display:inline-block;width:42px;height:20px;margin-left:10px;
      border-radius:10px;background:#d66;vertical-align:middle;cursor:pointer;position:relative;transition:.2s;pointer-events:auto !important;}
    #stm-panel .toggle::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;
      border-radius:50%;background:#fff;transition:.2s}
    #stm-panel .toggle.on{background:#5c5}
    #stm-panel .toggle.on::after{left:24px}

    .nick-colored { font-weight: 600; }
.nick-sus      { background:#600; color:#fff; padding:0 2px; border-radius:2px; }
  `;
  drawCSS();

  /* ══════════════ 4. Логика чата ══════════════ */

  const isPing = p => p.classList.contains('pm');
  const shouldHide = p => {
    const nick = p.querySelector('span')?.textContent.trim().toLowerCase() || '';
    const banned = blackArr().includes(nick);
    return banned && (S.ignoreMentions === '1' || !isPing(p));
  };

  const decorate = p => {
    if (shouldHide(p)) { p.style.display = 'none'; return; }
    p.style.display = '';
    let sp = p.querySelector('.msg-time');
    if (!sp) {
      const id = p.dataset.id, ts = id && /^\d+$/.test(id) ?
        (id.length === 13 ? +id : +id * 1000) : Date.now();
      sp = document.createElement('span');
      sp.className = 'msg-time'; sp.dataset.ts = ts;
      p.appendChild(sp);
    }
    sp.textContent = fmtTime(sp.dataset.ts);
    sp.style.color = S.color;

      const nickEl = p.querySelector('span');
      if (nickEl){
          if (S.colorNicks === '1') {
              nickEl.classList.add('nick-colored');
              nickEl.style.color = nickColor(nickEl.textContent);
              highlightConfusables(nickEl);
          } else {
              // убираем всё, если раньше было
              nickEl.classList.remove('nick-colored','nick-sus');
              nickEl.style.color = '';
          }
      }
  };

  const scan = () =>
    document.querySelectorAll('#chat .body p[data-id]').forEach(decorate);

  const watchChat = () => {
    const body = document.querySelector('#chat .body');
    if (!body) return;
    scan();
    new MutationObserver(ms =>
      ms.forEach(m => m.addedNodes.forEach(n =>
        n.nodeType === 1 && n.matches('p[data-id]') && decorate(n))))
      .observe(body, { childList:true });
  };

  /* ══════════════ 5. UI ══════════════ */

  const togglePanel = () => {
    const p = document.querySelector('#stm-panel');
    p ? (p.style.display = p.style.display === 'none' ? 'block' : 'none') : buildPanel();
  };

  const buildGear = () => {
    if (document.querySelector('#stm-gear')) return;
    const g = document.body.appendChild(document.createElement('div'));
    g.id = 'stm-gear';
    g.innerHTML = `<svg viewBox="0 0 96 96"><path d="M48 19c8-1 17 4 21 11 5 8 5 19 0 27-4 7-13 12-21 11-9 0-17-5-21-13-5-7-5-18 0-25 4-7 12-11 21-11m0-8C34 11 24 21 24 34c-5 11-5 24 0 35 4 13 14 23 27 23s24-10 27-23c5-11 5-24 0-35-4-13-14-23-27-23z"/></svg>`;
    g.onclick = togglePanel;
  };

  const buildPanel = () => {
    const d = document.body.appendChild(document.createElement('div'));
    d.id = 'stm-panel';
    d.innerHTML = `
      <span class="close">✕</span><h2>ST-Mate — настройки</h2>

      <label>Часовой пояс
        <select id="tz">${TZ_LIST.map(t =>
          `<option ${t === S.tz ? 'selected' : ''}>${t}</option>`).join('')}</select>
      </label>

      <label>Цвет времени
        <input type="color" id="col" value="${S.color}">
      </label>

      <label>Формат времени
        <select id="fmt">
          <option value="time-date">HH:mm:ss&nbsp;dd.MM</option>
          <option value="date-time">dd.MM&nbsp;HH:mm:ss</option>
        </select>
      </label>

      <label>Чёрный список (через запятую)
        <input type="text" id="bl" placeholder="ToxicUser, Spammer" value="${S.blacklist}">
      </label>

      <label id="ignWrap">Игнорировать упоминания
          <span id="ign" class="toggle${S.ignoreMentions==='1'?' on':''}"></span>
      </label>

      <label id="nickWrap">Цветные ники / Anti‑clone
  <span id="nickTg" class="toggle${S.colorNicks==='1'?' on':''}"></span>
</label>


      <button id="save">Сохранить</button>
    `;

    const $ = id => d.querySelector(id);

    let ign = S.ignoreMentions === '1';

const wrap = $('#ignWrap');
const knob = $('#ign');

const recolor = () => wrap.style.color = ign ? '#8f8' : '#f88';
recolor();

const toggleIgn = () => {
  ign = !ign;
  knob.classList.toggle('on', ign);
  recolor();
};

wrap.onclick = toggleIgn;
knob.onclick = e => { e.stopPropagation(); toggleIgn(); };

    /* === nick‑toggle === */
    let nOn = S.colorNicks === '1';
    const nWrap = $('#nickWrap');
    const nKnob = $('#nickTg');
    const nColor = () => nWrap.style.color = nOn ? '#8f8' : '#f88';
    nColor();

    const flipNick = () => { nOn = !nOn;
      nKnob.classList.toggle('on', nOn); nColor(); };
    nWrap.onclick = flipNick;
nKnob.onclick = e => { e.stopPropagation(); flipNick(); };

    d.querySelector('.close').onclick = () => d.style.display = 'none';

    $('#save').onclick = () => {
      try { Intl.DateTimeFormat(undefined,{ timeZone: $('#tz').value }); }
      catch { return alert('Неверный IANA-TZ'); }

      S.tz             = $('#tz').value;
      S.color          = $('#col').value;
      S.format         = $('#fmt').value;
      S.blacklist      = $('#bl').value;
      S.ignoreMentions = ign ? '1' : '0';
      S.colorNicks   = nOn ? '1' : '0';

      drawCSS(); scan();
      d.style.display = 'none';
    };
  };


  /* ══════════════ 6. Init ══════════════ */

  const init = () => {
    buildGear(); watchChat();
    GM_registerMenuCommand('ST-Mate — настройки', togglePanel);
  };

  document.readyState === 'loading'
    ? addEventListener('DOMContentLoaded', init)
    : init();

})();
