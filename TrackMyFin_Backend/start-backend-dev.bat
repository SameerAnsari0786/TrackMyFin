@echo off
echo === Finance Tracker Backend Startup (Development Mode) ===
echo.

REM Set JAVA_HOME
if exist "C:\Program Files\Java\jdk-21" (
    set JAVA_HOME=C:\Program Files\Java\jdk-21
    echo Found Java at: C:\Program Files\Java\jdk-21
) else if exist "C:\Program Files\Java\jdk-17" (
    set JAVA_HOME=C:\Program Files\Java\jdk-17
    echo Found Java at: C:\Program Files\Java\jdk-17
) else (
    echo Java installation not found. Please install Java JDK 11 or higher.
    pause
    exit /b 1
)

REM Set development profile to use H2 database
set SPRING_PROFILES_ACTIVE=dev

echo.
echo Starting Finance Tracker Backend with H2 Database...
echo - API will be available at: http://localhost:8080
echo - H2 Database Console: http://localhost:8080/h2-console
echo - Database URL: jdbc:h2:mem:financeTrackerDB
echo - Username: sa (no password)
echo.

REM Start the application
.\mvnw.cmd spring-boot:run

pause