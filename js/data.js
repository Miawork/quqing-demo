/* ============================================================
 * data.js — Mock 数据（生产环境替换为 API 响应）
 *
 * Work 字段说明：
 *   type   分类（作词/作曲/编曲/干音/后期/美工/PV）
 *   biz    "商业" | "非商业"
 *   audio  是否含音频（可播放）
 *   video  是否为视频作品
 *   cover  封面（CSS 背景值；null = 无封面，走默认模板）
 *   glyph  封面主字（有封面时显示）
 *   lyric  歌词文本（词作专用；无封面时自动排版为词作模板）
 *   ch     瀑布流封面高度 px（模拟不同图片比例）
 *   dur    音/视频时长
 * 封面适配优先级：video > cover > lyric 模板 > 音频模板
 * ============================================================ */

/* ---------- 平台资讯（头图与社区共用的公众号式文章） ---------- */
const ARTICLES = [
  {
    id: 1, kicker: "平台企划", title: "《九州录》系列企划正式启动：九曲连章，现招两位作曲人",
    author: "曲境官方", date: "09-20", read: 3204, like: 186, liked: false,
    glyph: "州", grad: "linear-gradient(120deg,#2152FF 0%,#6B8CFF 60%,#C6D92E 100%)",
    sections: [
      { p: "「九州风物，各成一曲。」由沧海遗音社主催、曲境平台监制的系列企划《九州录》今日正式启动。企划共九首曲目，以九州风物为题，词作已全部完成，现面向全站招募两位作曲人。" },
      { h: "企划要什么样的曲", p: "整体风格为大气叙事向国风，参考方向：五声调式为骨、民乐与管弦并举。每首预算 ¥3,000–5,000，商用买断，签平台电子协议，稿酬全程托管。" },
      { h: "如何报名", p: "点击文末按钮进入企划招募页投递报名，附上你的代表作与档期即可。主催将在一周内通过站内私信联系试稿人选，试稿有偿。" },
      { p: "平台提示：所有企划约稿务必通过平台签约与托管，勿站外交易。祝各位曲师接单顺利，曲遇知音。" },
    ],
    cta: { txt: "前往企划招募 ›", act: "demand" },
  },
  {
    id: 2, kicker: "本周热议", title: "戏腔到底该怎么混？编曲人和混音师「吵」起来了",
    author: "曲境官方", date: "09-21", read: 5127, like: 342, liked: false,
    glyph: "戏", grad: "linear-gradient(120deg,#3B4252 0%,#7B88A8 70%,#6ED3A0 100%)",
    sections: [
      { p: "本周社区最热的帖子来自编曲人江篱的一个提问：国风电子里的琵琶与戏腔，混进 Future Bass 底鼓后中频全糊，EQ 怎么挖都不透。一石激起千层浪，编曲党和混音党在评论区展开了友好而激烈的切磋。" },
      { h: "两派观点", p: "编曲派认为问题出在编配阶段：中频排布太挤，戏腔进来之前就该给它让位。混音派则主张侧链闪避只挂 200–500Hz 频段、戏腔双轨平行处理，一轨只留气声高频。" },
      { h: "平台小结", p: "无论先编后混还是边编边混，「留频段」永远比「挖频段」省力。我们把高赞回答整理进了话题精华，点击文末按钮即可围观完整讨论，欢迎带着你的工程截图参战。" },
    ],
    cta: { txt: "去围观完整讨论 ›", act: "topic" },
  },
  {
    id: 3, kicker: "新人扶持", title: "首单免佣金计划上线：9 月新入驻音乐人首笔订单 0 抽成",
    author: "曲境官方", date: "09-18", read: 2860, like: 254, liked: false,
    glyph: "免", grad: "linear-gradient(120deg,#2FA36B 0%,#6ED3A0 65%,#C6D92E 100%)",
    sections: [
      { p: "为帮助新入驻的音乐人接到第一单，曲境推出「首单免佣金计划」：2026 年 9 月 1 日后完成注册并通过工种认证的创作者，首笔完成的订单平台 0 抽成，稿酬全额结算。" },
      { h: "参与方式", p: "点击文末按钮报名后自动生效，无需其他操作。首单完成（买家验收 + 双方互评）后，佣金将随稿酬一并结算至钱包，可正常提现。" },
      { h: "注意事项", p: "仅限通过平台签约与托管的订单；站外交易不计入活动。每位创作者限享一次，活动解释权归平台所有。" },
    ],
    cta: { txt: "一键报名参加 ›", act: "signup" },
  },
];

