package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RoomDTO {
    private Long id;
    private Long eventId;
    private String name;
    private String description;
    private String registrationCode;
    private Integer maxMembers;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long memberCount;
    private Boolean userJoined;
}
