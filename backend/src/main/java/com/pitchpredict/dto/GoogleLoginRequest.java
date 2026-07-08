package com.pitchpredict.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** The Google OAuth access token obtained by the browser's token flow. */
@Data
public class GoogleLoginRequest {
    @NotBlank
    private String accessToken;
}
