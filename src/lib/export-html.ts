// Interactive HTML export: converts the editor design (pages JSON) into a
// self-contained, interactive HTML presentation with real DOM elements
// (text, shapes, images, embeds...), keyboard + button navigation,
// clickable links, jump-to-slide actions and live quiz answers.
// No external dependencies: works offline in any modern browser.

import type { Page } from '@/store/editor';

type Shadow = { x: number; y: number; blur: number; color: string };
type Gradient = { from: string; to: string; angle: number; type?: 'linear' | 'radial' };
type Interaction = { moveToSlide?: number };
// Elements are read dynamically from the design JSON; keep property access loose.
type AnyEl = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface InteractiveDesign {
  pages: Page[];
  canvasW: number;
  canvasH: number;
  name: string;
}

const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

const gradientCss = (g: Gradient): string =>
  (g.type ?? 'linear') === 'radial'
    ? 'radial-gradient(circle at 50% 50%, ' + g.from + ', ' + g.to + ')'
    : 'linear-gradient(' + num(g.angle) + 'deg, ' + g.from + ', ' + g.to + ')';

// Approximate exotic shapes with clip-path polygons. Simple shapes keep
// native CSS (border-radius / borders) so strokes render correctly.
// Cyber/decorative kinds fall back to a plain rect.
const CLIPS: Record<string, string> = {
  triangle: 'polygon(50% 0%, 0% 100%, 100% 100%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  arrow: 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  pentagon: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
  parallelogram: 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)',
  trapezoid: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
  lightning: 'polygon(40% 0%, 70% 0%, 55% 40%, 75% 40%, 30% 100%, 45% 55%, 25% 55%)',
  cross: 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)',
  speech: 'polygon(0% 0%, 100% 0%, 100% 75%, 40% 75%, 20% 100%, 25% 75%, 0% 75%)',
  heart: 'polygon(50% 100%, 14% 60%, 0% 35%, 8% 12%, 30% 4%, 50% 20%, 70% 4%, 92% 12%, 100% 35%, 86% 60%)',
};

function wrapEl(el: AnyEl, inner: string, extraStyle = ''): string {
  const style: string[] = [
    'position:absolute',
    'box-sizing:border-box',
    'left:' + num(el.x) + 'px',
    'top:' + num(el.y) + 'px',
    'width:' + num(el.width) + 'px',
    'height:' + num(el.height) + 'px',
  ];
  if (num(el.rotation)) style.push('transform:rotate(' + num(el.rotation) + 'deg)');
  if (typeof el.opacity === 'number' && el.opacity < 1) style.push('opacity:' + el.opacity);
  const blend = el.blendMode as string | undefined;
  if (blend && blend !== 'normal') style.push('mix-blend-mode:' + blend);
  const shadow = el.shadow as Shadow | undefined;
  if (shadow) style.push('filter:drop-shadow(' + shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.color + ')');
  const inter = el.interaction as Interaction | undefined;
  const goto = inter && inter.moveToSlide ? ' data-goto="' + inter.moveToSlide + '"' : '';
  const cursor = inter && inter.moveToSlide ? 'cursor:pointer;' : '';
  return '<div class="el"' + goto + ' style="' + cursor + style.join(';') + ';' + extraStyle + '">' + inner + '</div>';
}

