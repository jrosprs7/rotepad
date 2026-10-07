// Embedded in Rotepad.html; no runtime dependency on this file.
const compactStyle=document.createElement('style');
compactStyle.textContent=`
header{padding:10px 16px;gap:10px;flex-wrap:nowrap!important;min-width:0}
header .brand{flex-shrink:0}header #filename{flex:1;min-width:50px;width:150px}header .file-actions{flex-shrink:0;width:auto!important;gap:5px}
.toolbar{padding:7px 16px;gap:6px;flex-wrap:nowrap!important;min-height:48px;flex-shrink:0}
.toolbar .compact-core,.toolbar .compact-visible{display:flex;align-items:center;gap:5px;flex-wrap:nowrap}
.toolbar .compact-core{flex-shrink:0}.toolbar .compact-visible{flex:1;min-width:0;overflow:hidden}
.toolbar .compact-visible>*{flex-shrink:0}.toolbar .compact-visible .group{gap:5px}
.toolbar button,.toolbar select,.toolbar summary{height:34px;min-height:34px;box-sizing:border-box}
.toolbar .compact-core button,.toolbar [data-format=quote],.toolbar #link,.toolbar #find-toggle,.toolbar #more-format>summary{width:34px;min-width:34px;padding:5px;display:grid;place-items:center}
.toolbar #find-toggle{margin-left:0;flex-shrink:0}.toolbar #more-format{flex-shrink:0}
.toolbar #more-format>summary{list-style:none;font-size:22px;line-height:1}.toolbar #more-format>summary::-webkit-details-marker{display:none}
.toolbar #font{width:155px;max-width:155px}.toolbar #toolbar-zoom{width:76px;min-width:76px}.toolbar #paragraph-style{width:126px;max-width:126px}
.compact-visible label{display:none!important}.toolbar .more-menu{right:0;left:auto;top:40px;z-index:40;width:280px;max-width:calc(100vw - 24px);max-height:70dvh;overflow:auto;gap:5px;padding:10px}
#overflow-controls{display:grid;gap:8px;border-bottom:1px solid var(--line);padding-bottom:8px;margin-bottom:3px}#overflow-controls:empty{display:none}
#overflow-controls>.group{display:grid;grid-template-columns:55px 1fr;gap:8px}#overflow-controls label{display:block!important;font-size:13px}
#overflow-controls #font,#overflow-controls #toolbar-zoom,#overflow-controls #paragraph-style{width:100%;max-width:none}#overflow-controls>button{width:100%;text-align:left;display:block}
.compact-app-panel>details>summary{border:0}.compact-app-panel>details>.app-menu-panel{position:static;box-shadow:none;border:0;border-left:2px solid var(--line);min-width:0;margin:3px 0 6px 8px;max-height:none;overflow:visible}
@media(max-width:700px){header{padding:8px 10px}.toolbar{padding:6px 10px}.toolbar .compact-core,.toolbar .compact-visible{gap:4px}header .brand{font-size:17px}.toolbar{gap:4px}}
@media(max-width:440px){header .brand{font-size:0;gap:0}header>.divider{display:none}.toolbar{padding:6px}.toolbar .compact-core{gap:3px}.toolbar button,.toolbar #more-format>summary{min-width:32px}.toolbar .compact-core button{width:32px}}
@media print{#compact-app-menu{display:none!important}}
`;
document.head.append(compactStyle);
const compactCore=document.createElement('div');compactCore.className='compact-core format';
for(const node of [$('toggle-notes'),$('undo'),$('redo'),...['bold','italic','underline'].map(t=>document.querySelector('[data-format='+t+']'))])compactCore.append(node);
const compactVisible=document.createElement('div');compactVisible.className='compact-visible format';
const compactItems=[document.querySelector('[data-format=quote]'),$('paragraph-style'),$('link'),$('font').closest('.group'),zoomGroup,$('history-button')];
const overflowControls=document.createElement('div');overflowControls.id='overflow-controls';overflowControls.className='format';
morePanel.prepend(overflowControls);morePanel.classList.add('format');
const overflowSummary=$('more-format').querySelector('summary');overflowSummary.textContent='»';overflowSummary.title='More tools';overflowSummary.setAttribute('aria-label','More tools');
// Opening » by mouse keeps the editor selection, so selection tools such as Clear formatting stay enabled; the click still toggles the menu.
overflowSummary.addEventListener('mousedown',e=>{if(mode==='rich'){rememberRange();e.preventDefault();}});
compactVisible.append(...compactItems);
for(const child of [...mainToolbar.children])if(![$('find-toggle'),$('more-format')].includes(child))child.style.display='none';
mainToolbar.append(compactCore,compactVisible,$('find-toggle'),$('more-format'));
for(const option of $('font').options)if(option.value==='Iosevka Fixed SS03 Extended')option.textContent='Iosevka Fixed Extended';
$('font').title=$('font').value;$('font').addEventListener('change',()=>{$('font').title=$('font').value;});
$('font').setAttribute('aria-label','Font');
const compactApp=makeAppMenu('Menu','compact-app-menu');compactApp.panel.classList.add('compact-app-panel');topActions.append(compactApp.menu);
const topMenuItems=[fileMenu.menu,viewMenu.menu,helpMenu.menu,$('settings')];
let compactTop=null;
function fitToolbar(){
  // Move existing controls, retaining their listeners, state, and editor selection.
  compactVisible.append(...compactItems);
  while(compactVisible.scrollWidth>compactVisible.clientWidth+1&&compactVisible.lastElementChild)overflowControls.prepend(compactVisible.lastElementChild);
  const narrow=window.innerWidth<850;
  if(narrow!==compactTop){compactTop=narrow;compactApp.menu.open=false;for(const menu of topMenuItems)if(menu.tagName==='DETAILS')menu.open=false;if(narrow)compactApp.panel.append(...topMenuItems);else for(const node of topMenuItems)topActions.insertBefore(node,compactApp.menu);compactApp.menu.hidden=!narrow;}
}
new ResizeObserver(fitToolbar).observe(mainToolbar);fitToolbar();document.fonts.ready.then(fitToolbar);
compactApp.menu.addEventListener('click',e=>{if(e.target.closest('button'))compactApp.menu.open=false;});
document.addEventListener('pointerdown',e=>{if(!compactApp.menu.contains(e.target))compactApp.menu.open=false;});
for(const menu of [compactApp.menu,$('more-format')])menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();menu.open=false;menu.querySelector('summary').focus();}});
// » opened by mouse leaves focus in the note, so Escape there closes the menu and keeps the caret.
document.addEventListener('keydown',e=>{const more=$('more-format');if(e.key==='Escape'&&more.open&&!more.contains(document.activeElement)&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();more.open=false;}},true);
