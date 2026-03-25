function cn(symbol, code, name, pinyin, shortPinyin, aliases = []) {
  return [symbol, code, name, pinyin, shortPinyin, aliases];
}

function us(symbol, code, name, aliases = []) {
  return [symbol, code, name, "", "", aliases];
}

const RAW_STOCK_LIBRARY = {
  a: [
    cn("sh600519", "600519", "贵州茅台", "guizhoumaotai", "gzmt", ["maotai"]),
    cn("sz000001", "000001", "平安银行", "pinganyinhang", "payh", ["pinganbank"]),
    cn("sz300750", "300750", "宁德时代", "ningdeshidai", "ndsd", ["catl"]),
    cn("sh601318", "601318", "中国平安", "zhongguopingan", "zgpa", ["pingan"]),
    cn("sh600036", "600036", "招商银行", "zhaoshangyinhang", "zsyh", ["cmb"]),
    cn("sh601012", "601012", "隆基绿能", "longjilvneng", "ljln", ["longi"]),
    cn("sh600276", "600276", "恒瑞医药", "hengruiyiyao", "hryy", ["hengrui"]),
    cn("sz002594", "002594", "比亚迪", "biyadi", "byd", ["byd"]),
    cn("sh600900", "600900", "长江电力", "changjiangdianli", "cjdl", ["cjdianli"]),
    cn("sz000858", "000858", "五粮液", "wuliangye", "wly", ["wuliangye"]),
    cn("sh688111", "688111", "金山办公", "jinshanbangong", "jsbg", ["wps"]),
    cn("sz002415", "002415", "海康威视", "haikangweishi", "hkws", ["hikvision"]),
    cn("sh600887", "600887", "伊利股份", "yiligufen", "ylgf", ["yili"]),
    cn("sh600309", "600309", "万华化学", "wanhuahuaxue", "whhx", ["wanhua"]),
    cn("sz300059", "300059", "东方财富", "dongfangcaifu", "dfcf", ["eastmoney"]),
    cn("sz002714", "002714", "牧原股份", "muyuangufen", "mygf", ["muyuan"]),
    cn("sh601166", "601166", "兴业银行", "xingyeyinhang", "xyyh", ["cib"]),
    cn("sh601398", "601398", "工商银行", "gongshangyinhang", "gsyh", ["icbc"]),
    cn("sh600030", "600030", "中信证券", "zhongxinzhengquan", "zxzq", ["citicsec"]),
    cn("sh600809", "600809", "山西汾酒", "shanxifenjiu", "sxfj", ["fenjiu"]),
    cn("sh600438", "600438", "通威股份", "tongweigufen", "twgf", ["tongwei"]),
    cn("sz000333", "000333", "美的集团", "meidejituan", "mdjt", ["midea"]),
    cn("sz000651", "000651", "格力电器", "gelidianqi", "gldq", ["gree"]),
    cn("sz002475", "002475", "立讯精密", "lixunjingmi", "lxjm", ["luxshare"]),
    cn("sh601888", "601888", "中国中免", "zhongguozhongmian", "zgzm", ["ctg"]),
    cn("sh600941", "600941", "中国移动", "zhongguoyidong", "zgyd", ["chinamobile"]),
    cn("sh600104", "600104", "上汽集团", "shangqijituan", "sqjt", ["saic"]),
    cn("sh601288", "601288", "农业银行", "nongyeyinhang", "nyyh", ["abc"]),
    cn("sh601988", "601988", "中国银行", "zhongguoyinhang", "zgyh", ["boc"]),
    cn("sh601328", "601328", "交通银行", "jiaotongyinhang", "jtyh", ["bocom"]),
    cn("sh600031", "600031", "三一重工", "sanyizhonggong", "syzg", ["sany"]),
    cn("sh600406", "600406", "国电南瑞", "guodiannanrui", "gdnr", ["nari"]),
    cn("sz000725", "000725", "京东方A", "jingdongfang", "jdfa", ["boe", "boea"]),
    cn("sz300124", "300124", "汇川技术", "huichuanjishu", "hcjs", ["inovance"]),
    cn("sh601138", "601138", "工业富联", "gongyefulian", "gyfl", ["foxconn"]),
    cn("sh603259", "603259", "药明康德", "yaomingkangde", "ymkd", ["wuxiapptec"]),
    cn("sz300308", "300308", "中际旭创", "zhongjixuchuang", "zjxc", ["innolight"]),
    cn("sz002371", "002371", "北方华创", "beifanghuachuang", "bfhc", ["naura"]),
    cn("sz000063", "000063", "中兴通讯", "zhongxingtongxun", "zxtx", ["zte"]),
    cn("sz300274", "300274", "阳光电源", "yangguangdianyuan", "ygdy", ["sungrow"]),
    cn("sz002230", "002230", "科大讯飞", "kedaxunfei", "kdxf", ["iflytek"]),
    cn("sz300760", "300760", "迈瑞医疗", "mairuiyiliao", "mryl", ["mindray"]),
    cn("sh600690", "600690", "海尔智家", "haierzhijia", "hezj", ["haier"]),
    cn("sh601857", "601857", "中国石油", "zhongguoshiyou", "zgsy", ["petrochina"]),
    cn("sh600028", "600028", "中国石化", "zhongguoshihua", "zgsh", ["sinopec"]),
    cn("sh601899", "601899", "紫金矿业", "zijinkuangye", "zjky", ["zijin"]),
    cn("sh601668", "601668", "中国建筑", "zhongguojianzhu", "zgjz", ["cscec"]),
    cn("sh601601", "601601", "中国太保", "zhongguotaibao", "zgtb", ["cpic"]),
    cn("sh601336", "601336", "新华保险", "xinhuabaoxian", "xhbx", ["newchina"]),
    cn("sh600050", "600050", "中国联通", "zhongguoliantong", "zglt", ["chinaunicom"]),
    cn("sh600886", "600886", "国投电力", "guotoudianli", "gtdl", ["sdicpower"]),
    cn("sz000100", "000100", "TCL科技", "tclkeji", "tclkj", ["tcl"]),
    cn("sz002304", "002304", "洋河股份", "yanghegufen", "yhgf", ["yanghe"]),
    cn("sz000568", "000568", "泸州老窖", "luzhoulaojiao", "lzlj", ["laojiao"]),
    cn("sh601633", "601633", "长城汽车", "changchengqiche", "ccqc", ["greatwall"]),
    cn("sh601919", "601919", "中远海控", "zhongyuanhaikong", "zyhk", ["cosco"]),
    cn("sh600703", "600703", "三安光电", "sananguangdian", "sagd", ["sanan"]),
    cn("sh688008", "688008", "澜起科技", "lanqikeji", "lqkj", ["montage"]),
    cn("sh603501", "603501", "韦尔股份", "weiergufen", "wegf", ["willsemi"]),
    cn("sz300502", "300502", "新易盛", "xinyisheng", "xys", ["eoptolink"]),
    cn("sh601995", "601995", "中金公司", "zhongjingongsi", "zjgs", ["cicc"]),
    cn("sh600893", "600893", "航发动力", "hangfadongli", "hfdl", ["aecc"]),
    cn("sh601985", "601985", "中国核电", "zhongguohedian", "zghd", ["cnnc"]),
    cn("sh603986", "603986", "兆易创新", "zhaoyichuangxin", "zycx", ["gigadevice"]),
    cn("sh600745", "600745", "闻泰科技", "wentaikeji", "wtkj", ["wingtech"]),
    cn("sh688981", "688981", "中芯国际", "zhongxinguoji", "zxgj", ["smic"]),
    cn("sh688256", "688256", "寒武纪", "hanwuji", "hwj", ["cambricon"]),
    cn("sz300014", "300014", "亿纬锂能", "yiweilineng", "ywln", ["eve"]),
    cn("sz002142", "002142", "宁波银行", "ningboyinhang", "nbyh", ["nbbank"]),
    cn("sh600460", "600460", "士兰微", "shilanwei", "slw", ["silan"]),
    cn("sh601658", "601658", "邮储银行", "youchuyinhang", "ycyh", ["psbc"])
  ],
  hk: [
    cn("hk00700", "00700", "腾讯控股", "tengxunkonggu", "txkg", ["tencent"]),
    cn("hk09988", "09988", "阿里巴巴-SW", "alibaba", "albb", ["baba", "alibaba"]),
    cn("hk01810", "01810", "小米集团-W", "xiaomijituan", "xmjt", ["xiaomi"]),
    cn("hk03690", "03690", "美团-W", "meituan", "mt", ["meituan"]),
    cn("hk09618", "09618", "京东集团-SW", "jingdongjituan", "jdjt", ["jd"]),
    cn("hk02318", "02318", "中国平安", "zhongguopingan", "zgpa", ["pingan"]),
    cn("hk01299", "01299", "友邦保险", "youbangbaoxian", "ybbx", ["aia"]),
    cn("hk00883", "00883", "中国海洋石油", "zhongguohaiyangshiyou", "zghysy", ["cnooc"]),
    cn("hk02015", "02015", "理想汽车-W", "lixiangqiche", "lxqc", ["liauto"]),
    cn("hk09868", "09868", "小鹏汽车-W", "xiaopengqiche", "xpqc", ["xpeng"]),
    cn("hk09626", "09626", "哔哩哔哩-W", "bilibili", "bili", ["bilibili", "b站"]),
    cn("hk03888", "03888", "金山软件", "jinshanruanjian", "jsrj", ["kingsoft"]),
    cn("hk09999", "09999", "网易-S", "wangyi", "wy", ["netease"]),
    cn("hk01024", "01024", "快手-W", "kuaishou", "ks", ["kuaishou"]),
    cn("hk09633", "09633", "农夫山泉", "nongfushanquan", "nfsq", ["nongfu"]),
    cn("hk00941", "00941", "中国移动", "zhongguoyidong", "zgyd", ["chinamobile"]),
    cn("hk01398", "01398", "工商银行", "gongshangyinhang", "gsyh", ["icbc"]),
    cn("hk03988", "03988", "中国银行", "zhongguoyinhang", "zgyh", ["boc"]),
    cn("hk00939", "00939", "建设银行", "jiansheyinhang", "jsyh", ["ccb"]),
    cn("hk03968", "03968", "招商银行", "zhaoshangyinhang", "zsyh", ["cmb"]),
    cn("hk00005", "00005", "汇控", "huikong", "hk", ["hsbc", "huifeng"]),
    cn("hk00175", "00175", "吉利汽车", "jiliqiche", "jlqc", ["geely"]),
    cn("hk01211", "01211", "比亚迪股份", "biyadigufen", "bydgf", ["byd"]),
    cn("hk02269", "02269", "药明生物", "yaomingshengwu", "ymsw", ["wuxibiologics"]),
    cn("hk00857", "00857", "中国石油股份", "zhongguoshiyougufen", "zgsygf", ["petrochina"]),
    cn("hk00386", "00386", "中国石油化工股份", "zhongguoshiyouhuagonggufen", "zgshhg", ["sinopec"]),
    cn("hk01088", "01088", "中国神华", "zhongguoshenhua", "zgsh", ["shenhua"]),
    cn("hk00981", "00981", "中芯国际", "zhongxinguoji", "zxgj", ["smic"]),
    cn("hk02020", "02020", "安踏体育", "antatiyu", "atty", ["anta"]),
    cn("hk06618", "06618", "京东健康", "jingdongjiankang", "jdjk", ["jdhealth"]),
    cn("hk09866", "09866", "蔚来-SW", "weilai", "wl", ["nio"]),
    cn("hk09888", "09888", "百度集团-SW", "baidujituan", "bdjt", ["baidu"]),
    cn("hk09961", "09961", "携程集团-S", "xiechengjituan", "xcjt", ["trip", "ctrip"]),
    cn("hk06690", "06690", "海尔智家", "haierzhijia", "hezj", ["haier"]),
    cn("hk02331", "02331", "李宁", "lining", "ln", ["li ning"]),
    cn("hk03800", "03800", "协鑫科技", "xiexinkeji", "xxkj", ["gcl"]),
    cn("hk02601", "02601", "中国太保", "zhongguotaibao", "zgtb", ["cpic"]),
    cn("hk02382", "02382", "舜宇光学科技", "shunyuguangxuekeji", "sygx", ["sunnyoptical"]),
    cn("hk01109", "01109", "华润置地", "huarunzhidi", "hrzd", ["crland"]),
    cn("hk01797", "01797", "东方甄选", "dongfangzhenxuan", "dfzx", ["eastbuy"]),
    cn("hk09901", "09901", "新东方-S", "xindongfang", "xdf", ["neworiental"]),
    cn("hk01876", "01876", "百威亚太", "baiweiyatai", "bwyt", ["budweiserapac"]),
    cn("hk02628", "02628", "中国人寿", "zhongguorenshou", "zgrs", ["chinalife"]),
    cn("hk01093", "01093", "石药集团", "shiyaojituan", "syjt", ["cspc"]),
    cn("hk06862", "06862", "海底捞", "haidilao", "hdl", ["haidilao"]),
    cn("hk00762", "00762", "中国联通", "zhongguoliantong", "zglt", ["chinaunicom"]),
    cn("hk00728", "00728", "中国电信", "zhongguodianxin", "zgdx", ["chinatelecom"]),
    cn("hk00388", "00388", "香港交易所", "xianggangjiaoyisuo", "xgjys", ["hkex"]),
    cn("hk09863", "09863", "零跑汽车", "lingpaoqiche", "lpqc", ["leapmotor"]),
    cn("hk02313", "02313", "申洲国际", "shenzhouguoji", "szgj", ["shenzhou"]),
    cn("hk00268", "00268", "金蝶国际", "jindieguoji", "jdgj", ["kingdee"]),
    cn("hk00772", "00772", "阅文集团", "yuewenjituan", "ywjt", ["yuewen"]),
    cn("hk06060", "06060", "众安在线", "zhonganzaixian", "zazx", ["zhongan"]),
    cn("hk06160", "06160", "百济神州", "baijishenzhou", "bjsz", ["beigene"]),
    cn("hk02388", "02388", "中银香港", "zhongyinxianggang", "zyxg", ["bochk"]),
    cn("hk00960", "00960", "龙湖集团", "longhujituan", "lhjt", ["longfor"])
  ],
  us: [
    us("usAAPL", "AAPL", "Apple", ["apple", "iphone", "苹果"]),
    us("usMSFT", "MSFT", "Microsoft", ["microsoft", "azure", "微软"]),
    us("usNVDA", "NVDA", "NVIDIA", ["nvidia", "英伟达", "gpu"]),
    us("usTSLA", "TSLA", "Tesla", ["tesla", "特斯拉"]),
    us("usAMZN", "AMZN", "Amazon", ["amazon", "亚马逊"]),
    us("usMETA", "META", "Meta Platforms", ["meta", "facebook", "脸书"]),
    us("usGOOGL", "GOOGL", "Alphabet", ["google", "alphabet", "谷歌"]),
    us("usAMD", "AMD", "Advanced Micro Devices", ["amd", "超威"]),
    us("usNFLX", "NFLX", "Netflix", ["netflix", "奈飞"]),
    us("usINTC", "INTC", "Intel", ["intel", "英特尔"]),
    us("usAVGO", "AVGO", "Broadcom", ["broadcom", "博通"]),
    us("usORCL", "ORCL", "Oracle", ["oracle", "甲骨文"]),
    us("usADBE", "ADBE", "Adobe", ["adobe"]),
    us("usQCOM", "QCOM", "Qualcomm", ["qualcomm", "高通"]),
    us("usMU", "MU", "Micron Technology", ["micron", "美光"]),
    us("usARM", "ARM", "Arm Holdings", ["arm", "安谋"]),
    us("usSMCI", "SMCI", "Super Micro Computer", ["supermicro", "超微电脑"]),
    us("usTSM", "TSM", "Taiwan Semiconductor", ["tsmc", "台积电"]),
    us("usASML", "ASML", "ASML Holding", ["asml"]),
    us("usAMAT", "AMAT", "Applied Materials", ["appliedmaterials", "应用材料"]),
    us("usLRCX", "LRCX", "Lam Research", ["lamresearch", "泛林"]),
    us("usKLAC", "KLAC", "KLA", ["kla"]),
    us("usPLTR", "PLTR", "Palantir", ["palantir"]),
    us("usCRM", "CRM", "Salesforce", ["salesforce"]),
    us("usUBER", "UBER", "Uber Technologies", ["uber", "优步"]),
    us("usSHOP", "SHOP", "Shopify", ["shopify"]),
    us("usSQ", "SQ", "Block", ["square", "block"]),
    us("usCOIN", "COIN", "Coinbase Global", ["coinbase", "加密"]),
    us("usHOOD", "HOOD", "Robinhood Markets", ["robinhood"]),
    us("usSNOW", "SNOW", "Snowflake", ["snowflake"]),
    us("usDDOG", "DDOG", "Datadog", ["datadog"]),
    us("usMDB", "MDB", "MongoDB", ["mongodb"]),
    us("usNOW", "NOW", "ServiceNow", ["servicenow"]),
    us("usPANW", "PANW", "Palo Alto Networks", ["paloalto"]),
    us("usCRWD", "CRWD", "CrowdStrike", ["crowdstrike"]),
    us("usNET", "NET", "Cloudflare", ["cloudflare"]),
    us("usAPP", "APP", "AppLovin", ["applovin"]),
    us("usRBLX", "RBLX", "Roblox", ["roblox"]),
    us("usABNB", "ABNB", "Airbnb", ["airbnb"]),
    us("usBABA", "BABA", "Alibaba Group", ["alibaba", "阿里巴巴"]),
    us("usPDD", "PDD", "PDD Holdings", ["pdd", "拼多多"]),
    us("usJD", "JD", "JD.com", ["jd", "京东"]),
    us("usBIDU", "BIDU", "Baidu", ["baidu", "百度"]),
    us("usTCOM", "TCOM", "Trip.com Group", ["trip", "ctrip", "携程"]),
    us("usBEKE", "BEKE", "KE Holdings", ["keholdings", "贝壳"]),
    us("usBILI", "BILI", "Bilibili", ["bilibili", "哔哩哔哩", "b站"]),
    us("usNIO", "NIO", "NIO", ["nio", "蔚来"]),
    us("usXPEV", "XPEV", "XPeng", ["xpeng", "小鹏"]),
    us("usLI", "LI", "Li Auto", ["liauto", "理想"]),
    us("usFUTU", "FUTU", "Futu Holdings", ["futu", "富途"]),
    us("usTME", "TME", "Tencent Music", ["tencentmusic", "腾讯音乐"]),
    us("usTAL", "TAL", "TAL Education", ["tal", "好未来"]),
    us("usYUMC", "YUMC", "Yum China", ["yumchina", "百胜中国"]),
    us("usJPM", "JPM", "JPMorgan Chase", ["jpmorgan", "摩根大通"]),
    us("usBAC", "BAC", "Bank of America", ["bankofamerica", "美国银行"]),
    us("usWFC", "WFC", "Wells Fargo", ["wellsfargo", "富国银行"]),
    us("usGS", "GS", "Goldman Sachs", ["goldmansachs", "高盛"]),
    us("usMS", "MS", "Morgan Stanley", ["morganstanley", "摩根士丹利"]),
    us("usV", "V", "Visa", ["visa"]),
    us("usMA", "MA", "Mastercard", ["mastercard"]),
    us("usPYPL", "PYPL", "PayPal", ["paypal"]),
    us("usAXP", "AXP", "American Express", ["amex", "americanexpress"]),
    us("usLLY", "LLY", "Eli Lilly", ["elililly", "礼来"]),
    us("usJNJ", "JNJ", "Johnson & Johnson", ["johnson", "强生"]),
    us("usPFE", "PFE", "Pfizer", ["pfizer", "辉瑞"]),
    us("usMRK", "MRK", "Merck", ["merck", "默沙东"]),
    us("usABBV", "ABBV", "AbbVie", ["abbvie", "艾伯维"]),
    us("usUNH", "UNH", "UnitedHealth Group", ["unitedhealth"]),
    us("usCVS", "CVS", "CVS Health", ["cvs"]),
    us("usXOM", "XOM", "Exxon Mobil", ["exxon", "埃克森"]),
    us("usCVX", "CVX", "Chevron", ["chevron", "雪佛龙"]),
    us("usCOP", "COP", "ConocoPhillips", ["conocophillips", "康菲"]),
    us("usSLB", "SLB", "Schlumberger", ["schlumberger", "斯伦贝谢"]),
    us("usBA", "BA", "Boeing", ["boeing", "波音"]),
    us("usGE", "GE", "GE Aerospace", ["geaerospace", "通用电气"]),
    us("usCAT", "CAT", "Caterpillar", ["caterpillar", "卡特彼勒"]),
    us("usDE", "DE", "Deere & Company", ["deere", "迪尔"]),
    us("usWMT", "WMT", "Walmart", ["walmart", "沃尔玛"]),
    us("usCOST", "COST", "Costco", ["costco", "好市多"]),
    us("usTGT", "TGT", "Target", ["target", "塔吉特"]),
    us("usDIS", "DIS", "Disney", ["disney", "迪士尼"]),
    us("usCMCSA", "CMCSA", "Comcast", ["comcast"]),
    us("usSBUX", "SBUX", "Starbucks", ["starbucks", "星巴克"]),
    us("usMCD", "MCD", "McDonald's", ["mcdonalds", "麦当劳"]),
    us("usKO", "KO", "Coca-Cola", ["cocacola", "可口可乐"]),
    us("usPEP", "PEP", "PepsiCo", ["pepsico", "百事"]),
    us("usNKE", "NKE", "Nike", ["nike", "耐克"]),
    us("usFSLR", "FSLR", "First Solar", ["firstsolar"]),
    us("usENPH", "ENPH", "Enphase Energy", ["enphase"]),
    us("usRIVN", "RIVN", "Rivian Automotive", ["rivian"]),
    us("usLCID", "LCID", "Lucid Group", ["lucid"]),
    us("usSOFI", "SOFI", "SoFi Technologies", ["sofi"]),
    us("usRKLB", "RKLB", "Rocket Lab", ["rocketlab"]),
    us("usGME", "GME", "GameStop", ["gamestop"]),
    us("usAMC", "AMC", "AMC Entertainment", ["amc"]),
    us("usDAL", "DAL", "Delta Air Lines", ["delta", "达美"]),
    us("usAAL", "AAL", "American Airlines", ["americanairlines", "美国航空"]),
    us("usCCL", "CCL", "Carnival", ["carnival", "嘉年华"]),
    us("usCELH", "CELH", "Celsius Holdings", ["celsius"])
  ]
};

