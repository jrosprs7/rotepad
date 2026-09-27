// Native Windows caption buttons sit beside the existing tabs, not above them.
if(rotDesktop.platform==='win32'){
 document.body.classList.add('native-titlebar');
 const titlebarStyle=document.createElement('style');
 titlebarStyle.textContent=`@media screen{
  .native-titlebar #note-tabs-bar{width:env(titlebar-area-width,calc(100% - 138px));max-width:calc(100% - 138px);margin-left:env(titlebar-area-x,0px);padding-right:44px;-webkit-app-region:drag;user-select:none}
  .native-titlebar #note-tabs,.native-titlebar #new-note-tab{-webkit-app-region:no-drag}
  .native-titlebar.focus-mode #note-tabs-bar{display:flex}
  .native-titlebar.focus-mode #note-tabs,.native-titlebar.focus-mode #new-note-tab{display:none}
  .native-titlebar .titlebar-icon{width:18px;height:18px;flex:0 0 18px;margin-right:4px;pointer-events:none}
 }`;
 document.head.append(titlebarStyle);
 const icon=document.createElement('img');icon.className='titlebar-icon';icon.src='rotepad.png';icon.alt='Rotepad';icon.draggable=false;noteTabsBar.prepend(icon);
 const syncTitlebar=()=>rotDesktop.titlebarTheme(document.documentElement.dataset.theme==='dark'?'dark':'light').catch(error=>console.error('Title bar update failed:',error));
 new MutationObserver(syncTitlebar).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});void syncTitlebar();
}
const aboutButton=document.createElement('button');aboutButton.id='about-rotepad';aboutButton.textContent='About Rotepad';helpMenu.panel.append(aboutButton);
dialogMarkup('about-rotepad-dialog','<button class="dialog-close" id="about-rotepad-close" aria-label="Close About Rotepad">×</button><h2>Rotepad</h2><p id="about-version"></p><p id="about-copyright"></p><p>Offline notes, on your PC.</p>');
aboutButton.onclick=async()=>{try{const info=await rotDesktop.info();$('about-version').textContent='Version '+info.version;$('about-copyright').textContent=info.copyright;$('about-rotepad-dialog').showModal();}catch(error){alert('Could not show app information. '+error.message);}};
$('about-rotepad-close').onclick=()=>$('about-rotepad-dialog').close();
if(rotDesktop.platform==='win32'){
 const defaultRow=document.createElement('div');defaultRow.style.cssText='grid-column:1/-1;display:grid;gap:8px';
 defaultRow.innerHTML='<label>Windows default app</label><button type="button" id="choose-default-apps">Choose Rotepad for .md and .txt…</button><small>Choose your file defaults in Windows Settings. Installing Rotepad does not change them automatically.</small>';
 $('settings-dialog').querySelector('.settings-grid').append(defaultRow);
 $('choose-default-apps').onclick=async()=>{try{await rotDesktop.defaultApps();}catch(error){alert('Could not open Windows default apps. '+error.message);}};
}
