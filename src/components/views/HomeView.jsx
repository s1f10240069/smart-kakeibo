import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Sparkles, BarChart2, ChevronUp, ChevronDown } from 'lucide-react';
import { CATEGORY_MAP, formatCurrency } from '../../lib/categories';

const HomeView = ({
  summary, prevMonthData, diffAmount, diffPct,
  othersCount, currentOthersCount, isAiLoading, geminiKey, onRunAiCategorization,
  allMonthsSummary, targetMonth, onSelectMonth,
  chartData, filteredTx, expandedCat, onToggleCategory,
}) => (
  <div className="summary-container animate-fade">
    {/* サマリーカード群 */}
    <div className="desktop-kpi-row">
      <div className="total-card kpi-card">
        <div className="total-title">合計支出</div>
        <div className="total-amount">{formatCurrency(summary)}</div>
        {prevMonthData && diffAmount !== null && (
          <div className="diff-row">
            <span className="diff-prev">前月({prevMonthData.month}): {formatCurrency(prevMonthData.total)}</span>
            <span className={`diff-badge ${diffAmount > 0 ? 'diff-up' : diffAmount < 0 ? 'diff-down' : 'diff-flat'}`}>
              {diffAmount > 0 ? <TrendingUp size={13} /> : diffAmount < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
              {diffAmount > 0 ? '+' : ''}{formatCurrency(diffAmount)}
              {diffPct !== null && <span className="diff-pct"> ({diffAmount > 0 ? '+' : ''}{diffPct}%)</span>}
            </span>
          </div>
        )}
      </div>
      {/* AI 仕分けカード（デスクトップKPIとして） */}
      <div className="kpi-card ai-kpi-card">
        <div className="total-title">未分類件数（全月）</div>
        <div className="total-amount" style={{ fontSize: '36px', color: othersCount > 0 ? '#a855f7' : 'var(--success-color)' }}>
          {othersCount}<span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '4px' }}>件</span>
        </div>
        <button
          onClick={onRunAiCategorization}
          disabled={isAiLoading || currentOthersCount === 0 || !geminiKey}
          className="ai-quick-btn"
          style={{ background: (!geminiKey || currentOthersCount === 0) ? '#e5e7eb' : 'linear-gradient(135deg,#a855f7,#6366f1)', color: (!geminiKey || currentOthersCount === 0) ? '#9ca3af' : '#fff' }}>
          <Sparkles size={14} />
          {isAiLoading ? '解析中...' : (!geminiKey ? 'APIキーを設定' : `この月の${currentOthersCount}件を整理`)}
        </button>
      </div>
    </div>

    {/* 2カラムレイアウト（PC）/ 縦積み（モバイル） */}
    <div className="home-desktop-grid">
      {/* 左列: グラフ */}
      <div className="home-col">
        {/* 月別推移 */}
        {allMonthsSummary.length > 1 && (
          <div className="chart-wrapper">
            <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={18} color="var(--primary-color)" />月別推移
            </div>
            <div style={{ width: '100%', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allMonthsSummary} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.85)', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {allMonthsSummary.map((e, i) => (
                      <Cell key={i} fill={e.month === targetMonth ? 'var(--primary-color)' : 'var(--border-color)'} cursor="pointer" onClick={() => onSelectMonth(e.month)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>棒をクリックすると月を切り替え</p>
          </div>
        )}

        {/* 円グラフ */}
        {chartData.length > 0 && (
          <div className="chart-wrapper">
            <div className="chart-title">カテゴリー内訳</div>
            <div style={{ width: '100%', height: '220px', marginBottom: '12px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: '12px', border: 'none', background: 'rgba(0,0,0,0.8)', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      {/* 右列: カテゴリー一覧 */}
      <div className="home-col">
        {chartData.length > 0 ? (
          <div className="chart-wrapper" style={{ height: '100%' }}>
            <div className="chart-title">カテゴリー別金額</div>
            {chartData.map(cat => {
              const prevCatVal = prevMonthData?.catTotals?.[cat.key] || 0;
              const catDiff = cat.value - prevCatVal;
              const pct = Math.round((cat.value / summary) * 100);
              const isExpanded = expandedCat === cat.key;
              const catTxs = filteredTx.filter(t => t.catKey === cat.key);

              return (
                <div key={cat.key} className="cat-accordion-group">
                  <div className="cat-list-item" onClick={() => onToggleCategory(isExpanded ? null : cat.key)} style={{ cursor: 'pointer', padding: '12px 8px', margin: '0 -8px', borderRadius: '8px' }}>
                    <div className="cat-dot" style={{ backgroundColor: cat.color }} />
                    <div className="cat-icon-label" style={{ maxWidth: 'calc(100% - 150px)' }}>
                      <span className="cat-icon">{CATEGORY_MAP[cat.key].icon}</span>
                      <span className="cat-name">{cat.name}</span>
                      <span className="cat-toggle-icon">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    </div>
                    <div className="cat-bar-wrap">
                      <div className="cat-bar-fill" style={{ width: `${pct}%`, background: cat.color }} />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '90px' }}>
                      <div className="cat-val">{formatCurrency(cat.value)}</div>
                      {prevMonthData && (
                        <div className={`cat-diff ${catDiff > 0 ? 'diff-up' : catDiff < 0 ? 'diff-down' : 'diff-flat'}`}>
                          {catDiff > 0 ? '▲' : catDiff < 0 ? '▼' : '－'}{formatCurrency(Math.abs(catDiff))}
                        </div>
                      )}
                    </div>
                    <div className="cat-pct">{pct}%</div>
                  </div>
                  {isExpanded && catTxs.length > 0 && (
                    <div className="cat-tx-list">
                      {catTxs.map(tx => (
                        <div key={tx.id} className="cat-tx-item">
                          <div className="cat-tx-date">{tx.date.split('/')[2]}日</div>
                          <div className="cat-tx-desc">{tx.desc}</div>
                          <div className="cat-tx-amount">{formatCurrency(tx.amount)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>この月のデータはありません</div>
        )}
      </div>
    </div>
  </div>
);

export default HomeView;

