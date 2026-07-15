require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../connection');

const seedUsers = [
  { name: 'Admin',        username: 'admin',        role: 'superadmin', dept: 'System', title: 'Administrator', initials: 'AD', color: 'emerald' },
  { name: 'Saud Karim',   username: 'saud_karim',   role: 'user',       dept: 'IT', title: 'Developer', initials: 'SK', color: 'amber' },
  { name: 'Kamel',        username: 'kamel',        role: 'user',       dept: 'Operations', title: 'Manager', initials: 'KM', color: 'blue' },
  { name: 'Karim',        username: 'karim',        role: 'user',       dept: 'HR', title: 'HR', initials: 'KR', color: 'coral' },
  { name: 'Shehab Sayed', username: 'shehab_sayed', role: 'user',       dept: 'Procurement', title: 'Specialist', initials: 'SS', color: 'coral' },
  { name: 'Mohamed Omar', username: 'mohamed_omar', role: 'user',       dept: 'Warehouse', title: 'Supervisor', initials: 'MO', color: 'emerald' },
  { name: 'Jasmine Ali',  username: 'jasmine_ali',  role: 'user',       dept: 'Digital Transformation', title: 'DT Director', initials: 'JA', color: 'blue' },
];

const seedChannels = [
  { slug: 'ceo-announcements', name: 'ceo-announcements', description: 'Top-down from CEO office — read-only', type: 'announcement', is_mandatory: 1, is_readonly: 1 },
  { slug: 'announcements',     name: 'announcements',     description: 'Company-wide announcements',           type: 'announcement', is_mandatory: 1, is_readonly: 1 },
  { slug: 'ehub',              name: 'ehub',              description: 'Celebrations, birthdays, milestones',   type: 'public',       is_mandatory: 1, is_readonly: 0 },
  { slug: 'general',           name: 'general',           description: 'Company-wide conversation',             type: 'public',       is_mandatory: 0, is_readonly: 0 },
  { slug: 'procurement',       name: 'procurement',       description: 'RFQs, POs, supplier updates',           type: 'public',       is_mandatory: 0, is_readonly: 0 },
  { slug: 'warehouse',         name: 'warehouse',         description: 'Warehouse operations',                  type: 'public',       is_mandatory: 0, is_readonly: 0 },
  { slug: 'digital-transformation', name: 'digital-transformation', description: 'DT initiatives, AI innovation', type: 'private',   is_mandatory: 0, is_readonly: 0 },
  { slug: 'hr-updates',        name: 'hr-updates',        description: 'HR policies and benefits',              type: 'announcement', is_mandatory: 0, is_readonly: 1 },
];

const seedMessages = [
  { channel: 'ehub',              author: 'kamel', body: '🎂 Happy birthday @karim! Cake at 3 PM in the cafeteria — everyone welcome!' },
  { channel: 'ehub',              author: 'jasmine_ali', body: '@here Welcome to our newest joiners this week — say hi! 🌟' },
  { channel: 'general',           author: 'saud_karim', body: 'Good morning team ☀️ Let\'s make it a great week!' },
  { channel: 'procurement',       author: 'shehab_sayed',  body: '@admin RFQ-2026-142 for HVAC filters — 3 vendors responded. Comparison sheet incoming.' },
];

async function reset() {
  console.log('⚠ Clearing existing data...');
  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  await db.query('TRUNCATE TABLE reactions');
  await db.query('TRUNCATE TABLE attachments');
  await db.query('TRUNCATE TABLE messages');
  await db.query('TRUNCATE TABLE memberships');
  await db.query('TRUNCATE TABLE channels');
  await db.query('TRUNCATE TABLE audit_log');
  await db.query('TRUNCATE TABLE refresh_tokens');
  await db.query('TRUNCATE TABLE users');
  await db.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seed() {
  await reset();

  console.log('→ seeding users...');
  const password_hash = await bcrypt.hash('Password123!', 10);
  const userIds = {};
  for (const u of seedUsers) {
    const id = uuidv4();
    userIds[u.username] = id;
    await db.query(
      `INSERT INTO users (id, username, password_hash, name, avatar_initials, avatar_color, role, department, job_title, presence)
       VALUES (:id, :username, :ph, :name, :init, :color, :role, :dept, :title, 'offline')`,
      { id, username: u.username, ph: password_hash, name: u.name, init: u.initials, color: u.color, role: u.role, dept: u.dept, title: u.title }
    );
  }

  console.log('→ seeding channels + memberships...');
  const adminId = userIds['admin'];
  const channelIds = {};
  for (const c of seedChannels) {
    const id = uuidv4();
    channelIds[c.slug] = id;
    await db.query(
      `INSERT INTO channels (id, slug, name, description, type, is_mandatory, is_readonly, created_by)
       VALUES (:id, :slug, :name, :desc, :type, :mand, :ro, :by)`,
      { id, slug: c.slug, name: c.name, desc: c.description, type: c.type, mand: c.is_mandatory, ro: c.is_readonly, by: adminId }
    );
    // Auto-enroll everyone in mandatory channels; else only Admin + relevant staff
    for (const u of seedUsers) {
      const uid = userIds[u.username];
      const shouldJoin = c.is_mandatory || u.username === 'admin' ||
        (c.slug === 'procurement' && ['shehab_sayed', 'kamel', 'admin'].includes(u.username)) ||
        (c.slug === 'warehouse' && ['mohamed_omar', 'kamel', 'admin'].includes(u.username)) ||
        (c.slug === 'digital-transformation' && ['admin', 'jasmine_ali', 'saud_karim'].includes(u.username)) ||
        (c.slug === 'hr-updates' && ['karim', 'admin'].includes(u.username)) ||
        c.slug === 'general';
      if (!shouldJoin) continue;
      const isManager = (u.username === 'admin') || (c.slug === 'ehub' && u.username === 'kamel') ||
                       (c.slug === 'hr-updates' && u.username === 'karim');
      await db.query(
        `INSERT INTO memberships (id, channel_id, user_id, is_manager, can_post, can_add_members, can_remove_members, can_pin_messages, can_edit_topic, can_delete_messages)
         VALUES (:id, :cid, :uid, :mgr, :post, :mgr, :mgr, :mgr, :mgr, :mgr)`,
        { id: uuidv4(), cid: id, uid, mgr: isManager ? 1 : 0, post: (c.is_readonly && !isManager && u.username !== 'admin') ? 0 : 1 }
      );
    }
  }

  console.log('→ seeding messages...');
  for (const m of seedMessages) {
    await db.query(
      `INSERT INTO messages (id, channel_id, user_id, body, is_pinned) VALUES (:id, :cid, :uid, :body, :pinned)`,
      { id: uuidv4(), cid: channelIds[m.channel], uid: userIds[m.author], body: m.body, pinned: m.pinned || 0 }
    );
  }

  console.log('✓ Seed complete');
  console.log('\nLogin with any of:');
  seedUsers.forEach(u => console.log(`  ${u.username} / Password123! (${u.role})`));
  process.exit(0);
}

seed().catch(err => {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
});
