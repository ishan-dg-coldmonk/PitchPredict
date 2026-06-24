package com.pitchpredict.service;

import com.pitchpredict.dto.AuthResponse;
import com.pitchpredict.dto.LoginRequest;
import com.pitchpredict.dto.SignupRequest;
import com.pitchpredict.entity.User;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;

    public AuthResponse signup(SignupRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw ApiException.conflict("Username already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw ApiException.conflict("Email already registered");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .profilePic(request.getProfilePic())
                .build();

        user = userRepository.save(user);
        String token = tokenProvider.generateToken(user.getUsername());
        return toAuthResponse(user, token);
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> ApiException.notFound("User not found"));

        String token = tokenProvider.generateToken(user.getUsername());
        return toAuthResponse(user, token);
    }

    public AuthResponse getCurrentUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("User not found"));
        // No token returned for /me — frontend already has it
        return toAuthResponse(user, null);
    }

    /**
     * Update profile pic and/or full name for the given user.
     * Only non-null values in the parameters are applied — passing null
     * for a field means "leave it unchanged".
     * Returns a fresh AuthResponse (without token) so the frontend can
     * update its user state immediately.
     */
    public AuthResponse updateProfile(String username, String profilePic, String fullName) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("User not found"));

        if (profilePic != null) user.setProfilePic(profilePic);
        if (fullName   != null) user.setFullName(fullName);

        user = userRepository.save(user);
        return toAuthResponse(user, null);
    }

    private AuthResponse toAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .profilePic(user.getProfilePic())
                .role(user.getRole().name())
                .build();
    }
}
