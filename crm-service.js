// crm-service.js  --  CRM & Notifications Engine
// Provider-agnostic: works in simulated mode without API keys.
// Plug in Gupshup/MSG91/SMTP keys in notification_settings to enable live sending.

const nodemailer = require('nodemailer');

// ─── Internal DB pool reference (set by server.js) ─────────────────────────
let pool;
function setPool(p) { pool = p; }

// ─── Get notification settings from DB ─────────────────────────────────────
async function getSettings() {
  const [rows] = await pool.query('SELECT * FROM notification_settings LIMIT 1');
  return rows[0] || {};
}

// ─── Log a notification to DB ───────────────────────────────────────────────
async function logNotification({ type, channel, recipient, recipientName, message, status, errorMsg, referenceId }) {
  await pool.query(
    `INSERT INTO notification_logs (type,channel,recipient,recipient_name,message,status,error_message,reference_id)
     VALUES (?,?,?,?,?,?,?,?)`,
    [type, channel, recipient || '', recipientName || '', message || '', status || 'pending', errorMsg || null, referenceId || null]
  );
}

// ─── Send WhatsApp via Gupshup ──────────────────────────────────────────────
async function sendWhatsApp(phone, message, settings) {
  if (!settings.gupshup_api_key || !settings.gupshup_phone) {
    return { success: false, simulated: true };
  }
  try {
    const https = require('https');
    const body = new URLSearchParams({
      channel: 'whatsapp',
      source: settings.gupshup_phone,
      destination: phone,
      message: JSON.stringify({ type: 'text', text: message }),
      'src.name': settings.gupshup_app_name || 'FoodCourtERP'
    });
    return await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.gupshup.io',
        path: '/sm/api/v1/msg',
        method: 'POST',
        headers: { apikey: settings.gupshup_api_key, 'Content-Type': 'application/x-www-form-urlencoded' }
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ success: res.statusCode === 202, raw: data }));
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.write(body.toString());
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Send SMS via MSG91 ─────────────────────────────────────────────────────
async function sendSMS(phone, message, settings) {
  if (!settings.msg91_auth_key) {
    return { success: false, simulated: true };
  }
  try {
    const https = require('https');
    const payload = JSON.stringify({
      template_id: '',
      short_url: '0',
      realTimeResponse: '1',
      recipients: [{ mobiles: '91' + phone.replace(/\D/g, '').slice(-10), message }]
    });
    return await new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.msg91.com',
        path: `/api/v5/flow/?authkey=${settings.msg91_auth_key}&sender=${settings.msg91_sender_id || 'ERPALR'}&route=4&country=91`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length }
      }, (res) => {
        let data = '';
        res.on('data', d => data += d);
        res.on('end', () => resolve({ success: res.statusCode === 200, raw: data }));
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.write(payload);
      req.end();
    });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Send Email via SMTP ────────────────────────────────────────────────────
