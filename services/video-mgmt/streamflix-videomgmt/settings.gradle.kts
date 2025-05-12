rootProject.name = "streamflix-videomgmt"

// Enable the Gradle build cache
buildCache {
    local {
        directory = "build-cache"
        removeUnusedEntriesAfterDays = 30
    }
}
