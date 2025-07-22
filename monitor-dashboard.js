#!/usr/bin/env node
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class MISMOMonitorDashboard {
  constructor() {
    this.stats = {
      uptime: 0,
      totalRequests: 0,
      requestTypes: {},
      recentQueries: [],
      errorCount: 0,
      serverRestarts: 0
    };
    this.startTime = Date.now();
  }

  async getContainerStats() {
    try {
      const { stdout } = await execAsync('docker stats --no-stream --format "{{json .}}" mismo-expert-mcp');
      return JSON.parse(stdout);
    } catch (error) {
      return null;
    }
  }

  async getContainerInfo() {
    try {
      const { stdout } = await execAsync('docker inspect mismo-expert-mcp');
      return JSON.parse(stdout)[0];
    } catch (error) {
      return null;
    }
  }

  async checkHealth() {
    // Send a test query to check if server is responsive
    return new Promise((resolve) => {
      const process = spawn('docker', ['exec', '-i', 'mismo-expert-mcp', 'node', 'src/server.js'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const timeout = setTimeout(() => {
        process.kill();
        resolve(false);
      }, 5000);

      process.stdout.once('data', () => {
        clearTimeout(timeout);
        process.kill();
        resolve(true);
      });

      // Send initialize request
      const request = {
        jsonrpc: '2.0',
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {} },
        id: 1
      };
      process.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  async displayDashboard() {
    console.clear();
    console.log('🎯 MISMO Expert MCP - Live Monitor Dashboard');
    console.log('═'.repeat(60));
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');

    // Container Status
    const containerInfo = await this.getContainerInfo();
    if (containerInfo) {
      const status = containerInfo.State;
      console.log('📦 Container Status:');
      console.log(`   Status: ${status.Running ? '🟢 Running' : '🔴 Stopped'}`);
      console.log(`   Started: ${new Date(status.StartedAt).toLocaleString()}`);
      console.log(`   Restarts: ${containerInfo.RestartCount}`);
      console.log('');
    }

    // Resource Usage
    const stats = await this.getContainerStats();
    if (stats) {
      console.log('💻 Resource Usage:');
      console.log(`   CPU: ${stats.CPUPerc}`);
      console.log(`   Memory: ${stats.MemUsage} (${stats.MemPerc})`);
      console.log(`   Network: ↓ ${stats.NetIO.split(' / ')[0]} / ↑ ${stats.NetIO.split(' / ')[1]}`);
      console.log('');
    }

    // Health Check
    const isHealthy = await this.checkHealth();
    console.log('🏥 Health Status:');
    console.log(`   API Response: ${isHealthy ? '✅ Healthy' : '❌ Not Responding'}`);
    console.log(`   Uptime: ${this.formatUptime(Date.now() - this.startTime)}`);
    console.log('');

    // Recent Activity (from logs)
    try {
      const { stdout } = await execAsync('docker logs --tail 20 mismo-expert-mcp 2>&1 | grep -E "Request:|Error:" | tail -5');
      const logs = stdout.split('\n').filter(line => line.trim());
      
      if (logs.length > 0) {
        console.log('📊 Recent Activity:');
        logs.forEach(log => {
          if (log.includes('Request:')) {
            const method = log.split('Request:')[1].trim();
            console.log(`   → ${method}`);
          } else if (log.includes('Error:')) {
            console.log(`   ❌ ${log}`);
          }
        });
        console.log('');
      }
    } catch (error) {
      // Ignore if no logs
    }

    // Performance Metrics
    console.log('⚡ Performance Metrics:');
    console.log(`   Total Monitoring Time: ${this.formatUptime(Date.now() - this.startTime)}`);
    console.log(`   Container Restarts: ${containerInfo?.RestartCount || 0}`);
    console.log('');

    console.log('═'.repeat(60));
    console.log('📝 Press Ctrl+C to exit | Refreshing every 5 seconds...');
  }

  async startMonitoring() {
    // Initial display
    await this.displayDashboard();

    // Set up refresh interval
    setInterval(async () => {
      await this.displayDashboard();
    }, 5000);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n👋 Monitoring stopped');
      process.exit(0);
    });
  }
}

// Start the monitoring dashboard
const dashboard = new MISMOMonitorDashboard();
dashboard.startMonitoring();