/* ---------- 首页头图轮播 ---------- */
const BANNERS = [
  {
    kicker: "平台企划", title: "《九州录》系列企划", sub: "九曲连章 · 招募作曲×2 · 预算充足",
    glyph: "州", grad: "linear-gradient(120deg,#2152FF 0%,#6B8CFF 60%,#C6D92E 100%)",
    act: () => openArticle(1),
  },
  {
    kicker: "本周热议", title: "戏腔到底该怎么混？", sub: "编曲人和混音师吵起来了，快来围观",
    glyph: "戏", grad: "linear-gradient(120deg,#3B4252 0%,#7B88A8 70%,#6ED3A0 100%)",
    act: () => openArticle(2),
  },
  {
    kicker: "新人扶持", title: "首单免佣金计划", sub: "9 月新入驻音乐人首笔订单 0 抽成",
    glyph: "免", grad: "linear-gradient(120deg,#2FA36B 0%,#6ED3A0 65%,#C6D92E 100%)",
    act: () => openArticle(3),
  },
];

const WORKS = [
  {
    id: 1, type: "作曲", title: "《山河故人》古风作曲小样",
    author: "墨临溪", role: "作曲人 · 5 年经验",
    tags: ["古风", "江湖", "燃向", "原创企划", "纯音乐"],
    biz: "商业", price: "¥2,000 起",
    audio: true, video: false, cover: null, dur: "01:32", ch: 150,
    desc: "五声羽调式，箫与古筝主导，副歌弦乐推进，适合江湖侠气向企划。可按需调整段落结构。",
    detail: "整曲结构为 前奏-A-B-副歌-间奏-B-副歌-尾奏。商用约稿含分轨工程与两次免费修改，词曲同步创作可另议。",
  },
  {
    id: 2, type: "作词", title: "《折枝令》词作 · 待曲",
    author: "青梧", role: "词作者 · 古典文学系",
    tags: ["古风", "抒情", "同人企划", "悲怆"],
    biz: "非商业", price: "¥300 起",
    audio: false, video: false, cover: null,
    lyric: "折枝赠别时，霜色满旧衣。\n一别经年后，灯下叹雁迟。",
    desc: "化用唐人赠别诗意象，平仄工整，适合中速抒情曲。接受同人企划非商用合作。",
    detail: "全词两段主歌一段副歌，押 i 韵，已完成终稿。非商用需标注词作者署名；商用请私信另行报价。",
  },
  {
    id: 3, type: "干音", title: "干音试音 ·《咏絮》副歌片段",
    author: "绾绾", role: "古风女声 · 气声/戏腔",
    tags: ["古风", "戏腔", "歌手", "抒情", "个人单曲", "空灵"],
    biz: "商业", price: "¥800 起",
    audio: true, video: false, dur: "00:47", ch: 190,
    cover: "linear-gradient(160deg,#2152FF,#6B8CFF)", glyph: "绾",
    desc: "戏腔转真声演示，音域 G3–E5，设备：U87 + 羽毛声卡，可交付 48k/24bit 干音。",
    detail: "商用价格含三次返修，加急 +30%。干音交付格式 WAV 48k/24bit，无混响无压缩。",
  },
  {
    id: 4, type: "编曲", title: "《灯花误》国风电子编曲 Demo（含演示视频）",
    author: "江篱", role: "编曲人 · 国风电子",
    tags: ["国风电子", "电音", "燃向", "游戏配乐", "ACG"],
    biz: "商业", price: "¥3,200 起",
    audio: true, video: true, dur: "02:10", ch: 160,
    cover: "linear-gradient(160deg,#3B4252,#7B88A8)", glyph: "燈",
    desc: "传统五声旋律 × Future Bass 律动，琵琶采样与合成器音色融合，适合游戏宣传曲。",
    detail: "交付分轨 + 总线工程（Cubase / Studio One），含两次结构性修改与三次细节修改。",
  },
  {
    id: 5, type: "美工", title: "古风歌曲封面 · 工笔风格样例",
    author: "枕山客", role: "美术 · 工笔/水墨",
    tags: ["古风", "同人企划", "治愈"],
    biz: "非商业", price: "¥400 起",
    audio: false, video: false, ch: 200,
    cover: "linear-gradient(160deg,#8F9B1E,#C6D92E)", glyph: "畫",
    desc: "专接古风单曲封面与企划立绘，工笔重彩风格，交付 3000px 高清源文件。",
    detail: "非商用 ¥400/张，商用 ¥1,200/张 起，含线稿确认与一次成图修改。排单约 10 天。",
  },
  {
    id: 6, type: "PV", title: "歌曲 PV · 水墨动态分镜示例",
    author: "孤鹤", role: "PV 师 · AE/水墨动效",
    tags: ["古风", "商用宣传", "空灵", "抒情"],
    biz: "商业", price: "¥2,600 起",
    audio: false, video: true, dur: "00:15", ch: 150,
    cover: "linear-gradient(160deg,#1E2A24,#2FA36B)", glyph: "影",
    desc: "水墨晕染转场 + 歌词字幕动效，本片段为 15s 分镜演示，全曲 PV 周期约 30 天。",
    detail: "静态 PV ¥2,600 起；半动态含插画协调 ¥5,000 起。商用签平台协议，稿酬托管分期结算。",
  },
  {
    id: 7, type: "后期", title: "《雾隐江南》混音前后对比试听",
    author: "沈昼", role: "混音师 · 人声后期",
    tags: ["古风", "抒情", "个人单曲", "治愈"],
    biz: "商业", price: "¥1,200 起",
    audio: true, video: false, cover: null, dur: "01:05", ch: 130,
    desc: "人声修音 + 混音 + 母带一条龙，古风向人声空间感处理是强项，附前后对比片段。",
    detail: "单曲混音 ¥1,200 起，含两次返修；修音 + 混音 + 母带打包 ¥2,000 起。",
  },
  {
    id: 8, type: "作词", title: "《雪满弓刀》战歌向词作",
    author: "白鹭洲", role: "词作者 · 战歌/叙事向",
    tags: ["古风", "江湖", "燃向", "原创企划"],
    biz: "商业", price: "¥600 起",
    audio: false, video: false, cover: null,
    lyric: "雪满弓刀夜，孤城鼓角鸣。\n一骑出关去，身后是长风。",
    desc: "战歌向叙事词，意象刚劲，适合大气弦乐编曲。可命题定制，商用非商用皆接。",
    detail: "命题词作 5 个工作日交付，含两次韵脚与意象调整。商用买断另议。",
  },
];