async function sendEmail(to, subject, html, settings) {
  if (!settings.smtp_host || !settings.smtp_user) {
    return { success: false, simulated: true };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_port === 465,
      auth: { user: settings.smtp_user, pass: settings.smtp_pass }
    });
    await transporter.sendMail({
      from: `"${settings.smtp_from_name || 'Food Court ERP'}" <${settings.smtp_user}>`,
      to, subject, html
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Smart send: try real provider, fall back to simulated ─────────────────
async function smartSend({ type, channel, recipient, recipientName, message, referenceId }) {
  const settings = await getSettings();
  let result = { success: false, simulated: true };
  let actualChannel = channel;

  if (channel === 'whatsapp') {
    result = await sendWhatsApp(recipient, message, settings);
    if (result.simulated) actualChannel = 'simulated';
  } else if (channel === 'sms') {
    result = await sendSMS(recipient, message, settings);
    if (result.simulated) actualChannel = 'simulated';
  } else if (channel === 'email') {
    // email recipient is the "to" address; message is plain text, we wrap in HTML
    result = await sendEmail(recipient, type.replace(/_/g, ' ').toUpperCase(), `<p>${message.replace(/\n/g,'<br>')}</p>`, settings);
    if (result.simulated) actualChannel = 'simulated';
  }

  const status = result.simulated ? 'simulated' : (result.success ? 'sent' : 'failed');
  await logNotification({ type, channel: actualChannel, recipient, recipientName, message, status, errorMsg: result.error, referenceId });
  return { status, simulated: !!result.simulated };
}

// ─── LOW STOCK ALERT ─────────────────────────────────────────────────────────
async function triggerLowStockAlert(material) {
  const settings = await getSettings();
  if (!settings.low_stock_alert_enabled) return;

  // Throttle: don't re-alert if already alerted within throttle window
  if (material.last_alert_sent) {
    const hours = (Date.now() - new Date(material.last_alert_sent).getTime()) / 3600000;
    if (hours < (settings.low_stock_throttle_hours || 4)) return;
  }

  const msg = `⚠️ LOW STOCK ALERT\n${material.name} is running low!\nCurrent: ${material.stock_level} ${material.unit}\nMinimum: ${material.min_stock} ${material.unit}\nAction: Please reorder immediately.`;

  const tasks = [];
  if (settings.owner_whatsapp) {
    tasks.push(smartSend({ type: 'low_stock', channel: 'whatsapp', recipient: settings.owner_whatsapp, recipientName: 'Owner', message: msg, referenceId: String(material.id) }));
  }
  if (settings.owner_email) {
    tasks.push(smartSend({ type: 'low_stock', channel: 'email', recipient: settings.owner_email, recipientName: 'Owner', message: msg, referenceId: String(material.id) }));
  }
  if (!settings.owner_whatsapp && !settings.owner_email) {
    tasks.push(smartSend({ type: 'low_stock', channel: 'simulated', recipient: 'owner', recipientName: 'Owner', message: msg, referenceId: String(material.id) }));
  }

  await Promise.all(tasks);
  // Update last_alert_sent
  await pool.query('UPDATE raw_materials SET last_alert_sent=NOW() WHERE id=?', [material.id]);
  console.log(`[CRM] Low stock alert sent for: ${material.name}`);
}

// ─── DAILY SUMMARY ───────────────────────────────────────────────────────────
async function sendDailySummary() {
  try {
    const today = new Date().toLocaleDateString('en-CA');
    const [salesRows] = await pool.query(
      `SELECT COUNT(*) as orders, COALESCE(SUM(total_amount),0) as revenue,
       COALESCE(SUM(CASE WHEN payment_mode='Cash' THEN total_amount ELSE 0 END),0) as cash_total
       FROM orders WHERE DATE(order_date)=? AND status NOT IN ('cancelled')`, [today]
    );
    const [topItems] = await pool.query(
      `SELECT oi.item_name, SUM(oi.quantity) as qty FROM order_items oi
       JOIN orders o ON oi.order_id=o.id WHERE DATE(o.order_date)=? AND o.status NOT IN ('cancelled')
       GROUP BY oi.item_name ORDER BY qty DESC LIMIT 3`, [today]
    );
    const [lowStockRows] = await pool.query(
      `SELECT name FROM raw_materials WHERE stock_level <= min_stock`
    );

    const sales = salesRows[0];
    const topList = topItems.map((i,idx) => `  ${idx+1}. ${i.item_name} (${i.qty} sold)`).join('\n') || '  No data';
    const lowList = lowStockRows.length ? lowStockRows.map(r=>'  ⚠️ '+r.name).join('\n') : '  ✅ All stocked';

    const msg = `📊 DAILY SUMMARY - ${today}\n\n` +
      `📦 Total Orders: ${sales.orders}\n` +
      `💰 Total Revenue: ₹${parseFloat(sales.revenue).toFixed(2)}\n` +
      `💵 Cash Collected: ₹${parseFloat(sales.cash_total).toFixed(2)}\n\n` +
      `🏆 Top 3 Items:\n${topList}\n\n` +
      `📉 Low Stock Items:\n${lowList}\n\n` +
      `Have a great night! 🌙`;

    const settings = await getSettings();
    const tasks = [];
    if (settings.owner_whatsapp) tasks.push(smartSend({ type: 'daily_summary', channel: 'whatsapp', recipient: settings.owner_whatsapp, recipientName: 'Owner', message: msg, referenceId: today }));
    if (settings.owner_email) tasks.push(smartSend({ type: 'daily_summary', channel: 'email', recipient: settings.owner_email, recipientName: 'Owner', message: msg, referenceId: today }));
    if (!settings.owner_whatsapp && !settings.owner_email) tasks.push(smartSend({ type: 'daily_summary', channel: 'simulated', recipient: 'owner', recipientName: 'Owner', message: msg, referenceId: today }));

    await Promise.all(tasks);
    console.log('[CRM] Daily summary sent for', today);
    return { success: true, message: msg };
  } catch (e) {
    console.error('[CRM] Daily summary error:', e.message);
    return { success: false, error: e.message };
  }
}

// ─── ORDER READY NOTIFICATION ────────────────────────────────────────────────
async function sendOrderReadyNotification(order) {
  const settings = await getSettings();
  if (!settings.order_ready_sms && !settings.order_ready_whatsapp) return;

  const msg = `✅ Your order is READY!\nToken #: ${order.token_number}\nPickup at the counter now.\nThank you for ordering! 🍽️`;

  const tasks = [];
  if (order.customer_phone) {
    if (settings.order_ready_whatsapp) {
      tasks.push(smartSend({ type: 'order_ready', channel: 'whatsapp', recipient: order.customer_phone, recipientName: order.customer_name || 'Customer', message: msg, referenceId: String(order.id) }));
    }
    if (settings.order_ready_sms) {
      tasks.push(smartSend({ type: 'order_ready', channel: 'sms', recipient: order.customer_phone, recipientName: order.customer_name || 'Customer', message: msg, referenceId: String(order.id) }));
    }
  } else {
    tasks.push(smartSend({ type: 'order_ready', channel: 'simulated', recipient: 'customer', recipientName: order.customer_name || 'Customer', message: msg, referenceId: String(order.id) }));
  }
  await Promise.all(tasks);
  console.log(`[CRM] Order ready notification sent for token #${order.token_number}`);
}

// ─── FEEDBACK ALERT (negative) ───────────────────────────────────────────────
async function sendNegativeFeedbackAlert(feedback) {
  const settings = await getSettings();
  const threshold = settings.negative_feedback_threshold || 2;
  const avg = Math.round(((feedback.food_rating || feedback.rating || 0) + (feedback.service_rating || feedback.rating || 0) + (feedback.speed_rating || feedback.rating || 0)) / 3);

  if (avg > threshold) return;

  const msg = `🚨 NEGATIVE FEEDBACK ALERT!\n` +
    `Customer: ${feedback.customer_name || 'Anonymous'}\n` +
    `Order: #${feedback.order_id || 'N/A'}\n` +
    `Food Rating: ${feedback.food_rating || feedback.rating}/5\n` +
    `Service Rating: ${feedback.service_rating || feedback.rating}/5\n` +
    `Speed Rating: ${feedback.speed_rating || feedback.rating}/5\n` +
    `Comment: "${feedback.comments || 'No comment'}"\n\nPlease follow up immediately!`;

  const tasks = [];
  if (settings.owner_whatsapp) tasks.push(smartSend({ type: 'feedback_alert', channel: 'whatsapp', recipient: settings.owner_whatsapp, recipientName: 'Manager', message: msg, referenceId: String(feedback.id) }));
  else tasks.push(smartSend({ type: 'feedback_alert', channel: 'simulated', recipient: 'manager', recipientName: 'Manager', message: msg, referenceId: String(feedback.id) }));

  await Promise.all(tasks);
  await pool.query('UPDATE customer_feedback SET is_negative_alerted=1 WHERE id=?', [feedback.id]);
  console.log('[CRM] Negative feedback alert sent for feedback id', feedback.id);
}

// ─── LOYALTY: AWARD POINTS ───────────────────────────────────────────────────
async function awardLoyaltyPoints(customerId, orderId, totalAmount) {
  const settings = await getSettings();
  if (!settings.loyalty_enabled || !customerId) return 0;

  const rate = parseFloat(settings.loyalty_points_per_100) || 1;
  
  // Fetch current customer state
  const [cusRows] = await pool.query('SELECT total_spent, loyalty_points FROM customers WHERE id=?', [customerId]);
  if (!cusRows.length) return 0;
  
  const oldSpent = parseFloat(cusRows[0].total_spent) || 0;
  const newSpent = oldSpent + totalAmount;
  
  // Calculate total lifetime points they SHOULD have earned based on total_spent
  const newLifetimePoints = Math.floor((newSpent / 100) * rate);
  
  // Fetch total points ever redeemed by this customer
  const [redRows] = await pool.query('SELECT ABS(SUM(points)) as redeemed FROM loyalty_transactions WHERE type="redeem" AND customer_id=?', [customerId]);
  const totalRedeemed = parseFloat(redRows[0].redeemed) || 0;
  
  // Their target balance should be their lifetime earned minus what they've redeemed
  const targetBalance = newLifetimePoints - totalRedeemed;
  const currentBalance = parseFloat(cusRows[0].loyalty_points) || 0;
  
  const pointsEarned = Math.max(0, targetBalance - currentBalance);

  // ALWAYS update lifetime spent & visits
  await pool.query(
    'UPDATE customers SET loyalty_points=loyalty_points+?, total_spent=?, total_visits=total_visits+1, last_visit=CURDATE() WHERE id=?', 
    [pointsEarned, newSpent, customerId]
  );

  // If no points earned, stop here so we don't spam the transaction logs
  if (pointsEarned <= 0) return 0;
  
  const newBalance = (parseFloat(cusRows[0].loyalty_points) || 0) + pointsEarned;

  await pool.query('INSERT INTO loyalty_transactions (customer_id,order_id,type,points,balance_after,note) VALUES (?,?,?,?,?,?)',
    [customerId, orderId, 'earn', pointsEarned, newBalance, `Earned on order #${orderId}`]);

  await logNotification({ type: 'loyalty_earned', channel: 'simulated', recipientName: 'Customer', message: `Earned ${pointsEarned} pts. Balance: ${newBalance} pts`, referenceId: String(orderId) });
  
  return pointsEarned;
}

// ─── LOYALTY: REDEEM POINTS ──────────────────────────────────────────────────
async function redeemLoyaltyPoints(customerId, pointsToRedeem, orderId) {
  const settings = await getSettings();
  if (!settings.loyalty_enabled) throw new Error('Loyalty program is disabled');

  const minRedeem = settings.loyalty_min_redeem || 50;
  if (pointsToRedeem < minRedeem) throw new Error(`Minimum ${minRedeem} points required to redeem`);

  const [cusRows] = await pool.query('SELECT loyalty_points FROM customers WHERE id=?', [customerId]);
  if (!cusRows.length) throw new Error('Customer not found');

  const currentBalance = cusRows[0].loyalty_points || 0;
  if (pointsToRedeem > currentBalance) throw new Error(`Insufficient points. Available: ${currentBalance}`);

  const redeemRatio = parseFloat(settings.loyalty_redeem_ratio) || 1; // 1 point = ₹1
  const discount = pointsToRedeem * redeemRatio;

  // Use atomic update
  await pool.query('UPDATE customers SET loyalty_points=loyalty_points-? WHERE id=?', [pointsToRedeem, customerId]);
  
  // Get the updated balance for the log
  const [updatedCus] = await pool.query('SELECT loyalty_points FROM customers WHERE id=?', [customerId]);
  const newBalance = updatedCus.length ? updatedCus[0].loyalty_points : currentBalance - pointsToRedeem;

  await pool.query('INSERT INTO loyalty_transactions (customer_id,order_id,type,points,balance_after,note) VALUES (?,?,?,?,?,?)',
    [customerId, orderId || null, 'redeem', -pointsToRedeem, newBalance, `Redeemed ${pointsToRedeem} pts = ₹${discount}`]);

  return { discount, newBalance, pointsRedeemed: pointsToRedeem };
}

// ─── BROADCAST CAMPAIGN ──────────────────────────────────────────────────────
async function dispatchBroadcast(campaignId) {
  const [camps] = await pool.query('SELECT * FROM broadcast_campaigns WHERE id=?', [campaignId]);
  if (!camps.length) throw new Error('Campaign not found');
  const campaign = camps[0];

  // Build recipient list
  let customerQuery = 'SELECT id, name, phone, email, loyalty_points, total_spent FROM customers WHERE 1=1';
  if (campaign.target_segment === 'high_value') customerQuery += ' AND total_spent >= 500';
  else if (campaign.target_segment === 'inactive') customerQuery += ' AND (last_visit IS NULL OR last_visit < DATE_SUB(NOW(), INTERVAL 30 DAY))';
  else if (campaign.target_segment === 'loyalty') customerQuery += ' AND loyalty_points > 0';

  const [customers] = await pool.query(customerQuery);
  await pool.query('UPDATE broadcast_campaigns SET status=?,total_recipients=? WHERE id=?', ['sending', customers.length, campaignId]);
  await pool.query('DELETE FROM broadcast_recipients WHERE campaign_id=?', [campaignId]);

  // Insert recipient rows
  if (customers.length > 0) {
    const recipRows = customers.map(c => [campaignId, c.id, c.name, c.phone, c.email, 'pending']);
    await pool.query('INSERT INTO broadcast_recipients (campaign_id,customer_id,customer_name,phone,email,status) VALUES ?', [recipRows]);
  }

  const settings = await getSettings();
  let sent = 0, failed = 0;

  for (const cust of customers) {
    const channel = campaign.channel === 'email' ? 'email' : (campaign.channel === 'sms' ? 'sms' : 'whatsapp');
    const recipient = channel === 'email' ? cust.email : cust.phone;
    if (!recipient) { failed++; await pool.query('UPDATE broadcast_recipients SET status=?,error_message=? WHERE campaign_id=? AND customer_id=?', ['skipped','No contact info', campaignId, cust.id]); continue; }

    const result = await smartSend({ type: 'broadcast', channel, recipient, recipientName: cust.name, message: campaign.message, referenceId: String(campaignId) });
    if (result.status === 'sent' || result.status === 'simulated') {
      sent++;
      await pool.query('UPDATE broadcast_recipients SET status=?,sent_at=NOW() WHERE campaign_id=? AND customer_id=?', ['sent', campaignId, cust.id]);
    } else {
      failed++;
      await pool.query('UPDATE broadcast_recipients SET status=? WHERE campaign_id=? AND customer_id=?', ['failed', campaignId, cust.id]);
    }
    // Small delay between sends to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  await pool.query('UPDATE broadcast_campaigns SET status=?,sent_at=NOW(),total_sent=?,total_failed=? WHERE id=?', ['sent', sent, failed, campaignId]);
  console.log(`[CRM] Broadcast #${campaignId} complete: ${sent} sent, ${failed} failed`);
  return { sent, failed, total: customers.length };
}

// ─── DAILY SUMMARY SCHEDULER ─────────────────────────────────────────────────
function startDailySummaryScheduler() {
  const cron = require('node-cron');
  let lastScheduledTime = null;
  let cronTask = null;

  async function scheduleFromDB() {
    try {
      const settings = await getSettings();
      const time = settings.daily_summary_time || '22:00';
      if (time === lastScheduledTime) return;

      if (cronTask) { cronTask.stop(); cronTask = null; }
      const [hour, minute] = time.split(':').map(Number);
      const expr = `${minute} ${hour} * * *`;
      cronTask = cron.schedule(expr, async () => {
        const s = await getSettings();
        if (s.daily_summary_enabled) {
          console.log('[CRM] Running scheduled daily summary...');
          await sendDailySummary();
        }
      }, { timezone: 'Asia/Kolkata' });
      lastScheduledTime = time;
      console.log(`[CRM] Daily summary scheduled at ${time} IST`);
    } catch (e) {
      console.error('[CRM] Scheduler error:', e.message);
    }
  }

  scheduleFromDB();
  // Re-check settings every 5 minutes in case user changes the time
  setInterval(scheduleFromDB, 5 * 60 * 1000);
}

module.exports = {
  setPool, getSettings, logNotification, smartSend, sendEmail,
  triggerLowStockAlert, sendDailySummary, sendOrderReadyNotification,
  sendNegativeFeedbackAlert, awardLoyaltyPoints, redeemLoyaltyPoints,
  dispatchBroadcast, startDailySummaryScheduler
};
