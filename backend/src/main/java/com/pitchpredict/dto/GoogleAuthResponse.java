package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Result of POST /api/auth/google.
 *
 *  • Existing (or auto-linked) account → {@code newUser=false} and {@code auth} is
 *    a full logged-in AuthResponse (token + profile).
 *  • Brand-new Google account → {@code newUser=true}; no token yet. The client
 *    shows the "choose a username" step and finishes via /api/auth/google/complete.
 *    {@code suggestedUsername}, {@code fullName} and {@code profilePic} pre-fill it.
 */
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class GoogleAuthResponse {
    private boolean newUser;
    private AuthResponse auth;
    private String suggestedUsername;
    private String fullName;
    private String profilePic;
}