const ARTISTS = [
  {
    name: "墨临溪", roles: ["作曲", "编曲"],
    bio: "专注古风五声调式创作五年，代表作《山河故人》《雪满弓刀》。全年接稿，商单档期请提前预约。",
    works: 36, deals: 120, rate: "99%", price: "¥2,000 起",
    style: {
      tags: ["五声调式", "江湖侠气", "箫/古筝主导", "弦乐推进"],
      desc: "偏爱叙事性旋律，擅长用五声音阶营造山河意象；副歌习惯弦乐层层推进，适合江湖、家国向企划。电音赛博向不接。",
    },
    shop: [
      { kind: "work", title: "《关山月》成品曲买断", price: "¥3,500", biz: "商业", glyph: "月", grad: "linear-gradient(150deg,#3B4252,#7B88A8)" },
      { kind: "work", title: "《风雪归人》待售小样", price: "¥1,200", biz: "非商业", glyph: "雪", grad: "linear-gradient(150deg,#2FA36B,#6ED3A0)" },
      { kind: "bundle", title: "江湖企划全包 · 词曲+编曲", price: "¥6,800 起", count: 3, desc: "作曲+编曲+词，整体风格统一", glyph: "侠", grad: "linear-gradient(150deg,#8F9B1E,#C6D92E)" },
    ],
    prices: [
      ["古风作曲（含小样）", "商业", "¥2,000 起"],
      ["词曲打包", "商业", "¥2,800 起"],
      ["同人企划作曲", "非商业", "¥500 起"],
    ],
  },
  {
    name: "绾绾", roles: ["干音", "演唱"],
    bio: "古风女声，擅长气声与戏腔，音域 G3–E5。可接和声编写，交付高质量干音。",
    works: 52, deals: 210, rate: "98%", price: "¥800 起",
    style: {
      tags: ["气声", "戏腔", "古风女声", "G3–E5"],
      desc: "音色婉转，戏腔真声无缝转换是招牌；情歌、叙事曲均可，嗓音向不接。",
    },
    shop: [
      { kind: "work", title: "《咐悬》副歌干音现货", price: "¥600", biz: "非商业", glyph: "咐", grad: "linear-gradient(150deg,#2152FF,#6B8CFF)" },
      { kind: "bundle", title: "主题曲演唱套餐 · 主喳+和声", price: "¥1,500 起", count: 2, desc: "主喳干音+全套和声编写与录制", glyph: "戏", grad: "linear-gradient(150deg,#2152FF,#6B8CFF)" },
    ],
    prices: [
      ["歌曲演唱（含和声）", "商业", "¥800 起"],
      ["同人企划演唱", "非商业", "¥300 起"],
    ],
  },
  {
    name: "青梧", roles: ["作词"],
    bio: "古典文学专业，擅化用诗词意象，工整雅致。可命题创作，非商企划友好。",
    works: 88, deals: 96, rate: "97%", price: "¥300 起",
    style: {
      tags: ["诗词化用", "工整押韵", "赠别/思乡"],
      desc: "走古典雅词路线，典故考据严谨；命题创作需提供世界观设定，白话口水词不接。",
    },
    shop: [
      { kind: "work", title: "《折枝令》成词待曲", price: "¥300", biz: "非商业", glyph: "折", grad: "linear-gradient(150deg,#2FA36B,#6ED3A0)" },
      { kind: "work", title: "《雪满弓刀》战歌词买断", price: "¥900", biz: "商业", glyph: "刀", grad: "linear-gradient(150deg,#1E2A24,#2FA36B)" },
    ],
    prices: [
      ["定制词作", "商业", "¥800 起"],
      ["同人企划词作", "非商业", "¥300 起"],
    ],
  },
  {
    name: "江篱", roles: ["编曲", "后期"],
    bio: "国风电子方向编曲人，游戏音乐合作经验丰富。混音母带一条龙可谈。",
    works: 41, deals: 75, rate: "98%", price: "¥3,200 起",
    style: {
      tags: ["国风电子", "Future Bass", "琵琶采样", "游戏向"],
      desc: "传统五声 × 电子律动是主打，适合游戏宣传曲与燃向 PV；纯传统器乐编制也可。",
    },
    shop: [
      { kind: "bundle", title: "游戏企划音乐包 · 编曲×3+后期", price: "¥12,000 起", count: 4, desc: "主题曲+两首场景BGM+全部混音母带", glyph: "燈", grad: "linear-gradient(150deg,#3B4252,#7B88A8)" },
    ],
    prices: [
      ["整曲编曲", "商业", "¥3,200 起"],
      ["混音+母带", "商业", "¥1,500 起"],
    ],
  },
  {
    name: "枕山客", roles: ["美工"],
    bio: "工笔重彩风格画师，专接古风单曲封面、企划主视觉与人设立绘。",
    works: 120, deals: 230, rate: "99%", price: "¥400 起",
    style: {
      tags: ["工笔重彩", "人设立绘", "单曲封面"],
      desc: "设色浓丽、线条工整，擅长带故事感的构图；人设卡、立绘、封面均可，Q 版不接。",
    },
    shop: [
      { kind: "work", title: "古风封面现货 · 竹林夜孴", price: "¥800", biz: "商业", glyph: "竹", grad: "linear-gradient(150deg,#1E2A24,#2FA36B)" },
      { kind: "work", title: "古风封面现货 · 红衣們僥", price: "¥800", biz: "商业", glyph: "红", grad: "linear-gradient(150deg,#2152FF,#6B8CFF)" },
      { kind: "bundle", title: "企划视觉全包 · 主视觉+人设×3", price: "¥4,600 起", count: 4, desc: "主视觉一张+三张人设立绘，风格统一", glyph: "畫", grad: "linear-gradient(150deg,#8F9B1E,#C6D92E)" },
    ],
    prices: [
      ["单曲封面", "商业", "¥1,200 起"],
      ["单曲封面", "非商业", "¥400 起"],
    ],
  },
];

