package com.pitchpredict.config;

import com.pitchpredict.entity.TeamRanking;
import com.pitchpredict.repository.TeamRankingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds FIFA world rankings (by TLA) once, if the table is empty.
 * Rankings barely move during a tournament, so a static seed is fine; an admin
 * can adjust rows later. Teams not present here simply fall back to form-only
 * in the AI suggestion.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class TeamRankingSeeder implements CommandLineRunner {

    private final TeamRankingRepository repo;

    @Override
    public void run(String... args) {
        if (repo.count() > 0) return;

        List<TeamRanking> seed = List.of(
                r("ARG", 1, 1886), r("ESP", 2, 1875), r("FRA", 3, 1870), r("ENG", 4, 1820),
                r("BRA", 5, 1776), r("POR", 6, 1772), r("NED", 7, 1754), r("BEL", 8, 1740),
                r("ITA", 9, 1718), r("GER", 10, 1716), r("CRO", 11, 1698), r("MAR", 12, 1694),
                r("COL", 13, 1690), r("MEX", 14, 1682), r("USA", 15, 1670), r("URU", 16, 1660),
                r("SUI", 17, 1648), r("JPN", 18, 1644), r("SEN", 19, 1630), r("IRN", 20, 1618),
                r("DEN", 21, 1610), r("KOR", 22, 1602), r("AUS", 23, 1500), r("ECU", 24, 1570),
                r("AUT", 25, 1560), r("UKR", 26, 1548), r("TUR", 27, 1540), r("CAN", 28, 1530),
                r("SWE", 29, 1520), r("WAL", 30, 1512), r("SRB", 31, 1508), r("POL", 32, 1502),
                r("EGY", 33, 1490), r("NGA", 34, 1484), r("CIV", 35, 1478), r("PAR", 36, 1470),
                r("PER", 37, 1460), r("CHI", 38, 1452), r("TUN", 39, 1444), r("ALG", 40, 1438),
                r("CZE", 41, 1430), r("NOR", 42, 1424), r("GRE", 43, 1418), r("SCO", 44, 1410),
                r("CMR", 45, 1404), r("GHA", 46, 1398), r("RSA", 47, 1392), r("CRC", 48, 1386),
                r("PAN", 49, 1380), r("VEN", 50, 1374), r("JAM", 51, 1360), r("HON", 52, 1350),
                r("QAT", 53, 1400), r("SAU", 54, 1420), r("NZL", 55, 1300), r("BIH", 56, 1440),
                r("HUN", 57, 1490), r("ROU", 58, 1470), r("COD", 59, 1360), r("CPV", 60, 1350)
        );
        repo.saveAll(seed);
        log.info("[Seed] Inserted {} FIFA team rankings", seed.size());
    }

    private static TeamRanking r(String tla, int rank, int points) {
        return TeamRanking.builder().tla(tla).fifaRank(rank).fifaPoints(points).build();
    }
}
