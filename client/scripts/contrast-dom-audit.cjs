/* Static TSX audit for inherited foreground/background clashes.
 * Only follows literal base classes and their JSX ancestry. Dynamic class
 * expressions, photograph overlays and CSS pseudo-states need visual review.
 * Run: node scripts/contrast-dom-audit.cjs
 */
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const palette = { white: '#FFFFFF', black: '#0F2A1A' };
function component(color) {
  const rgb = color.match(/^#([0-9a-f]{6})$/i);
  if (!rgb) return null;
  return [0, 2, 4].map(i => parseInt(rgb[1].slice(i, i + 2), 16));
}
function blend(top, bottom, alpha) {
  return top.map((v, i) => v * alpha + bottom[i] * (1 - alpha));
}
function luminance(rgb) {
  return rgb.map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
}
function ratio(foreground, background) {
  const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (a + 0.05) / (b + 0.05);
}
function classes(node) {
  const attrs = ts.isJsxElement(node) ? node.openingElement.attributes.properties : node.attributes.properties;
  const attr = attrs.find(a => a.name?.text === 'className');
  if (!attr?.initializer) return '';
  if (ts.isStringLiteral(attr.initializer)) return attr.initializer.text;
  const expr = attr.initializer.expression;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  // Only the unconditional portion of a template literal can be inherited.
  if (ts.isTemplateExpression(expr)) return expr.head.text + ' __dynamic__';
  if (ts.isCallExpression(expr)) {
    const first = expr.arguments[0];
    if (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first)) return first.text;
  }
  return '__dynamic__';
}
function pick(tokens, kind) {
  let result = null;
  for (const token of tokens) {
    if (!token.startsWith(kind + '-')) continue;
    const suffix = token.slice(kind.length + 1);
    const m = /^(\[#[0-9A-Fa-f]{6}\]|white|black)(?:\/(\d+))?$/.exec(suffix);
    if (!m) continue;
    const color = (palette[m[1]] || m[1].slice(1, -1)).toUpperCase();
    result = { color, opacity: m[2] ? Number(m[2]) / 100 : 1 };
  }
  return result;
}
function hasOwnText(node) {
  if (!ts.isJsxElement(node)) return false;
  return node.children.some(child =>
    (ts.isJsxText(child) && child.text.trim()) ||
    (ts.isJsxExpression(child) && child.expression &&
      (ts.isIdentifier(child.expression) || ts.isStringLiteral(child.expression) ||
       ts.isPropertyAccessExpression(child.expression) || ts.isCallExpression(child.expression)))
  );
}
function visit(node, sf, inherited, reports) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tokens = classes(node).split(/\s+/);
    let { bg, fg, photo } = inherited;
    if (tokens.includes('bg-cover') && node.getText(sf).slice(0, 400).includes('backgroundImage')) photo = true;
    const newBg = pick(tokens, 'bg');
    const newFg = pick(tokens, 'text');
    if (newBg) {
      const rgb = component(newBg.color);
      if (rgb) {
        bg = blend(rgb, bg, newBg.opacity);
        if (newBg.opacity === 1) photo = false;
      }
    }
    if (newFg) fg = newFg;
    const rgbFg = component(fg.color);
    // Colour-context check, independent of overlays and opacity. On photo
    // cards whose markup explicitly opts into text-white we assume a dark
    // scrim; the literal CSS may be an inline backgroundImage.
    let context = inherited.context;
    if (tokens.includes('__dynamic__')) context = 'unknown';
    if (newBg && newBg.opacity >= 0.9) context = newBg.color === '#0F2A1A' ? 'dark' : 'light';
    if (tokens.some(t => t === 'bg-[var(--home-pill)]')) {
      context = 'dark';
      bg = component('#0F2A1A');
    }
    if (tokens.includes('bg-cover') && tokens.includes('text-white')) context = 'dark';
    if (ts.isJsxElement(node) && ['PageHero', 'InnerHero'].includes(node.openingElement.tagName.getText(sf))) context = 'unknown';
    const visualFg = rgbFg && blend(rgbFg, bg, fg.opacity);
    if (hasOwnText(node) && newFg) {
      const clash = (context === 'dark' && newFg.color === '#0F2A1A') ||
        (context === 'light' && newFg.color === '#FFFFFF');
      // AA small-body-text threshold, for solid surfaces only. Gradients,
      // background images and translucent scrims require human review.
      const lowRatio = !photo && context !== 'unknown' && visualFg && ratio(visualFg, bg) < 4.5;
      if (clash || lowRatio) {
        const at = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        const tag = (ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName).getText(sf);
        reports.push(`${path.relative(root, sf.fileName)}:${at.line + 1} <${tag}> ${clash ? 'wrong foreground' : 'under 4.5:1'}: ${classes(node).slice(0, 110)}`);
      }
    }
    const next = { bg, fg, photo, context };
    ts.forEachChild(node, child => visit(child, sf, next, reports));
  } else {
    ts.forEachChild(node, child => visit(child, sf, inherited, reports));
  }
}
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(f);
    else if (f.endsWith('.tsx')) yield f;
  }
}
const reports = [];
for (const dir of ['app', 'components', 'features']) {
  for (const file of files(path.join(root, dir))) {
    const source = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    visit(sf, sf, { bg: component('#F9F6ED'), fg: { color: '#0F2A1A', opacity: 1 }, photo: false, context: dir === 'app' ? 'light' : 'unknown' }, reports);
  }
}
console.log(reports.length ? reports.join('\n') : 'No near-invisible inherited colours in literal JSX class hierarchies.');
console.log(`${reports.length} potential contrast failures (static audit; check backgrounds with images manually).`);