/* ---------- 我的主页：个人风格 + 橱窗 ----------
 * 橱窗可挂：零散待售作品（kind:"work"，现货直接买）
 *          或企划整体约稿（kind:"bundle"，歌单式打包）
 * ------------------------------------------------------------ */
const MY_STYLE = {
  tags: ["古风作曲", "五声旋律", "叙事向", "同人友好"],
  desc: "旋律先行流，偏爱用简单动机发展成完整叙事；抽屉里存了很多江湖小调，欢迎带设定来聊。",
};

const MY_SHOP = [
  { kind: "work", title: "《长安夜行录》成品买断", price: "¥2,400", biz: "商业", glyph: "♩", grad: "linear-gradient(150deg,#2FA36B,#6ED3A0)" },
  { kind: "work", title: "《掬水月》待售小样", price: "¥900", biz: "非商业", glyph: "♬", grad: "linear-gradient(150deg,#2152FF,#6B8CFF)" },
  { kind: "bundle", title: "同人企划音乐包 · 词曲×3", price: "¥4,200 起", count: 3, desc: "三首词曲打包，风格统一，含小样", glyph: "♪", grad: "linear-gradient(150deg,#3B4252,#7B88A8)" },
];

/* 我的报价（可在主页编辑增删） */
const MY_PRICES = [
  { t: "古风作曲（含小样）", note: "商用 · 全款托管 · 15 个工作日", biz: "商业", price: "¥1,800 起" },
  { t: "整曲编曲（国风配器）", note: "商用 · 分期支付 · 20 个工作日", biz: "商业", price: "¥3,500 起" },
  { t: "同人企划作曲", note: "非商用 · 标注署名即可", biz: "非商业", price: "¥600 起" },
];

