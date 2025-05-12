# Use a Gradle Docker container to build
FROM gradle:7.6-jdk AS builder
WORKDIR /app
COPY . .
# Use cache volume for faster builds
RUN --mount=type=cache,target=/home/gradle/.gradle gradle build --no-daemon

# Create the final image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh
RUN apt-get update && apt-get install -y netcat-openbsd && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/wait-for-it.sh", "postgres:5432", "--", "java", "-jar", "app.jar"]