function renderText(el: AnyEl): string {
  const style: string[] = [
    'width:100%',
    'height:100%',
    'display:flex',
    'flex-direction:column',
    'justify-content:flex-start',
    'box-sizing:border-box',
    'font-family:' + (el.fontFamily || 'Inter, system-ui, sans-serif'),
    'font-size:' + num(el.fontSize, 24) + 'px',
    'font-weight:' + num(el.fontWeight, 400),
    'color:' + (el.color || '#111'),
    'text-align:' + (el.align || 'left'),
    'white-space:pre-wrap',
    'word-break:break-word',
  ];
  if (el.italic) style.push('font-style:italic');
  if (el.underline) style.push('text-decoration:underline');
  if (typeof el.letterSpacing === 'number') style.push('letter-spacing:' + el.letterSpacing + 'em');
  if (typeof el.lineHeight === 'number') style.push('line-height:' + el.lineHeight);
  const tt = el.textTransform as string | undefined;
  if (tt && tt !== 'none') style.push('text-transform:' + tt);
  const shadow = el.shadow as Shadow | undefined;
  if (shadow) style.push('text-shadow:' + shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.color);
  const g = el.gradient as Gradient | undefined;
  if (g) {
    style.push('background:' + gradientCss(g));
    style.push('-webkit-background-clip:text');
    style.push('background-clip:text');
    style.push('color:transparent');
  }
  let body = el.bullet
    ? String(el.text ?? '').split('\n').map((l: string) => '• ' + esc(l)).join('\n')
    : esc(el.text);
  if (el.href) {
    body = '<a href="' + esc(el.href) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">' + body + '</a>';
  }
  return '<div style="' + style.join(';') + '">' + body + '</div>';
}

function renderShape(el: AnyEl): string {
  const kind = String(el.shape || 'rect');
  const style: string[] = ['width:100%', 'height:100%', 'box-sizing:border-box'];
  const g = el.gradient as Gradient | undefined;
  if (g) style.push('background:' + gradientCss(g));
  else style.push('background:' + (el.fill || 'transparent'));
  const clip = CLIPS[kind];
  const ring = kind === 'ring' || kind === 'hex_ring';
  if (kind === 'circle' || ring) style.push('border-radius:50%');
  if (kind === 'rect' && num(el.cornerRadius)) style.push('border-radius:' + num(el.cornerRadius) + 'px');
  if (clip) {
    style.push('clip-path:' + clip);
  } else if (ring) {
    style.push('background:transparent');
    style.push('border:' + num(el.strokeWidth, 2) + 'px ' + (el.strokeStyle || 'solid') + ' ' + (el.stroke || '#111'));
  } else if (el.stroke && el.stroke !== 'none' && num(el.strokeWidth) > 0) {
    style.push('border:' + num(el.strokeWidth) + 'px ' + (el.strokeStyle || 'solid') + ' ' + el.stroke);
  }
  const effect = String(el.effect || 'none');
  const fill = String(el.fill || '#fff');
  if (effect === 'neon') style.push('filter:drop-shadow(0 0 6px ' + fill + ') drop-shadow(0 0 18px ' + fill + ')');
  if (effect === 'soft_shadow') style.push('filter:drop-shadow(0 18px 28px rgba(0,0,0,0.35))');
  if (effect === 'inner_glow') style.push('box-shadow:inset 0 0 40px ' + fill);
  if (effect === 'liquid_glass') {
    style.push('backdrop-filter:blur(14px) saturate(160%)');
    style.push('-webkit-backdrop-filter:blur(14px) saturate(160%)');
    style.push('background:linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.18))');
  }
  return '<div style="' + style.join(';') + '"></div>';
}

function renderImage(el: AnyEl): string {
  const imgStyle: string[] = ['width:100%', 'height:100%', 'display:block', 'object-fit:' + (el.fit || 'cover')];
  if (num(el.cornerRadius)) imgStyle.push('border-radius:' + num(el.cornerRadius) + 'px');
  if (el.borderColor && num(el.borderWidth)) imgStyle.push('border:' + num(el.borderWidth) + 'px solid ' + el.borderColor);
  const f = el.filters as Record<string, number> | undefined;
  if (f) {
    imgStyle.push(
      'filter:brightness(' + num(f.brightness, 100) + '%) contrast(' + num(f.contrast, 100) +
      '%) saturate(' + num(f.saturate, 100) + '%) blur(' + num(f.blur) + 'px) grayscale(' + num(f.grayscale) +
      '%) sepia(' + num(f.sepia) + '%) hue-rotate(' + num(f.hueRotate) + 'deg) invert(' + num(f.invert) + '%)'
    );
  }
  let tr = '';
  if (el.flipX) tr += 'scaleX(-1) ';
  if (el.flipY) tr += 'scaleY(-1)';
  if (tr) imgStyle.push('transform:' + tr.trim());
  let inner = '<img src="' + esc(el.src) + '" alt="" draggable="false" style="' + imgStyle.join(';') + '" />';
  const g = el.gradient as Gradient | undefined;
  if (g) {
    inner += '<div style="position:absolute;inset:0;background:' + gradientCss(g) + ';opacity:' +
      (typeof el.gradientOpacity === 'number' ? el.gradientOpacity : 0.5) + '"></div>';
  }
  return '<div style="position:relative;width:100%;height:100%">' + inner + '</div>';
}

