package com.pitchpredict.service;

import com.pitchpredict.dto.EventDTO;
import com.pitchpredict.entity.Event;
import com.pitchpredict.enums.EventStatus;
import com.pitchpredict.exception.ApiException;
import com.pitchpredict.repository.EventRepository;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepository;
    private final RoomRepository roomRepository;
    private final MatchRepository matchRepository;

    public List<EventDTO> getAllEvents() {
        List<EventDTO> events = eventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDTO)
                .toList();
        log.info("[Event] getAllEvents ✓ - {} event(s)", events.size());
        return events;
    }

    public EventDTO getEvent(Long id) {
        log.info("[Event] getEvent - id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        EventDTO dto = toDTO(event);
        log.info("[Event] getEvent ✓ - id={} title={} status={}", id, dto.getTitle(), dto.getStatus());
        return dto;
    }

    public EventDTO createEvent(Event event) {
        log.info("[Event] createEvent - title={}", event.getTitle());
        event = eventRepository.save(event);
        EventDTO dto = toDTO(event);
        log.info("[Event] createEvent ✓ - eventId={}", dto.getId());
        return dto;
    }

    public EventDTO updateEvent(Long id, Event updated) {
        log.info("[Event] updateEvent - id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));

        if (updated.getTitle() != null)              event.setTitle(updated.getTitle());
        if (updated.getDescription() != null)        event.setDescription(updated.getDescription());
        if (updated.getSport() != null)              event.setSport(updated.getSport());
        if (updated.getBannerUrl() != null)          event.setBannerUrl(updated.getBannerUrl());
        if (updated.getPrize() != null)              event.setPrize(updated.getPrize());
        if (updated.getStartDate() != null)          event.setStartDate(updated.getStartDate());
        if (updated.getEndDate() != null)            event.setEndDate(updated.getEndDate());
        if (updated.getApiCompId() != null)          event.setApiCompId(updated.getApiCompId());
        if (updated.getPredictableStages() != null)  event.setPredictableStages(updated.getPredictableStages());

        event = eventRepository.save(event);
        log.info("[Event] updateEvent ✓ - id={}", id);
        return toDTO(event);
    }

    public EventDTO activateEvent(Long id) {
        log.info("[Event] activateEvent - id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        event.setStatus(EventStatus.ACTIVE);
        EventDTO dto = toDTO(eventRepository.save(event));
        log.info("[Event] activateEvent ✓ - id={} title={}", id, dto.getTitle());
        return dto;
    }

    public EventDTO finishEvent(Long id) {
        log.info("[Event] finishEvent - id={}", id);
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Event not found"));
        event.setStatus(EventStatus.COMPLETED);
        EventDTO dto = toDTO(eventRepository.save(event));
        log.info("[Event] finishEvent ✓ - id={} title={}", id, dto.getTitle());
        return dto;
    }

    private EventDTO toDTO(Event event) {
        return EventDTO.builder()
                .id(event.getId())
                .title(event.getTitle())
                .description(event.getDescription())
                .sport(event.getSport())
                .bannerUrl(event.getBannerUrl())
                .prize(event.getPrize())
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
