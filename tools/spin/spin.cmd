@echo off
rem spin PREFIX START COUNT  --  opens numbered Claude sessions as tabs in one Terminal window.
rem This file lives in the repo at tools\spin\spin.cmd; a copy sits in the user's .local\bin folder (on PATH) so 'spin' works from any shell.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\brigg\ai-learning-journey\tools\spin\spin.ps1" %*
