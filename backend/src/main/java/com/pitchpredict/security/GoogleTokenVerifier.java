package com.pitchpredict.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pitchpredict.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Verifies a Google OAuth access token (from the browser's token flow) and
 * returns the trusted profile.
 *
 * Two Google calls, both dependency-free (no google-api-client):
 *   1. tokeninfo — confirms the token was issued to THIS app (audience check),
 *      guarding against a token minted for a different client being replayed.
 *   2. userinfo  — returns the verified profile (sub, email, name, picture).
 *
 * Logins are infrequent, so the extra round-trips are negligible. We never trust
 * identity fields sent directly by the browser.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class GoogleTokenVerifier {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    private static final String USERINFO_URL  = "https://openidconnect.googleapis.com/v1/userinfo";

    @Value("${google.client-id:}")
    private String clientId;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    /** Trusted subset of Google claims. */
    public record GoogleUser(String sub, String email, boolean emailVerified, String name, String picture) {}

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank();
    }

    public GoogleUser verify(String accessToken) {
        if (!isConfigured()) {
            throw ApiException.badRequest("Google sign-in is not configured on the server");
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw ApiException.badRequest("Missing Google token");
        }

        // 1) Audience check — the token must belong to this app.
        JsonNode info;
        try {
            String url = UriComponentsBuilder.fromHttpUrl(TOKENINFO_URL)
                    .queryParam("access_token", accessToken)
                    .toUriString();
            info = objectMapper.readTree(restTemplate.getForEntity(url, String.class).getBody());
        } catch (HttpStatusCodeException e) {
            log.warn("[Google] tokeninfo rejected token: {}", e.getStatusCode());
            throw ApiException.badRequest("Invalid or expired Google session");
        } catch (Exception e) {
            log.warn("[Google] tokeninfo call failed: {}", e.getMessage());
            throw ApiException.badRequest("Could not verify Google sign-in — please try again");
        }

        String aud = info.path("aud").asText(null);
        String azp = info.path("azp").asText(null);
        if (!clientId.equals(aud) && !clientId.equals(azp)) {
            log.warn("[Google] audience mismatch (aud={}, azp={})", aud, azp);
            throw ApiException.badRequest("Google token was issued for a different app");
        }

        // 2) Fetch the verified profile.
        JsonNode profile;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            ResponseEntity<String> resp = restTemplate.exchange(
                    USERINFO_URL, HttpMethod.GET, new HttpEntity<>(headers), String.class);
            profile = objectMapper.readTree(resp.getBody());
        } catch (Exception e) {
            log.warn("[Google] userinfo call failed: {}", e.getMessage());
            throw ApiException.badRequest("Could not read your Google profile — please try again");
        }

        String sub = profile.path("sub").asText(null);
        if (sub == null || sub.isBlank()) {
            throw ApiException.badRequest("Google profile is missing a subject id");
        }

        return new GoogleUser(
                sub,
                profile.path("email").asText(null),
                profile.path("email_verified").asBoolean(false),
                profile.path("name").asText(null),
                profile.path("picture").asText(null)
        );
    }
}
