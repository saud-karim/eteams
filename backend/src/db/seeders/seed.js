require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '..', '.env') });
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../connection');

const seedUsers = [
  { name: 'Jasmine Ali',      email: 'jasmine@edara.com.eg',  role: 'superadmin', dept: 'Digital Transformation', title: 'DT Director',        initials: 'JA', color: 'emerald' },
  { name: 'Mohamed Beltagy',  email: 'beltagy@edara.com.eg',  role: 'user',       dept: 'Executive',              title: 'Chief Executive Officer', initials: 'MB', color: 'amber' },
  { name: 'Karim Sobhy',      email: 'karim@edara.com.eg',    role: 'user',       dept: 'Operations',             title: 'FM Operations Manager',   initials: 'KS', color: 'blue' },
  { name: 'Mariam Adel',      email: 'mariam@edara.com.eg',   role: 'user',       dept: 'HR',                     title: 'HR Manager',              initials: 'MA', color: 'coral' },
  { name: 'Wessam Youssef',   email: 'wessam@edara.com.eg',   role: 'user',       dept: 'Procurement',            title: 'Procurement Lead',        initials: 'WY', color: 'coral' },
  { name: 'Nourhan Ahmed',    email: 'nourhan@edara.com.eg',  role: 'user',       dept: 'Community Management',   title: 'Community Manager',       initials: 'NA', color: 'emerald' },
  { name: 'Ahmed Fathy',      email: 'ahmed@edara.com.eg',    role: 'user',       dept: 'Warehouse',              title: 'Warehouse Supervisor',    initials: 'AF', color: 'blue' },
  { name: 'Omar Khaled',      email: 'omar@edara.com.eg',     role: 'user',       dept: 'IT',                     title: 'IT Support Lead',         initials: 'OK', color: 'emerald' },
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
  { channel: 'ceo-announcements', author: 'beltagy@edara.com.eg', body: 'Team,\n\nI am formally introducing our new internal communication channel — **ETeams**. From today, this replaces internal emails for day-to-day coordination.\n\nFaster. Cleaner. More transparent. Use it well. 🚀', pinned: 1 },
  { channel: 'ceo-announcements', author: 'beltagy@edara.com.eg', body: 'Congratulations to @jasmine and the DT team for hitting Phase 1 on the unified portal. Recognition at Sunday townhall.' },
  { channel: 'announcements',     author: 'mariam@edara.com.eg',  body: '📅 Ramadan working hours start next Monday. Full policy will follow.' },
  { channel: 'ehub',              author: 'nourhan@edara.com.eg', body: '🎂 Happy birthday @karim! Cake at 3 PM in the cafeteria — everyone welcome!' },
  { channel: 'ehub',              author: 'jasmine@edara.com.eg', body: '@here Welcome to our newest joiners this week — say hi! 🌟' },
  { channel: 'general',           author: 'jasmine@edara.com.eg', body: 'Good morning team ☀️ Let\'s make it a great week!' },
  { channel: 'procurement',       author: 'wessam@edara.com.eg',  body: '@jasmine RFQ-2026-142 for HVAC filters — 3 vendors responded. Comparison sheet incoming.' },
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
    userIds[u.email] = id;
    await db.query(
      `INSERT INTO users (id, email, password_hash, name, avatar_initials, avatar_color, role, department, job_title, presence)
       VALUES (:id, :email, :ph, :name, :init, :color, :role, :dept, :title, 'offline')`,
      { id, email: u.email, ph: password_hash, name: u.name, init: u.initials, color: u.color, role: u.role, dept: u.dept, title: u.title }
    );
  }

  console.log('→ seeding channels + memberships...');
  const jasmineId = userIds['jasmine@edara.com.eg'];
  const channelIds = {};
  for (const c of seedChannels) {
    const id = uuidv4();
    channelIds[c.slug] = id;
    await db.query(
      `INSERT INTO channels (id, slug, name, description, type, is_mandatory, is_readonly, created_by)
       VALUES (:id, :slug, :name, :desc, :type, :mand, :ro, :by)`,
      { id, slug: c.slug, name: c.name, desc: c.description, type: c.type, mand: c.is_mandatory, ro: c.is_readonly, by: jasmineId }
    );
    // Auto-enroll everyone in mandatory channels; else only Jasmine + relevant staff
    for (const u of seedUsers) {
      const uid = userIds[u.email];
      const shouldJoin = c.is_mandatory || u.email === 'jasmine@edara.com.eg' ||
        (c.slug === 'procurement' && ['wessam@edara.com.eg', 'karim@edara.com.eg', 'jasmine@edara.com.eg'].includes(u.email)) ||
        (c.slug === 'warehouse' && ['ahmed@edara.com.eg', 'karim@edara.com.eg', 'jasmine@edara.com.eg'].includes(u.email)) ||
        (c.slug === 'digital-transformation' && ['jasmine@edara.com.eg', 'omar@edara.com.eg'].includes(u.email)) ||
        (c.slug === 'hr-updates' && ['mariam@edara.com.eg', 'jasmine@edara.com.eg'].includes(u.email)) ||
        c.slug === 'general';
      if (!shouldJoin) continue;
      const isManager = (u.email === 'jasmine@edara.com.eg') || (c.slug === 'ehub' && u.email === 'nourhan@edara.com.eg') ||
                       (c.slug === 'hr-updates' && u.email === 'mariam@edara.com.eg');
      await db.query(
        `INSERT INTO memberships (id, channel_id, user_id, is_manager, can_post, can_add_members, can_remove_members, can_pin_messages, can_edit_topic, can_delete_messages)
         VALUES (:id, :cid, :uid, :mgr, :post, :mgr, :mgr, :mgr, :mgr, :mgr)`,
        { id: uuidv4(), cid: id, uid, mgr: isManager ? 1 : 0, post: (c.is_readonly && !isManager && u.email !== 'beltagy@edara.com.eg') ? 0 : 1 }
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
  seedUsers.forEach(u => console.log(`  ${u.email} / Password123! (${u.role})`));
  process.exit(0);
}

seed().catch(err => {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
});
