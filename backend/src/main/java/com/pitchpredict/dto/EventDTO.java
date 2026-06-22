package com.pitchpredict.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EventDTO {
    private Long id;
    private String title;
    private String description;
    private String sport;
    private String bannerUrl;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private String apiCompId;
    private String predictableStages;
    private Long createdBy;
    private LocalDateTime createdAt;
    private Long roomCount;
    private Long matchCount;
}
