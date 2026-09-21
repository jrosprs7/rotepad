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
@media screen{
 .single-row-ui{background:var(--paper)}
 html[data-theme=dark] .single-row-ui{--paper:#272727;--chrome:#202222;--canvas:#272727;--soft:#363939;--line:#414545}
 .single-row-ui header{height:38px;min-height:38px;padding:3px 8px;background:var(--chrome);border:0;gap:4px}
 .single-row-ui header .logo{width:22px;height:22px}
 .single-row-ui header #filename{border-color:transparent;background:transparent;padding:3px 5px}
 .single-row-ui header #filename:hover{background:var(--soft)}
 .single-row-ui header .toolbar{height:32px}
 .single-row-ui header button,.single-row-ui header select,.single-row-ui header summary{border-color:transparent;background:transparent;border-radius:4px}
 .single-row-ui header button:hover:not(:disabled),.single-row-ui header select:hover,.single-row-ui header summary:hover{background:var(--soft)}
 .single-row-ui header .format button[aria-pressed=true]{background:var(--soft);color:var(--accent)}
 .single-row-ui header :is(button,select,summary,input):focus-visible,.single-row-ui footer button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
 .single-row-ui .document-column .workspace{margin:0;border:0;border-radius:0;box-shadow:none}
 .single-row-ui #rich-editor:focus-visible{box-shadow:none}
 .single-row-ui .document-column footer{margin:0;padding:2px 12px;height:26px;min-height:26px;box-sizing:border-box;border:0;border-radius:0;align-items:center;gap:12px;flex-wrap:nowrap;flex-shrink:0;white-space:nowrap;font-size:11px}
 .single-row-ui footer #editing-mode{border:0;background:transparent;min-height:22px;height:22px;padding:1px 6px;font-size:11px}
 .single-row-ui footer #editing-mode:hover{background:var(--soft)}
 .single-row-ui footer #save-status{overflow:hidden;text-overflow:ellipsis;min-width:0}
 .single-row-ui .find-panel{margin:0;border-width:0 0 1px;border-radius:0;padding:6px 12px}
 .single-row-ui header .more-menu button,.single-row-ui header .app-menu-panel button{border-color:transparent;border-radius:4px}
 .single-row-ui header .more-menu,.single-row-ui header .app-menu-panel{background:var(--paper)}
}
`;
document.head.append(singleRowStyle);
// Keep the title and its close button together, then tools and a single Menu.
topActions.before(mainToolbar);
compactItems.unshift(...['bold','italic','underline'].map(kind=>document.querySelector('[data-format='+kind+']')));
fitToolbar();
