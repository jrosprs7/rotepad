const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../Rotepad.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(js);
const context = { URL };
vm.createContext(context);
vm.runInContext(js.slice(js.indexOf('const escapeHTML'), js.indexOf('function persist')) +
  js.slice(js.indexOf('function markdownText'), js.indexOf('function markAutoLinks')), context);
// Minimal node fixtures exercise the serializer without a browser dependency.
function text(data) { return { nodeType: 3, data, get textContent() { return data; } }; }
function element(tagName, childNodes = [], attrs = {}) {
  return { nodeType: 1, tagName, childNodes,
    get children() { return childNodes.filter(n => n.nodeType === 1); },
    get textContent() { return childNodes.map(n => n.textContent).join(''); },
    getAttribute: key => attrs[key] };
}
const e = element, t = text;
vm.runInContext(js.slice(js.indexOf('function quoteLines'),js.indexOf('function quoteSelection')),context);
assert.equal(context.quoteLines('First\n\nSecond'),'> First\n> \n> Second');
assert.equal(context.quoteLines('> Existing\nNew'),'> Existing\n> New');
assert.match(html,/data-format="quote"/);
assert.equal(context.inline('__underlined__'), '<u>underlined</u>');
assert.equal(context.inline('__**both**__'), '<u><strong>both</strong></u>');
assert.equal(context.inline('\\_\\_literal\\_\\_'), '__literal__');
function check(nodes, expected) {
  context.rich = e('DIV', nodes);
  assert.equal(context.richMarkdown(), expected);
}
check([e('P', [t('hello')]), e('P', [t('world')])], 'hello\nworld');
check([e('P', [e('U', [t('underlined')])])], '__underlined__');
check([e('P', [e('STRONG', [t('bold')]), t(' and '), e('EM', [t('italic')])])], '**bold** and *italic*');
check([e('H1', [t('Title')]), e('UL', [e('LI', [t('one')]), e('LI', [t('two')])])], '# Title\n- one\n- two');
check([e('P', [e('A', [t('Facebook')], { href: 'https://www.facebook.com/' })])], '[Facebook](https://www.facebook.com/)');
check([e('P', [t('first')]), e('P', [e('BR')]), e('P', [t('third')])], 'first\n\nthird');
check([e('PRE', [e('CODE', [t('a < b')])])], '```\na < b\n```');
check([e('P', [t('literal * character')])], 'literal \\* character');
check([e('P', [e('A', [t('unsafe')], { href: 'javascript:alert(1)' })])], 'unsafe');
assert.match(context.inline('www.facebook.com'), /href="https:\/\/www.facebook.com\//);
assert.ok(!context.inline('<img onerror=alert(1)>').includes('<img'));
assert.equal(context.markdown('hello\n\nworld'), '<p>hello</p><p><br></p><p>world</p>');
check([e('P', [e('DEL', [t('old')]), t(' '), e('MARK', [t('important')])])], '~~old~~ ==important==');
check([e('UL', [e('LI', [e('SPAN', [t('☑')], {class:'task-box'}), t('Done')], {'data-checked':'true'})])], '- [x] Done');
check([e('P', [e('SPAN', [t('www.facebook.com')], {'data-no-link':'true'})])], 'www\\.facebook\\.com');
assert.match(context.markdown('- [ ] first\n- [x] second'), /aria-checked="false"/);
assert.match(context.markdown('- [ ] first\n- [x] second'), /aria-checked="true"/);
assert.match(context.inline('~~old~~ ==new=='), /<del>old<\/del> <mark>new<\/mark>/);
assert.ok(!context.inline('www\\.facebook\\.com').includes('<a'));
vm.runInContext(js.slice(js.indexOf('function findMatches'), js.indexOf('let findHits')), context);
assert.equal(context.findMatches('One one ONE', 'one').length, 3);
assert.equal(context.findMatches('One one ONE', 'one', true).length, 1);
assert.equal(context.findMatches('a.b aXb a.b', 'a.b').length, 2);
assert.equal(context.findMatches('hello', '').length, 0);
assert.equal(context.findMatches('[x] plus [x]', '[x]').length, 2);
console.log('JavaScript syntax and 23 formatting, serialization, checkbox, link, and search checks passed.');
