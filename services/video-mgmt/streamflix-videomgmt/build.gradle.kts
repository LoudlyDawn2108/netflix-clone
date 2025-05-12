import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    id("org.springframework.boot") version "3.3.0"
    id("io.spring.dependency-management") version "1.1.4"
    kotlin("jvm") version "2.0.0"
    kotlin("plugin.spring") version "2.0.0"
    kotlin("plugin.jpa") version "2.0.0"
    id("org.owasp.dependencycheck") version "9.2.0" // Added OWASP dependency-check plugin
}

group = "com.streamflix"
version = "0.0.1-SNAPSHOT"
java.sourceCompatibility = JavaVersion.VERSION_17

repositories {
    mavenCentral()
}

// Spring Cloud version
ext {
    set("springCloudVersion", "2023.0.0")
}

val flywayVersion = "10.15.0" // Explicitly define version for clarity if preferred, or use direct literal below

dependencies {
    // Spring Boot
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-hateoas")
    
    // Spring Security
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("io.jsonwebtoken:jjwt-api:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.11.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.11.5")
    
    // Spring Cloud Stream with Kafka
    implementation("org.springframework.cloud:spring-cloud-starter-stream-kafka")
    implementation("org.springframework.cloud:spring-cloud-stream-binder-kafka")
    implementation("org.springframework.cloud:spring-cloud-starter-netflix-eureka-client") // Added for service discovery
    
    // Database
    implementation("org.postgresql:postgresql")
    implementation("org.flywaydb:flyway-core:${flywayVersion}")
    implementation("org.flywaydb:flyway-database-postgresql:${flywayVersion}")
    
    // H2 Database for testing
    testImplementation("com.h2database:h2")
    
    // AWS SDK for S3
    implementation("software.amazon.awssdk:s3:2.23.11")
    implementation("software.amazon.awssdk:sts:2.23.11")
    implementation("software.amazon.awssdk:apache-client:2.23.11") // Added Apache HTTP client

    // Messaging with Kafka
    implementation("org.springframework.kafka:spring-kafka")
    
    // Documentation
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")
    
    // Micrometer and OpenTelemetry for observability
    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("io.opentelemetry:opentelemetry-api:1.28.0")
    implementation("io.opentelemetry:opentelemetry-sdk:1.28.0")
    implementation("io.opentelemetry:opentelemetry-exporter-jaeger:1.28.0")
    implementation("io.opentelemetry.instrumentation:opentelemetry-instrumentation-annotations:1.28.0")
      // Resilience4j for circuit breakers and retries
    implementation("org.springframework.cloud:spring-cloud-starter-circuitbreaker-resilience4j:3.0.3")
    implementation("io.github.resilience4j:resilience4j-spring-boot3:2.1.0")
    implementation("io.github.resilience4j:resilience4j-circuitbreaker:2.1.0")
    implementation("io.github.resilience4j:resilience4j-retry:2.1.0")
    implementation("io.github.resilience4j:resilience4j-timelimiter:2.1.0")
    
    // Spring Statemachine for workflow orchestration
    implementation("org.springframework.statemachine:spring-statemachine-core:4.0.1")
    implementation("org.springframework.statemachine:spring-statemachine-data-jpa:4.0.1")
    
    // JSON processing
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    
    // Testing
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.mockito:mockito-core:5.5.0")
    testImplementation("org.mockito:mockito-junit-jupiter:5.5.0")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testImplementation("org.testcontainers:testcontainers:1.19.0")
    testImplementation("org.testcontainers:junit-jupiter:1.19.0")
    testImplementation("org.testcontainers:postgresql:1.19.0")
    testImplementation("org.springframework.security:spring-security-test")
    testImplementation("org.testcontainers:kafka")
}

// Apply Spring Cloud dependency management
dependencyManagement {
    imports {
        mavenBom("org.springframework.cloud:spring-cloud-dependencies:${property("springCloudVersion")}")
    }
}

tasks.withType<KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs += "-Xjsr305=strict"
        jvmTarget = "17"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}

dependencyCheck {
    // Configuration for the OWASP dependency-check plugin
    // Fails the build if a CVSS score of 7 or higher is found
    failBuildOnCVSS = 7.0f 
    // Specifies the format for the report (HTML, XML, JSON, CSV, JUNIT, SARIF, ALL)
    format = org.owasp.dependencycheck.reporting.ReportGenerator.Format.ALL 
    // Specifies the output directory for the report
    outputDirectory = "$buildDir/reports/dependency-check"
    // Suppresses file names in the report to reduce noise from transitive dependencies
    suppressionFiles.add("config/owasp/dependency-check-suppressions.xml")
}