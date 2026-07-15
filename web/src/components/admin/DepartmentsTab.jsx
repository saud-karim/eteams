import React, { useState, useEffect } from 'react';
import { Briefcase, Building, Edit, Trash2, Plus, X, Check } from 'lucide-react';
import { api } from '../../api/client';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';

export default function DepartmentsTab() {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [departments, setDepartments] = useState([]);
  const [jobTitles, setJobTitles] = useState([]);
  
  const [loading, setLoading] = useState(true);

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
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Departments Section */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Departments</h3>
            </div>
            <button 
              onClick={() => { setDeptForm({ id: null, name: '' }); setShowDeptModal(true); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="p-0 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-gray-400 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="px-5 py-8 text-center text-gray-500">No departments found</td>
                  </tr>
                ) : departments.map(d => (
                  <tr key={d.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{d.name}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button 
                        onClick={() => { setDeptForm(d); setShowDeptModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteDept(d.id, d.name)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Job Titles Section */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex flex-col">
          <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">Job Titles</h3>
            </div>
            <button 
              onClick={() => { setTitleForm({ id: null, name: '' }); setShowTitleModal(true); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          <div className="p-0 overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-white/5 text-gray-400 sticky top-0">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobTitles.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="px-5 py-8 text-center text-gray-500">No job titles found</td>
                  </tr>
                ) : jobTitles.map(t => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-5 py-3 text-white font-medium">{t.name}</td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button 
                        onClick={() => { setTitleForm(t); setShowTitleModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTitle(t.id, t.name)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Dept Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">
                {deptForm.id ? 'Edit Department' : 'New Department'}
              </h2>
              <button onClick={() => setShowDeptModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDept} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Department Name</label>
                <input 
                  type="text"
                  value={deptForm.name}
                  onChange={e => setDeptForm({...deptForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g. Engineering"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDeptModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Title Modal */}
      {showTitleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-semibold text-white">
                {titleForm.id ? 'Edit Job Title' : 'New Job Title'}
              </h2>
              <button onClick={() => setShowTitleModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTitle} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Job Title Name</label>
                <input 
                  type="text"
                  value={titleForm.name}
                  onChange={e => setTitleForm({...titleForm, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g. Senior Developer"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowTitleModal(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