function createStock(market, row) {
  const [symbol, code, name, pinyin, shortPinyin, aliases] = row;
  return {
    market,
    symbol,
    code,
    name,
    ...(pinyin ? { pinyin } : {}),
    ...(shortPinyin ? { shortPinyin } : {}),
    ...(aliases?.length ? { aliases } : {})
  };
}

const STOCK_LIBRARY = Object.fromEntries(
  Object.entries(RAW_STOCK_LIBRARY).map(([market, rows]) => [
    market,
    rows.map((row) => createStock(market, row))
  ])
);

function pick(market, symbol) {
  return STOCK_LIBRARY[market].find((stock) => stock.symbol === symbol);
}

export const SAMPLE_WATCHLIST = {
  a: [pick("a", "sh600519"), pick("a", "sz300750"), pick("a", "sz002594")],
  hk: [pick("hk", "hk00700"), pick("hk", "hk01810"), pick("hk", "hk03690")],
  us: [pick("us", "usAAPL"), pick("us", "usNVDA"), pick("us", "usTSLA")]
};

function normalizeText(text) {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_.\/]+/g, "")
    .trim();
}

function getFieldScore(query, token, weight) {
  if (!token) {
    return 0;
  }

  if (token === query) {
    return weight + 320;
  }

  if (token.startsWith(query)) {
    return weight + 180 - Math.min(token.length - query.length, 80);
  }

  const index = token.indexOf(query);
  if (index >= 0) {
    return weight + 30 - Math.min(index, 20);
  }

  return 0;
}

