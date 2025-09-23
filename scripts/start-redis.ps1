# Start Redis Server for Windows
$redisPath = "C:\Redis"
$redisExe = "$redisPath\redis-server.exe"
$redisConf = "$redisPath\redis.windows.conf"

# Check if Redis is already running
$existingProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue

if ($existingProcess) {
    Write-Host "Redis is already running (PID: $($existingProcess.Id))" -ForegroundColor Green
    
    # Test connection
    & "$redisPath\redis-cli.exe" ping | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Redis connection successful!" -ForegroundColor Green
    } else {
        Write-Host "Redis is running but not responding. Restarting..." -ForegroundColor Yellow
        Stop-Process -Name "redis-server" -Force
        Start-Sleep -Seconds 1
        Start-Process -FilePath $redisExe -ArgumentList $redisConf -WindowStyle Hidden
        Start-Sleep -Seconds 2
        Write-Host "Redis restarted successfully!" -ForegroundColor Green
    }
} else {
    Write-Host "Starting Redis server..." -ForegroundColor Yellow
    
    if (Test-Path $redisExe) {
        Start-Process -FilePath $redisExe -ArgumentList $redisConf -WindowStyle Hidden
        Start-Sleep -Seconds 2
        
        # Verify it's running
        $newProcess = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
        if ($newProcess) {
            Write-Host "Redis server started successfully (PID: $($newProcess.Id))" -ForegroundColor Green
            Write-Host "Redis is listening on localhost:6379" -ForegroundColor Cyan
        } else {
            Write-Host "Failed to start Redis server. Please check the configuration." -ForegroundColor Red
        }
    } else {
        Write-Host "Redis not found at $redisExe" -ForegroundColor Red
        Write-Host "Please ensure Redis is installed in C:\Redis" -ForegroundColor Yellow
    }
}