/* 我的作品（管理：置顶 / 隐藏 / 删除；新作品从发布页上传） */
const MY_WORKS = [
  { title: "长安夜行录", role: "作曲", plays: "1.2w", glyph: "♪", grad: "linear-gradient(135deg,#2FA36B,#6ED3A0)", top: false, hidden: false },
  { title: "掬水月", role: "编曲", plays: "8,432", glyph: "♬", grad: "linear-gradient(135deg,#2152FF,#6B8CFF)", top: false, hidden: false },
  { title: "雁归引", role: "作曲", plays: "6,010", glyph: "♩", grad: "linear-gradient(135deg,#3B4252,#7B88A8)", top: false, hidden: false },
];

const DEMANDS = [
  {
    title: "《山海谣》个人企划 · 招干音与 PV",
    desc: "自作词曲的山海经题材单曲，编曲已完成，现招一位清丽女声干音与一位水墨风 PV 师，非商用，署名+稿酬。",
    whoType: "个人企划", whoName: "我", budget: "¥1,500–2,500",
    biz: "非商业", tags: ["招干音", "招 PV", "水墨风"],
  },
  {
    title: "原创古风企划《九州录》招募作曲×2",
    desc: "系列企划共 9 首曲目，现招两位作曲，需擅长大气叙事向国风，词已完成。商用买断，预算充足，签平台协议。",
    whoType: "企划方", whoName: "沧海遗音社", budget: "¥3,000–5,000/首",
    biz: "商业", tags: ["作曲", "档期 10 月前"],
  },
  {
    title: "同人歌企划急招后期混音一名",
    desc: "某武侠游戏同人歌，干音与伴奏齐全，需混音+简单母带，风格参考已备。非商用，署名+稿酬。",
    whoType: "个人企划", whoName: "二十四桥", budget: "¥500–800",
    biz: "非商业", tags: ["后期", "一周内交付"],
  },
  {
    title: "古风单曲 PV 招募（水墨风）",
    desc: "已完成歌曲《雾隐江南》寻 PV 师，倾向水墨动态风格，全曲 4 分 12 秒，商用发布于各视频平台。",
    whoType: "制作人", whoName: "半盏茶", budget: "¥4,000–6,000",
    biz: "商业", tags: ["PV", "AE 动效"],
  },
  {
    title: "募集古风男声干音（戏腔佳）",
    desc: "抒情武侠向单曲，需低沉男声，副歌含少量戏腔。试音通过后签约，商用买断干音。",
    whoType: "工作室", whoName: "闻弦音乐", budget: "¥1,000–1,500",
    biz: "商业", tags: ["干音", "男声"],
  },
];