function buildSearchFields(stock) {
  return {
    code: normalizeText(stock.code),
    symbol: normalizeText(stock.symbol),
    name: normalizeText(stock.name),
    pinyin: normalizeText(stock.pinyin),
    shortPinyin: normalizeText(stock.shortPinyin),
    aliases: (stock.aliases || []).map(normalizeText)
  };
}

const SEARCH_INDEX = Object.fromEntries(
  Object.entries(STOCK_LIBRARY).map(([market, stocks]) => [
    market,
    stocks.map((stock) => ({
      stock,
      fields: buildSearchFields(stock)
    }))
  ])
);

function dedupeBySymbol(stocks) {
  const map = new Map();
  stocks.forEach((stock) => {
    map.set(stock.symbol, stock);
  });
  return Array.from(map.values());
}

function getMatchScore(entry, query) {
  const { fields } = entry;
  let score = 0;

  score = Math.max(score, getFieldScore(query, fields.code, 1500));
  score = Math.max(score, getFieldScore(query, fields.symbol, 1450));
  score = Math.max(score, getFieldScore(query, fields.name, 1100));
  score = Math.max(score, getFieldScore(query, fields.pinyin, 1040));
  score = Math.max(score, getFieldScore(query, fields.shortPinyin, 1000));

  fields.aliases.forEach((alias) => {
    score = Math.max(score, getFieldScore(query, alias, 920));
  });

  return score;
}

