; Register available handlers without overwriting extension defaults or UserChoice.
; Keep the existing Markdown ProgID so an already-selected Rotepad default survives upgrades.
!include nsDialogs.nsh

; Windows lets only the user choose a default app. For each file type ticked on the installer's Default apps page,
; show Windows' own picker with "Always" ticked (OAIF_REGISTER_EXT|OAIF_FORCE_REGISTRATION). No file is opened (no OAIF_EXEC).
!macro RotepadChooseDefault EXT
  Push $0
  Push $1
  Push $2
  InitPluginsDir
  FileOpen $0 "$PLUGINSDIR\Rotepad.${EXT}" w
  FileClose $0
  System::Call '*(&w${NSIS_MAX_STRLEN} "$PLUGINSDIR\Rotepad.${EXT}") p.r2'
  System::Call '*(p r2, p 0, i 0xA) p.r1'
  System::Call 'shell32::SHOpenWithDialog(p $HWNDPARENT, p r1) i.r0'
  System::Free $1
  System::Free $2
  Pop $2
  Pop $1
  Pop $0
!macroend
!macro RotepadFileType EXT PROGID
  WriteRegStr HKLM "Software\Classes\${PROGID}" "" "Rotepad document"
  WriteRegStr HKLM "Software\Classes\${PROGID}\Application" "ApplicationName" "Rotepad"
  WriteRegStr HKLM "Software\Classes\${PROGID}\Application" "ApplicationDescription" "Rotepad offline notes"
  WriteRegStr HKLM "Software\Classes\${PROGID}\Application" "ApplicationIcon" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr HKLM "Software\Classes\${PROGID}\DefaultIcon" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr HKLM "Software\Classes\${PROGID}\shell\open" "" "Open with Rotepad"
  WriteRegStr HKLM "Software\Classes\${PROGID}\shell\open\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" $\"%1$\"'
  WriteRegNone HKLM "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
  WriteRegStr HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".${EXT}" ""
  WriteRegStr HKLM "Software\Rotepad\Capabilities\FileAssociations" ".${EXT}" "${PROGID}"
!macroend

!macro customInstall
  WriteRegStr HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "Rotepad"
  WriteRegStr HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" $\"%1$\"'
  WriteRegStr HKLM "Software\Rotepad\Capabilities" "ApplicationName" "Rotepad"
  WriteRegStr HKLM "Software\Rotepad\Capabilities" "ApplicationDescription" "Rotepad offline Markdown and text notes"
  WriteRegStr HKLM "Software\Rotepad\Capabilities" "ApplicationIcon" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr HKLM "Software\RegisteredApplications" "Rotepad" "Software\Rotepad\Capabilities"
  !insertmacro RotepadFileType "md" "Rotepad Markdown document"
  !insertmacro RotepadFileType "markdown" "Rotepad Markdown document"
  !insertmacro RotepadFileType "txt" "Rotepad Text document"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)'
  ${IfNot} ${Silent}
    ${If} $RotepadDefaultMd == ${BST_CHECKED}
      !insertmacro RotepadChooseDefault "md"
    ${EndIf}
    ${If} $RotepadDefaultTxt == ${BST_CHECKED}
      !insertmacro RotepadChooseDefault "txt"
    ${EndIf}
  ${EndIf}
!macroend

; Opt-in Default apps page after the folder choice; nothing is ticked unless the user ticks it.
!macro customPageAfterChangeDir
  Var RotepadDefaultMd
  Var RotepadDefaultTxt
  Var RotepadMdBox
  Var RotepadTxtBox
  Page custom RotepadDefaultsPage RotepadDefaultsLeave
  Function RotepadDefaultsPage
    !insertmacro MUI_HEADER_TEXT "Default apps" "Choose which files Rotepad opens when you double-click them."
    nsDialogs::Create 1018
    Pop $0
    ${NSD_CreateLabel} 0 0 100% 40u "Tick a file type to make Rotepad its default app. After installation, Windows shows its own $\"How do you want to open$\" window for each ticked type: choose Rotepad and select OK or Always. You can change this later in Rotepad Settings or Windows Settings."
    Pop $0
    ${NSD_CreateCheckbox} 0 48u 100% 12u "Markdown files (.md)"
    Pop $RotepadMdBox
    ${NSD_CreateCheckbox} 0 64u 100% 12u "Text files (.txt)"
    Pop $RotepadTxtBox
    ${If} $RotepadDefaultMd == ${BST_CHECKED}
      ${NSD_Check} $RotepadMdBox
    ${EndIf}
    ${If} $RotepadDefaultTxt == ${BST_CHECKED}
      ${NSD_Check} $RotepadTxtBox
    ${EndIf}
    nsDialogs::Show
  FunctionEnd
  Function RotepadDefaultsLeave
    ${NSD_GetState} $RotepadMdBox $RotepadDefaultMd
    ${NSD_GetState} $RotepadTxtBox $RotepadDefaultTxt
  FunctionEnd
!macroend

!macro customUnInstall
  DeleteRegValue HKLM "Software\Classes\.md\OpenWithProgids" "Rotepad Markdown document"
  DeleteRegValue HKLM "Software\Classes\.markdown\OpenWithProgids" "Rotepad Markdown document"
  DeleteRegValue HKLM "Software\Classes\.txt\OpenWithProgids" "Rotepad Text document"
  DeleteRegKey HKLM "Software\Classes\Rotepad Markdown document"
  DeleteRegKey HKLM "Software\Classes\Rotepad Text document"
  DeleteRegKey HKLM "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  DeleteRegKey HKLM "Software\Rotepad\Capabilities"
  DeleteRegKey /ifempty HKLM "Software\Rotepad"
  DeleteRegValue HKLM "Software\RegisteredApplications" "Rotepad"
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)'
!macroend

!macro customFinishPage
  Function RotepadStartApp
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" ""
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION RotepadStartApp
  !insertmacro MUI_PAGE_FINISH
!macroend
