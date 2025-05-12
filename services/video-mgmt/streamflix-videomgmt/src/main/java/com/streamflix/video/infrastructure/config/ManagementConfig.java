package com.streamflix.video.infrastructure.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.ServletContextInitializer;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.core.env.Environment;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import java.lang.management.ManagementFactory;

/**
 * Configuration for application management functions including startup/shutdown hooks
 * and metrics initialization
 */
@Configuration
public class ManagementConfig {

    private static final Logger log = LoggerFactory.getLogger(ManagementConfig.class);
    private static final long applicationStartTimestamp = System.currentTimeMillis();

    @Value("${spring.lifecycle.timeout-per-shutdown-phase:30s}")
    private String shutdownTimeout;

    private final Environment environment;

    public ManagementConfig(Environment environment) {
        this.environment = environment;
    }

    /**
     * Initialization hook logs application startup details
     */
    @PostConstruct
    public void init() {
        logApplicationStartup();
    }

    /**
     * Graceful shutdown hook 
     */
    @PreDestroy
    public void shutdown() {
        log.info("Application shutdown requested, waiting for active requests to complete. Timeout: {}", shutdownTimeout);
    }

    /**
     * Get application startup timestamp
     * @return the timestamp when the application was started
     */
    public static long getApplicationStartTimestamp() {
        return applicationStartTimestamp;
    }

    /**
     * Logs application startup information including runtime, profiles, and JVM info
     */
    private void logApplicationStartup() {
        String protocol = "http";
        String serverPort = environment.getProperty("server.port", "8080");
        String contextPath = environment.getProperty("server.servlet.context-path", "/");
        if (!contextPath.startsWith("/")) {
            contextPath = "/" + contextPath;
        }
        if (!contextPath.endsWith("/")) {
            contextPath += "/";
        }
        
        String hostAddress = "localhost";
        String profiles = String.join(", ", environment.getActiveProfiles());
        
        log.info("""
                
                ----------------------------------------------------------
                Application '{}' is running!
                Profile(s): {}
                Access URLs:
                   Local: {}://{}:{}{}
                   Health: {}://{}:{}{}/actuator/health
                   Metrics: {}://{}:{}{}/actuator/metrics
                JVM: {} by {}
                Memory: {} MB / {} MB
                ----------------------------------------------------------
                """,
            environment.getProperty("spring.application.name"),
            profiles.isEmpty() ? "default" : profiles,
            protocol,
            hostAddress,
            serverPort,
            contextPath,
            protocol,
            hostAddress,
            serverPort,
            contextPath,
            protocol,
            hostAddress,
            serverPort,
            contextPath,
            System.getProperty("java.version"),
            System.getProperty("java.vendor"),
            Runtime.getRuntime().totalMemory() / 1024 / 1024,
            Runtime.getRuntime().maxMemory() / 1024 / 1024
        );
    }

    /**
     * Listener for graceful shutdown
     */
    @Bean
    public ApplicationListener<ContextClosedEvent> shutdownListener() {
        return event -> {
            long jvmUptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;
            log.info("Application is shutting down... JVM uptime: {} seconds", jvmUptime);
        };
    }

    /**
     * Configure the servlet context with version info for health endpoints
     */
    @Bean
    public ServletContextInitializer contextInitializer() {
        return new ServletContextInitializer() {
            @Override
            public void onStartup(ServletContext servletContext) throws ServletException {
                servletContext.setAttribute("app.version", getClass().getPackage().getImplementationVersion());
                servletContext.setAttribute("app.startup.time", applicationStartTimestamp);
            }
        };
    }
}