export function getStockLibrary() {
  return STOCK_LIBRARY;
}

export function getStockBySymbol(market, symbol) {
  return (STOCK_LIBRARY[market] || []).find((stock) => stock.symbol === symbol) || null;
}

export function createManualCandidate(market, query) {
  const raw = String(query || "").trim();
  if (!raw) {
    return null;
  }

  if (market === "a" && /^\d{6}$/.test(raw)) {
    const prefix = /^[569]/.test(raw) ? "sh" : /^[48]/.test(raw) ? "bj" : "sz";
    return {
      market,
      symbol: `${prefix}${raw}`,
      code: raw,
      name: raw,
      isCustom: true
    };
  }

  if (market === "hk" && /^\d{1,5}$/.test(raw)) {
    const code = raw.padStart(5, "0");
    return {
      market,
      symbol: `hk${code}`,
      code,
      name: code,
      isCustom: true
    };
  }

  if (market === "us" && /^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(raw)) {
    const code = raw.toUpperCase();
    return {
      market,
      symbol: `us${code}`,
      code,
      name: code,
      isCustom: true
    };
  }

  return null;
}

export function getSearchMatches(market, query, existingIds = new Set(), limit = 8) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const ranked = (SEARCH_INDEX[market] || [])
    .filter(({ stock }) => !existingIds.has(`${market}:${stock.symbol}`))
    .map((entry) => ({
      stock: entry.stock,
      score: getMatchScore(entry, normalizedQuery)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.stock.code.localeCompare(right.stock.code, "zh-CN");
    })
    .map((item) => item.stock);

  const candidate = createManualCandidate(market, query);
  const results = dedupeBySymbol(ranked);

  if (candidate && !existingIds.has(`${market}:${candidate.symbol}`)) {
    const hasSameSymbol = results.some((stock) => stock.symbol === candidate.symbol);
    if (!hasSameSymbol) {
      results.unshift({
        ...candidate,
        label: "按代码直接添加"
      });
    }
  }

  return results.slice(0, limit);
}
