package com.pitchpredict.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Finishes a first-time Google signup: the access token, chosen username, and an optional custom avatar. */
@Data
public class GoogleCompleteRequest {
    @NotBlank
    private String accessToken;

    @NotBlank
    private String username;

    /** Optional base64 avatar chosen during signup; falls back to the Google picture if absent. */
    private String profilePic;
}
