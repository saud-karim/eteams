// Parse mention tokens from message body. Returns { users: [ids], special: ['channel'|'here'|'everyone'] }
function parseMentions(body, memberLookup = {}) {
  const users = new Set();
  const special = new Set();
  const re = /@([a-zA-Z0-9._-]+|channel|here|everyone)/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const tok = m[1].toLowerCase();
    if (tok === 'channel' || tok === 'here' || tok === 'everyone') {
      special.add(tok);
    } else {
      // If memberLookup has it (username map), use it. Otherwise, assume tok is already an ID (e.g. UUID from frontend).
      users.add(memberLookup[tok] || tok);
    }
  }
  return { users: Array.from(users), special: Array.from(special) };
}

module.exports = { parseMentions };
