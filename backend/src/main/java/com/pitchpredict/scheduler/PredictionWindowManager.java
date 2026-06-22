package com.pitchpredict.scheduler;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class PredictionWindowManager {

    private final MatchRepository matchRepository;

    @Scheduled(fixedRate = 60000)
    public void closePredictionWindows() {
        List<Match> openMatches = matchRepository.findByPredictionOpenTrueAndStatus(MatchStatus.SCHEDULED);
        LocalDateTime threshold = LocalDateTime.now().plusMinutes(10);

        for (Match match : openMatches) {
            if (match.getMatchDate().isBefore(threshold)) {
                match.setPredictionOpen(false);
                matchRepository.save(match);
                log.info("Closed prediction window for match {}: {} vs {}",
                        match.getId(), match.getHomeTeam(), match.getAwayTeam());
            }
        }
    }
}