function renderIcon(el: AnyEl): string {
  if (el.src) return renderImage({ ...el, fit: 'contain' });
  // Lucide icons are React components and cannot be inlined in static HTML;
  // show a neutral placeholder so the slide layout is preserved.
  return '<div style="width:100%;height:100%;display:grid;place-items:center;color:' +
    (el.color || '#334155') + '"><div style="width:38%;height:38%;border:' +
    num(el.strokeWidth, 2) + 'px solid currentColor;border-radius:50%;opacity:.8"></div></div>';
}

function renderButton(el: AnyEl): string {
  const style: string[] = [
    'width:100%',
    'height:100%',
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    'box-sizing:border-box',
    'background:' + (el.bgColor || '#2563eb'),
    'color:' + (el.fgColor || '#fff'),
    'border:' + num(el.borderWidth) + 'px solid ' + (el.borderColor || 'transparent'),
    'border-radius:' + num(el.cornerRadius, 8) + 'px',
    'font-family:' + (el.fontFamily || 'Inter, system-ui, sans-serif'),
    'font-size:' + num(el.fontSize, 16) + 'px',
    'font-weight:' + num(el.fontWeight, 600),
    'text-decoration:none',
    'cursor:pointer',
  ];
  const shadow = el.shadow as Shadow | undefined;
  if (shadow) style.push('box-shadow:' + shadow.x + 'px ' + shadow.y + 'px ' + shadow.blur + 'px ' + shadow.color);
  const href = el.href as string | undefined;
  const inter = el.interaction as Interaction | undefined;
  if (href) {
    return '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="' + style.join(';') + '">' + esc(el.text) + '</a>';
  }
  if (inter && inter.moveToSlide) {
    return '<div data-goto="' + inter.moveToSlide + '" style="' + style.join(';') + '">' + esc(el.text) + '</div>';
  }
  return '<div style="' + style.join(';') + '">' + esc(el.text) + '</div>';
}

function renderEmbed(el: AnyEl): string {
  return '<iframe src="' + esc(el.src) + '" title="' + esc(el.title || 'Embed') +
    '" style="width:100%;height:100%;border:0" allow="' + esc(el.allow || 'autoplay; fullscreen; clipboard-write') +
    '" allowfullscreen></iframe>';
}

