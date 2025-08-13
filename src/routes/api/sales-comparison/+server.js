import { query } from '$lib/database.js';
import { jsonResponse, internalServerErrorResponse } from '$lib/response.js';
import { DEFAULT_TENANT_ID, QUERIES } from '$lib/constants.js';

/**
 * Sales Comparison API - Provides period-over-period sales analysis
 * Returns revenue data for: Last Week, Week-to-date, Week-to-date Last Year, This week Last year
 */

export async function GET() {
  try {
    // Calculate date ranges for sales comparison
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysFromMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Adjust for Monday start
    
    // Current week start (Monday)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - daysFromMonday);
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Last week date ranges
    const lastWeekEnd = new Date(currentWeekStart);
    lastWeekEnd.setDate(currentWeekStart.getDate() - 1);
    lastWeekEnd.setHours(23, 59, 59, 999);
    
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
    lastWeekStart.setHours(0, 0, 0, 0);
    
    // Same periods last year
    const currentWeekStartLastYear = new Date(currentWeekStart);
    currentWeekStartLastYear.setFullYear(currentWeekStart.getFullYear() - 1);
    
    const currentWeekEndLastYear = new Date(now);
    currentWeekEndLastYear.setFullYear(now.getFullYear() - 1);
    currentWeekEndLastYear.setHours(23, 59, 59, 999);
    
    const lastWeekStartLastYear = new Date(lastWeekStart);
    lastWeekStartLastYear.setFullYear(lastWeekStart.getFullYear() - 1);
    
    const lastWeekEndLastYear = new Date(lastWeekEnd);
    lastWeekEndLastYear.setFullYear(lastWeekEnd.getFullYear() - 1);
    
    // Use consistent query from constants
    const salesQuery = QUERIES.SALES_BY_DATE_RANGE;
    
    // Execute all queries in parallel for better performance
    const [lastWeekResult, weekToDateResult, weekToDateLastYearResult, lastWeekLastYearResult] = await Promise.all([
      query(salesQuery, [DEFAULT_TENANT_ID, lastWeekStart, lastWeekEnd]),
      query(salesQuery, [DEFAULT_TENANT_ID, currentWeekStart, now]),
      query(salesQuery, [DEFAULT_TENANT_ID, currentWeekStartLastYear, currentWeekEndLastYear]),
      query(salesQuery, [DEFAULT_TENANT_ID, lastWeekStartLastYear, lastWeekEndLastYear])
    ]);
    
    // Extract revenue values
    const lastWeekRevenue = parseFloat(lastWeekResult.rows[0]?.revenue || 0);
    const weekToDateRevenue = parseFloat(weekToDateResult.rows[0]?.revenue || 0);
    const weekToDateLastYearRevenue = parseFloat(weekToDateLastYearResult.rows[0]?.revenue || 0);
    const lastWeekLastYearRevenue = parseFloat(lastWeekLastYearResult.rows[0]?.revenue || 0);
    
    // Calculate changes (both absolute and percentage)
    function calculateChanges(current, previous) {
      const absoluteChange = current - previous;
      const percentageChange = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
      
      return {
        absolute: absoluteChange,
        percentage: percentageChange
      };
    }
    
    // Build response data with both absolute and percentage changes
    const lastWeekChanges = calculateChanges(lastWeekRevenue, lastWeekLastYearRevenue);
    const weekToDateChanges = calculateChanges(weekToDateRevenue, weekToDateLastYearRevenue);
    
    const salesComparison = [
      {
        period: 'Last Week',
        revenue: lastWeekRevenue,
        change: lastWeekChanges.percentage, // Keep for backward compatibility
        changeAbsolute: lastWeekChanges.absolute,
        changePercentage: lastWeekChanges.percentage
      },
      {
        period: 'Week-to-date',
        revenue: weekToDateRevenue,
        change: weekToDateChanges.percentage, // Keep for backward compatibility
        changeAbsolute: weekToDateChanges.absolute,
        changePercentage: weekToDateChanges.percentage
      },
      {
        period: 'Week-to-date Last Year',
        revenue: weekToDateLastYearRevenue,
        change: 0, // No comparison point for last year's data
        changeAbsolute: 0,
        changePercentage: 0
      },
      {
        period: 'This week Last year',
        revenue: lastWeekLastYearRevenue,
        change: 0, // No comparison point for last year's data
        changeAbsolute: 0,
        changePercentage: 0
      }
    ];
    
    console.log('Sales comparison data generated:', {
      dateRanges: {
        lastWeek: { start: lastWeekStart, end: lastWeekEnd },
        weekToDate: { start: currentWeekStart, end: now },
        weekToDateLastYear: { start: currentWeekStartLastYear, end: currentWeekEndLastYear },
        lastWeekLastYear: { start: lastWeekStartLastYear, end: lastWeekEndLastYear }
      },
      revenues: {
        lastWeek: lastWeekRevenue,
        weekToDate: weekToDateRevenue,
        weekToDateLastYear: weekToDateLastYearRevenue,
        lastWeekLastYear: lastWeekLastYearRevenue
      }
    });
    
    return jsonResponse(salesComparison);
    
  } catch (error) {
    console.error('Sales comparison endpoint error:', error);
    
    // Return fallback data on error (matches DashboardService default)
    return jsonResponse([
      { period: 'Last Week', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
      { period: 'Week-to-date', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
      { period: 'Week-to-date Last Year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 },
      { period: 'This week Last year', revenue: 0, change: 0, changeAbsolute: 0, changePercentage: 0 }
    ]);
  }
}