const POSTS = [
  {
    name: "沈昼", topic: "避雷曝光", time: "1 小时前",
    title: "转发提醒，商单务必托管！",
    txt: "转发给刚入坦的朋友们，#避雷 这事真不是危言耸听。",
    like: 18, liked: false, reposts: 2,
    origin: { name: "孤鹤", title: "提醒：接 PV 单一定走平台协议托管", txt: "上个月一个站外单，成片交付后甲方失联。大家商单务必平台托管稿酬…" },
    comments: [],
  },
  {
    name: "江篱", topic: "编曲交流", time: "2 小时前",
    title: "国风电子里琵琶采样总是发闷，怎么破？",
    txt: "混进 Future Bass 底鼓后琵琶中频全糊了，EQ 挖了 300Hz 还是不透。各位有什么侧链思路或者好用的琵琶音源推荐吗？#编曲交流 #求助 ",
    like: 46, liked: false, reposts: 5,
    comments: [
      { name: "墨临溪", txt: "侧链挂在 200-500Hz 频段就行，不用全频段闪避。", time: "1 小时前" },
      { name: "绾绾", type: "sticker", key: "tea", time: "55 分钟前" },
      { name: "沈昼", txt: "试试把琵琶双轨平行处理，一轨只留喋喋体高频。", time: "40 分钟前" },
    ],
  },
  {
    name: "青梧", topic: "填词切磋", time: "5 小时前",
    title: "「平仄」在古风歌词里到底要不要死磕？",
    txt: "最近接的单子甲方要求严格律诗平仄，但配上旋律以后倒字严重。想听听大家实际约稿中是怎么和作曲协调的，有没有先曲后词的经验帖…",
    like: 132, liked: true, reposts: 12,
    comments: [
      { name: "半盏茶", txt: "我们企划都是先曲后词，倒字优先级高于平仄。", time: "3 小时前" },
    ],
  },
  {
    name: "半盏茶", topic: "企划茶话", time: "昨天",
    title: "第一次当企划主催，流程求带！",
    txt: "想做一个七首歌的节气企划，词曲唱美 PV 全要约。预算怎么分配比较合理？协议是每个人单独签还是拉群统一签？求过来人指路。",
    like: 98, liked: false, reposts: 7,
    comments: [
      { name: "孤鹤", txt: "建议逐个签，工种交付节点不同，统一签容易扶皮。", time: "昨天" },
      { name: "枕山客", txt: "美工和 PV 记得留足档期，我们一般排在成曲之后。", time: "昨天" },
      { name: "绾绾", txt: "预算建议曲 3 词 1.5 唱 1.5 美 1 PV 3（千元）起步～", time: "12 小时前" },
    ],
  },
  {
    name: "绾绾", topic: "设备党", time: "昨天",
    title: "两千预算的录音麦，古风女声怎么选？",
    txt: "目前用 XX 电容麦录戏腔总觉得高频刺。预算 2k 以内，主要录干音交后期，有没有姐妹分享一下实际对比？",
    like: 71, liked: false, reposts: 0,
    comments: [],
  },
  {
    name: "孤鹤", topic: "避雷曝光", time: "3 天前",
    title: "提醒：接 PV 单一定走平台协议托管",
    txt: "上个月一个站外单，成片交付后甲方失联。大家商单务必平台托管稿酬，分镜确认后再开工，留好沟通记录。",
    like: 210, liked: false, reposts: 43,
    comments: [
      { name: "墨临溪", txt: "血泪教训 +1，现在只接托管单。", time: "2 天前" },
    ],
  },
];

const MESSAGES = [
  { name: "沧海遗音社", txt: "您好，看到您的作曲报价，想邀请您参与《九州录》企划…", time: "10:24", unread: 2 },
  { name: "九州录企划组", txt: "绾绾：和声小样我传群里啦，大家听听", time: "09:50", unread: 3, group: true },
  { name: "绾绾", txt: "小样收到啦！副歌戏腔部分我录了两版给你参考～", time: "昨天", unread: 1 },
  { name: "平台助手", txt: "您与「半盏茶」的约稿协议已生效，首期稿酬已托管。", time: "昨天", unread: 0 },
  { name: "青梧", txt: "《折枝令》第二段改好了，你看看这版韵脚顺不顺。", time: "周一", unread: 0 },
];
/* ---------- 通知中心 ----------
 * type: order（约稿/订单）| comment（评论和@）| like（点赞）| fav（收藏）| fan（新增关注）| system
 * from: 触发用户；target: 关联作品/帖子；cmt: 评论正文
 * ------------------------------------------------------------ */