function renderChart(el: AnyEl): string {
  const data = (el.data || []) as Array<{ label?: string; value: number }>;
  const colors = (el.colors || ['#2563eb']) as string[];
  const fg = String(el.fgColor || '#334155');
  const max = Math.max(...data.map((d) => num(d.value, 0)), 1);
  const kind = String(el.chart || 'bar');
  let body = '';
  if (kind === 'pie' || kind === 'doughnut') {
    const total = data.reduce((a, d) => a + num(d.value, 0), 0) || 1;
    let acc = 0;
    const stops: string[] = [];
    data.forEach((d, i) => {
      const from = (acc / total) * 100;
      acc += num(d.value, 0);
      stops.push(colors[i % colors.length] + ' ' + from.toFixed(2) + '% ' + ((acc / total) * 100).toFixed(2) + '%');
    });
    body = '<div style="width:100%;height:100%;display:grid;place-items:center"><div style="width:80%;height:80%;border-radius:50%;background:conic-gradient(' +
      stops.join(', ') + ');display:grid;place-items:center">' +
      (kind === 'doughnut' ? '<div style="width:55%;height:55%;border-radius:50%;background:' + (el.bgColor || '#fff') + '"></div>' : '') +
      '</div></div>';
  } else if (kind === 'line') {
    const pts = data
      .map((d, i) => ((i / Math.max(data.length - 1, 1)) * 100).toFixed(2) + ',' + (95 - (num(d.value, 0) / max) * 90).toFixed(2))
      .join(' ');
    body = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%"><polyline points="' +
      pts + '" fill="none" stroke="' + colors[0] + '" stroke-width="2" vector-effect="non-scaling-stroke" />' +
      (el.showValues
        ? data.map((d, i) => '<circle cx="' + ((i / Math.max(data.length - 1, 1)) * 100).toFixed(2) + '" cy="' +
            (95 - (num(d.value, 0) / max) * 90).toFixed(2) + '" r="1.6" fill="' + colors[0] + '" />').join('')
        : '') +
      '</svg>';
  } else {
    const bars = data
      .map((d, i) => {
        const hPct = ((num(d.value, 0) / max) * 88).toFixed(1);
        return '<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;height:100%"><div style="width:70%;height:' +
          hPct + '%;background:' + colors[i % colors.length] + ';border-radius:4px 4px 0 0"></div>' +
          (el.showValues ? '<div style="font-size:10px;color:' + fg + '">' + num(d.value) + '</div>' : '') +
          '<div style="font-size:9px;color:' + fg + ';opacity:.7">' + esc(d.label || '') + '</div></div>';
      })
      .join('');
    body = '<div style="width:100%;height:100%;display:flex;align-items:flex-end;gap:6px;padding:4px 0;box-sizing:border-box">' + bars + '</div>';
  }
  let inner = body;
  if (el.title) {
    inner = '<div style="font:700 15px Inter,system-ui,sans-serif;color:' + fg + ';margin-bottom:8px">' + esc(el.title) +
      '</div><div style="height:calc(100% - 30px)">' + body + '</div>';
  }
  return '<div style="width:100%;height:100%;box-sizing:border-box;background:' + (el.bgColor || 'transparent') +
    ';border-radius:8px;padding:8px">' + inner + '</div>';
}

function renderQuiz(el: AnyEl): string {
  const opts = (el.options || []) as Array<{ id: string; label?: string; text?: string }>;
  const style: string[] = [
    'width:100%',
    'height:100%',
    'box-sizing:border-box',
    'display:flex',
    'flex-direction:column',
    'gap:8px',
    'justify-content:center',
    'padding:16px',
    'background:' + (el.bgColor || '#fff'),
    'color:' + (el.fgColor || '#111'),
    'border-radius:12px',
    'font-family:Inter,system-ui,sans-serif',
  ];
  const buttons = opts
    .map((o) => {
      const label = o.label ?? o.text ?? '';
      const correct = o.id === el.correctId ? 1 : 0;
      return '<button type="button" class="q-opt" data-correct="' + correct +
        '" style="text-align:left;padding:8px 12px;border:1px solid ' + (el.accentColor || '#2563eb') +
        '55;border-radius:8px;background:transparent;color:inherit;font-size:13px;cursor:pointer">' + esc(label) + '</button>';
    })
    .join('');
  return '<div class="quiz" style="' + style.join(';') + '"><div style="font-weight:700;font-size:15px">' +
    esc(el.question) + '</div>' + buttons + '</div>';
}

