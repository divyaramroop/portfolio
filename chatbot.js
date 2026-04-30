// ═══════════════════════════════════════════
//  DIVYA RAMROOP — CHATBOT ENGINE
//  Intents loaded from intents.json
// ═══════════════════════════════════════════

let INTENTS = [];

// ── MATCHING ENGINE ──────────────────────────

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
}
function tokenize(text) {
  return normalize(text).split(/\s+/).filter(w => w.length > 1);
}
function stem(word) {
  return word
    .replace(/ing$/, '').replace(/tion$/, '').replace(/tions$/, '')
    .replace(/ness$/, '').replace(/ment$/, '').replace(/ments$/, '')
    .replace(/ies$/, 'y').replace(/ed$/, '').replace(/er$/, '')
    .replace(/ers$/, '').replace(/ly$/, '').replace(/s$/, '');
}
function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = [];
  for (let i = 0; i <= b.length; i++) {
    dp[i] = [i];
    for (let j = 1; j <= a.length; j++) {
      dp[i][j] = i === 0 ? j :
        b[i-1] === a[j-1] ? dp[i-1][j-1] :
        1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[b.length][a.length];
}
function getBigrams(tokens) {
  const bg = [];
  for (let i = 0; i < tokens.length - 1; i++) bg.push(tokens[i] + ' ' + tokens[i+1]);
  return bg;
}
function scoreIntent(input, intent) {
  const inputTokens  = tokenize(input);
  const inputStems   = inputTokens.map(stem);
  const inputBigrams = getBigrams(inputTokens);
  const normInput    = normalize(input);
  let score = 0;
  for (const trigger of intent.triggers) {
    const triggerNorm  = normalize(trigger);
    const triggerStems = tokenize(trigger).map(stem);
    if (normInput.includes(triggerNorm)) { score += 10 + triggerNorm.length * 0.3; continue; }
    for (const bg of inputBigrams) {
      if (triggerNorm.includes(bg) || bg === triggerNorm) score += 6;
    }
    for (const ts of triggerStems) {
      if (ts.length < 3) continue;
      for (const is of inputStems) {
        if (is === ts) { score += 4; break; }
        if (ts.length > 4 && is.length > 3) {
          const d = levenshtein(is, ts);
          if (d === 1) score += 3;
          else if (d === 2 && ts.length > 6) score += 1.5;
        }
      }
    }
  }
  return score;
}
function getResponse(input) {
  if (!input.trim()) return null;
  let best = null, bestScore = 0;
  for (const intent of INTENTS) {
    const score = scoreIntent(input, intent);
    if (score > bestScore) { bestScore = score; best = intent; }
  }
  if (bestScore < 3) return "Hmm, I'm not sure I caught that! Try asking about my research, projects, background, or how to reach me. Or email me at <a href='mailto:contactdramroop@gmail.com' style='color:#2d2d6b;font-weight:600;'>contactdramroop@gmail.com</a> 😊";
  return best.response;
}

// ── UI ───────────────────────────────────────

function buildChatUI() {
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

    #dr-bubble-wrap {
      position:fixed; bottom:28px; right:28px; z-index:9999;
      display:flex; align-items:center; gap:10px; flex-direction:row-reverse;
    }
    #dr-bubble-label {
      background:white; border-radius:20px; padding:10px 16px;
      box-shadow:0 4px 18px rgba(0,0,0,0.13); display:flex;
      flex-direction:column; gap:2px; cursor:pointer;
      border:1px solid #e5e3e0;
      animation:dr-label-in 0.5s cubic-bezier(0.34,1.56,0.64,1) 1.2s both;
      transition:box-shadow 0.2s, transform 0.2s;
    }
    #dr-bubble-label:hover { box-shadow:0 6px 24px rgba(0,0,0,0.16); transform:translateY(-2px); }
    @keyframes dr-label-in {
      from { opacity:0; transform:translateX(12px) scale(0.9); }
      to   { opacity:1; transform:translateX(0) scale(1); }
    }
    .dr-label-top { font-size:13px; font-weight:700; color:#1a1a2e; font-family:'DM Sans',sans-serif; white-space:nowrap; }
    .dr-label-sub { font-size:11px; color:#6b6b80; font-family:'DM Sans',sans-serif; white-space:nowrap; }
    .dr-label-dot {
      display:inline-block; width:7px; height:7px; background:#25d366;
      border-radius:50%; margin-right:4px; animation:dr-pulse 1.8s infinite;
    }
    @keyframes dr-pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }

    #dr-bubble-inner { position:relative; flex-shrink:0; }
    #dr-bubble {
      width:62px; height:62px; border-radius:50%;
      background:#2d2d6b; border:3px solid #fff; cursor:pointer;
      box-shadow:0 4px 22px rgba(45,45,107,0.38);
      display:flex; align-items:center; justify-content:center;
      transition:transform 0.2s, box-shadow 0.2s;
      overflow:hidden; padding:0;
    }
    #dr-bubble:hover { transform:scale(1.07); box-shadow:0 6px 30px rgba(45,45,107,0.48); }
    #dr-bubble img { width:100%; height:100%; object-fit:cover; object-position:center 15%; border-radius:50%; display:block; }
    #dr-bubble .bubble-fallback { font-size:20px; font-weight:700; color:white; font-family:'DM Sans',sans-serif; }
    #dr-bubble-online {
      position:absolute; bottom:2px; right:2px;
      width:14px; height:14px; background:#25d366;
      border-radius:50%; border:2px solid white; pointer-events:none; z-index:10001;
    }

    #dr-win {
      position:fixed; bottom:96px; right:28px; z-index:9998;
      width:340px; max-height:520px; background:#ece5dd;
      border-radius:18px; box-shadow:0 10px 48px rgba(0,0,0,0.18);
      display:flex; flex-direction:column; overflow:hidden;
      transform:scale(0.9) translateY(12px); opacity:0; pointer-events:none;
      transition:transform 0.24s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease;
    }
    #dr-win.open { transform:scale(1) translateY(0); opacity:1; pointer-events:all; }

    #dr-header {
      background:#2d2d6b; padding:12px 14px;
      display:flex; align-items:center; gap:10px; flex-shrink:0;
    }
    #dr-header-avatar {
      width:38px; height:38px; border-radius:50%;
      object-fit:cover; object-position:center 15%;
      flex-shrink:0; border:2px solid rgba(255,255,255,0.25);
    }
    #dr-header-fallback {
      width:38px; height:38px; border-radius:50%;
      background:rgba(255,255,255,0.18); color:white;
      font-size:14px; font-weight:700;
      display:none; align-items:center; justify-content:center;
      flex-shrink:0; font-family:'DM Sans',sans-serif;
    }
    .dr-header-info { flex:1; }
    .dr-header-name   { font-size:15px; font-weight:600; color:white; font-family:'DM Sans',sans-serif; }
    .dr-header-status { font-size:11.5px; color:rgba(255,255,255,0.72); font-family:'DM Sans',sans-serif; }
    #dr-close { background:none; border:none; color:rgba(255,255,255,0.8); font-size:16px; cursor:pointer; padding:2px 4px; }
    #dr-close:hover { color:white; }

    #dr-msgs {
      flex:1; overflow-y:auto; padding:12px 10px;
      display:flex; flex-direction:column; gap:4px; scroll-behavior:smooth;
    }
    #dr-msgs::-webkit-scrollbar { width:3px; }
    #dr-msgs::-webkit-scrollbar-thumb { background:#ccc; border-radius:3px; }

    .dr-date-stamp {
      text-align:center; font-size:11px; color:#888;
      background:rgba(255,255,255,0.55); border-radius:6px;
      padding:3px 10px; align-self:center; margin:4px 0 8px;
      font-family:'DM Sans',sans-serif;
    }
    .dr-msg-wrap { display:flex; flex-direction:column; max-width:78%; animation:dr-slide 0.18s ease; }
    @keyframes dr-slide { from{opacity:0;transform:translateY(5px);} to{opacity:1;transform:none;} }
    .dr-msg-wrap.user { align-self:flex-end; align-items:flex-end; }
    .dr-msg-wrap.bot  { align-self:flex-start; align-items:flex-start; }
    .dr-bubble-text {
      padding:8px 12px; border-radius:10px;
      font-size:13.5px; line-height:1.55;
      font-family:'DM Sans',sans-serif; word-wrap:break-word;
    }
    .dr-msg-wrap.user .dr-bubble-text { background:#dcf8c6; border-bottom-right-radius:3px; color:#111; }
    .dr-msg-wrap.bot  .dr-bubble-text { background:#ffffff; border-bottom-left-radius:3px;  color:#111; }

    .dr-meta { display:flex; align-items:center; gap:3px; margin-top:2px; padding:0 2px; }
    .dr-time  { font-size:10.5px; color:#888; font-family:'DM Sans',sans-serif; }
    .dr-ticks { font-size:13px; color:#888; line-height:1; transition:color 0.3s; }
    .dr-ticks.delivered { color:#888; }
    .dr-ticks.read      { color:#53bdeb; }

    #dr-typing-wrap { align-self:flex-start; animation:dr-slide 0.18s ease; }
    .dr-typing-bubble {
      background:#fff; border-radius:10px; border-bottom-left-radius:3px;
      padding:10px 14px; display:flex; gap:4px; align-items:center;
    }
    .dr-typing-bubble span {
      width:7px; height:7px; border-radius:50%; background:#aaa;
      display:inline-block; animation:dr-bounce 1.3s infinite;
    }
    .dr-typing-bubble span:nth-child(2) { animation-delay:0.2s; }
    .dr-typing-bubble span:nth-child(3) { animation-delay:0.4s; }
    @keyframes dr-bounce { 0%,60%,100%{transform:translateY(0);} 30%{transform:translateY(-5px);} }

    #dr-chips { display:flex; flex-wrap:wrap; gap:6px; padding:6px 10px 8px; flex-shrink:0; }
    .dr-chip {
      font-size:12px; background:white; color:#2d2d6b;
      border:1px solid #d4d1ed; border-radius:16px; padding:5px 11px;
      cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s;
    }
    .dr-chip:hover { background:#eae8f5; }

    #dr-input-row { display:flex; align-items:center; gap:8px; padding:8px 10px; background:#f0f0f0; flex-shrink:0; }
    #dr-input {
      flex:1; border:none; border-radius:22px; padding:9px 14px;
      font-size:13.5px; outline:none; font-family:'DM Sans',sans-serif; background:white; color:#111;
    }
    #dr-send {
      width:38px; height:38px; border-radius:50%;
      background:#2d2d6b; color:white; border:none; cursor:pointer;
      font-size:15px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      transition:background 0.2s, transform 0.15s;
    }
    #dr-send:hover { background:#3d3d8b; transform:scale(1.08); }

    @media (max-width:480px) {
      #dr-win { width:calc(100vw - 24px); right:12px; }
      #dr-bubble-wrap { right:16px; bottom:16px; }
    }
  `;
  document.head.appendChild(style);

  // Bubble wrap
  const bubbleWrap = document.createElement('div');
  bubbleWrap.id = 'dr-bubble-wrap';

  const label = document.createElement('div');
  label.id = 'dr-bubble-label';
  label.innerHTML = `
    <div class="dr-label-top">💬 Chat with Divya</div>
    <div class="dr-label-sub"><span class="dr-label-dot"></span>online now · ask me anything</div>
  `;

  const bubbleInner = document.createElement('div');
  bubbleInner.id = 'dr-bubble-inner';

  const bubble = document.createElement('button');
  bubble.id = 'dr-bubble';
  bubble.setAttribute('aria-label', 'Chat with Divya');
  bubble.innerHTML = `
    <img src="images/divya_ramroop.jpg" alt="Divya"
      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
    <span class="bubble-fallback" style="display:none;">DR</span>
  `;

  const onlineDot = document.createElement('div');
  onlineDot.id = 'dr-bubble-online';

  bubbleInner.appendChild(bubble);
  bubbleInner.appendChild(onlineDot);
  bubbleWrap.appendChild(label);
  bubbleWrap.appendChild(bubbleInner);
  document.body.appendChild(bubbleWrap);

  // Chat window
  const win = document.createElement('div');
  win.id = 'dr-win';
  const dateStr = new Date().toLocaleDateString([], { weekday:'long', day:'numeric', month:'long' });
  win.innerHTML = `
    <div id="dr-header">
      <img id="dr-header-avatar" src="images/divya_ramroop.jpg" alt="Divya Ramroop"
        onerror="this.style.display='none'; document.getElementById('dr-header-fallback').style.display='flex';">
      <div id="dr-header-fallback">DR</div>
      <div class="dr-header-info">
        <div class="dr-header-name">Divya Ramroop</div>
        <div class="dr-header-status" id="dr-status">online</div>
      </div>
      <button id="dr-close">✕</button>
    </div>
    <div id="dr-msgs">
      <div class="dr-date-stamp">${dateStr}</div>
    </div>
    <div id="dr-chips">
      <button class="dr-chip">What do you research?</button>
      <button class="dr-chip">Your projects</button>
      <button class="dr-chip">How to contact you?</button>
      <button class="dr-chip">Your background</button>
    </div>
    <div id="dr-input-row">
      <input id="dr-input" type="text" placeholder="Message Divya…" autocomplete="off" maxlength="200">
      <button id="dr-send" aria-label="Send">➤</button>
    </div>
  `;
  document.body.appendChild(win);

  const msgs   = win.querySelector('#dr-msgs');
  const input  = win.querySelector('#dr-input');
  const status = win.querySelector('#dr-status');

  function getTime() {
    return new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
  }
  function addUserMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'dr-msg-wrap user';
    wrap.innerHTML = `
      <div class="dr-bubble-text">${text}</div>
      <div class="dr-meta">
        <span class="dr-time">${getTime()}</span>
        <span class="dr-ticks">✓</span>
      </div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    const tick = wrap.querySelector('.dr-ticks');
    setTimeout(() => { tick.textContent = '✓✓'; tick.classList.add('delivered'); }, 500);
    setTimeout(() => { tick.classList.remove('delivered'); tick.classList.add('read'); }, 1000);
  }
  function showTyping() {
    status.textContent = 'typing...';
    const wrap = document.createElement('div');
    wrap.id = 'dr-typing-wrap';
    wrap.innerHTML = `<div class="dr-typing-bubble"><span></span><span></span><span></span></div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function removeTyping() {
    const t = document.getElementById('dr-typing-wrap');
    if (t) t.remove();
    status.textContent = 'online';
  }
  function addBotMessage(text) {
    const wrap = document.createElement('div');
    wrap.className = 'dr-msg-wrap bot';
    wrap.innerHTML = `
      <div class="dr-bubble-text">${text}</div>
      <div class="dr-meta"><span class="dr-time">${getTime()}</span></div>`;
    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function sendMessage(text) {
    text = text.trim();
    if (!text) return;
    input.value = '';
    win.querySelector('#dr-chips').style.display = 'none';
    addUserMessage(text);
    setTimeout(() => {
      showTyping();
      setTimeout(() => {
        removeTyping();
        addBotMessage(getResponse(text));
      }, 900 + Math.random() * 600);
    }, 1000);
  }
  function openChat() {
    win.classList.add('open');
    label.style.display = 'none';
    if (msgs.querySelectorAll('.dr-msg-wrap').length === 0) {
      setTimeout(() => {
        showTyping();
        setTimeout(() => {
          removeTyping();
          addBotMessage("Hey! 👋 I'm Divya. Feel free to ask me anything about my research, projects, or how to get in touch!");
        }, 900);
      }, 300);
    }
    setTimeout(() => input.focus(), 250);
  }
  function closeChat() {
    win.classList.remove('open');
    label.style.display = 'flex';
  }

  bubble.addEventListener('click', () => win.classList.contains('open') ? closeChat() : openChat());
  label.addEventListener('click', openChat);
  win.querySelector('#dr-close').addEventListener('click', closeChat);
  win.querySelector('#dr-send').addEventListener('click', () => sendMessage(input.value));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(input.value); });
  win.querySelectorAll('.dr-chip').forEach(chip => {
    chip.addEventListener('click', () => sendMessage(chip.textContent));
  });
}

// ── INIT: load intents then build UI ─────────

fetch('intents.json')
  .then(res => res.json())
  .then(data => {
    INTENTS = data;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', buildChatUI);
    } else {
      buildChatUI();
    }
  })
  .catch(err => console.warn('Could not load intents.json:', err));
