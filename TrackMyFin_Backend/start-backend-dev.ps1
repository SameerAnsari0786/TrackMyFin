# PowerShell script to start the Finance Tracker Backend Server with H2 Database
# This solves database connection issues by using an embedded database

Write-Host "=== Finance Tracker Backend Startup (Development Mode) ===" -ForegroundColor Green
Write-Host ""

# Set JAVA_HOME if not already set
if (-not $env:JAVA_HOME) {
    Write-Host "JAVA_HOME not set. Attempting to locate Java installation..." -ForegroundColor Yellow
    
    $javaPaths = @(
        "C:\Program Files\Java\jdk-21",
        "C:\Program Files\Java\jdk-17", 
        "C:\Program Files\Java\jdk-11"
    )
    
    $javaFound = $false
    foreach ($path in $javaPaths) {
        if (Test-Path $path) {
            $env:JAVA_HOME = $path
            $javaFound = $true
            Write-Host "Found Java at: $env:JAVA_HOME" -ForegroundColor Green
            break
        }
    }
    
    if (-not $javaFound) {
        # Try to find any JDK in Program Files\Java
        $javaInstalls = Get-ChildItem "C:\Program Files\Java\" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "jdk*" }
        if ($javaInstalls) {
            $env:JAVA_HOME = $javaInstalls[0].FullName
            Write-Host "Found Java at: $env:JAVA_HOME" -ForegroundColor Green
            $javaFound = $true
        }
    }
    
    if (-not $javaFound) {
        Write-Host "Java installation not found. Please install Java JDK 11 or higher." -ForegroundColor Red
        Write-Host "Download from: https://adoptium.net/" -ForegroundColor Cyan
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Using existing JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
}

# Check if we're in the right directory
if (-not (Test-Path "pom.xml")) {
    Write-Host "Error: pom.xml not found. Please run this script from the backend directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Finance Tracker Backend with H2 Database..." -ForegroundColor Cyan
Write-Host "- API will be available at: http://localhost:8080" -ForegroundColor Yellow
Write-Host "- H2 Database Console: http://localhost:8080/h2-console" -ForegroundColor Yellow
Write-Host "- Database URL: jdbc:h2:mem:financeTrackerDB" -ForegroundColor Yellow
Write-Host "- Username: sa (no password)" -ForegroundColor Yellow
Write-Host ""

# Start the application with dev profile
try {
    $env:SPRING_PROFILES_ACTIVE = "dev"
    .\mvnw.cmd spring-boot:run
} catch {
    Write-Host "Error starting the application: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"