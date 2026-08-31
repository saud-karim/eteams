const Message = require('../models/Message');
const Channel = require('../models/Channel');

async function exportChannel(req, res, next) {
  try {
    const { id: channelId } = req.params;
    
    // Authorization check
    const ch = await Channel.findById(channelId);
    if (!ch) return res.status(404).json({ error: 'Channel not found' });
    
    const isSuperAdmin = req.user.role === 'superadmin';
    const membership = await Channel.getMembership(channelId, req.user.id);
    const isChannelManager = membership && membership.is_manager;
    
    if (!isSuperAdmin && !isChannelManager) {
      return res.status(403).json({ error: 'Only channel managers or superadmins can export the chat.' });
    }

    const canExportDeleted = true; // since they are already manager/admin

    const msgs = await Message.listAllForExport(channelId);
    
    let messageHtml = '';
    const uniqueAuthors = new Set();

    msgs.forEach(m => {
      if (m.deleted_at && !canExportDeleted) return;

      const date = new Date(m.created_at).toLocaleString();
      const author = m.author_name || 'Unknown';
      uniqueAuthors.add(author);
      
      const initial = author.charAt(0).toUpperCase();
      
      let content = m.body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      let bodyClass = 'body';
      
      if (m.deleted_at) {
        content = `[Deleted] ${content}`;
        bodyClass += ' deleted';
      }

      messageHtml += `
    <div class="message" data-timestamp="${new Date(m.created_at).getTime()}" data-author="${author.toLowerCase()}" data-content="${content.toLowerCase().replace(/"/g, '&quot;')}">
      <div class="avatar">${initial}</div>
      <div class="msg-content">
        <div class="msg-header">
          <div class="author">${author}</div>
          <div class="time">${date}</div>
        </div>
        <div class="${bodyClass}">${content}</div>
      </div>
    </div>
`;
    });

    const authorOptions = Array.from(uniqueAuthors).sort().map(a => `<option value="${a.toLowerCase()}">${a}</option>`).join('\n        ');

    let htmlOutput = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eteams Export: ${ch.name || ch.slug}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 0; line-height: 1.5; }
    .header { background-color: #1e293b; padding: 24px; text-align: center; border-bottom: 1px solid #334155; }
    .header h1 { margin: 0 0 8px 0; color: #38bdf8; font-size: 24px; }
    .header p { margin: 0; color: #94a3b8; font-size: 14px; }
    .chat-container { max-width: 800px; margin: 0 auto; padding: 24px; }
    .controls { background-color: #1e293b; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 16px; border: 1px solid #334155; align-items: center; }
    .controls .control-group { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
    .controls label { font-size: 13px; color: #cbd5e1; font-weight: 600; white-space: nowrap; }
    .controls input, .controls select { padding: 10px 14px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; flex: 1; outline: none; font-size: 14px; width: 100%; }
    .controls input:focus, .controls select:focus { border-color: #38bdf8; }
    .message { display: flex; gap: 16px; margin-bottom: 24px; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #3ba7d6; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; flex-shrink: 0; }
    .msg-content { flex: 1; }
    .msg-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .author { font-weight: 700; font-size: 15px; color: #f8fafc; }
    .time { font-size: 12px; color: #64748b; }
    .body { color: #cbd5e1; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
    .deleted { color: #ef4444; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>#${ch.name || ch.slug}</h1>
    <p>Chat Export generated on ${new Date().toLocaleString()}</p>
  </div>
  <div class="chat-container">
    <div class="controls">
      <div class="control-group">
        <label>Search:</label>
        <input type="text" id="searchInput" placeholder="Search in messages...">
      </div>
      <div class="control-group">
        <label>User:</label>
        <select id="userFilter">
          <option value="">All Users</option>
          ${authorOptions}
        </select>
      </div>
      <div class="control-group">
        <label>From:</label>
        <input type="date" id="dateFrom">
      </div>
      <div class="control-group">
        <label>To:</label>
        <input type="date" id="dateTo">
      </div>
      <div class="control-group">
        <label>Sort:</label>
        <select id="sortOrder">
          <option value="asc">Oldest First</option>
          <option value="desc">Newest First</option>
        </select>
      </div>
    </div>
    <div id="messagesList">
${messageHtml}
    </div>
  </div>

  <script>
    const searchInput = document.getElementById('searchInput');
    const userFilter = document.getElementById('userFilter');
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    const sortOrder = document.getElementById('sortOrder');
    const messagesList = document.getElementById('messagesList');
    
    // Store original DOM elements in an array for sorting
    const messages = Array.from(document.querySelectorAll('.message'));

    function filterMessages() {
      const query = searchInput.value.toLowerCase();
      const selectedUser = userFilter.value;
      const fromTime = dateFrom.value ? new Date(dateFrom.value).getTime() : null;
      // For dateTo, we want the end of that day
      let toTime = null;
      if (dateTo.value) {
        const d = new Date(dateTo.value);
        d.setHours(23, 59, 59, 999);
        toTime = d.getTime();
      }
      
      const order = sortOrder.value;

      // Filter and collect visible messages
      const visibleMsgs = [];
      messages.forEach(msg => {
        const author = msg.getAttribute('data-author') || '';
        const content = msg.getAttribute('data-content') || '';
        const timestamp = parseInt(msg.getAttribute('data-timestamp'), 10);
        
        const matchesUser = !selectedUser || author === selectedUser;
        const matchesSearch = !query || content.includes(query) || author.includes(query);
        const matchesFrom = !fromTime || timestamp >= fromTime;
        const matchesTo = !toTime || timestamp <= toTime;

        if (matchesUser && matchesSearch && matchesFrom && matchesTo) {
          msg.style.display = 'flex';
          visibleMsgs.push(msg);
        } else {
          msg.style.display = 'none';
        }
      });
      
      // Sort
      visibleMsgs.sort((a, b) => {
        const tA = parseInt(a.getAttribute('data-timestamp'), 10);
        const tB = parseInt(b.getAttribute('data-timestamp'), 10);
        return order === 'asc' ? tA - tB : tB - tA;
      });
      
      // Re-append in correct order
      messagesList.innerHTML = '';
      visibleMsgs.forEach(msg => messagesList.appendChild(msg));
    }

    searchInput.addEventListener('input', filterMessages);
    userFilter.addEventListener('change', filterMessages);
    dateFrom.addEventListener('change', filterMessages);
    dateTo.addEventListener('change', filterMessages);
    sortOrder.addEventListener('change', filterMessages);
  </script>
</body>
</html>
`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${ch.name || ch.slug}-export.html"`);
    res.send(htmlOutput);
  } catch (err) {
    next(err);
  }
}

module.exports = { exportChannel };
