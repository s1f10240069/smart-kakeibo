// カテゴリー定義と仕分けロジック

export const CATEGORY_MAP = {
  Food:          { name: '食費・飲食',     color: '#f43f5e', icon: '🍔' },
  Daily:         { name: '日用品・スーパー', color: '#10b981', icon: '🛒' },
  Shopping:      { name: 'ショッピング',    color: '#34d399', icon: '🛍️' },
  Entertainment: { name: 'エンタメ・趣味',  color: '#a855f7', icon: '🎮' },
  Transport:     { name: '交通・通信',      color: '#3b82f6', icon: '🚃' },
  Beauty:        { name: '美容・医療',      color: '#ec4899', icon: '✂️' },
  Travel:        { name: '旅行・宿泊',      color: '#f59e0b', icon: '🏨' },
  Fixed:         { name: '固定費・税金',    color: '#0ea5e9', icon: '📄' },
  Others:        { name: 'その他',          color: '#94a3b8', icon: '💳' },
};

export const categorize = (desc, customRules = {}) => {
  const d = desc.toUpperCase();
  for (const [k, v] of Object.entries(customRules)) {
    if (d.includes(k.toUpperCase())) return v;
  }
  if (/(ﾃﾝ|店|食堂|ｶﾌｴ|ｶﾌｪ|居酒屋|ﾚｽﾄﾗﾝ|ﾀﾞｲﾆﾝｸﾞ|ﾍﾞ-ｶﾘ-|ﾊﾟﾝﾔ|ﾏｸﾄﾞﾅﾙﾄﾞ|ﾏｯｸ|FAMILYMART|ﾌｱﾐﾘ-ﾏ-ﾄ|ﾛ-ｿﾝ|LAWSON|ｾﾌﾞﾝ|ﾏﾂﾔ|ﾔﾖｲｹﾝ|ｽｷﾔ|ﾖｼﾉﾔ|ｳﾄﾞﾝ|ｿﾊﾞ|ﾗ-ﾒﾝ|ｽｼ|ﾔｷﾆｸ|焼肉|ﾊﾞ-|BAR|ｺ-ﾋ-|ｽﾀﾊﾞ|ﾄﾞﾄ-ﾙ|ｳ-ﾊﾞ-|UBER|WOLT|ﾃﾞﾘﾊﾞﾘ-|KFC|ｻｲｾﾞﾘﾔ|ｶﾞｽﾄ|すき家|吉野家|モスバーガー)/.test(d)) return 'Food';
  if (/(ｽ-ﾊﾟ-|ｺﾝﾋﾞﾆ|ﾏ-ﾄ|MAXVALU|ﾒｶﾞﾄﾞﾝｷ|ﾄﾞﾝｷ|ｲｵﾝ|AEON|ｲﾄ-ﾖ-ｶﾄﾞ-|ｾｲﾕｳ|SEIYU|ﾏﾙｴﾂ|ｻﾐｯﾄ|ｲﾅｹﾞﾔ|ﾏﾂﾓﾄｷﾖｼ|ﾏﾂｷﾖ|薬|ﾄﾞﾗｯｸﾞ|ｳｴﾙｼｱ|ｽｷﾞ|DAISO|ﾀﾞｲｿ-|ｾﾘｱ|CANDO|ｷｬﾝﾄﾞｩ)/.test(d)) return 'Daily';
  if (/(AMAZON|ｱﾏｿﾞﾝ|YAMADA|ﾔﾏﾀﾞ|ﾋﾞｯｸｶﾒﾗ|ﾖﾄﾞﾊﾞｼ|ﾆﾄﾘ|IKEA|無印|UNIQLO|ﾕﾆｸﾛ|GU|ZOZO|楽天|YAHOO|ﾏﾙｲ|ﾙﾐﾈ|ﾊﾟﾙｺ|ｲｾﾀﾝ|ﾀｶｼﾏﾔ|ﾐﾂｺｼ|ｼｮｯﾌﾟ|SHOP|STORE|ｽﾄｱ|MALL|PAYPAY|ﾍﾟｲﾍﾟｲ|SQ\*|BASE)/.test(d)) return 'Shopping';
  if (/(STEAM|NINTENDO|任天堂|PLAYSTATION|SONY|YOUTUB|NETFLIX|PRIME|DISNEY|HULU|U-NEXT|SPOTIFY|APPLE|GOOGLE|DMM|PIXIV|ｹﾞ-ﾑ|ｶﾗｵｹ|映画|ｼﾈﾏ|TOHO|TICKET|ﾁｹｯﾄ|ｲﾍﾞﾝﾄ|ﾗｲﾌﾞ|本|書店|BOOK|TSUTAYA|GEO|ｹﾞｵ)/.test(d)) return 'Entertainment';
  if (/(SUICA|PASMO|ICOCA|JR|地下鉄|ﾒﾄﾛ|METRO|交通|ﾀｸｼ-|ﾊﾞｽ|航空|ANA|JAL|PEACH|PARKING|駐車|TIMES|ﾄﾞｺﾓ|DOCOMO|AU|SOFTBANK|UQ|Y!MOBILE|LINEMO|POVO|通信|ETC|高速|ｶﾞｿﾘﾝ|ENEOS)/.test(d)) return 'Transport';
  if (/(美容|ｻﾛﾝ|ﾈｲﾙ|ｴｽﾃ|ﾏﾂｴｸ|ﾍｱ-|ｶｯﾄ|ｸﾘﾆｯｸ|病院|歯科|眼科|薬局|ﾏｯｻ-ｼﾞ|整体)/.test(d)) return 'Beauty';
  if (/(HOTEL|BOOKING|AGODA|EXPEDIA|JTB|HIS|旅行|旅館|ﾎﾃﾙ|AIRBNB|TRIP|TOUR)/.test(d)) return 'Travel';
  if (/(ガス|水道|電気|ﾃﾞﾝｷ|保険|税金|NHK|年金|電力|東京瓦斯|TEPCO|家賃|ｱﾊﾟﾏﾝ)/.test(d)) return 'Fixed';
  return 'Others';
};

export const formatCurrency = (val) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
