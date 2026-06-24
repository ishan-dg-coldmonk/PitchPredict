package com.pitchpredict.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class CorsConfig {

    /**
     * Comma-separated list of extra allowed origins, injected from environment.
     * Set CORS_ALLOWED_ORIGINS in your EC2 .env file, e.g.:
     *   CORS_ALLOWED_ORIGINS=https://your-site.netlify.app,https://yourdomain.com
     *
     * Defaults to empty string if not set (local dev works via the hardcoded list below).
     */
    @Value("${cors.allowed-origins:}")
    private String extraOrigins;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Always allowed (local dev)
        List<String> origins = new ArrayList<>(List.of(
                "http://localhost:5173",
                "http://localhost:3000",
                "http://localhost:4173"   // vite preview
        ));

        // Production origins from env var (comma-separated)
        if (extraOrigins != null && !extraOrigins.isBlank()) {
            for (String origin : extraOrigins.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty()) origins.add(trimmed);
            }
        }

        config.setAllowedOrigins(origins);

        // PATCH is required for profile updates — was missing before
        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));

        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L); // cache preflight for 1 hour

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