function renderUi(el: AnyEl): string {
  const ts = typeof el.textScale === 'number' ? el.textScale : 1;
  const pad = Math.round(16 * (typeof el.padScale === 'number' ? el.padScale : 1));
  const style: string[] = [
    'width:100%',
    'height:100%',
    'box-sizing:border-box',
    'display:flex',
    'flex-direction:column',
    'gap:6px',
    'justify-content:center',
    'padding:' + pad + 'px',
    'background:' + (el.bgColor || '#ffffff'),
    'color:' + (el.fgColor || '#334155'),
    'border-radius:' + num(el.cornerRadius, 12) + 'px',
    'font-family:' + (el.fontFamily || 'Inter, system-ui, sans-serif'),
  ];
  if (el.borderColorOverride) {
    style.push('border:' + num(el.borderWidth, 1) + 'px ' + (el.borderStyle || 'solid') + ' ' + el.borderColorOverride);
  }
  let inner = '<div style="font-weight:700;font-size:' + Math.round(17 * ts) + 'px' +
    (el.uppercase ? ';text-transform:uppercase' : '') + '">' + esc(el.title || '') + '</div>';
  if (el.body) {
    inner += '<div style="font-size:' + Math.round(13 * ts) + 'px;opacity:.85;white-space:pre-wrap">' + esc(el.body) + '</div>';
  }
  const items = (el.items || []) as string[];
  if (items.length) {
    inner += '<ul style="margin:0;padding-left:18px;font-size:' + Math.round(12 * ts) + 'px">' +
      items.map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>';
  }
  if (typeof el.value === 'number' && el.value > 0) {
    inner += '<div style="height:8px;border-radius:99px;background:currentColor;opacity:.15"><div style="height:100%;width:' +
      Math.min(100, Math.round(el.value)) + '%;border-radius:99px;background:' + (el.accentColor || '#2563eb') + '"></div></div>';
  }
  return '<div style="' + style.join(';') + '">' + inner + '</div>';
}

function renderElement(el: AnyEl): string {
  switch (el.type) {
    case 'text': return wrapEl(el, renderText(el));
    case 'shape': return wrapEl(el, renderShape(el));
    case 'image': return wrapEl(el, renderImage(el));
    case 'icon': return wrapEl(el, renderIcon(el));
    case 'button': return wrapEl(el, renderButton(el));
    case 'embed': return wrapEl(el, renderEmbed(el));
    case 'chart': return wrapEl(el, renderChart(el));
    case 'quiz': return wrapEl(el, renderQuiz(el));
    case 'ui': return wrapEl(el, renderUi(el));
    default: return '';
  }
}

function renderPage(page: Page, canvasW: number, canvasH: number): string {
  const style: string[] = ['width:' + canvasW + 'px', 'height:' + canvasH + 'px', 'background:' + (page.bgColor || '#fff')];
  if (page.bgImage) {
    style.push('background-image:url(' + JSON.stringify(page.bgImage) + ')');
    style.push('background-size:' + (page.bgFit || 'cover'));
    style.push('background-position:center');
    style.push('background-repeat:no-repeat');
  }
  const els = (page.elements || []).map((e) => renderElement(e as AnyEl)).join('\n');
  return '<section class="slide" data-duration="' + num(page.duration, 3) + '" style="' + style.join(';') + '">' + els + '</section>';
}

const CSS = [
  'html,body{margin:0;height:100%;background:#0b0e14;overflow:hidden;font-family:Inter,system-ui,sans-serif}',
  '#viewport{position:fixed;inset:0;display:grid;place-items:center}',
  '#stage{position:relative;transform-origin:center}',
  '.slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .35s ease;overflow:hidden}',
  '.slide.active{opacity:1;visibility:visible}',
  '.el a{color:inherit}',
  '#controls{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;background:rgba(15,23,42,.72);backdrop-filter:blur(8px);padding:8px 14px;border-radius:99px;z-index:10}',
  '#controls button{border:0;background:transparent;color:#e2e8f0;font-size:18px;cursor:pointer;padding:2px 8px;border-radius:8px}',
  '#controls button:hover{background:rgba(255,255,255,.12)}',
  '#counter{color:#94a3b8;font-size:12px;min-width:56px;text-align:center}',
].join('\n');

