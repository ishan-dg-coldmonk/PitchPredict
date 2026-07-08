package com.pitchpredict.enums;

/** How an account was created / can authenticate. */
public enum AuthProvider {
    LOCAL,   // username + password
    GOOGLE   // Google Sign-In (no local password)
}