const NOTICES = [
  { type: "order", icon: "单", txt: "《九州录》主题曲订单：定金 ¥2,000 已托管，可以开工啦", time: "10 分钟前", unread: true },
  { type: "comment", icon: "评", txt: "「绢绢」评论了你的作品《掬水月》：副歌戲腔这里起得真好！", time: "28 分钟前", unread: true,
    from: ["绢绢"], target: { kind: "work", title: "掬水月" }, cmt: "副歌戲腔这里起得真好！间奏的笛子也很惊艳，已单曲循环一下午。" },
  { type: "fan", icon: "粉", txt: "「白鹭洲」关注了你，去看看 TA 的主页吧", time: "1 小时前", unread: true },
  { type: "like", icon: "赞", txt: "「二十四桥」赞了你的作品《掬水月》", time: "3 小时前", unread: true,
    from: ["二十四桥"], target: { kind: "work", title: "掬水月" } },
  { type: "fav", icon: "藏", txt: "「孤鹤」收藏了你的作品《雁归引》到「宝藏 BGM」", time: "5 小时前", unread: true,
    from: ["孤鹤"], target: { kind: "work", title: "雁归引" }, fold: "宝藏 BGM" },
  { type: "comment", icon: "@", txt: "「沈昼」在帖子里 @ 了你：这个混音思路可以听听他的", time: "昨天", unread: false,
    from: ["沈昼"], target: { kind: "post", idx: 1 }, cmt: "@洛云笙 这个混音思路可以听听他的，他之前处理琵琶的方法很巧。" },
  { type: "order", icon: "评", txt: "「二十四桥」给了你一条 5 星评价，已展示在你的主页", time: "昨天", unread: false },
  { type: "like", icon: "赞", txt: "「半盏茶」等 3 人赞了帖子「提醒：接 PV 单一定走平台协议托管」", time: "昨天", unread: false,
    from: ["半盏茶", "青梓", "墨临溪"], target: { kind: "post", idx: 5 } },
  { type: "system", icon: "告", txt: "平台提示：商单请务必签署电子协议并托管稿酬", time: "昨天", unread: false },
];/* ---------- 关注 / 粉丝（小红书式：可互关） ---------- */

/** 关注我的人（互相关注即好友） */
const FANS = ["绾绾", "青梧", "半盏茶", "孤鹤", "白鹭洲", "沈昼", "二十四桥"];

/** 非音乐人用户的补充资料（关注/粉丝列表展示用） */
const USERS_EXTRA = {
  半盏茶: { bio: "企划主催 · 节气企划筹备中" },
  孤鹤: { bio: "PV 师 · AE/水墨动效" },
  白鹭洲: { bio: "词作者 · 战歌/叙事向" },
  沈昼: { bio: "混音师 · 人声后期" },
  二十四桥: { bio: "同人企划 · 武侠向" },
  沧海遗音社: { bio: "企划方 · 《九州录》系列主催" },
  闻弦音乐: { bio: "工作室 · 古风全流程制作" },
};

/* ---------- 新朋友（最近关注了我的人，回关即成为好友）----------
 * status: "pending" 待回关 | "accepted" 已互关
 * ------------------------------------------------------------ */
const FRIEND_REQS = [
  { name: "二十四桥", msg: "关注了你 · 武侠同人企划主催，想细聊合作", time: "1 小时前", status: "pending" },
  { name: "半盏茶", msg: "关注了你 · 听了你的《掬水月》想约编曲", time: "昨天", status: "pending" },
];

/* ---------- 订单 ----------
 * mine   : "接稿"（我是乙方） | "约稿"（我是甲方）
 * status : 待付款 → 进行中 → 待验收 → 已完成
 * payMode: "定金"（50% 定金 + 尾款） | "全款"，由被购买方（接稿方）设定
 * paid   : 已托管金额；rated: 订单完成后我方是否已评价
 * ------------------------------------------------------------ */
const ORDERS = [
  {
    id: "QX-20260916-002", title: "《长安雪》同风格编曲 · 约稿邀约", who: "二十四桥",
    mine: "接稿", amount: 2800, paid: 0, payMode: "全款", status: "待接稿", date: "09-16",
    note: "对方向你发起了约稿邀约 · 接受后协议生效并等待托管",
  },
  {
    id: "QX-20260915-009", title: "《山河录》插曲编曲", who: "白鹭洲",
    mine: "接稿", amount: 3000, paid: 0, payMode: "定金", status: "待付款", date: "09-15",
    note: "协议已签署 · 您可设定本单交易方式，等待对方托管",
  },
  {
    id: "QX-20260912-031", title: "《九州录》主题曲作曲", who: "沧海遗音社",
    mine: "接稿", amount: 4000, paid: 2000, payMode: "定金", status: "进行中", date: "09-12",
    note: "定金 50% 已托管 · 约定 10-15 交付小样",
  },
  {
    id: "QX-20260910-118", title: "单曲封面 · 工笔重彩", who: "枕山客",
    mine: "约稿", amount: 1200, paid: 0, payMode: "定金", status: "待付款", date: "09-10",
    note: "协议已签署 · 对方支持定金模式，可先付 50%",
  },
  {
    id: "QX-20260901-207", title: "《雾隐江南》混音+母带", who: "沈昼",
    mine: "约稿", amount: 1200, paid: 600, payMode: "定金", status: "待验收", date: "09-01",
    note: "成品已交付 · 验收时需补齐尾款 ¥600",
    file: { name: "雾隐江南_混音母带_v2.wav", size: "680 MB", ext: "WAV" },
  },
  {
    id: "QX-20260820-054", title: "同人曲《掬水月》编曲", who: "二十四桥",
    mine: "接稿", amount: 2600, paid: 2600, payMode: "全款", status: "已完成", date: "08-20",
    note: "稿酬已结算入账 · 待您评价对方", rated: false,
    file: { name: "掬水月_编曲工程+分轨.zip", size: "1.2 GB", ext: "ZIP" },
  },
];

