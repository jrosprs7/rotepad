// One desktop command row; reuse the existing responsive overflow controls.
document.body.classList.add('single-row-ui');
const singleRowStyle=document.createElement('style');
singleRowStyle.textContent=`
.single-row-ui header{height:46px;min-height:46px;box-sizing:border-box;padding:6px 10px;gap:6px;flex-shrink:0}
.single-row-ui header .brand{font-size:0;gap:0}.single-row-ui header .logo{width:28px;height:28px}
.single-row-ui header>.divider{display:none}
.single-row-ui header #filename{flex:0 1 160px;width:160px;min-width:75px;font-size:14px;padding:4px 6px}
.single-row-ui #close-note{width:28px;min-width:28px;height:30px;padding:3px;flex-shrink:0}
.single-row-ui header .toolbar{flex:1;min-width:0;min-height:0;height:34px;padding:0;border:0;gap:4px;background:transparent;overflow:visible}
.single-row-ui header .toolbar button,.single-row-ui header .toolbar select,.single-row-ui header .toolbar summary{height:30px;min-height:30px;font-size:13px}
.single-row-ui header .compact-core{gap:3px}.single-row-ui header .compact-visible{gap:3px}
.single-row-ui header .toolbar .compact-core button,.single-row-ui header .toolbar #find-toggle,.single-row-ui header .toolbar #more-format>summary{width:30px;min-width:30px}
.single-row-ui header .toolbar #more-format>summary{font-size:21px}
.single-row-ui header .toolbar .more-menu{top:35px}
.single-row-ui header .file-actions{margin-left:0;gap:0}
.single-row-ui #compact-app-menu>summary{height:30px;min-height:30px;padding:4px 8px;font-size:13px;box-sizing:border-box}
@media(max-width:850px){.single-row-ui header #filename{flex-basis:110px;width:110px}.single-row-ui header{gap:4px;padding:6px}}
`;
document.head.append(singleRowStyle);
// Keep the title and its close button together, then tools and a single Menu.
topActions.before(mainToolbar);
compactItems.unshift(...['bold','italic','underline'].map(kind=>document.querySelector('[data-format='+kind+']')));
fitToolbar();
