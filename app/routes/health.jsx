/**
 * Health Check Endpoint
 * Provides system health status for monitoring and load balancers
 */

import { json } from "@remix-run/node";
import prisma from "../db.server";
import { getEnvConfig } from "../services/environment.server.js";
import logger from "../services/logger.server.js";

export async function loader() {
  const startTime = Date.now();
  
  try {
    // Get environment configuration
    const config = getEnvConfig();
    
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check external service connectivity (optional)
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      service: "harmony-assistant",
      version: process.env.npm_package_version || "unknown",
      uptime: process.uptime(),
      database: "connected",
      responseTime: Date.now() - startTime,
      checks: {
        database: true,
        environment: true
      }
    };
    
    // Log health check (debug level to avoid spam)
    logger.debug("Health check passed", { 
      responseTime: healthData.responseTime,
      environment: config.nodeEnv 
    });
    
    return json(healthData, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json"
      }
    });
    
  } catch (error) {
    logger.error("Health check failed", { 
      error: error.message,
      responseTime: Date.now() - startTime 
    }, error);
    
    const errorData = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime,
      checks: {
        database: false,
        environment: true
      }
    };
    
    return json(errorData, { 
      status: 503,
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json"
      }
    });
  }
}