package com.streamflix.video.domain;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "categories", 
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"name", "tenant_id"})
    },
    indexes = {
        @Index(name = "idx_category_tenant", columnList = "tenant_id")
    }
)
public class Category implements MultiTenantEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column
    private String description;
    
    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    // Default constructor for JPA
    protected Category() {}

    // Constructor for creating new categories
    public Category(String name, String description, UUID tenantId) {
        this.name = name;
        this.description = description;
        this.tenantId = tenantId;
    }
    
    // Legacy constructor for backward compatibility
    public Category(String name, String description) {
        this(name, description, null); // Default to null tenant ID, will be set by service layer
    }

    // Getters and setters
    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
    
    public UUID getTenantId() {
        return tenantId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    // Equals, hashCode and toString
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Category category = (Category) o;
        return Objects.equals(id, category.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Category{" +
                "id=" + id +
                ", name='" + name + '\'' +
                '}';
    }
}