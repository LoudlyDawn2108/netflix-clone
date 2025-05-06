Write-Host "Building and running tests in Docker..." -ForegroundColor Cyan

try {
    # Run the tests using docker-compose
    docker-compose -f docker-compose.test.yml up --build
    
    $testExitCode = $LASTEXITCODE
    
    if ($testExitCode -eq 0) {
        Write-Host "`n✅ Tests completed successfully!" -ForegroundColor Green
        Write-Host "Test reports are available in ./build/reports/tests/test/" -ForegroundColor Cyan
    }
    else {
        Write-Host "`n❌ Tests failed with exit code $testExitCode" -ForegroundColor Red
        Write-Host "Check the logs above for details" -ForegroundColor Yellow
    }
}
finally {
    # Clean up containers
    Write-Host "`nCleaning up containers..." -ForegroundColor Cyan
    docker-compose -f docker-compose.test.yml down
}

exit $testExitCode