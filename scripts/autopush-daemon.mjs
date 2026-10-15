/**
 * Background Auto-Push Daemon
 * Periodically checks for new news stories and pushes to Telegram every 1 minute (60,000ms)
 */

const INTERVAL_MS = 60 * 1000; // 1 minute
const ENDPOINT = 'http://localhost:3000/api/admin/telegram/autopush';

console.log('----------------------------------------------------');
console.log('🤖 Nexus News Auto-Push Daemon Initialized');
console.log(`⏱️  Polling Interval: Every 1 Minute (${INTERVAL_MS / 1000}s)`);
console.log(`📡 Target API: ${ENDPOINT}`);
console.log('----------------------------------------------------');

async function triggerAutoPush() {
  const timestamp = new Date().toISOString();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    if (data.pushed && data.article) {
      console.log(`[${timestamp}] 🚀 PUSHED: "${data.article.title}" [${data.article.sourceName}] -> Telegram Msg #${data.messageId}`);
    } else {
      console.log(`[${timestamp}] 💤 IDLE: ${data.message || 'No new stories to broadcast'}`);
    }
  } catch (err) {
    console.warn(`[${timestamp}] ⚠️ Auto-push tick warning:`, err.message);
  }
}

// Initial tick
triggerAutoPush();

// Recurring 1-minute interval loop
setInterval(triggerAutoPush, INTERVAL_MS);
