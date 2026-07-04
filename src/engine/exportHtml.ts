import type { Story } from '../types/story'

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

// Produces a single, dependency-free HTML file that plays the story without Plotline installed.
// The runtime below is a deliberately small re-implementation of engine/play.ts in vanilla JS,
// since the exported file can't import anything from the app.
export function buildStandaloneHtml(story: Story): string {
  // Author notes are private; strip them so they aren't readable in the exported file's source.
  const nodes = Object.fromEntries(
    Object.entries(story.nodes).map(([id, node]) => {
      const { notes, ...rest } = node
      void notes
      return [id, rest]
    }),
  )
  const embeddedStory = JSON.stringify({ ...story, nodes }).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(story.title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; line-height: 1.6; background: #f8fafc; color: #0f172a; }
  body.dark { background: #020617; color: #e2e8f0; }
  @media (prefers-color-scheme: dark) { body:not(.light) { background: #020617; color: #e2e8f0; } }
  #theme-toggle { position: fixed; top: 1rem; right: 1rem; padding: .3rem .6rem; border-radius: .5rem; border: 1px solid rgba(100,116,139,.4); background: transparent; color: inherit; font-size: .8rem; cursor: pointer; font-family: inherit; opacity: .6; }
  #theme-toggle:hover { opacity: 1; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  .description { margin: 0 0 1.5rem; opacity: .7; font-size: .9rem; white-space: pre-line; }
  .scene { border: 1px solid rgba(100,116,139,.3); border-radius: 1rem; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; background: rgba(255,255,255,.6); }
  body.dark .scene { background: rgba(15,23,42,.6); }
  @media (prefers-color-scheme: dark) { body:not(.light) .scene { background: rgba(15,23,42,.6); } }
  .scene h2 { margin: 0 0 .5rem; font-size: 1.05rem; }
  .scene p { margin: 0; white-space: pre-line; }
  .choices { display: flex; flex-direction: column; gap: .5rem; }
  button.choice { display: flex; align-items: center; gap: .6rem; text-align: left; padding: .75rem 1rem; border-radius: .75rem; border: 1px solid rgba(100,116,139,.4); background: transparent; color: inherit; font-size: .9rem; cursor: pointer; font-family: inherit; }
  button.choice:hover { border-color: #8b5cf6; background: rgba(139,92,246,.08); }
  .choice .key { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; width: 1.25rem; height: 1.25rem; border-radius: .3rem; border: 1px solid rgba(100,116,139,.4); font-size: .65rem; font-weight: 600; opacity: .6; }
  .ending { text-align: center; }
  .ending .badge { display: inline-block; padding: .35rem 1rem; border-radius: 999px; background: rgba(139,92,246,.12); color: #7c3aed; font-size: .85rem; font-weight: 600; margin-bottom: .75rem; }
  button.restart { padding: .6rem 1.25rem; border-radius: .75rem; border: none; background: #7c3aed; color: white; font-size: .9rem; cursor: pointer; font-family: inherit; }
  .nav-bar { display: flex; gap: .5rem; margin-bottom: 1rem; }
  button.btn-back { padding: .4rem .9rem; border-radius: .75rem; border: 1px solid rgba(100,116,139,.4); background: transparent; color: inherit; font-size: .85rem; cursor: pointer; font-family: inherit; }
  button.btn-back:hover { border-color: #8b5cf6; }
  button.btn-back:disabled { opacity: .35; cursor: not-allowed; }
  #restore { border: 1px solid rgba(100,116,139,.3); border-radius: 1rem; padding: 1.5rem; text-align: center; margin-bottom: 1.5rem; }
  #restore p { margin: 0 0 1rem; font-size: .95rem; }
  .restore-btns { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
  button.btn-resume { padding: .6rem 1.25rem; border-radius: .75rem; border: none; background: #7c3aed; color: white; font-size: .9rem; cursor: pointer; font-family: inherit; }
  button.btn-newgame { padding: .6rem 1.25rem; border-radius: .75rem; border: 1px solid rgba(100,116,139,.4); background: transparent; color: inherit; font-size: .9rem; cursor: pointer; font-family: inherit; }
  button.btn-newgame:hover { border-color: #8b5cf6; }
  details.vars { margin-top: 1.25rem; font-size: .8rem; color: #64748b; }
  details.vars summary { cursor: pointer; user-select: none; }
  details.vars dl { margin: .5rem 0 0; display: flex; flex-direction: column; gap: .2rem; }
  details.vars .var-row { display: flex; gap: .5rem; }
  details.vars dt { font-weight: 600; color: #475569; }
  @media (prefers-color-scheme: dark) { body:not(.light) details.vars dt { color: #94a3b8; } body:not(.light) details.vars { color: #64748b; } }
  body.dark details.vars dt { color: #94a3b8; } body.dark details.vars { color: #64748b; }
  footer { margin-top: 3rem; text-align: center; font-size: .75rem; opacity: .5; }
</style>
</head>
<body>
<button id="theme-toggle" aria-label="Переключить тему" title="Переключить светлую/тёмную тему">🌙</button>
<h1>${escapeHtml(story.title)}</h1>${story.description.trim() ? `\n<p class="description">${escapeHtml(story.description)}</p>` : ''}
<div id="app"></div>
<footer>Сделано в Plotline</footer>
<script>
(function () {
  var STORY = ${embeddedStory};
  var SAVE_KEY = 'plotline-save-' + STORY.id;
  var THEME_KEY = 'plotline-theme';

  (function initTheme() {
    var saved = localStorage.getItem(THEME_KEY);
    var btn = document.getElementById('theme-toggle');
    if (saved === 'dark') { document.body.classList.add('dark'); btn.textContent = '🌙'; }
    else if (saved === 'light') { document.body.classList.add('light'); btn.textContent = '☀️'; }
    else {
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      btn.textContent = prefersDark ? '🌙' : '☀️';
    }
  })();

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var body = document.body;
    var btn = document.getElementById('theme-toggle');
    if (body.classList.contains('dark')) {
      body.classList.remove('dark');
      body.classList.add('light');
      btn.textContent = '☀️';
      localStorage.setItem(THEME_KEY, 'light');
    } else {
      body.classList.remove('light');
      body.classList.add('dark');
      btn.textContent = '🌙';
      localStorage.setItem(THEME_KEY, 'dark');
    }
  });

  function meetsCondition(choice, variables) {
    var c = choice.condition;
    if (!c) return true;
    var actual = variables[c.variableId] || 0;
    switch (c.comparator) {
      case 'eq': return actual === c.value;
      case 'neq': return actual !== c.value;
      case 'gt': return actual > c.value;
      case 'gte': return actual >= c.value;
      case 'lt': return actual < c.value;
      case 'lte': return actual <= c.value;
      default: return true;
    }
  }

  function availableChoices(node, variables) {
    if (!node) return [];
    return node.choices.filter(function (c) {
      return c.targetNodeId !== null && STORY.nodes[c.targetNodeId] && meetsCondition(c, variables);
    });
  }

  function applyEffects(choice, variables) {
    var next = Object.assign({}, variables);
    (choice.effects || []).forEach(function (effect) {
      var current = next[effect.variableId] || 0;
      next[effect.variableId] = effect.op === 'set' ? effect.value : current + effect.value;
    });
    return next;
  }

  function startState() {
    var variables = {};
    (STORY.variables || []).forEach(function (v) { variables[v.id] = v.initialValue; });
    return { nodeId: STORY.startNodeId, variables: variables };
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !saved.nodeId || !STORY.nodes[saved.nodeId]) return null;
      return saved;
    } catch (e) { return null; }
  }

  function persistState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ nodeId: state.nodeId, variables: state.variables })); }
    catch (e) {}
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }

  var state = startState();
  var stateStack = [];
  var currentChoices = [];

  function goBack() {
    if (stateStack.length === 0) return;
    state = stateStack.pop();
    render();
  }

  function render() {
    var app = document.getElementById('app');
    app.innerHTML = '';

    var navBar = document.createElement('div');
    navBar.className = 'nav-bar';
    var backBtn = document.createElement('button');
    backBtn.className = 'btn-back';
    backBtn.textContent = '← Назад';
    backBtn.disabled = stateStack.length === 0;
    backBtn.onclick = goBack;
    navBar.appendChild(backBtn);
    app.appendChild(navBar);

    var node = STORY.nodes[state.nodeId];
    if (!node) {
      app.textContent = 'В этой истории нет стартовой сцены.';
      return;
    }

    var scene = document.createElement('div');
    scene.className = 'scene';
    var h2 = document.createElement('h2');
    h2.textContent = node.title || 'Без названия';
    var p = document.createElement('p');
    p.textContent = node.text || '';
    scene.appendChild(h2);
    scene.appendChild(p);
    app.appendChild(scene);

    var choices = availableChoices(node, state.variables);
    currentChoices = choices;

    if (choices.length === 0) {
      clearSave();
      var ending = document.createElement('div');
      ending.className = 'ending';
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Конец истории';
      var endingBtns = document.createElement('div');
      endingBtns.style.cssText = 'display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;margin-top:.75rem';
      if (stateStack.length > 0) {
        var backEnd = document.createElement('button');
        backEnd.className = 'btn-back';
        backEnd.textContent = '← Назад';
        backEnd.onclick = goBack;
        endingBtns.appendChild(backEnd);
      }
      var restart = document.createElement('button');
      restart.className = 'restart';
      restart.textContent = 'Сыграть заново';
      restart.onclick = function () { state = startState(); stateStack = []; clearSave(); render(); };
      endingBtns.appendChild(restart);
      ending.appendChild(badge);
      ending.appendChild(endingBtns);
      app.appendChild(ending);
    } else {
      persistState();
      var choicesWrap = document.createElement('div');
      choicesWrap.className = 'choices';
      choices.forEach(function (choice, index) {
        var btn = document.createElement('button');
        btn.className = 'choice';
        if (index < 9) {
          var kbd = document.createElement('kbd');
          kbd.className = 'key';
          kbd.textContent = String(index + 1);
          btn.appendChild(kbd);
        }
        var label = document.createElement('span');
        label.textContent = choice.text || '...';
        btn.appendChild(label);
        btn.onclick = (function (c) { return function () {
          stateStack.push(state);
          state = { nodeId: c.targetNodeId, variables: applyEffects(c, state.variables) };
          render();
        }; })(choice);
        choicesWrap.appendChild(btn);
      });
      app.appendChild(choicesWrap);
    }

    if (STORY.variables && STORY.variables.length > 0) {
      var details = document.createElement('details');
      details.className = 'vars';
      var summary = document.createElement('summary');
      summary.textContent = 'Переменные';
      details.appendChild(summary);
      var dl = document.createElement('dl');
      STORY.variables.forEach(function (v) {
        var row = document.createElement('div');
        row.className = 'var-row';
        var dt = document.createElement('dt');
        dt.textContent = v.name;
        var dd = document.createElement('dd');
        var val = state.variables[v.id];
        if (val === undefined) val = v.initialValue;
        dd.textContent = v.type === 'boolean' ? (val === 1 ? 'Да' : 'Нет') : String(val);
        row.appendChild(dt);
        row.appendChild(dd);
        dl.appendChild(row);
      });
      details.appendChild(dl);
      app.appendChild(details);
    }
  }

  document.addEventListener('keydown', function (e) {
    var target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
      if (e.key.toLowerCase() === 'b') { e.preventDefault(); goBack(); return; }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); state = startState(); stateStack = []; clearSave(); render(); return; }
    }
    var index = Number(e.key) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= currentChoices.length) return;
    e.preventDefault();
    var choice = currentChoices[index];
    stateStack.push(state);
    state = { nodeId: choice.targetNodeId, variables: applyEffects(choice, state.variables) };
    render();
  });

  var saved = loadSave();
  if (saved) {
    var restoreDiv = document.createElement('div');
    restoreDiv.id = 'restore';
    var restoreMsg = document.createElement('p');
    restoreMsg.textContent = 'У вас есть сохранённый прогресс. Продолжить?';
    var btns = document.createElement('div');
    btns.className = 'restore-btns';
    var resumeBtn = document.createElement('button');
    resumeBtn.className = 'btn-resume';
    resumeBtn.textContent = 'Продолжить';
    resumeBtn.onclick = function () {
      state = saved;
      restoreDiv.remove();
      render();
    };
    var newBtn = document.createElement('button');
    newBtn.className = 'btn-newgame';
    newBtn.textContent = 'Начать заново';
    newBtn.onclick = function () {
      state = startState();
      clearSave();
      restoreDiv.remove();
      render();
    };
    btns.appendChild(resumeBtn);
    btns.appendChild(newBtn);
    restoreDiv.appendChild(restoreMsg);
    restoreDiv.appendChild(btns);
    document.getElementById('app').appendChild(restoreDiv);
  } else {
    render();
  }
})();
</script>
</body>
</html>
`
}
