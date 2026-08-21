import { Edit3 } from 'lucide-react';
import { CATEGORY_MAP, formatCurrency } from '../../lib/categories';

const ListView = ({ filteredTx, groupedTxs, summary, onUpdateCategory }) => (
  <div className="animate-fade">
    {/* PC: テーブル形式 */}
    <div className="tx-table-wrapper desktop-only">
      {filteredTx.length > 0 ? (
        <table className="tx-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>商品名・決済先</th>
              <th>カテゴリー</th>
              <th style={{ textAlign: 'right' }}>金額</th>
            </tr>
          </thead>
          <tbody>
            {filteredTx.map(tx => (
              <tr key={tx.id} className="tx-table-row">
                <td className="tx-table-date">{tx.date}</td>
                <td className="tx-table-desc">
                  <span className="tx-table-icon">{CATEGORY_MAP[tx.catKey].icon}</span>
                  {tx.desc}{tx.source === 'gmail' && <span title="メールから自動取込" style={{ marginLeft: '6px' }}>📧</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <select className="tx-cat-select" value={tx.catKey} onChange={e => onUpdateCategory(tx.id, e.target.value)}>
                      {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k}>{CATEGORY_MAP[k].icon} {CATEGORY_MAP[k].name}</option>)}
                    </select>
                    <Edit3 size={11} color="var(--primary-color)" />
                  </div>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <span className="tx-amount">{formatCurrency(tx.amount)}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="tx-table-foot">
              <td colSpan={3} style={{ fontWeight: 700, padding: '12px 16px' }}>合計 ({filteredTx.length}件)</td>
              <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '16px', padding: '12px 16px', color: 'var(--primary-color)' }}>{formatCurrency(summary)}</td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>この月の明細はありません</div>
      )}
    </div>

    {/* モバイル: グループリスト */}
    <div className="mobile-only tx-mobile-list">
      {groupedTxs.length > 0 ? groupedTxs.map(group => (
        <div key={group.date}>
          <div className="tx-group-date">{group.date}</div>
          <div className="tx-list">
            {group.items.map(tx => (
              <div key={tx.id} className="tx-item">
                <div className="tx-icon-wrapper">{CATEGORY_MAP[tx.catKey].icon}</div>
                <div className="tx-details">
                  <div className="tx-desc" title={tx.desc}>{tx.desc}{tx.source === 'gmail' && <span style={{ marginLeft: '4px' }}>📧</span>}</div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <select className="tx-cat-select" value={tx.catKey} onChange={e => onUpdateCategory(tx.id, e.target.value)}>
                      {Object.keys(CATEGORY_MAP).map(k => <option key={k} value={k}>{CATEGORY_MAP[k].name}</option>)}
                    </select>
                    <Edit3 size={12} style={{ marginLeft: '4px', color: 'var(--primary-color)' }} />
                  </div>
                </div>
                <div className="tx-amount">{formatCurrency(tx.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )) : (
        <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--text-secondary)' }}>明細がありません</div>
      )}
    </div>
  </div>
);

export default ListView;
