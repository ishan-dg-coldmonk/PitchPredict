package com.pitchpredict.controller;

import com.pitchpredict.dto.AuthResponse;
import com.pitchpredict.dto.LoginRequest;
import com.pitchpredict.dto.SignupRequest;
import com.pitchpredict.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        log.info("[API] POST /api/auth/signup - username={}", request.getUsername());
        AuthResponse res = authService.signup(request);
        log.info("[API] POST /api/auth/signup ✓ - userId={}", res.getId());
        return ResponseEntity.ok(res);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        log.info("[API] POST /api/auth/login - username={}", request.getUsername());
        AuthResponse res = authService.login(request);
        log.info("[API] POST /api/auth/login ✓ - userId={}", res.getId());
        return ResponseEntity.ok(res);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        log.info("[API] GET /api/auth/me - username={}", authentication.getName());
        AuthResponse res = authService.getCurrentUser(authentication.getName());
        log.info("[API] GET /api/auth/me ✓ - userId={}", res.getId());
        return ResponseEntity.ok(res);
    }

    /**
     * PATCH /api/auth/profile
     * Updates the logged-in user's profilePic and/or fullName.
     * Only fields present in the body are changed.
     */
    @PatchMapping("/profile")
    public ResponseEntity<AuthResponse> updateProfile(
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        String username = authentication.getName();
        String profilePic = body.get("profilePic");
        String fullName = body.get("fullName");
        log.info("[API] PATCH /api/auth/profile - username={} fullName={} hasProfilePic={}",
                username, fullName, profilePic != null);
        AuthResponse res = authService.updateProfile(username, profilePic, fullName);
        log.info("[API] PATCH /api/auth/profile ✓ - userId={}", res.getId());
        return ResponseEntity.ok(res);
    }
}
