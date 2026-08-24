import React, { useState } from 'react';
import Pagination from './Pagination';

export default function ChannelsTab({
  localChannels,
  handleExportChannels,
  setShowCreateChannelModal,
  openEditChannel,
  handleArchiveChannel,
  handleUnarchiveChannel,
  onJumpToChannel
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState('channels'); // 'channels', 'dms', or 'archived'
  const itemsPerPage = 10;

  const filteredChannels = localChannels.filter(c => {
    if (filterType === 'channels') {
      return c.type !== 'dm' && c.type !== 'group_dm' && c.archived_at == null && c.deleted_at == null;
    } else if (filterType === 'dms') {
      return (c.type === 'dm' || c.type === 'group_dm') && c.archived_at == null && c.deleted_at == null;
    } else if (filterType === 'archived') {
      return c.archived_at != null;
    } else if (filterType === 'deleted') {
      return c.deleted_at != null;
    }
    return false;
  });

  const paginatedChannels = filteredChannels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Channels & Permissions</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ display: 'flex', background: 'var(--panel)', padding: '4px', borderRadius: '8px' }}>
          <button 
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', background: filterType === 'channels' ? 'var(--panel-2)' : 'transparent', color: filterType === 'channels' ? 'var(--text)' : 'var(--text-mute)', border: 'none', cursor: 'pointer', fontWeight: filterType === 'channels' ? '600' : '400' }}
            onClick={() => { setFilterType('channels'); setCurrentPage(1); }}
          >
            Channels
          </button>
          <button 
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', background: filterType === 'dms' ? 'var(--panel-2)' : 'transparent', color: filterType === 'dms' ? 'var(--text)' : 'var(--text-mute)', border: 'none', cursor: 'pointer', fontWeight: filterType === 'dms' ? '600' : '400' }}
            onClick={() => { setFilterType('dms'); setCurrentPage(1); }}
          >
            Direct Messages
          </button>
          <button 
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', background: filterType === 'archived' ? 'var(--panel-2)' : 'transparent', color: filterType === 'archived' ? 'var(--text)' : 'var(--text-mute)', border: 'none', cursor: 'pointer', fontWeight: filterType === 'archived' ? '600' : '400' }}
            onClick={() => { setFilterType('archived'); setCurrentPage(1); }}
          >
            Archived
          </button>
          <button 
            style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '14px', background: filterType === 'deleted' ? 'var(--panel-2)' : 'transparent', color: filterType === 'deleted' ? 'var(--text)' : 'var(--text-mute)', border: 'none', cursor: 'pointer', fontWeight: filterType === 'deleted' ? '600' : '400' }}
            onClick={() => { setFilterType('deleted'); setCurrentPage(1); }}
          >
            Deleted
          </button>
        </div>
        <div style={{ flex: 1 }}></div>
        <input type="text" className="admin-search-inp" placeholder="Search..." />
        <button className="admin-btn-ghost" onClick={handleExportChannels}>Export list</button>
        {filterType === 'channels' && (
          <button className="admin-btn-primary" onClick={() => setShowCreateChannelModal(true)}>+ Create Channel</button>
        )}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
        <thead style={{ background: 'var(--panel)' }}>
          <tr>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Channel</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Type</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Members</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Read Only</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Messages</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedChannels.map((c, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
              <td 
                style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent)', cursor: 'pointer' }}
                onClick={() => onJumpToChannel(c.slug)}
              >
                #{c.name}
                {c.deleted_at && <span style={{ marginLeft: '8px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Deleted</span>}
                {c.archived_at && <span style={{ marginLeft: '8px', background: 'rgba(245,158,11,0.1)', color: 'var(--amber)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px' }}>Archived</span>}
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{ display: 'inline-block', background: c.type === 'announce' ? 'rgba(234,179,8,0.1)' : c.type === 'private' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: c.type === 'announce' ? 'var(--amber)' : c.type === 'private' ? 'var(--danger)' : 'var(--blue)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {c.type}
                </span>
              </td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.member_count}</td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.is_readonly ? 'Yes' : 'No'}</td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.message_count}</td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(c.type !== 'dm' && c.type !== 'group_dm') && (
                    <button className="admin-btn-ghost" onClick={() => openEditChannel(c)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                  )}
                  {c.archived_at ? (
                    <button className="admin-btn-primary" onClick={() => handleUnarchiveChannel(c)} style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', color: 'var(--emerald)', border: '1px solid var(--emerald)' }}>Restore</button>
                  ) : (
                    <button className="admin-btn-danger" onClick={() => handleArchiveChannel(c)} style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}>Archive</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredChannels.length > 0 && (
        <Pagination 
          currentPage={currentPage} 
          totalItems={filteredChannels.length} 
          itemsPerPage={itemsPerPage} 
          onPageChange={setCurrentPage} 
        />
      )}
      {filteredChannels.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-mute)' }}>
          No {filterType === 'channels' ? 'channels' : filterType === 'dms' ? 'direct messages' : filterType === 'archived' ? 'archived items' : 'deleted items'} found.
        </div>
      )}
    </div>
  );
}