const CONTROLS =
  '<div id="controls"><button id="prev" title="Previous">\u2190</button>' +
  '<button id="play" title="Autoplay">\u25B6</button>' +
  '<button id="next" title="Next">\u2192</button>' +
  '<span id="counter"></span></div>';

const RUNTIME_JS = [
  '(function(){',
  '"use strict";',
  'var stage=document.getElementById("stage");',
  'var slides=[].slice.call(document.querySelectorAll(".slide"));',
  'var counter=document.getElementById("counter");',
  'var idx=0,timer=null;',
  'function show(n){idx=(n+slides.length)%slides.length;for(var i=0;i<slides.length;i++){slides[i].classList.toggle("active",i===idx);}counter.textContent=(idx+1)+" / "+slides.length;}',
  'function next(){show(idx+1);}function prev(){show(idx-1);}',
  'function fit(){var w=+stage.getAttribute("data-w"),h=+stage.getAttribute("data-h");var s=Math.min((window.innerWidth-40)/w,(window.innerHeight-100)/h,1);stage.style.transform="scale("+s+")";}',
  'function stop(){if(timer){clearTimeout(timer);timer=null;}document.getElementById("play").innerHTML="\\u25B6";}',
  'function autoplay(){if(timer){return;}document.getElementById("play").innerHTML="\\u23F8";var step=function(){var d=(+slides[idx].getAttribute("data-duration")||3)*1000;timer=setTimeout(function(){if(!timer){return;}next();step();},d);};timer=1;step();}',
  'document.getElementById("prev").onclick=function(){stop();prev();};',
  'document.getElementById("next").onclick=function(){stop();next();};',
  'document.getElementById("play").onclick=function(){if(timer){stop();}else{autoplay();}};',
  'window.addEventListener("keydown",function(e){if(e.key==="ArrowRight"||e.key==="PageDown"||(e.key===" "&&e.target===document.body)){stop();next();e.preventDefault();}else if(e.key==="ArrowLeft"||e.key==="PageUp"){stop();prev();e.preventDefault();}else if(e.key==="Home"){stop();show(0);}else if(e.key==="End"){stop();show(slides.length-1);}});',
  'document.addEventListener("click",function(e){var t=e.target;while(t&&t!==stage){if(t.classList&&t.classList.contains("q-opt")){var quiz=t.parentNode;if(quiz.getAttribute("data-answered")){return;}quiz.setAttribute("data-answered","1");var opts=quiz.querySelectorAll(".q-opt");for(var j=0;j<opts.length;j++){if(opts[j].getAttribute("data-correct")==="1"){opts[j].style.background="rgba(34,197,94,.25)";opts[j].style.borderColor="#16a34a";}}if(t.getAttribute("data-correct")!=="1"){t.style.background="rgba(239,68,68,.2)";t.style.borderColor="#dc2626";}else{t.style.background="rgba(34,197,94,.35)";}return;}if(t.getAttribute&&t.getAttribute("data-goto")){stop();show(+t.getAttribute("data-goto")-1);return;}t=t.parentNode;}});',
  'window.addEventListener("resize",fit);',
  'fit();show(0);',
  '})();',
].join('\n');

export function buildInteractiveHTML(design: InteractiveDesign): string {
  const { pages, canvasW, canvasH, name } = design;
  const slides = pages.map((p) => renderPage(p, canvasW, canvasH)).join('\n');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>' + esc(name) + '</title>',
    '<style>' + CSS + '</style>',
    '</head>',
    '<body>',
    '<div id="viewport"><div id="stage" data-w="' + canvasW + '" data-h="' + canvasH + '" style="width:' +
      canvasW + 'px;height:' + canvasH + 'px">' + slides + '</div></div>',
    CONTROLS,
    '<script>' + RUNTIME_JS + '</' + 'script>',
    '</body>',
    '</html>',
  ].join('\n');
}