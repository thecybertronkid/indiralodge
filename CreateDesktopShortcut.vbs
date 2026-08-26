Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
strStartMenu = WshShell.SpecialFolders("Programs")

' Create Desktop Shortcut
Set objShortcut = WshShell.CreateShortcut(strDesktop & "\Indira Lodge PMS.lnk")
objShortcut.TargetPath = WshShell.CurrentDirectory & "\START_INDIRA_LODGE.bat"
objShortcut.WorkingDirectory = WshShell.CurrentDirectory
objShortcut.Description = "Launch Indira Lodge Property Management System"
objShortcut.WindowStyle = 1
objShortcut.Save

' Create Start Menu Shortcut
Set objStartShortcut = WshShell.CreateShortcut(strStartMenu & "\Indira Lodge PMS.lnk")
objStartShortcut.TargetPath = WshShell.CurrentDirectory & "\START_INDIRA_LODGE.bat"
objStartShortcut.WorkingDirectory = WshShell.CurrentDirectory
objStartShortcut.Description = "Launch Indira Lodge Property Management System"
objStartShortcut.Save

WScript.Echo "Shortcuts successfully created on Desktop and Start Menu!"
