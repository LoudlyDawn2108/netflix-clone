package com.streamflix.video.infrastructure.partitioning;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

/**
 * Component responsible for setting up and maintaining database partitioning.
 * Uses PostgreSQL's declarative partitioning to horizontally partition tables by tenant.
 */
@Component
@ConditionalOnProperty(name = "app.partitioning.enabled", havingValue = "true")
public class PostgresPartitionManager {

    private final JdbcTemplate jdbcTemplate;

    public PostgresPartitionManager(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Initialize the partition setup on application startup
     */
    @PostConstruct
    public void initializePartitioning() {
        // Only run if we need to set up partitioning
        if (isPartitioningSetUp()) {
            return;
        }

        // Create partitioned tables
        setupVideoPartitioning();
        setupCategoryPartitioning();
        setupThumbnailPartitioning();
    }

    private boolean isPartitioningSetUp() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'videos_partitioned'", 
            Integer.class);
        return count != null && count > 0;
    }

    private void setupVideoPartitioning() {
        // Create the partitioned table
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS videos_partitioned (
                id UUID NOT NULL,
                title VARCHAR(255) NOT NULL,
                description VARCHAR(2000),
                tenant_id UUID NOT NULL,
                category_id UUID,
                release_year INTEGER,
                language VARCHAR(10),
                status VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITHOUT TIME ZONE,
                updated_at TIMESTAMP WITHOUT TIME ZONE,
                PRIMARY KEY (tenant_id, id)
            ) PARTITION BY HASH (tenant_id);
        """);

        // Create default partition
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS videos_default_partition
            PARTITION OF videos_partitioned DEFAULT;
        """);
    }

    private void setupCategoryPartitioning() {
        // Create the partitioned table
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS categories_partitioned (
                id UUID NOT NULL,
                name VARCHAR(255) NOT NULL,
                description VARCHAR(2000),
                tenant_id UUID NOT NULL,
                PRIMARY KEY (tenant_id, id)
            ) PARTITION BY HASH (tenant_id);
        """);

        // Create default partition
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS categories_default_partition
            PARTITION OF categories_partitioned DEFAULT;
        """);
    }

    private void setupThumbnailPartitioning() {
        // Create the partitioned table
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS thumbnails_partitioned (
                id UUID NOT NULL,
                url VARCHAR(255) NOT NULL,
                width INTEGER,
                height INTEGER,
                is_default BOOLEAN,
                is_primary BOOLEAN,
                video_id UUID NOT NULL,
                tenant_id UUID NOT NULL,
                PRIMARY KEY (tenant_id, id)
            ) PARTITION BY HASH (tenant_id);
        """);

        // Create default partition
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS thumbnails_default_partition
            PARTITION OF thumbnails_partitioned DEFAULT;
        """);
    }

    /**
     * Create a new partition for a specific tenant
     * @param tenantId The tenant ID
     */
    public void createTenantPartition(String tenantId) {
        // Create partitions for each table type
        jdbcTemplate.execute(String.format("""
            CREATE TABLE IF NOT EXISTS videos_tenant_%s
            PARTITION OF videos_partitioned
            FOR VALUES WITH (MODULUS 100, REMAINDER %d);
        """, tenantId, Math.abs(tenantId.hashCode() % 100)));

        jdbcTemplate.execute(String.format("""
            CREATE TABLE IF NOT EXISTS categories_tenant_%s
            PARTITION OF categories_partitioned
            FOR VALUES WITH (MODULUS 100, REMAINDER %d);
        """, tenantId, Math.abs(tenantId.hashCode() % 100)));

        jdbcTemplate.execute(String.format("""
            CREATE TABLE IF NOT EXISTS thumbnails_tenant_%s
            PARTITION OF thumbnails_partitioned
            FOR VALUES WITH (MODULUS 100, REMAINDER %d);
        """, tenantId, Math.abs(tenantId.hashCode() % 100)));
    }
}
