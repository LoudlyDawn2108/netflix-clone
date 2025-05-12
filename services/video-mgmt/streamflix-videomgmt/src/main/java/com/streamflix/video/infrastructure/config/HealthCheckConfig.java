package com.streamflix.video.infrastructure.config;

import org.springframework.boot.actuate.autoconfigure.health.HealthEndpointProperties;
import org.springframework.boot.actuate.health.CompositeHealthContributor;
import org.springframework.boot.actuate.health.HealthContributor;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.system.DiskSpaceHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.actuate.health.PingHealthIndicator;
import org.springframework.boot.actuate.health.DiskSpaceHealthIndicatorProperties;
import org.springframework.boot.actuate.jms.JmsHealthIndicator;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.util.unit.DataSize;
import org.springframework.boot.actuate.redis.RedisHealthIndicator;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.HeadBucketRequest;

import java.io.File;
import java.util.Optional;

import javax.sql.DataSource;

import org.springframework.data.redis.connection.RedisConnectionFactory;

/**
 * Configuration for health indicators and custom health checks
 */
@Configuration
public class HealthCheckConfig {

    @Bean
    public HealthContributor s3HealthIndicator(Optional<AmazonS3> amazonS3) {
        return amazonS3.map(s3 -> (HealthIndicator) () -> {
            try {
                String bucketName = System.getenv("S3_BUCKET_NAME") != null ? 
                                    System.getenv("S3_BUCKET_NAME") : "streamflix-videos";
                s3.headBucket(new HeadBucketRequest(bucketName));
                return Health.up()
                        .withDetail("bucket", bucketName)
                        .withDetail("endpoint", s3.getRegionName())
                        .build();
            } catch (Exception e) {
                return Health.down()
                        .withException(e)
                        .withDetail("error", "S3 bucket connectivity failed")
                        .build();
            }
        }).orElse(() -> Health.unknown().withDetail("message", "S3 client not configured").build());
    }

    @Bean
    public HealthContributor diskSpaceHealthIndicator() {
        DiskSpaceHealthIndicatorProperties properties = new DiskSpaceHealthIndicatorProperties();
        properties.setThreshold(DataSize.ofMegabytes(100)); // Minimum 100 MB of free space required
        properties.setPath(new File(".").getAbsoluteFile().toPath());
        return new DiskSpaceHealthIndicator(properties);
    }

    @Bean
    public HealthContributor appHealthIndicator() {
        return () -> {
            long uptime = System.currentTimeMillis() - ManagementConfig.getApplicationStartTimestamp();
            return Health.up()
                    .withDetail("uptime", uptime)
                    .withDetail("description", "Video Management Service")
                    .withDetail("version", getClass().getPackage().getImplementationVersion())
                    .build();
        };
    }

    @Bean
    public HealthContributor kafkaHealthIndicator(@Autowired(required = false) KafkaTemplate<?, ?> kafkaTemplate) {
        return Optional.ofNullable(kafkaTemplate)
                .map(template -> (HealthIndicator) () -> {
                    try {
                        // Testing Kafka connection
                        template.getDefaultTopic();
                        return Health.up()
                                .withDetail("brokers", template.getProducerFactory().getConfigurationProperties()
                                        .get("bootstrap.servers"))
                                .build();
                    } catch (Exception e) {
                        return Health.down()
                                .withException(e)
                                .build();
                    }
                }).orElse(() -> Health.unknown().withDetail("message", "Kafka not configured").build());
    }

    @Bean
    public HealthContributor redisHealthIndicator(@Autowired(required = false) RedisConnectionFactory redisConnectionFactory) {
        return Optional.ofNullable(redisConnectionFactory)
                .map(factory -> (HealthIndicator) new RedisHealthIndicator(factory))
                .orElse(() -> Health.unknown().withDetail("message", "Redis not configured").build());
    }

    @Bean
    public HealthContributor threadHealthIndicator() {
        return () -> {
            int availableProcessors = Runtime.getRuntime().availableProcessors();
            int threadCount = Thread.activeCount();
            
            if (threadCount > availableProcessors * 10) {
                return Health.status(new Status("WARNING", "High thread count"))
                        .withDetail("thread.count", threadCount)
                        .withDetail("processors", availableProcessors)
                        .build();
            }
            
            return Health.up()
                    .withDetail("thread.count", threadCount)
                    .withDetail("processors", availableProcessors)
                    .build();
        };
    }

    @Bean
    public HealthContributor memoryHealthIndicator() {
        return () -> {
            Runtime runtime = Runtime.getRuntime();
            long freeMemory = runtime.freeMemory();
            long totalMemory = runtime.totalMemory();
            long maxMemory = runtime.maxMemory();
            long usedMemory = totalMemory - freeMemory;
            
            double memoryUsagePercentage = (double) usedMemory / maxMemory * 100;
            
            if (memoryUsagePercentage > 90) {
                return Health.status(new Status("WARNING", "High memory usage"))
                        .withDetail("free", freeMemory)
                        .withDetail("total", totalMemory)
                        .withDetail("max", maxMemory)
                        .withDetail("used", usedMemory)
                        .withDetail("usage_percentage", String.format("%.2f%%", memoryUsagePercentage))
                        .build();
            }
            
            return Health.up()
                    .withDetail("free", freeMemory)
                    .withDetail("total", totalMemory)
                    .withDetail("max", maxMemory)
                    .withDetail("used", usedMemory)
                    .withDetail("usage_percentage", String.format("%.2f%%", memoryUsagePercentage))
                    .build();
        };
    }
}
