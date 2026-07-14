const { db } = require('../db/connection');
const { v4: uuidv4 } = require('uuid');

class RolePreset {
  static async findAll() {
    const [rows] = await db.query('SELECT * FROM role_presets ORDER BY created_at ASC');
    return rows.map(r => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions
    }));
  }

  static async findById(id) {
    const [rows] = await db.query('SELECT * FROM role_presets WHERE id = ?', [id]);
    if (!rows.length) return null;
    const r = rows[0];
    r.permissions = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions;
    return r;
  }

  static async create(data) {
    const id = uuidv4();
    const perms = data.permissions ? JSON.stringify(data.permissions) : '{}';
    await db.query(
      `INSERT INTO role_presets (id, name, description, icon, permissions, is_system)
       VALUES (:id, :name, :description, :icon, :permissions, :is_system)`,
      {
        id,
        name: data.name,
        description: data.description || '',
        icon: data.icon || 'Shield',
        permissions: perms,
        is_system: data.is_system ? 1 : 0
      }
    );
    return this.findById(id);
  }

  static async update(id, data) {
    const perms = data.permissions ? JSON.stringify(data.permissions) : '{}';
    await db.query(
      `UPDATE role_presets 
       SET name = :name, description = :description, icon = :icon, permissions = :permissions
       WHERE id = :id`,
      {
        id,
        name: data.name,
        description: data.description || '',
        icon: data.icon || 'Shield',
        permissions: perms
      }
    );
    return this.findById(id);
  }

  static async delete(id) {
    const [rows] = await db.query('SELECT is_system FROM role_presets WHERE id = ?', [id]);
    if (rows.length && rows[0].is_system) {
      throw new Error("Cannot delete a system role preset.");
    }
    await db.query('DELETE FROM role_presets WHERE id = ?', [id]);
    return true;
  }
}

module.exports = RolePreset;
