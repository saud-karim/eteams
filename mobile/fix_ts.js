const fs = require('fs');
const file = 'd:/eteams/mobile/src/app/thread/[id].tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix edit -> update
content = content.replace(/api\.messages\.edit/g, 'api.messages.update');

// Fix sendWithAttachment signature
content = content.replace(
  /messageRes = await api\.messages\.sendWithAttachment\(formData\);/g,
  `messageRes = await api.messages.sendWithAttachment(
          parentMessage.channel_id,
          body.trim(),
          id as string,
          attachment.uri,
          attachment.mimeType || 'application/octet-stream',
          attachment.name
        );`
);

fs.writeFileSync(file, content);
console.log('Fixed thread/[id].tsx TS errors');
