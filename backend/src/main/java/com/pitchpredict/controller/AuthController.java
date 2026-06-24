package com.pitchpredict.controller;

import com.pitchpredict.dto.AuthResponse;
import com.pitchpredict.dto.LoginRequest;
import com.pitchpredict.dto.SignupRequest;
import com.pitchpredict.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.getCurrentUser(authentication.getName()));
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
        return ResponseEntity.ok(
                authService.updateProfile(
                        authentication.getName(),
                        body.get("profilePic"),
                        body.get("fullName")
                )
        );
    }
}
