import type { Story } from '../types/story'

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

// Produces a single, dependency-free HTML file that plays the story without Plotline installed.
// The runtime below is a deliberately small re-implementation of engine/play.ts in vanilla JS,
// since the exported file can't import anything from the app.
export function buildStandaloneHtml(story: Story): string {
  const embeddedStory = JSON.stringify(story).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(story.title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 640px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; line-height: 1.6; background: #f8fafc; color: #0f172a; }
  @media (prefers-color-scheme: dark) { body { background: #020617; color: #e2e8f0; } }
  h1 { font-size: 1.25rem; margin: 0 0 1.5rem; }
  .scene { border: 1px solid rgba(100,116,139,.3); border-radius: 1rem; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; background: rgba(255,255,255,.6); }
  @media (prefers-color-scheme: dark) { .scene { background: rgba(15,23,42,.6); } }
  .scene h2 { margin: 0 0 .5rem; font-size: 1.05rem; }
  .scene p { margin: 0; white-space: pre-line; }
  .choices { display: flex; flex-direction: column; gap: .5rem; }
  button.choice { text-align: left; padding: .75rem 1rem; border-radius: .75rem; border: 1px solid rgba(100,116,139,.4); background: transparent; color: inherit; font-size: .9rem; cursor: pointer; font-family: inherit; }
  button.choice:hover { border-color: #8b5cf6; background: rgba(139,92,246,.08); }
  .ending { text-align: center; }
  .ending .badge { display: inline-block; padding: .35rem 1rem; border-radius: 999px; background: rgba(139,92,246,.12); color: #7c3aed; font-size: .85rem; font-weight: 600; margin-bottom: .75rem; }
  button.restart { padding: .6rem 1.25rem; border-radius: .75rem; border: none; background: #7c3aed; color: white; font-size: .9rem; cursor: pointer; font-family: inherit; }
  footer { margin-top: 3rem; text-align: center; font-size: .75rem; opacity: .5; }
</style>
</head>
<body>
<h1>${escapeHtml(story.title)}</h1>
<div id="app"></div>
<footer>Сделано в Plotline</footer>
<script>
(function () {
  var STORY = ${embeddedStory};

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

  var state = startState();

  function render() {
    var app = document.getElementById('app');
    app.innerHTML = '';
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

    if (choices.length === 0) {
      var ending = document.createElement('div');
      ending.className = 'ending';
      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'Конец истории';
      var restart = document.createElement('button');
      restart.className = 'restart';
      restart.textContent = 'Сыграть заново';
      restart.onclick = function () { state = startState(); render(); };
      ending.appendChild(badge);
      ending.appendChild(document.createElement('br'));
      ending.appendChild(restart);
      app.appendChild(ending);
      return;
    }

    var choicesWrap = document.createElement('div');
    choicesWrap.className = 'choices';
    choices.forEach(function (choice) {
      var btn = document.createElement('button');
      btn.className = 'choice';
      btn.textContent = choice.text || '...';
      btn.onclick = function () {
        state = { nodeId: choice.targetNodeId, variables: applyEffects(choice, state.variables) };
        render();
      };
      choicesWrap.appendChild(btn);
    });
    app.appendChild(choicesWrap);
  }

  render();
})();
</script>
</body>
</html>
`
}
