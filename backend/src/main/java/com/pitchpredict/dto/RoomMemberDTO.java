package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomMemberDTO {
    private Long userId;
    private String username;
    private String fullName;
    private String profilePic;
    private LocalDateTime joinedAt;
}
