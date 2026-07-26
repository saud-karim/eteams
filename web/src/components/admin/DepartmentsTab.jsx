import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';
import { X } from 'lucide-react';
import Pagination from './Pagination';

export default function DepartmentsTab() {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [deptPage, setDeptPage] = useState(1);
  const [titlePage, setTitlePage] = useState(1);
  const itemsPerPage = 10;

  // Form states
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ id: null, name: '' });
  
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleForm, setTitleForm] = useState({ id: null, name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, titleRes] = await Promise.all([
        api.admin.getDepartments(),
        api.admin.getJobTitles()
      ]);
      setDepartments(deptRes.departments || []);
      setJobTitles(titleRes.job_titles || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptForm.name.trim()) return;
    try {
      if (deptForm.id) {
        await api.admin.updateDepartment(deptForm.id, { name: deptForm.name });
      } else {
        await api.admin.createDepartment({ name: deptForm.name });
      }
      setShowDeptModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save department');
    }
  };

  const handleDeleteDept = async (id, name) => {
    const ok = await confirm({ 
      title: 'Delete Department', 
      message: `Are you sure you want to delete the department "${name}"? Users assigned to this department will have their department cleared.`, 
      isDanger: true 
    });
    if (!ok) return;
    try {
      await api.admin.deleteDepartment(id);
      loadData();
    } catch (err) {
      alert('Failed to delete department');
    }
  };

  const handleSaveTitle = async (e) => {
    e.preventDefault();
    if (!titleForm.name.trim()) return;
    try {
      if (titleForm.id) {
        await api.admin.updateJobTitle(titleForm.id, { name: titleForm.name });
      } else {
        await api.admin.createJobTitle({ name: titleForm.name });
      }
      setShowTitleModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to save job title');
    }
  };

  const handleDeleteTitle = async (id, name) => {
    const ok = await confirm({ 
      title: 'Delete Job Title', 
      message: `Are you sure you want to delete the job title "${name}"? Users assigned to this title will have their job title cleared.`, 
      isDanger: true 
    });
    if (!ok) return;
    try {
      await api.admin.deleteJobTitle(id);
      loadData();
    } catch (err) {
      alert('Failed to delete job title');
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>;
  }

  const paginatedDepts = departments.slice((deptPage - 1) * itemsPerPage, deptPage * itemsPerPage);
  const paginatedTitles = jobTitles.slice((titlePage - 1) * itemsPerPage, titlePage * itemsPerPage);

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Departments & Job Titles</h2>

      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap' }}>
        
        {/* Departments Section */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500' }}>Departments</h3>
            <button 
              className="admin-btn-primary" 
              onClick={() => { setDeptForm({ id: null, name: '' }); setShowDeptModal(true); }}
            >
              + Add Department
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
            <thead style={{ background: 'var(--panel)' }}>
              <tr>
                <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Name</th>
                <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedDepts.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No departments found</td>
                </tr>
              ) : paginatedDepts.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-main)', fontWeight: '500' }}>{d.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button className="admin-btn-ghost" onClick={() => { setDeptForm(d); setShowDeptModal(true); }} style={{ padding: '4px 8px', fontSize: '11px', marginRight: '5px' }}>Edit</button>
                    <button className="admin-btn-danger" onClick={() => handleDeleteDept(d.id, d.name)} style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {departments.length > 0 && (
            <Pagination 
              currentPage={deptPage} 
              totalItems={departments.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setDeptPage} 
            />
          )}
        </div>

        {/* Job Titles Section */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '500' }}>Job Titles</h3>
            <button 
              className="admin-btn-primary" 
              onClick={() => { setTitleForm({ id: null, name: '' }); setShowTitleModal(true); }}
            >
              + Add Job Title
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
            <thead style={{ background: 'var(--panel)' }}>
              <tr>
                <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Name</th>
                <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTitles.length === 0 ? (
                <tr>
                  <td colSpan="2" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No job titles found</td>
                </tr>
              ) : paginatedTitles.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', color: 'var(--text-main)', fontWeight: '500' }}>{t.name}</td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button className="admin-btn-ghost" onClick={() => { setTitleForm(t); setShowTitleModal(true); }} style={{ padding: '4px 8px', fontSize: '11px', marginRight: '5px' }}>Edit</button>
                    <button className="admin-btn-danger" onClick={() => handleDeleteTitle(t.id, t.name)} style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {jobTitles.length > 0 && (
            <Pagination 
              currentPage={titlePage} 
              totalItems={jobTitles.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setTitlePage} 
            />
          )}
        </div>

      </div>

      {/* Dept Modal */}
      {showDeptModal && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative', width: '400px' }}>
            <button 
              onClick={() => setShowDeptModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px' }}>{deptForm.id ? 'Edit Department' : 'New Department'}</h3>
            <form onSubmit={handleSaveDept}>
              <div className="form-field">
                <label>Department Name <span style={{color:'var(--danger)'}}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={deptForm.name}
                  onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                  placeholder="e.g. Engineering"
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '32px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Title Modal */}
      {showTitleModal && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative', width: '400px' }}>
            <button 
              onClick={() => setShowTitleModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '20px' }}>{titleForm.id ? 'Edit Job Title' : 'New Job Title'}</h3>
            <form onSubmit={handleSaveTitle}>
              <div className="form-field">
                <label>Job Title Name <span style={{color:'var(--danger)'}}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={titleForm.name}
                  onChange={e => setTitleForm({...titleForm, name: e.target.value})}
                  placeholder="e.g. Senior Developer"
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '32px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowTitleModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
