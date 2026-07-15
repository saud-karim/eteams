const fs = require('fs');
let code = fs.readFileSync('./src/controllers/adminController.js', 'utf8');
const funcs = `
const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM departments ORDER BY name ASC');
    res.json({ departments: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = require('uuid').v4();
    await db.query('INSERT INTO departments (id, name) VALUES (?, ?)', [id, name]);
    res.json({ id, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Department exists' });
    res.status(500).json({ error: err.message });
  }
};
const updateDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const [old] = await db.query('SELECT name FROM departments WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Not found' });
    const oldName = old[0].name;
    await db.query('UPDATE departments SET name = ? WHERE id = ?', [name, req.params.id]);
    await db.query('UPDATE users SET department = ? WHERE department = ?', [name, oldName]);
    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const deleteDepartment = async (req, res) => {
  try {
    const [old] = await db.query('SELECT name FROM departments WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM departments WHERE id = ?', [req.params.id]);
    await db.query('UPDATE users SET department = NULL WHERE department = ?', [old[0].name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getJobTitles = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM job_titles ORDER BY name ASC');
    res.json({ job_titles: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const createJobTitle = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const id = require('uuid').v4();
    await db.query('INSERT INTO job_titles (id, name) VALUES (?, ?)', [id, name]);
    res.json({ id, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Job Title exists' });
    res.status(500).json({ error: err.message });
  }
};
const updateJobTitle = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const [old] = await db.query('SELECT name FROM job_titles WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Not found' });
    const oldName = old[0].name;
    await db.query('UPDATE job_titles SET name = ? WHERE id = ?', [name, req.params.id]);
    await db.query('UPDATE users SET job_title = ? WHERE job_title = ?', [name, oldName]);
    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const deleteJobTitle = async (req, res) => {
  try {
    const [old] = await db.query('SELECT name FROM job_titles WHERE id = ?', [req.params.id]);
    if (!old.length) return res.status(404).json({ error: 'Not found' });
    await db.query('DELETE FROM job_titles WHERE id = ?', [req.params.id]);
    await db.query('UPDATE users SET job_title = NULL WHERE job_title = ?', [old[0].name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
`;

code = code.replace('module.exports = {', funcs + '\nmodule.exports = {\n  getDepartments,\n  createDepartment,\n  updateDepartment,\n  deleteDepartment,\n  getJobTitles,\n  createJobTitle,\n  updateJobTitle,\n  deleteJobTitle,');
fs.writeFileSync('./src/controllers/adminController.js', code);
console.log('adminController updated');
