FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Add application jar
COPY build/libs/*.jar app.jar

# Add wait-for-it script to wait for dependent services
ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Set environment variables with defaults that can be overridden
ENV SPRING_PROFILES_ACTIVE=prod
ENV SERVER_PORT=8080

# Expose the application port
EXPOSE 8080

# Run the application with proper memory settings
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]