package com.pitchpredict.controller;

import com.pitchpredict.dto.EventDTO;
import com.pitchpredict.dto.MatchDTO;
import com.pitchpredict.service.EventService;
import com.pitchpredict.service.MatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Slf4j
public class EventController {

    private final EventService eventService;
    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<List<EventDTO>> getAllEvents() {
        log.info("[API] GET /api/events");
        List<EventDTO> events = eventService.getAllEvents();
        log.info("[API] GET /api/events ✓ - {} event(s) returned", events.size());
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventDTO> getEvent(@PathVariable Long id) {
        log.info("[API] GET /api/events/{}", id);
        EventDTO event = eventService.getEvent(id);
        log.info("[API] GET /api/events/{} ✓ - title={}", id, event.getTitle());
        return ResponseEntity.ok(event);
    }

    @GetMapping("/{id}/matches")
    public ResponseEntity<List<MatchDTO>> getEventMatches(@PathVariable Long id) {
        log.info("[API] GET /api/events/{}/matches", id);
        List<MatchDTO> matches = matchService.getMatchesByEvent(id);
        log.info("[API] GET /api/events/{}/matches ✓ - {} match(es) returned", id, matches.size());
        return ResponseEntity.ok(matches);
    }
}
