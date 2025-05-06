#!/bin/bash
set -e

echo "Building and running tests in Docker..."
docker-compose -f docker-compose.test.yml up --build

# Check if tests were successful based on exit code
TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n✅ Tests completed successfully!"
    echo "Test reports are available in ./build/reports/tests/test/"
else
    echo -e "\n❌ Tests failed with exit code $TEST_EXIT_CODE"
    echo "Check the logs above for details"
fi

# Clean up containers
echo -e "\nCleaning up containers..."
docker-compose -f docker-compose.test.yml down

exit $TEST_EXIT_CODE