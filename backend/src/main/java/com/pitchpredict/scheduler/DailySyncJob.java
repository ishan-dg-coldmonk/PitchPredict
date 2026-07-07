package com.pitchpredict.scheduler;

import com.pitchpredict.entity.Event;
import com.pitchpredict.enums.EventStatus;
import com.pitchpredict.repository.EventRepository;
import com.pitchpredict.service.FootballDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * DailySyncJob
 *
 * Runs once a day at 1:00 PM IST — a quiet window with no matches expected.
 *
 * For every ACTIVE event that has an API competition ID, it:
 *   1. Re-syncs the matches table  — a failsafe in case the 60s live-score
 *      scheduler missed an update (crash, downtime, API blip).
 *   2. Refreshes the standings table.
 *
 * That's ~2 football API calls per active event per day. The UI reads matches
 * and standings straight from our DB, so it never depends on the API being up.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DailySyncJob {

    private final EventRepository eventRepository;
    private final FootballDataService footballDataService;

    @Scheduled(cron = "0 0 13 * * *", zone = "Asia/Kolkata")
    public void run() {
        List<Event> events = eventRepository.findAll().stream()
                .filter(e -> e.getStatus() == EventStatus.ACTIVE)
                .filter(e -> e.getApiCompId() != null && !e.getApiCompId().isBlank())
                .toList();

        log.info("[DailySync] Starting — {} active event(s) to sync", events.size());

        for (Event event : events) {
            Long id = event.getId();

            try {
                int matches = footballDataService.syncMatches(id);
                log.info("[DailySync] event {} — matches synced: {}", id, matches);
            } catch (Exception e) {
                log.warn("[DailySync] event {} — matches sync FAILED: {}", id, e.getMessage());
            }

            try {
                int rows = footballDataService.syncStandings(id);
                log.info("[DailySync] event {} — standings rows: {}", id, rows);
            } catch (Exception e) {
                log.warn("[DailySync] event {} — standings sync FAILED: {}", id, e.getMessage());
            }

            try {
                int rows = footballDataService.syncScorers(id);
                log.info("[DailySync] event {} — scorer rows: {}", id, rows);
            } catch (Exception e) {
                log.warn("[DailySync] event {} — scorers sync FAILED: {}", id, e.getMessage());
            }
        }

        log.info("[DailySync] Done");
    }
}
