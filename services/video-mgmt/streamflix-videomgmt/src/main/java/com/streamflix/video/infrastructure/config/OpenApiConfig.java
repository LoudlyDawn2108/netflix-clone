package com.streamflix.video.infrastructure.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.tags.Tag;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI videoManagementOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Streamflix Video Management API")
                        .description("API for managing video metadata, triggering ingestion workflows, and thumbnail management")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Streamflix API Team")
                                .email("api-team@streamflix.com")
                                .url("https://developers.streamflix.com"))
                        .license(new License()
                                .name("Streamflix API License")
                                .url("https://api.streamflix.com/license")))
                .servers(Arrays.asList(
                        new Server().url("/").description("Current Environment"),
                        new Server().url("https://api.streamflix.com").description("Production Environment"),
                        new Server().url("https://staging-api.streamflix.com").description("Staging Environment")))
                .tags(Arrays.asList(
                        new Tag().name("Video Management").description("Operations for managing video metadata"),
                        new Tag().name("Thumbnails").description("Operations for managing video thumbnails"),
                        new Tag().name("Categories").description("Operations for managing video categories"),
                        new Tag().name("Tags").description("Operations for working with video tags"),
                        new Tag().name("Health & Metrics").description("Operations for system health and metrics")
                ))
                .addSecurityItem(new SecurityRequirement().addList("JWT Auth"))
                .addSecurityItem(new SecurityRequirement().addList("API Key"))
                .components(new Components()
                        .addSecuritySchemes("JWT Auth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Enter JWT token with Bearer prefix (e.g., Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)"))
                        .addSecuritySchemes("API Key", new SecurityScheme()
                                .type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER)
                                .name("X-API-Key")
                                .description("Enter your API key")));
    }
}
