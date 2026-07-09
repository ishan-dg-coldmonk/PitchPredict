package com.pitchpredict.entity;

import com.pitchpredict.enums.AuthProvider;
import com.pitchpredict.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 50, unique = true, nullable = false)
    private String username;

    @Column(length = 100, unique = true, nullable = false)
    private String email;

    /** Null for OAuth-only accounts (e.g. Google) — they have no local password. */
    @Column
    private String password;

    /** How this account authenticates. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.LOCAL;

    /** Google's stable subject id ("sub") once linked; null for password-only accounts. */
    @Column(unique = true)
    private String providerId;

    @Column(length = 100)
    private String fullName;

    // Base64 thumbnail (or a Google avatar URL). Plain TEXT — NOT @Lob: on
    // PostgreSQL @Lob reads as a large object, which fails in auto-commit mode
    // (e.g. the per-request findByUsername in the auth filter).
    @Column(columnDefinition = "TEXT")
    private String profilePic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
