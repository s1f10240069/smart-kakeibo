import { useState, useEffect } from 'react';
import { Plus, Home, List, Settings } from 'lucide-react';
import { formatCurrency } from './lib/categories';
import { useTransactions } from './hooks/useTransactions';
import { useAi } from './hooks/useAi';
import { useGoogleAuth } from './hooks/useGoogleAuth';
import { useGmailSync } from './hooks/useGmailSync';
import MonthCalendarModal from './components/MonthCalendarModal';
import MonthSwitcher from './components/MonthSwitcher';
import Sidebar from './components/Sidebar';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import LoginGate from './components/LoginGate';
import WelcomeView from './components/views/WelcomeView';
import HomeView from './components/views/HomeView';
import ListView from './components/views/ListView';
import SettingsView from './components/views/SettingsView';
import './index.css';

// ===== メインアプリ =====
export default function App() {
  // ===== UI 状態 =====
  const [view, setView] = useState('home');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  // ===== ドメインフック =====
  const {
    allTransactions, setAllTransactions, customRules, setCustomRules,
    targetMonth, setTargetMonth, availableMonths, monthTotals,
    filteredTx, summary, chartData, groupedTxs,
    prevMonthData, allMonthsSummary,
    othersCount, currentOthersCount, diffAmount, diffPct,
    touchLocalModified, localModifiedTick, changeMonth, updateCategory, applyAiResults,
    handleFileUpload: handleFileUploadRaw,
  } = useTransactions();

  const gmail = useGmailSync({ setAllTransactions, touchLocalModified });

  const google = useGoogleAuth({
    allTransactions, customRules, setAllTransactions, setCustomRules,
    needsReview: gmail.needsReview, setNeedsReview: gmail.saveNeedsReview,
    runGmailSync: gmail.runGmailSync, localModifiedTick,
  });

  const ai = useAi({ allTransactions, customRules, filteredTx, applyAiResults });

  // ===== 起動時の自動同期＋メールキャッチアップ =====
  useEffect(() => {
    try {
      const t = localStorage.getItem('kakeibo_google_token');
      const exp = parseInt(localStorage.getItem('kakeibo_google_token_expiry') || '0', 10);
      const u = localStorage.getItem('kakeibo_google_user');
      if (t && exp > Date.now()) {
        google.autoSyncCloud(t).then(() => gmail.runGmailSync(t));
      } else if (u) {
        google.trySilentGoogleLogin();
      }
    } catch(e) { console.error(e); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== ホーム遷移を伴う合成ハンドラー =====
  const handleFileUpload = async (e) => { await handleFileUploadRaw(e); setView('home'); };

  const clearData = () => {
    const note = google.googleUser
      ? '\n\nGoogleにログイン中のため、次回の自動同期でクラウドの内容が復元されます。クラウドのデータも削除したい場合は、先にログアウトしてから実行してください。'
      : '';
    if (window.confirm(`全データを完全削除しますか？（クラウドは消えません）${note}`)) {
      setAllTransactions([]); setCustomRules({});
      localStorage.removeItem('kakeibo_data'); localStorage.removeItem('kakeibo_rules');
      // 注意: ここでtouchLocalModified()は呼ばない。呼ぶと「ローカルが最新」と誤認識され、
      // 自動アップロードでクラウド側のデータまで空で上書きしてしまう。
      setView('home');
    }
  };

  // 有効なGoogle認証がない間は家計簿本体へ入れない。
  // 保存済みセッションがある場合は、起動時useEffectのサイレント認証完了後に自動で解除される。
  if (!google.isAuthenticated) {
    return <LoginGate onLogin={google.handleGoogleLogin} status={google.syncStatus} />;
  }


  // ===== メインレンダー =====
  return (
    <div id="app-root">

      {/* ===== PC サイドバー ===== */}
      <Sidebar
        view={view}
        onSelectView={setView}
        hasData={allTransactions.length > 0}
        targetMonth={targetMonth}
        availableMonths={availableMonths}
        monthTotals={monthTotals}
        onChangeMonth={changeMonth}
        onOpenCalendar={() => setShowCalendar(true)}
        onSelectMonth={setTargetMonth}
        onFileUpload={handleFileUpload}
        googleUser={google.googleUser}
        syncPhase={google.syncPhase}
        reLoginNeeded={google.reLoginNeeded}
        onReLogin={google.handleGoogleLogin}
      />

      {/* ===== メインエリア ===== */}
      <div className="main-wrapper">
        {/* モバイル専用ヘッダー */}
        <div className="app-header mobile-only">
          <div className="app-title">スマート明細</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {google.googleUser && (
              <SyncStatusIndicator
                syncPhase={google.syncPhase}
                reLoginNeeded={google.reLoginNeeded}
                onReLogin={google.handleGoogleLogin}
              />
            )}
            <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '14px' }}>{filteredTx.length}件</div>
          </div>
        </div>

        {/* PC 専用トップバー */}
        <div className="desktop-topbar desktop-only">
          <div className="desktop-topbar-left">
            <div className="desktop-topbar-title">
              {view === 'home' && `${targetMonth} のサマリー`}
              {view === 'list' && `${targetMonth} の明細一覧`}
              {view === 'settings' && '設定'}
            </div>
            {(view === 'home' || view === 'list') && (
              <div className="desktop-topbar-sub">{filteredTx.length}件 | {formatCurrency(summary)}</div>
            )}
          </div>
          {(view === 'home' || view === 'list') && (
            <label className="desktop-upload-btn">
              <Plus size={16} />CSVを追加
              <input type="file" accept=".csv" multiple onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        {/* モバイル専用月切り替え */}
        {(view === 'home' || view === 'list') && (
          <MonthSwitcher
            className="mobile-only"
            targetMonth={targetMonth}
            availableMonths={availableMonths}
            onChangeMonth={changeMonth}
            onOpenCalendar={() => setShowCalendar(true)}
          />
        )}

        {/* コンテンツ */}
        <div className="content-area">
          {view === 'settings' ? (
            <SettingsView
              ai={{
                geminiKey: ai.geminiKey,
                onGeminiKeyChange: ai.handleGeminiKeyChange,
                showKey,
                onToggleShowKey: () => setShowKey(!showKey),
                othersCount,
                aiProgress: ai.aiProgress,
                aiAllMonthsLoading: ai.aiAllMonthsLoading,
                onRunAiAllMonths: ai.runAiCategorizationAllMonths,
              }}
              google={{
                googleUser: google.googleUser,
                onLogout: google.handleGoogleLogout,
                onUpload: () => google.uploadToCloud(),
                onDownload: () => google.downloadFromCloud(),
                onLogin: google.handleGoogleLogin,
                syncStatus: google.syncStatus,
              }}
              gmail={{
                senderInput: gmail.senderInput,
                setSenderInput: gmail.setSenderInput,
                onAddSender: gmail.addGmailSender,
                senders: gmail.gmailSenders,
                onRemoveSender: gmail.removeGmailSender,
                labelInputs: gmail.labelInputs,
                setLabelInputs: gmail.setLabelInputs,
                onAddParseLabel: gmail.addParseLabel,
                parseLabels: gmail.parseLabels,
                onRemoveParseLabel: gmail.removeParseLabel,
                onRunSync: () => gmail.runGmailSync(),
                syncStatus: gmail.gmailSyncStatus,
                needsReview: gmail.needsReview,
                expandedReviewId: gmail.expandedReviewId,
                setExpandedReviewId: gmail.setExpandedReviewId,
                onRetryReview: gmail.retryParseReview,
              }}
              onClearData={clearData}
            />
          ) : allTransactions.length === 0 ? (
            <WelcomeView onFileUpload={handleFileUpload} />
          ) : view === 'home' ? (
            <HomeView
              summary={summary}
              prevMonthData={prevMonthData}
              diffAmount={diffAmount}
              diffPct={diffPct}
              othersCount={othersCount}
              currentOthersCount={currentOthersCount}
              isAiLoading={ai.isAiLoading}
              geminiKey={ai.geminiKey}
              onRunAiCategorization={ai.runAiCategorization}
              allMonthsSummary={allMonthsSummary}
              targetMonth={targetMonth}
              onSelectMonth={setTargetMonth}
              chartData={chartData}
              filteredTx={filteredTx}
              expandedCat={expandedCat}
              onToggleCategory={setExpandedCat}
            />
          ) : view === 'list' ? (
            <ListView
              filteredTx={filteredTx}
              groupedTxs={groupedTxs}
              summary={summary}
              onUpdateCategory={updateCategory}
            />
          ) : null}
        </div>
      </div>

      {/* モバイル FAB */}
      {view !== 'settings' && (
        <label className="fab mobile-only">
          <Plus size={28} />
          <input type="file" accept=".csv" multiple onChange={handleFileUpload} />
        </label>
      )}

      {/* モバイル ボトムナビ */}
      <div className="bottom-nav mobile-only">
        {[
          { id: 'home', icon: <Home size={22} />, label: 'ホーム', disabled: allTransactions.length === 0 },
          { id: 'list', icon: <List size={22} />, label: '明細', disabled: allTransactions.length === 0 },
          { id: 'settings', icon: <Settings size={22} />, label: '設定', disabled: false },
        ].map(({ id, icon, label, disabled }) => (
          <div key={id} className={`nav-item ${view === id ? 'active' : ''}`}
            onClick={() => !disabled && setView(id)}
            style={{ opacity: disabled ? 0.4 : 1 }}>
            {icon}<span className="nav-label">{label}</span>
          </div>
        ))}
      </div>

      {/* カレンダーモーダル */}
      {showCalendar && (
        <MonthCalendarModal
          availableMonths={availableMonths}
          targetMonth={targetMonth}
          onSelect={m => setTargetMonth(m)}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
