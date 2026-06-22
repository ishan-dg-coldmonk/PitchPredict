package com.pitchpredict.scheduler;

import com.pitchpredict.entity.Match;
import com.pitchpredict.enums.MatchStatus;
import com.pitchpredict.repository.MatchRepository;
import com.pitchpredict.service.FootballDataService;
import com.pitchpredict.service.PointsCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class MatchScoreUpdater {

    private final MatchRepository matchRepository;
    private final FootballDataService footballDataService;
    private final PointsCalculationService pointsCalculationService;

    @Scheduled(fixedRate = 60000)
    public void updateScores() {
        List<Match> liveMatches = matchRepository.findByStatus(MatchStatus.LIVE);
        if (liveMatches.isEmpty()) return;

        Set<Long> liveMatchIds = liveMatches.stream()
                .map(Match::getId)
                .collect(Collectors.toSet());

        footballDataService.updateLiveScores();

        for (Long matchId : liveMatchIds) {
            Match match = matchRepository.findById(matchId).orElse(null);
            if (match != null && match.getStatus() == MatchStatus.FINISHED) {
                log.info("Match {} finished, calculating points", matchId);
                pointsCalculationService.calculatePointsForMatch(match);
            }
        }
    }
}
