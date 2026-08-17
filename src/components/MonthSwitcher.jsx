import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

const MonthSwitcher = ({ className = '', targetMonth, availableMonths, onChangeMonth, onOpenCalendar }) => (
  <div className={`month-switcher ${className}`}>
    <button className="month-btn" onClick={() => onChangeMonth(1)} disabled={availableMonths.indexOf(targetMonth) >= availableMonths.length - 1}><ChevronLeft /></button>
    <button className="month-label-btn" onClick={onOpenCalendar}>
      <span className="month-label">{targetMonth}</span>
      <CalendarDays size={16} color="var(--primary-color)" style={{ marginLeft: '6px' }} />
    </button>
    <button className="month-btn" onClick={() => onChangeMonth(-1)} disabled={availableMonths.indexOf(targetMonth) <= 0}><ChevronRight /></button>
  </div>
);

export default MonthSwitcher;
