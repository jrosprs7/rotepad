; Register available handlers without overwriting extension defaults or UserChoice.
; Keep the existing Markdown ProgID so an already-selected Rotepad default survives upgrades.
; Registrations go to SHCTX, which is the current user's hive for the per-user install.
!include nsDialogs.nsh

; Rotepad installs for the current user only, so updates need no administrator prompt; the install-mode page is skipped.
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; Versions up to 0.12.7 installed for all users in Program Files. Offer to remove that copy before installing for this user.
; Notes and settings are in the user profile (%APPDATA%\Rotepad and the save folder), not the install folder, so they are kept.
; The old uninstaller runs as a copy in the temporary folder, as electron-builder does for upgrades, so ExecWait waits for it and
; the old folder can be deleted; it asks Windows for permission itself. It would end a running Rotepad, so Rotepad must be closed.
; This expands inside .onInit, after electron-builder's own definitions; the include itself is read before them.
!macro customInit
  ReadRegStr $R8 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $R8 "" rotepadOldDone
  IfSilent rotepadOldDone
  MessageBox MB_YESNO|MB_ICONQUESTION "An older Rotepad is installed for all users in$\r$\n$R8$\r$\n$\r$\nThis version installs for you only, so that it can update itself. Remove the older copy first? Windows will ask for permission.$\r$\n$\r$\nYour notes and settings are kept." IDNO rotepadOldDone
  rotepadOldRunning:
    nsExec::Exec '"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV /NH | "$SYSDIR\findstr.exe" /B /I /C:"\"${APP_EXECUTABLE_FILENAME}\""'
    Pop $R9
    StrCmp $R9 0 0 rotepadOldRemove
    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "Rotepad is open. Close every Rotepad window, then select Retry.$\r$\n$\r$\nSelect Cancel to keep the older copy and install this version alongside it." IDRETRY rotepadOldRunning
    Goto rotepadOldDone
  rotepadOldRemove:
    InitPluginsDir
    ClearErrors
    CopyFiles /SILENT "$R8\${UNINSTALL_FILENAME}" "$PLUGINSDIR\old-all-users-uninstaller.exe"
    IfErrors rotepadOldCheck
    ExecWait '"$PLUGINSDIR\old-all-users-uninstaller.exe" /S /allusers /KEEP_APP_DATA _?=$R8' $R9
  rotepadOldCheck:
    ReadRegStr $R9 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
    StrCmp $R9 "" rotepadOldDone
    MessageBox MB_OK|MB_ICONEXCLAMATION "The older Rotepad could not be removed. This version will be installed for you alongside it.$\r$\n$\r$\nYou can remove the older copy later in Windows Settings > Apps > Installed apps."
  rotepadOldDone:
  ; electron-builder picks all-users mode when only an all-users copy exists; this version always installs for the current user.
  StrCpy $hasPerMachineInstallation "0"
  !insertmacro setInstallModePerUser
!macroend

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
  WriteRegStr SHCTX "Software\Classes\${PROGID}" "" "Rotepad document"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\Application" "ApplicationName" "Rotepad"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\Application" "ApplicationDescription" "Rotepad offline notes"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\Application" "ApplicationIcon" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr SHCTX "Software\Classes\${PROGID}\DefaultIcon" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open" "" "Open with Rotepad"
  WriteRegStr SHCTX "Software\Classes\${PROGID}\shell\open\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" $\"%1$\"'
  WriteRegNone SHCTX "Software\Classes\.${EXT}\OpenWithProgids" "${PROGID}"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".${EXT}" ""
  WriteRegStr SHCTX "Software\Rotepad\Capabilities\FileAssociations" ".${EXT}" "${PROGID}"
!macroend

!macro customInstall
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "Rotepad"
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\" $\"%1$\"'
  WriteRegStr SHCTX "Software\Rotepad\Capabilities" "ApplicationName" "Rotepad"
  WriteRegStr SHCTX "Software\Rotepad\Capabilities" "ApplicationDescription" "Rotepad offline Markdown and text notes"
  WriteRegStr SHCTX "Software\Rotepad\Capabilities" "ApplicationIcon" '$\"$INSTDIR\${APP_EXECUTABLE_FILENAME}$\",0'
  WriteRegStr SHCTX "Software\RegisteredApplications" "Rotepad" "Software\Rotepad\Capabilities"
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
  DeleteRegValue SHCTX "Software\Classes\.md\OpenWithProgids" "Rotepad Markdown document"
  DeleteRegValue SHCTX "Software\Classes\.markdown\OpenWithProgids" "Rotepad Markdown document"
  DeleteRegValue SHCTX "Software\Classes\.txt\OpenWithProgids" "Rotepad Text document"
  DeleteRegKey SHCTX "Software\Classes\Rotepad Markdown document"
  DeleteRegKey SHCTX "Software\Classes\Rotepad Text document"
  DeleteRegKey SHCTX "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  DeleteRegKey SHCTX "Software\Rotepad\Capabilities"
  DeleteRegKey /ifempty SHCTX "Software\Rotepad"
  DeleteRegValue SHCTX "Software\RegisteredApplications" "Rotepad"
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
