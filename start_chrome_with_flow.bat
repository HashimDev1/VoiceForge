@echo off
echo ========================================================
echo  VoiceForge Studio - Unified Studio Chrome Window
echo ========================================================
echo.
echo Starting Google Chrome with VoiceForge Studio and Google Flow in ONE window...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1 --remote-allow-origins=* --user-data-dir="%~dp0data\chrome_flow_userdata\slot_1" "http://localhost:3000" "https://flow.google.com"

echo.
echo Chrome is running on port 9222 with both tabs in the SAME window!
ping -n 2 127.0.0.1 >nul
