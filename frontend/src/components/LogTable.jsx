import React from 'react';
import { format } from 'date-fns';

function LogTable({ logs }) {
  const getLevelClass = (level) => {
    switch (level) {
      case 'ERROR':
        return 'level-error';
      case 'WARNING':
        return 'level-warning';
      case 'INFO':
        return 'level-info';
      case 'DEBUG':
        return 'level-debug';
      default:
        return '';
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="empty-state">
        <p>No logs found</p>
      </div>
    );
  }

  return (
    <div className="log-table-container">
      <table className="log-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Type</th>
            <th>Agent</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index}>
              <td className="timestamp">
                {log.timestamp
                  ? format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')
                  : '-'}
              </td>
              <td>
                <span className={`level-badge ${getLevelClass(log.level)}`}>
                  {log.level || 'N/A'}
                </span>
              </td>
              <td>{log.type || '-'}</td>
              <td>{log.agent_id || '-'}</td>
              <td className="message-cell">{log.message || log.content || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default LogTable;
