package com.streamflix.video.infrastructure.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {
    public static final String VIDEO_CACHE = "video";
    public static final String VIDEOS_BY_CATEGORY_CACHE = "videosByCategory";
    public static final String VIDEOS_BY_TAG_CACHE = "videosByTag";

    @Bean
    public RedisCacheConfiguration defaultCacheConfig() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .disableCachingNullValues()
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        RedisCacheConfiguration defaultConfig = defaultCacheConfig();
        Map<String, RedisCacheConfiguration> configs = new HashMap<>();
        configs.put(VIDEO_CACHE, defaultConfig.entryTtl(Duration.ofHours(1)));
        configs.put(VIDEOS_BY_CATEGORY_CACHE, defaultConfig.entryTtl(Duration.ofMinutes(10)));
        configs.put(VIDEOS_BY_TAG_CACHE, defaultConfig.entryTtl(Duration.ofMinutes(10)));
        return RedisCacheManager.builder(redisConnectionFactory)
            .cacheDefaults(defaultConfig)
            .withInitialCacheConfigurations(configs)
            .transactionAware()
            .build();
    }

    @Bean("cacheKeyGenerator")
    public KeyGenerator keyGenerator() {
        return (target, method, params) -> {
            StringBuilder sb = new StringBuilder();
            sb.append(target.getClass().getSimpleName()).append(".").append(method.getName());
            for (Object param : params) {
                sb.append(".").append(param != null ? param.toString() : "null");
            }
            return sb.toString();
        };
    }
}
