package com.pitchpredict.service;

import com.pitchpredict.dto.AuthResponse;
import com.pitchpredict.dto.GoogleAuthResponse;
import com.pitchpredict.dto.LoginRequest;
import com.pitchpredict.dto.SignupRequest;
import com.pitchpredict.entity.User;
import com.pitchpredict.enums.AuthProvider;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.UserRepository;
import com.pitchpredict.security.GoogleTokenVerifier;
import com.pitchpredict.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private static final String USERNAME_PATTERN = "^[A-Za-z0-9_]{3,50}$";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuthenticationManager authenticationManager;
    private final GoogleTokenVerifier googleTokenVerifier;

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

    // ── Google Sign-In ─────────────────────────────────────────────────────

    /**
     * Verifies a Google credential and either logs the user in (existing account,
     * or a password account with the same email that we auto-link), or signals a
     * brand-new user who must pick a username first.
     */
    public GoogleAuthResponse googleAuth(String accessToken) {
        GoogleTokenVerifier.GoogleUser g = googleTokenVerifier.verify(accessToken);
        if (!g.emailVerified()) {
            throw ApiException.badRequest("Your Google email isn't verified");
        }

        // 1) Returning Google user — matched on the stable subject id.
        Optional<User> byProvider = userRepository.findByProviderId(g.sub());
        if (byProvider.isPresent()) {
            return loggedIn(byProvider.get());
        }

        // 2) Existing password account with this email — auto-link (Google verifies
        //    the email, so this is safe). Keep the local password usable.
        if (g.email() != null) {
            Optional<User> byEmail = userRepository.findByEmail(g.email());
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                u.setProviderId(g.sub());
                if (u.getProfilePic() == null && g.picture() != null) {
                    u.setProfilePic(g.picture());
                }
                userRepository.save(u);
                log.info("[Auth] Linked Google to existing account userId={}", u.getId());
                return loggedIn(u);
            }
        }

        // 3) Brand-new user — defer creation until they confirm a username.
        return GoogleAuthResponse.builder()
                .newUser(true)
                .suggestedUsername(generateUsername(g.email(), g.name()))
                .fullName(g.name())
                .profilePic(g.picture())
                .build();
    }

    /** Finishes a first-time Google signup with the user's chosen username and optional avatar. */
    public AuthResponse googleComplete(String accessToken, String username, String profilePic) {
        GoogleTokenVerifier.GoogleUser g = googleTokenVerifier.verify(accessToken);
        if (!g.emailVerified()) {
            throw ApiException.badRequest("Your Google email isn't verified");
        }
        if (profilePic != null && profilePic.length() > 3_000_000) {
            throw ApiException.badRequest("Profile picture is too large");
        }

        // Idempotency / race guard: the account may already exist by now.
        Optional<User> byProvider = userRepository.findByProviderId(g.sub());
        if (byProvider.isPresent()) {
            return toAuthResponse(byProvider.get(), tokenProvider.generateToken(byProvider.get().getUsername()));
        }
        if (g.email() != null) {
            Optional<User> byEmail = userRepository.findByEmail(g.email());
            if (byEmail.isPresent()) {
                User u = byEmail.get();
                u.setProviderId(g.sub());
                userRepository.save(u);
                return toAuthResponse(u, tokenProvider.generateToken(u.getUsername()));
            }
        }

        String uname = username == null ? "" : username.trim();
        if (!uname.matches(USERNAME_PATTERN)) {
            throw ApiException.badRequest("Username must be 3–50 characters: letters, numbers and underscores only");
        }
        if (userRepository.existsByUsername(uname)) {
            throw ApiException.conflict("Username already taken");
        }

        // Use the avatar the user chose in the signup step, if any; else Google's.
        String avatar = (profilePic != null && !profilePic.isBlank()) ? profilePic : g.picture();

        User user = User.builder()
                .username(uname)
                .email(g.email())
                .password(null)                 // OAuth-only account
                .fullName(g.name())
                .profilePic(avatar)
                .authProvider(AuthProvider.GOOGLE)
                .providerId(g.sub())
                .build();
        user = userRepository.save(user);
        log.info("[Auth] Created Google account userId={} username={}", user.getId(), user.getUsername());
        return toAuthResponse(user, tokenProvider.generateToken(user.getUsername()));
    }

    /** True if the username is well-formed and not already taken (for live UI checks). */
    public boolean isUsernameAvailable(String username) {
        if (username == null) return false;
        String u = username.trim();
        return u.matches(USERNAME_PATTERN) && !userRepository.existsByUsername(u);
    }

    private GoogleAuthResponse loggedIn(User user) {
        return GoogleAuthResponse.builder()
                .newUser(false)
                .auth(toAuthResponse(user, tokenProvider.generateToken(user.getUsername())))
                .build();
    }

    /** Derives an available username from the Google email/name, with a numeric suffix on collision. */
    private String generateUsername(String email, String name) {
        String base = null;
        if (email != null && email.contains("@")) {
            base = email.substring(0, email.indexOf('@'));
        } else if (name != null) {
            base = name;
        }
        if (base == null) base = "player";
        base = base.toLowerCase().replaceAll("[^a-z0-9_]", "");
        if (base.length() < 3) base = "player";
        if (base.length() > 40) base = base.substring(0, 40);

        String candidate = base;
        int suffix = 0;
        while (userRepository.existsByUsername(candidate)) {
            suffix++;
            candidate = base + suffix;
        }
        return candidate;
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