/* ---------- 评价 ----------
 * 订单完成后双方互评，公开展示在个人主页
 * 仅可整体公开 / 隐藏，不可单条设置
 * ------------------------------------------------------------ */
const REVIEWS = {
  墨临溪: [
    { from: "沧海遗音社", stars: 5, txt: "旋律叙事感很强，两轮修改都非常耐心，交稿准时。", date: "08-30" },
    { from: "半盏茶", stars: 5, txt: "同人企划预算有限，仍给了很完整的编曲建议，强推。", date: "07-12" },
  ],
  绾绾: [
    { from: "二十四桥", stars: 5, txt: "戟腔惊艳，干音干净，返修沟通顺畅。", date: "08-02" },
  ],
  青梧: [
    { from: "孤鹤", stars: 4, txt: "词很有画面感，韵脚工整，就是档期稍满需早约。", date: "08-18" },
  ],
  枕山客: [
    { from: "白鹭洲", stars: 5, txt: "工笔质感拉满，封面与曲风适配度极高。", date: "09-03" },
  ],
};

/** 我收到的评价（展示在我的主页，可整体开关） */
const MY_REVIEWS = [
  { from: "二十四桥", stars: 5, txt: "编曲配器层次分明，国风味很正，合作体验极佳！", date: "08-25" },
  { from: "半盏茶", stars: 4, txt: "成品质量很好，中途改了一版副歌也很爽快地配合了。", date: "07-18" },
];

/* ---------- 聊天记录 ----------
 * who: "me" | "them"；type: "text" | "sticker"（默认表情 key）| "img"（相册导入）
 * ------------------------------------------------------------ */
/* ---------- 群聊（讨论组）：members 不含自己；owner 为 "me" 表示我是群主 ---------- */
const GROUPS = {
  九州录企划组: { members: ["沧海遗音社", "绾绾", "青梧"], owner: "沧海遗音社" },
};

const CHATS = {
  九州录企划组: [
    { who: "sys", type: "sys", txt: "沧海遗音社 邀请你加入了群聊" },
    { who: "them", name: "沧海遗音社", type: "text", txt: "拉了个企划组，《九州录》的进度都在这里同步～" },
    { who: "them", name: "绾绾", type: "text", txt: "和声小样我传群里啦，大家听听" },
    { who: "them", name: "青梧", type: "text", txt: "词稿二校今晚发出，明天对谱面" },
  ],
  沧海遗音社: [
    { who: "them", type: "text", txt: "您好，看到您的作曲报价，想邀请您参与《九州录》企划～" },
    { who: "them", type: "text", txt: "预算 ¥4,000，商用授权，周期一个月，方便细聊吗？" },
    { who: "me", type: "sticker", key: "tea" },
    { who: "me", type: "text", txt: "可以的！我下午把往期 demo 发您参考～" },
  ],
  绾绾: [
    { who: "them", type: "text", txt: "小样收到啦！副歌戟腔部分我录了两版给你参考～" },
    { who: "them", type: "sticker", key: "congrats" },
  ],
  平台助手: [
    { who: "them", type: "text", txt: "您与「半盏茶」的约稿协议已生效，首期稿酬已托管。" },
  ],
  青梧: [
    { who: "them", type: "text", txt: "《折枝令》第二段改好了，你看看这版韵脚顺不顺。" },
    { who: "me", type: "sticker", key: "nice" },
  ],
};