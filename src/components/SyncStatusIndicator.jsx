import { RefreshCw, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';

const PHASE_CONFIG = {
  idle: { icon: null, label: '', color: 'var(--text-secondary)' },
  syncing: { icon: RefreshCw, spin: true, label: '同期中...', color: 'var(--primary-color)' },
  synced: { icon: CheckCircle2, label: '同期済み', color: '#10b981' },
  error: { icon: AlertCircle, label: '同期エラー', color: 'var(--danger-color, #ef4444)' },
  needsLogin: { icon: AlertTriangle, label: '再ログインが必要', color: 'var(--danger-color, #ef4444)' },
};

const SyncStatusIndicator = ({ syncPhase, reLoginNeeded, onReLogin }) => {
  const phase = reLoginNeeded ? 'needsLogin' : (syncPhase || 'idle');
  const config = PHASE_CONFIG[phase] || PHASE_CONFIG.idle;
  const Icon = config.icon;

  if (!Icon) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: config.color }}>
      <Icon size={14} className={config.spin ? 'animate-spin' : ''} />
      <span>{config.label}</span>
      {reLoginNeeded && (
        <button
          onClick={onReLogin}
          style={{ marginLeft: '2px', padding: '3px 8px', borderRadius: '999px', border: 'none', background: config.color, color: '#fff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
        >
          再ログイン
        </button>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
