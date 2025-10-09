package com.financetracker.controller;

import com.financetracker.dto.DashboardStatsResponse;
import com.financetracker.dto.ExpenseChartResponse;
import com.financetracker.entity.User;
import com.financetracker.service.DashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats(Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
            log.info("Getting dashboard stats for user: {}", user.getEmail());
            
            DashboardStatsResponse stats = dashboardService.getDashboardStats(user);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting dashboard stats: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/expenses-chart")
    public ResponseEntity<ExpenseChartResponse> getExpenseChart(
            @RequestParam(defaultValue = "6m") String range,
            Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
            log.info("Getting expense chart for user: {} with range: {}", user.getEmail(), range);
            
            ExpenseChartResponse chartData = dashboardService.getExpenseChartData(user, range);
            return ResponseEntity.ok(chartData);
        } catch (Exception e) {
            log.error("Error getting expense chart: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Dashboard API is running");
    }
}