import { Sparkles, Key, Eye, EyeOff, RefreshCw, X, ChevronUp, ChevronDown, ShieldAlert } from 'lucide-react';
import { DEFAULT_PARSE_LABELS } from '../../gmailSync';

const SettingsView = ({ ai, google, gmail, onClearData }) => {
  const { geminiKey, onGeminiKeyChange, showKey, onToggleShowKey, othersCount, aiProgress, aiAllMonthsLoading, onRunAiAllMonths } = ai;
  const { googleUser, onLogout, onSync, onLogin, syncStatus, syncPhase } = google;
  const { senderInput, setSenderInput, onAddSender, senders, onRemoveSender, labelInputs, setLabelInputs, onAddParseLabel, parseLabels, onRemoveParseLabel, onRunSync, syncStatus: gmailSyncStatus, needsReview, expandedReviewId, setExpandedReviewId, onRetryReview } = gmail;

  return (
    <div className="summary-container animate-fade">
      <h2 className="settings-title">設定</h2>
      <div className="settings-desktop-grid">
        {/* AI設定 */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Sparkles color="#a855f7" /><span style={{ fontWeight: '700', fontSize: '16px' }}>Gemini AI 連携</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
            <Key size={18} color="var(--primary-color)" style={{ marginRight: '12px' }} />
            <input type={showKey ? 'text' : 'password'} placeholder="AIzaSy..." value={geminiKey}
              onChange={e => onGeminiKeyChange(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '16px', color: 'var(--text-primary)' }} />
            <button type="button" onClick={onToggleShowKey} aria-label={showKey ? 'APIキーを隠す' : 'APIキーを表示'} className="icon-tap-btn">
              {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* 全月一括AI */}
          <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sparkles color="var(--primary-color)" size={18} />
              <span style={{ fontWeight: '700', color: 'var(--primary-color)', fontSize: '14px' }}>全月一括AI解析</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: '1.6' }}>
              全月合計 <b style={{ color: 'var(--text-primary)' }}>{othersCount}件</b> の未分類をまとめてAIで自動仕分けします。
            </p>
            {aiProgress && (
              <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)', background: 'rgba(99,102,241,0.08)', padding: '8px 12px', borderRadius: '8px' }}>
                {aiProgress}
              </div>
            )}
            <button onClick={onRunAiAllMonths} disabled={aiAllMonthsLoading || othersCount === 0 || !geminiKey}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: (!geminiKey || othersCount === 0) ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#a855f7)', color: (!geminiKey || othersCount === 0) ? '#9ca3af' : '#fff', fontWeight: '700', fontSize: '13px', cursor: (!geminiKey || othersCount === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={15} />
              {aiAllMonthsLoading ? 'AI解析中...' : (!geminiKey ? 'APIキーを入力してください' : `全${othersCount}件を一括AIで整理する`)}
            </button>
          </div>
        </div>
        {/* Googleアカウント（ログイン・クラウド同期・メール自動取込） */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <Sparkles color="var(--text-primary)" /><span style={{ fontWeight: '700', fontSize: '16px' }}>Googleアカウント</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
            Googleでログインすると、クラウド同期とクレジットカード利用速報メールの自動取込が使えます。
          </p>

          {/* ログイン済み */}
          {googleUser ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <img src={googleUser.picture} alt={googleUser.email} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px' }}>{googleUser.name || googleUser.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{googleUser.email}</div>
                </div>
                <button onClick={onLogout} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}>ログアウト</button>
              </div>

              {/* 通常は自動同期。必要なときだけ同じ双方向同期を手動実行する。 */}
              <button
                onClick={onSync}
                disabled={syncPhase === 'syncing'}
                style={{ width: '100%', marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '7px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: syncPhase === 'syncing' ? 'not-allowed' : 'pointer', opacity: syncPhase === 'syncing' ? 0.65 : 1 }}>
                <RefreshCw size={16} className={syncPhase === 'syncing' ? 'animate-spin' : ''} />
                {syncPhase === 'syncing' ? '同期中...' : '今すぐ同期'}
              </button>

              {/* メール自動取込 */}
              <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: '14px', border: '1px solid rgba(99,102,241,0.2)' }}>
                <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '8px' }}>📧 メール自動取込</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', lineHeight: '1.6' }}>
                  登録した送信元からの利用速報メールを検索し、金額・利用日が読み取れたものだけ明細に追加します。
                </p>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  <input type="text" placeholder="例: rakuten-card.co.jp" value={senderInput}
                    onChange={e => setSenderInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') onAddSender(); }}
                    style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }} />
                  <button onClick={onAddSender} style={{ padding: '0 16px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>追加</button>
                </div>

                {senders.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {senders.map(s => (
                      <span key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '999px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '12px' }}>
                        {s}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={() => onRemoveSender(s)} />
                      </span>
                    ))}
                  </div>
                )}
                {/* メール解析キーワード（カード会社ごとの言い回しの違いをUIで吸収する） */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>解析キーワード（メールの文言に合わせて調整）</div>
                  {[
                    { key: 'amount', label: '金額' },
                    { key: 'date', label: '日付' },
                    { key: 'merchant', label: '利用先' },
                  ].map(({ key, label }) => (
                    <div key={key} style={{ marginBottom: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}のキーワード</div>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                        <input type="text" placeholder={`例: ${DEFAULT_PARSE_LABELS[key][0]}`} value={labelInputs[key]}
                          onChange={e => setLabelInputs({ ...labelInputs, [key]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') onAddParseLabel(key); }}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '12px', outline: 'none' }} />
                        <button onClick={() => onAddParseLabel(key)} style={{ padding: '0 12px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>追加</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {parseLabels[key].map(v => (
                          <span key={v} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '999px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', fontSize: '11px' }}>
                            {v}
                            <X size={10} style={{ cursor: 'pointer' }} onClick={() => onRemoveParseLabel(key, v)} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={onRunSync} disabled={senders.length === 0}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: senders.length === 0 ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#a855f7)', color: senders.length === 0 ? '#9ca3af' : '#fff', fontWeight: '700', fontSize: '13px', cursor: senders.length === 0 ? 'not-allowed' : 'pointer' }}>
                  今すぐメールを確認
                </button>

                {gmailSyncStatus && (
                  <div style={{ marginTop: '10px', fontSize: '12px', fontWeight: '600', color: 'var(--primary-color)' }}>{gmailSyncStatus}</div>
                )}

                {needsReview.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>要確認（自動で明細化されなかったメール、クリックで本文を確認）</div>
                    <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                      {needsReview.map(item => (
                        <div key={item.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: item.bodyText ? 'pointer' : 'default' }}
                            onClick={() => item.bodyText && setExpandedReviewId(expandedReviewId === item.id ? null : item.id)}>
                            {item.bodyText && (expandedReviewId === item.id ? <ChevronUp size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> : <ChevronDown size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />)}
                            {item.subject}
                          </div>
                          {expandedReviewId === item.id && item.bodyText && (
                            <div style={{ marginTop: '6px' }}>
                              <pre style={{ maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontSize: '11px', color: 'var(--text-primary)', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', margin: 0 }}>{item.bodyText}</pre>
                              <button onClick={() => onRetryReview(item)}
                                style={{ marginTop: '6px', padding: '6px 12px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: '#fff', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}>
                                このメールを再解析
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 未ログイン */
            <button onClick={onLogin}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#fff', color: '#3c4043', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.6l-6.6-5.4C29.7 34.9 27 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.6 5.4C41.3 35.9 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z" />
              </svg>
              Googleでログイン
            </button>
          )}

          {syncStatus && (
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.05)', padding: '10px 12px', borderRadius: '8px', fontWeight: '600' }}>
              {syncStatus}
            </div>
          )}
        </div>
        {/* データリセット */}
        <div className="chart-wrapper">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ShieldAlert color="var(--danger-color)" /><span style={{ fontWeight: '700', fontSize: '16px' }}>端末データリセット</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            この端末に保存されているすべての明細を完全に消去します。クラウドのデータは消えません。
          </p>
          <button className="settings-btn" onClick={onClearData}>端末の全データを消去</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;


