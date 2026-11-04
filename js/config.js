/* ============================================================
 * config.js — 全局配置（可调参数集中在此）
 * ============================================================ */

/** 手绘线条图标：统一描边/圆头笔触，颜色随文字 currentColor */
const ICON = paths =>
  `<svg class="li" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const ICONS = {
  home:    ICON('<path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 10.8V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-8.2"/><path d="M10 20v-5h4v5"/>'),
  tea:     ICON('<path d="M5.5 10.5H16v4.5a5 5 0 0 1-5 5h-.5a5 5 0 0 1-5-5z"/><path d="M16 11.5h1.8a2.4 2.4 0 0 1 0 4.8H16"/><path d="M9 7.5c0-1.2 1-1.4 1-2.5M12.5 7.5c0-1.2 1-1.4 1-2.5"/>'),
  plus:    ICON('<path d="M12 5.5v13M5.5 12h13"/>'),
  msg:     ICON('<path d="M4 7A2.5 2.5 0 0 1 6.5 4.5h11A2.5 2.5 0 0 1 20 7v6a2.5 2.5 0 0 1-2.5 2.5H10.5L6 19.5v-4A2.5 2.5 0 0 1 4 13z"/><path d="M8.5 9h7M8.5 11.8h4.5"/>'),
  user:    ICON('<circle cx="12" cy="8" r="3.8"/><path d="M5.5 19.5c1-3.4 3.4-5 6.5-5s5.5 1.6 6.5 5"/>'),
  bell:    ICON('<path d="M6.5 16v-5.5a5.5 5.5 0 0 1 11 0V16l1.5 2.5h-14z"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
  gear:    ICON('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6M6 6l1.8 1.8M16.2 16.2 18 18M18 6l-1.8 1.8M7.8 16.2 6 18"/>'),
  pencil:  ICON('<path d="M4.5 19.5l1-3.8L16.6 4.6a1.9 1.9 0 0 1 2.8 2.8L8.3 18.5z"/><path d="M14.8 6.4l2.8 2.8"/>'),
  search:  ICON('<circle cx="10.5" cy="10.5" r="5.8"/><path d="M15.3 15.3 20 20"/>'),
  note:    ICON('<path d="M9.5 17V5.8l9-2v11.4"/><circle cx="7" cy="17.2" r="2.4"/><circle cx="16" cy="15" r="2.4"/>'),
  pen:     ICON('<path d="M13.5 4.5c2 2.6 4.4 3.6 6 3.8-1 4-4 7.8-8 9l-4.3-4.3c1.3-4 4-6.8 6.3-8.5z"/><path d="M7.5 16.5 4 20"/>'),
  sliders: ICON('<path d="M5.5 4.5v15M12 4.5v15M18.5 4.5v15"/><circle cx="5.5" cy="9.5" r="1.9"/><circle cx="12" cy="15" r="1.9"/><circle cx="18.5" cy="7.5" r="1.9"/>'),
  mic:     ICON('<rect x="9.2" y="3.5" width="5.6" height="10" rx="2.8"/><path d="M6 11.5a6 6 0 0 0 12 0M12 17.5v3"/>'),
  fader:   ICON('<path d="M4.5 8.5h15M4.5 15.5h15"/><circle cx="9.5" cy="8.5" r="2.2"/><circle cx="14.5" cy="15.5" r="2.2"/>'),
  palette: ICON('<path d="M12 3.5a8.5 8.5 0 1 0 .3 17c1.4 0 1.8-1 1.3-1.9-.5-1 0-1.9 1.4-1.9h1.6a4 4 0 0 0 4-4c0-5-3.8-9.2-8.6-9.2z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.6" r="1"/><circle cx="16" cy="10" r="1"/>'),
  clapper: ICON('<rect x="3.5" y="9" width="17" height="10.5" rx="2"/><path d="M3.5 9l1.8-4h15.2l-1.8 4M9 5l-1.8 4M14 5l-1.8 4"/>'),
  mega:    ICON('<path d="M4 10.5v3.5h3.5l8.5 4.5v-13L7.5 10z"/><path d="M19 9.5a4.2 4.2 0 0 1 0 5"/>'),
  speech:  ICON('<path d="M4 7A2.5 2.5 0 0 1 6.5 4.5h11A2.5 2.5 0 0 1 20 7v5.5a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6V15h-.3A2.5 2.5 0 0 1 4 12.5z"/><path d="M8.5 8.5h7M8.5 11.3h4.5"/>'),
  scroll:  ICON('<path d="M7 4.5h10.5a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H8"/><path d="M7 4.5a2 2 0 0 0-2 2V18a2 2 0 0 1-2 2h5"/><path d="M10.5 9h5.5M10.5 12.5h5.5"/>'),
  all:     ICON('<circle cx="12" cy="12" r="2.2"/><path d="M12 4v3.5M12 16.5V20M4 12h3.5M16.5 12H20"/>'),
};

const CONFIG = {
  appName: "曲境",

  /** 环境（来自 js/env.js，部署时替换该文件切换 dev/prod） */
  env: (window.QUQI_ENV && window.QUQI_ENV.ENV) || "dev",
  apiBase: (window.QUQI_ENV && window.QUQI_ENV.API_BASE) || "/api/v1",
  useMock: window.QUQI_ENV ? window.QUQI_ENV.USE_MOCK !== false : true,

  /** 小图标（手绘线条风），通过 [data-icon] 注入静态 DOM */
  icons: ICONS,

  /** 发布分类（发布器等仍按工种归类） */
  categories: ["全部", "作词", "作曲", "编曲", "干音", "后期", "美工", "PV"],

  /** 首页检索：并行标签组（可多选，组内任一命中、组间叠加） */
  tagGroups: [
    { key: "风格", tags: ["古风", "国风电子", "现代流行", "民谣", "电音", "摇滚", "ACG", "戏腔", "爵士", "纯音乐"] },
    { key: "工种", tags: ["歌手", "作曲", "作词", "编曲", "和声", "念白", "后期", "美工", "PV"] },
    { key: "用途", tags: ["同人企划", "原创企划", "游戏配乐", "广播剧", "个人单曲", "商用宣传"] },
    { key: "授权", tags: ["商业", "非商业"] },
  ],

  /** 标签同义词（检索时命中任一即可） */
  tagAlias: {
    歌手: ["歌手", "演唱", "干音", "女声", "男声"],
    作词: ["作词", "词作"],
    电音: ["电音", "电子"],
    ACG: ["ACG", "同人", "游戏"],
  },

  /** 分类图标 */
  categoryIcons: {
    全部: ICONS.all, 作词: ICONS.pen, 作曲: ICONS.note, 编曲: ICONS.sliders,
    干音: ICONS.mic, 后期: ICONS.fader, 美工: ICONS.palette, PV: ICONS.clapper,
  },

  /** 注册可选工种（可多选，可跳过） */
  roles: ["作曲", "作词", "编曲", "歌手", "念白", "后期", "美工", "PV", "宣发"],

  /** 工种图标 */
  roleIcons: {
    作曲: ICONS.note, 作词: ICONS.pen, 编曲: ICONS.sliders, 歌手: ICONS.mic, 念白: ICONS.speech,
    后期: ICONS.fader, 美工: ICONS.palette, PV: ICONS.clapper, 宣发: ICONS.mega,
  },

  /** 各分类发布时必需的内容（av=音频或视频 / video / image / lyric） */
  mediaRules: {
    作曲: "av", 编曲: "av", 干音: "av", 后期: "av",
    PV: "video", 美工: "image", 作词: "lyric",
  },

  /** 社区话题 */
  topics: ["全部", "编曲交流", "填词切磋", "企划茶话", "设备党", "避雷曝光"],

  /** 聊天默认表情（符合古风调性的贴纸），另可从相册导入表情包 */
  stickers: [
    { key: "nice",     e: "🎐", t: "妙哉" },
    { key: "tea",      e: "🍵", t: "奉茶一盏" },
    { key: "ok",       e: "📜", t: "收到" },
    { key: "please",   e: "🙏", t: "有劳了" },
    { key: "congrats", e: "🏮", t: "恭喜开单" },
    { key: "moved",    e: "🌙", t: "泪目" },
    { key: "wait",     e: "⏳", t: "容我斟酌" },
    { key: "love",     e: "🪶", t: "爱了爱了" },
  ],

  /** 头像渐变色池（按名字 hash 分配） */
  avatarColors: [
    "linear-gradient(135deg,#2152FF,#6B8CFF)",
    "linear-gradient(135deg,#3B4252,#7B88A8)",
    "linear-gradient(135deg,#2FA36B,#6ED3A0)",
    "linear-gradient(135deg,#8F9B1E,#C6D92E)",
    "linear-gradient(135deg,#6A3BFF,#9D7BFF)",
  ],

  /** UI 参数 */
  ui: {
    toastDuration: 1800,      // toast 显示时长 ms
    waveBarsCard: 16,         // 瀑布流卡片波形条数
    waveBarsViewer: 26,       // 沉浸页波形条数
    coverHeightDefault: 150,  // 瀑布流封面默认高度 px
  },
};
