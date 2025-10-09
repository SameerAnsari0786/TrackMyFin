# PowerShell script to start the Finance Tracker Backend Server
# Run this script from the backend directory

Write-Host "=== Finance Tracker Backend Startup ===" -ForegroundColor Green
Write-Host ""

# Set JAVA_HOME if not already set
if (-not $env:JAVA_HOME) {
    Write-Host "JAVA_HOME not set. Attempting to locate Java installation..." -ForegroundColor Yellow
    
    $javaPaths = @(
        "C:\Program Files\Java\jdk-21",
        "C:\Program Files\Java\jdk-17",
        "C:\Program Files\Java\jdk-11",
        "C:\Program Files\Java\jdk1.8.0_*"
    )
    
    $javaFound = $false
    foreach ($path in $javaPaths) {
        if ($path -like "*\*") {
            $expandedPaths = Get-ChildItem "C:\Program Files\Java\" -Directory | Where-Object { $_.Name -like "jdk1.8.0_*" }
            if ($expandedPaths) {
                $env:JAVA_HOME = $expandedPaths[0].FullName
                $javaFound = $true
                break
            }
        } elseif (Test-Path $path) {
            $env:JAVA_HOME = $path
            $javaFound = $true
            break
        }
    }
    
    if ($javaFound) {
        Write-Host "Found Java at: $env:JAVA_HOME" -ForegroundColor Green
    } else {
        Write-Host "Java installation not found. Please install Java JDK 11 or higher." -ForegroundColor Red
        Write-Host "Download from: https://adoptium.net/" -ForegroundColor Cyan
        exit 1
    }
} else {
    Write-Host "Using existing JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Green
}

# Check current directory
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "pom.xml")) {
    Write-Host "Error: pom.xml not found in current directory" -ForegroundColor Red
    Write-Host "Please navigate to the backend directory:" -ForegroundColor Yellow
    Write-Host "cd 'C:\Users\Sameer\Desktop\Finance Tracker UI\Finance\finance-tracker'" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Current files in directory:" -ForegroundColor Yellow
    Get-ChildItem | Format-Table Name, Length, LastWriteTime
    exit 1
}

Write-Host "✅ Found pom.xml - in correct backend directory" -ForegroundColor Green

# Check if Maven wrapper exists
if (Test-Path "mvnw.cmd") {
    Write-Host "✅ Found Maven wrapper" -ForegroundColor Green
} else {
    Write-Host "❌ Maven wrapper (mvnw.cmd) not found" -ForegroundColor Red
    exit 1
}

# Check if MySQL is running (optional check)
Write-Host ""
Write-Host "🔍 Checking MySQL connection..." -ForegroundColor Yellow
try {
    # Simple test to see if port 3306 is open
    $connection = Test-NetConnection -ComputerName "localhost" -Port 3306 -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "✅ MySQL appears to be running on localhost:3306" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MySQL may not be running on localhost:3306" -ForegroundColor Yellow
        Write-Host "   Make sure MySQL is started and database 'financeTrackerDB' exists" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not check MySQL status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Spring Boot application..." -ForegroundColor Green
Write-Host "   Backend will be available at: http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Cyan
Write-Host ""

# Start the Spring Boot application
try {
    .\mvnw.cmd spring-boot:run
} catch {
    Write-Host ""
    Write-Host "❌ Failed to start backend server" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "1. Make sure MySQL is running" -ForegroundColor White
    Write-Host "2. Verify database 'financeTrackerDB' exists" -ForegroundColor White
    Write-Host "3. Check application.properties for correct DB credentials" -ForegroundColor White
    Write-Host "4. Ensure Java 21 is installed" -ForegroundColor White
    exit 1
}