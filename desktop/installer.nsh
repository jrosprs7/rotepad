; Register available handlers without overwriting extension defaults or UserChoice.
; Keep the existing Markdown ProgID so an already-selected Rotepad default survives upgrades.
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
  Function RotepadChooseDefaults
    ${StdUtils.ExecShellAsUser} $0 "ms-settings:defaultapps?registeredAppMachine=Rotepad" "open" ""
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION RotepadStartApp
  !define MUI_FINISHPAGE_SHOWREADME
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Choose Rotepad for .md and .txt in Windows Settings"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION RotepadChooseDefaults
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !insertmacro MUI_PAGE_FINISH
!macroend
