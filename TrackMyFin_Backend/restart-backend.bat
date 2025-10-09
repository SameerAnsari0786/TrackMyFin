@echo off
echo Restarting Finance Tracker Backend...
echo.

REM Kill any existing Java processes for the backend
taskkill /F /IM java.exe >nul 2>&1

REM Wait a moment
timeout /t 2 >nul

REM Set environment variables
set JAVA_HOME=C:\Program Files\Java\jdk-21
set SPRING_PROFILES_ACTIVE=dev

echo Environment:
echo JAVA_HOME: %JAVA_HOME%
echo SPRING_PROFILES_ACTIVE: %SPRING_PROFILES_ACTIVE%
echo.

echo Starting backend with Hibernate fix...
.\mvnw.cmd spring-boot:run

pause