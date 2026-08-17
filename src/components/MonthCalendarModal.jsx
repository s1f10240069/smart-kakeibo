import { useState, useMemo } from 'react';

const MonthCalendarModal = ({ availableMonths, targetMonth, onSelect, onClose }) => {
  const monthSet = new Set(availableMonths);
  const years = useMemo(() => {
    const ys = new Set(availableMonths.map(m => m.split('/')[0]));
    return Array.from(ys).sort().reverse();
  }, [availableMonths]);
  const [selectedYear, setSelectedYear] = useState(() =>
    targetMonth ? targetMonth.split('/')[0] : (years[0] || '')
  );
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const monthLabels = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">📅 月を選択</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="year-tabs">
          {years.map(y => (
            <button key={y} className={`year-tab ${selectedYear === y ? 'active' : ''}`} onClick={() => setSelectedYear(y)}>
              {y}年 <span className="year-badge">{availableMonths.filter(m => m.startsWith(y + '/')).length}</span>
            </button>
          ))}
        </div>
        <div className="month-grid">
          {months.map((m, i) => {
            const key = `${selectedYear}/${m}`;
            const hasData = monthSet.has(key);
            return (
              <button key={m} className={`month-cell ${hasData ? 'has-data' : 'no-data'} ${key === targetMonth ? 'active' : ''}`}
                disabled={!hasData} onClick={() => { onSelect(key); onClose(); }}>
                <span className="month-cell-num">{monthLabels[i]}</span>
                {hasData && <span className="month-cell-dot" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MonthCalendarModal;
