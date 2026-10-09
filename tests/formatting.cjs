const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../Rotepad.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(js);
const context = { URL };
vm.createContext(context);
vm.runInContext(js.slice(js.indexOf('function tableCells'),js.indexOf('const optionalAutoFormat')),context);
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
assert.equal(context.inline('\\> literal'), '&gt; literal');
assert.equal(context.markdown('\\> literal'), '<p>&gt; literal</p>');
assert.equal(context.markdown('> intentional'), '<blockquote>intentional</blockquote>');
assert.equal(context.markdown('\\- literal\n\t\\+ plus'), '<p>- literal</p><p>\t+ plus</p>');
assert.equal(context.markdown('- intentional'), '<ul><li>intentional</li></ul>');
assert.equal(context.inline('a \\- b'), 'a \\- b');
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
check([e('P', [t('> literal')])], '\\> literal');
check([e('P', [t('- dash')]), e('P', [t('+ plus\n- soft')]), e('P', [t('a - b')]), e('P', [t('--- run')]), e('P', [t('-tight')])], '\\- dash\n\\+ plus\n\\- soft\na - b\n--- run\n-tight');
// QA 2026-10-06: literal # and ~, empty formatting, code line breaks and bare text before a block.
check([e('P', [t('# not heading')]), e('P', [t('## two #tag')]), e('P', [t('####### seven')]), e('P', [t('~~not struck~~ a~b')])], '\\# not heading\n\\## two #tag\n####### seven\n\\~\\~not struck\\~\\~ a\\~b');
assert.equal(context.markdown('\\# not heading\n\\## two'), '<p># not heading</p><p>## two</p>');
assert.equal(context.inline('\\~\\~not struck\\~\\~'), '~~not struck~~');
check([e('P', [e('STRONG', [t('bold')]), t('word'), e('STRONG', []), t(' '), e('EM', [t(' ')]), e('A', [], { href: 'https://e.example/' }), e('MARK', [])])], '**bold**word  ');
check([e('PRE', [e('CODE', [t('line1'), e('BR'), t('inserted\nline2'), e('DIV', [t('block')])])])], '```\nline1\ninserted\nline2\nblock\n```');
check([t('First'), e('P', [t('Second')]), e('P', [t('Third')])], 'First\nSecond\nThird');
check([t('- bare'), e('P', [e('BR')]), e('P', [t('beta')])], '\\- bare\n\nbeta');
check([t('only bare text')], 'only bare text');
// Plain "3. " lines and table-separator rows stay text; backslashes before dots no longer double on each save.
check([e('P', [t('1. step')]), e('P', [t('  12. indented')]), e('P', [t('3.14 value')]), e('P', [t('a | b')]), e('P', [t('|---|---|')])], '1\\. step\n  12\\. indented\n3.14 value\na | b\n\\|---\\|---\\|');
assert.equal(context.markdown('1\\. step\na | b\n\\|---\\|---\\|'), '<p><span data-no-link="true">1.</span> step</p><p>a | b</p><p>|---|---|</p>');
check([e('P', [e('SPAN', [t('a\\.b')], { 'data-no-link': 'true' })])], 'a\\\\\\.b');
assert.equal(context.inline('a\\\\\\.b'), '<span data-no-link="true">a\\.b</span>');
for (const [text, linked] of [['notes.md', false], ['node.js', false], ['end.Next', false], ['example.com', true], ['claude.ai', true], ['www.site.md', true], ['https://x.md/a', true], ['example.com/path?q=1', true]])
  assert.equal(context.inline(text).includes('<a '), linked, text);
check([e('BLOCKQUOTE', [t('> literal inside quote')])], '> \\> literal inside quote');
assert.equal(context.inline(context.markdownText('1 > 0')), '1 &gt; 0');
check([e('P', [e('A', [t('unsafe')], { href: 'javascript:alert(1)' })])], 'unsafe');
assert.match(context.inline('www.facebook.com'), /href="https:\/\/www.facebook.com\//);
assert.ok(!context.inline('<img onerror=alert(1)>').includes('<img'));
assert.equal(context.markdown('hello\n\nworld'), '<p>hello</p><p><br></p><p>world</p>');
assert.equal(context.markdown('---\n-----'),'<p>---</p><p>-----</p>');
check([e('HR')],'***');
assert.equal(context.markdown('***'),'<hr>');
check([e('P', [e('DEL', [t('old')]), t(' '), e('MARK', [t('important')])])], '~~old~~ ==important==');
check([e('UL', [e('LI', [e('SPAN', [t('☑')], {class:'task-box'}), t('Done')], {'data-checked':'true'})])], '- [x] Done');
check([e('P', [e('SPAN', [t('www.facebook.com')], {'data-no-link':'true'})])], 'www\\.facebook\\.com');
assert.match(context.markdown('- [ ] first\n- [x] second'), /aria-checked="false"/);
assert.match(context.markdown('- [ ] first\n- [x] second'), /aria-checked="true"/);
assert.match(context.inline('~~old~~ ==new=='), /<del>old<\/del> <mark>new<\/mark>/);
for(let count=1;count<=40;count++)assert.equal(context.inline('='.repeat(count)),'='.repeat(count));
assert.equal(context.inline('before ====== after'),'before ====== after');
assert.equal(context.inline('== =='),'== ==');
assert.equal(context.inline('==a=b=='),'<mark>a=b</mark>');
assert.equal(context.inline('==**bold**=='),'<mark><strong>bold</strong></mark>');
assert.equal(context.inline('\\=\\=literal\\=\\='),'==literal==');
assert.equal(context.inline(context.markdownText('==literal==')),'==literal==');
check([e('P',[e('MARK',[t('======')])])],'==\\=\\=\\=\\=\\=\\===');
assert.equal(context.inline('==\\=\\=\\=\\=\\=\\==='),'<mark>======</mark>');
assert.ok(!context.inline('www\\.facebook\\.com').includes('<a'));
assert.equal(context.inline('**bold*'),'**bold*');
assert.equal(context.inline('**bold**'),'<strong>bold</strong>');
vm.runInContext(js.slice(js.indexOf('function findMatches'), js.indexOf('let findHits')), context);
assert.equal(context.findMatches('One one ONE', 'one').length, 3);
assert.equal(context.findMatches('One one ONE', 'one', true).length, 1);
assert.equal(context.findMatches('a.b aXb a.b', 'a.b').length, 2);
assert.equal(context.findMatches('hello', '').length, 0);
assert.equal(context.findMatches('[x] plus [x]', '[x]').length, 2);
console.log('JavaScript syntax and formatting, serialization, checkbox, link, and search checks passed.');
