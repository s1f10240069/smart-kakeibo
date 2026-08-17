import { UploadCloud } from 'lucide-react';

const WelcomeView = ({ onFileUpload }) => (
  <div className="welcome-container animate-fade">
    <h3>家計簿を始めましょう</h3>
    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px', lineHeight: '1.5' }}>
      CSVファイルを読み込むか、設定からクラウド同期を行ってください！
    </p>
    <label className="welcome-upload">
      <UploadCloud size={48} color="var(--primary-color)" style={{ marginBottom: '16px' }} />
      <div style={{ fontWeight: '700', fontSize: '18px', color: 'var(--primary-color)' }}>CSVファイルを選択</div>
      <input type="file" accept=".csv" multiple onChange={onFileUpload} />
    </label>
  </div>
);

export default WelcomeView;
