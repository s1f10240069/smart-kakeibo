import { Home, List, Settings, ChevronLeft, ChevronRight, CalendarDays, Upload } from 'lucide-react';
import { formatCurrency } from '../lib/categories';

const Sidebar = ({ view, onSelectView, hasData, targetMonth, availableMonths, monthTotals, onChangeMonth, onOpenCalendar, onSelectMonth, onFileUpload }) => (
  <aside className="sidebar">
    <div className="sidebar-brand">🧾 スマート明細</div>

    <nav className="sidebar-nav">
      {[
        { id: 'home', icon: <Home size={18} />, label: 'ホーム', disabled: !hasData },
        { id: 'list', icon: <List size={18} />, label: '明細一覧', disabled: !hasData },
        { id: 'settings', icon: <Settings size={18} />, label: '設定', disabled: false },
      ].map(({ id, icon, label, disabled }) => (
        <button key={id} className={`sidebar-nav-item ${view === id ? 'active' : ''}`}
          onClick={() => !disabled && onSelectView(id)}
          style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer' }}>
          {icon}{label}
        </button>
      ))}
    </nav>

    {/* 月切り替え（サイドバー内） */}
    {(view === 'home' || view === 'list') && (
      <div className="sidebar-month-section">
        <div className="sidebar-section-title">表示月</div>
        <div className="sidebar-month-ctrl">
          <button className="month-btn" onClick={() => onChangeMonth(1)} disabled={availableMonths.indexOf(targetMonth) >= availableMonths.length - 1}><ChevronLeft size={16} /></button>
          <button className="sidebar-month-label-btn" onClick={onOpenCalendar}>
            {targetMonth} <CalendarDays size={13} />
          </button>
          <button className="month-btn" onClick={() => onChangeMonth(-1)} disabled={availableMonths.indexOf(targetMonth) <= 0}><ChevronRight size={16} /></button>
        </div>

        {/* 月リスト */}
        <div className="sidebar-month-list">
          {availableMonths.map(m => (
            <button key={m} className={`sidebar-month-item ${m === targetMonth ? 'active' : ''}`} onClick={() => onSelectMonth(m)}>
              <span>{m}</span>
              <span className="sidebar-month-total">{formatCurrency(monthTotals[m] || 0)}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {/* CSVアップロード */}
    <div className="sidebar-footer">
      <label className="sidebar-upload-btn">
        <Upload size={15} />CSVをインポート
        <input type="file" accept=".csv" multiple onChange={onFileUpload} style={{ display: 'none' }} />
      </label>
    </div>
  </aside>
);

export default Sidebar;
