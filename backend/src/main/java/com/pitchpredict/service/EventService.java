package com.pitchpredict.service;

import com.pitchpredict.dto.EventDTO;
import com.pitchpredict.entity.Event;
import com.pitchpredict.enums.EventStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.EventRepository;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final RoomRepository roomRepository;
    private final MatchRepository matchRepository;

    public List<EventDTO> getAllEvents() {
        return eventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
    }

    public EventDTO getEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        return toDTO(event);
    }

    public EventDTO createEvent(Event event) {
        event = eventRepository.save(event);
        return toDTO(event);
    }

    public EventDTO updateEvent(Long id, Event updated) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));

        if (updated.getTitle() != null) event.setTitle(updated.getTitle());
        if (updated.getDescription() != null) event.setDescription(updated.getDescription());
        if (updated.getSport() != null) event.setSport(updated.getSport());
        if (updated.getBannerUrl() != null) event.setBannerUrl(updated.getBannerUrl());
        if (updated.getStartDate() != null) event.setStartDate(updated.getStartDate());
        if (updated.getEndDate() != null) event.setEndDate(updated.getEndDate());
        if (updated.getApiCompId() != null) event.setApiCompId(updated.getApiCompId());
        if (updated.getPredictableStages() != null) event.setPredictableStages(updated.getPredictableStages());

        event = eventRepository.save(event);
        return toDTO(event);
    }

    public EventDTO activateEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        event.setStatus(EventStatus.ACTIVE);
        return toDTO(eventRepository.save(event));
    }

    public EventDTO finishEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        event.setStatus(EventStatus.COMPLETED);
        return toDTO(eventRepository.save(event));
    }

    private EventDTO toDTO(Event event) {
        return EventDTO.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .sport(event.getSport())
                .bannerUrl(event.getBannerUrl())
                .status(event.getStatus().name())
                .startDate(event.getStartDate())
                .endDate(event.getEndDate())
                .apiCompId(event.getApiCompId())
                .predictableStages(event.getPredictableStages())
                .createdBy(event.getCreatedBy())
                .createdAt(event.getCreatedAt())
                .roomCount(roomRepository.countByEventId(event.getId()))
                .matchCount((long) matchRepository.findByEventIdOrderByMatchDateAsc(event.getId()).size())
                .build();
    }
}
