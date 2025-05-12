package com.streamflix.video.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5); // Start with a sensible default
        executor.setMaxPoolSize(10); // Adjust based on expected load
        executor.setQueueCapacity(25); // Buffer for tasks
        executor.setThreadNamePrefix("VideoMgmtAsync-");
        executor.initialize();
        return executor;
    }
}
