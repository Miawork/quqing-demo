/* ============================================================
 * app.js — 应用状态与交互逻辑
 *   state    ：唯一可变状态
 *   render*  ：状态 → DOM
 *   全局函数 ：供模板 onclick 调用（openViewer / toast 等）
 * ============================================================ */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

/* ---------- 状态 ---------- */
const state = {
  homeMode: "works",      // "works" | "artist" | "demand"
  tagSel: {},             // 首页标签检索：{ 组名: [已选标签…] }，空 = 全部
  topic: "全部",           // 社区话题筛选
  filteredWorks: [...WORKS], // 当前筛选后的作品（沉浸式浏览顺序依据）
  accepting: true,        // 「我的」接稿状态
  myRoles: [],            // 已选工种（注册时可多选，可跳过后补）
  customRoles: [],        // 用户自定义工种（通过「其他」创建，全局复用）
  roleSetupMode: "register", // "register" | "edit"
  regStep: 1,             // 注册步骤：1 基本资料 | 2 选工种
  profile: {              // 注册资料（仅圈名必填，ID 留空随机分配）
    name: "", uid: "", gender: "保密", bio: "",
    avatar: null,         // 自定义头像 dataURL；null = 用简笔画头像
  },
  following: new Set(["墨临溪", "青梧", "绾绾"]), // 我关注的人（小红书式：互相关注即好友）
  blocked: new Set(),      // 已拉黑的用户（黑名单，设置里可解除）
  followTab: "following",  // 关注列表当前页签 "following" | "fans"
  favFolders: [           // 收藏夹（歌单式分类）
    { name: "默认收藏", ids: [2] },
    { name: "古风灵感", ids: [1, 4] },
  ],
  orderFilter: "全部",     // 订单状态筛选
  showMyReviews: true,     // 评价整体公开/隐藏（不可单条设置）
  rateOrderId: null,       // 当前评价的订单
  rateStars: 5,
  currentChat: null,       // 当前聊天对象
  myStickers: [],          // 相册导入的表情包 dataURL
  currentPost: null,       // 当前打开的帖子下标
  currentShare: null,      // 当前分享的帖子下标
  currentRepost: null,     // 当前转发的帖子下标
  searchHistory: ["古风作曲", "水墨 PV"], // 搜索历史（最多 8 条）
  settings: {              // 设置（小红书式）
    email: "", phone: "", password: "",
    theme: "light",        // 夜间模式：system | light | dark（默认日间）
    cacheMB: 12.6,         // 模拟缓存大小
    privacy: { showFollow: true, allowDM: true, findByPhone: false, personalized: true },
  },
};

/* ---------- 首页 ---------- */

/** 把手绘图标注入静态 DOM（[data-icon] 占位） */
function injectIcons() {
  $$("[data-icon]").forEach(el => { el.innerHTML = CONFIG.icons[el.dataset.icon] || ""; });
}

function renderCategories() {
  const selAll = CONFIG.tagGroups.flatMap(g => (state.tagSel[g.key] || []).map(t => ({ g: g.key, t })));
  // 首页紧凑筛选栏：抽屉入口 + 已选标签（不再占半屏，让作品第一眼可见）
  $("#catRow").innerHTML = `
    <div class="fb-btn ${selAll.length ? "has" : ""}" onclick="openCatDrawer()">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
      筛选${selAll.length ? ` · ${selAll.length}` : ""}
    </div>
    <div class="fb-chips">
      ${selAll.length
        ? selAll.map(s => `<div class="chip on" onclick="toggleTag('${s.g}','${s.t}')">${s.t} ✕</div>`).join("")
        : `<span class="fb-hint">按风格 / 工种 / 用途 / 授权筛选</span>`}
    </div>`;
  // 侧边抽屉：分组纵向铺开，一屏浏览全部分类
  const body = $("#catDrawerBody");
  if (body) body.innerHTML = CONFIG.tagGroups.map(g => {
    const sel = state.tagSel[g.key] || [];
    return `<div class="cd-group">
      <h5>${g.key}</h5>
      <div class="cd-chips">
        <div class="chip ${sel.length ? "" : "on"}" onclick="clearTagGroup('${g.key}')">全部</div>
        ${g.tags.map(t => `
        <div class="chip ${sel.includes(t) ? "on" : ""}" onclick="toggleTag('${g.key}','${t}')">${t}</div>`).join("")}
      </div></div>`;
  }).join("");
}

function openCatDrawer() { $("#drawerMask").classList.add("show"); }
function closeCatDrawer() { $("#drawerMask").classList.remove("show"); }

/** 多选：点击切换选中状态 */
function toggleTag(group, tag) {
  const sel = state.tagSel[group] || (state.tagSel[group] = []);
  const i = sel.indexOf(tag);
  i >= 0 ? sel.splice(i, 1) : sel.push(tag);
  renderCategories();
  renderHome();
}

function clearTagGroup(group) {
  state.tagSel[group] = [];
  renderCategories();
  renderHome();
}

function clearTags() {
  state.tagSel = {};
  renderCategories();
  renderHome();
}

/** 标签命中：含同义词（歌手→演唱/干音 等） */
function tagHit(hay, tag) {
  return (CONFIG.tagAlias[tag] || [tag]).some(t => hay.includes(t));
}

/** 组内任一命中（OR），组间叠加（AND） */
function matchTags(hay) {
  return CONFIG.tagGroups.every(g => {
    const sel = state.tagSel[g.key];
    return !sel || !sel.length || sel.some(t => tagHit(hay, t));
  });
}

function renderHome() {
  const feed = $("#homeFeed");

  if (state.homeMode === "works") {
    state.filteredWorks = WORKS.filter(w => matchTags([
      Array.isArray(w.type) ? w.type.join("/") : w.type,
      w.biz, w.role, (w.tags || []).join("/"),
    ].join("/")));
    feed.className = "masonry";
    feed.innerHTML = state.filteredWorks.length
      ? state.filteredWorks.map(workCardHTML).join("")
      : emptyHTML("没有符合筛选的作品，换个标签试试");

  } else if (state.homeMode === "artist") {
    const list = ARTISTS.filter(a => matchTags([
      a.roles.join("/"), a.bio,
      a.style ? a.style.tags.join("/") : "",
      (a.prices || []).map(p => p[1]).join("/"),
    ].join("/")));
    feed.className = "feed";
    feed.innerHTML = list.map(a => artistCardHTML(a, ARTISTS.indexOf(a))).join("")
      || emptyHTML("暂无符合筛选的音乐人");

  } else {
    const list = DEMANDS.filter(d => matchTags(
      [d.tags.join("/"), d.title, d.desc, d.biz].join("/")));
    feed.className = "feed";
    feed.innerHTML = list.map(demandCardHTML).join("") || emptyHTML("暂无符合筛选的招募");
  }
}

function setHomeMode(mode, el) {
  state.homeMode = mode;
  $$("#modeTabs .mode-tab").forEach(t => t.classList.toggle("on", t === el));
  renderHome();
}

/* ---------- 社区 ---------- */

function renderCommunity() {
  $("#topicRow").innerHTML = CONFIG.topics.map(t => `
    <div class="chip ${t === state.topic ? "on" : ""}" onclick="setTopic('${t}')">
      ${t === "全部" ? t : "# " + t}</div>`).join("");
  const articles = state.topic === "全部"
    ? `<div class="art-sec">平台资讯</div>` + ARTICLES.map(articleCardHTML).join("")
    : "";
  $("#commFeed").innerHTML = articles +
    (POSTS.filter(p => state.topic === "全部" || p.topic === state.topic)
      .map(postHTML).join("") || emptyHTML("该话题下暂无帖子"));
}

function setTopic(t) {
  state.topic = t;
  renderCommunity();
}

/** 热议卡片：跳到对应话题 */
function goHotTopic() {
  setTopic("编曲交流");
  toast("已切到热议话题 # 编曲交流");
}

function toggleLike(i) {
  const p = POSTS[i];
  p.liked = !p.liked;
  p.like += p.liked ? 1 : -1;
  renderCommunity();
  if (state.currentPost === i && $("#ovPost").classList.contains("show")) renderPostDetail();
}

/* ---------- 分享（多平台面板）/ 转发（微博式） ---------- */

function openShare(i) {
  state.currentShare = i;
  $("#shareMask").classList.add("show");
}
function closeShare() { $("#shareMask").classList.remove("show"); }

function shareTo(platform) {
  const p = POSTS[state.currentShare];
  closeShare();
  toast(`已分享《${p.title.slice(0, 10)}…》到${platform}`);
}
function copyShareLink() {
  closeShare();
  toast("链接已复制，快去粘贴吧");
}

/** 转发：引用原帖（转发的转发仍指向最初原帖，微博逻辑） */
function repostOriginOf(p) {
  return p.origin || { name: p.name, title: p.title, txt: p.txt };
}

function openRepost(i) {
  state.currentRepost = i;
  $("#repostTxt").value = "";
  $("#repostOrig").innerHTML = originBoxHTML(repostOriginOf(POSTS[i]));
  $("#repostMask").classList.add("show");
}
function closeRepost() { $("#repostMask").classList.remove("show"); }

function submitRepost() {
  const src = POSTS[state.currentRepost];
  const o = repostOriginOf(src);
  src.reposts = (src.reposts || 0) + 1;
  POSTS.unshift({
    name: state.profile.name || "洛云笙", topic: null, time: "刚刚",
    title: "转发：" + o.title,
    txt: $("#repostTxt").value.trim() || "转发",
    like: 0, liked: false, reposts: 0, comments: [], origin: o,
  });
  closeRepost();
  closeOverlay("ovPost");
  state.topic = "全部";
  renderCommunity();
  toast("转发成功");
}

function openPost(i, focusCmt) {
  state.currentPost = i;
  renderPostDetail();
  $("#cmtTray").classList.remove("show");
  $("#ovPost").classList.add("show");
  if (focusCmt) setTimeout(() => $("#cmtInput").focus(), 250);
}

function renderPostDetail() {
  $("#postBody").innerHTML = postDetailHTML(POSTS[state.currentPost], state.currentPost);
}

function addComment() {
  const input = $("#cmtInput");
  const v = input.value.trim();
  if (!v) return;
  POSTS[state.currentPost].comments.push({
    name: state.profile.name || "洛云笙", txt: v, time: "刚刚",
  });
  input.value = "";
  renderPostDetail();
  renderCommunity();
  toast("评论成功");
}

/* 评论：发表情 / 发图片 */

function toggleCmtTray() {
  const tray = $("#cmtTray");
  if (!tray.classList.contains("show")) {
    tray.innerHTML = CONFIG.stickers.map(s => `
      <div class="tray-item" onclick="sendCmtSticker('${s.key}')"><span>${s.e}</span><b>${s.t}</b></div>`).join("");
  }
  tray.classList.toggle("show");
}

function sendCmtSticker(key) {
  POSTS[state.currentPost].comments.push({
    name: state.profile.name || "洛云笙", type: "sticker", key, time: "刚刚",
  });
  $("#cmtTray").classList.remove("show");
  renderPostDetail();
  renderCommunity();
  toast("表情已发送");
}

function pickCmtImg() { $("#cmtImgFile").click(); }

function onCmtImg(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    POSTS[state.currentPost].comments.push({
      name: state.profile.name || "洛云笙", type: "img", src: e.target.result, time: "刚刚",
    });
    renderPostDetail();
    renderCommunity();
    toast("图片评论已发送");
  };
  reader.readAsDataURL(file);
  input.value = "";
}

/* ---------- 发帖（正文 #话题+空格 自动识别标签） ---------- */

function openPostForm() {
  $("#postTitle").value = "";
  $("#postTxt").value = "";
  postTxtInput();
  $("#postMask").classList.add("show");
}

function closePostForm() {
  $("#postMask").classList.remove("show");
}

/** 发布面板入口：跳到社区页并打开发帖弹层 */
function switchToCommunityPost() {
  switchTab($('.tab[data-scr="scr-comm"]'));
  openPostForm();
}

/** 实时预览正文里识别到的 #标签 */
function postTxtInput() {
  const tags = [...$("#postTxt").value.matchAll(/#([^#\s]+)(?=\s|$)/g)].map(m => m[1]);
  $("#postTagPrev").innerHTML = tags.length
    ? "已识别标签：" + tags.map(t => `<b class="htag">#${esc(t)}</b>`).join(" ")
    : "✎ 正文输入「#话题 + 空格」自动识别为标签";
}

function submitPost() {
  const title = $("#postTitle").value.trim();
  if (!title) return toast("先给帖子起个标题吧");
  const txt = $("#postTxt").value.trim() || "（无正文）";
  const m = txt.match(/#([^#\s]+)(?=\s|$)/);
  const topic = m && CONFIG.topics.includes(m[1]) ? m[1] : null;
  POSTS.unshift({
    name: state.profile.name || "洛云笙", topic, time: "刚刚",
    title, txt, like: 0, liked: false, reposts: 0, comments: [],
  });
  state.topic = topic || "全部";
  closePostForm();
  renderCommunity();
  toast(m ? `发布成功，已带标签 #${m[1]}` : "发布成功");
}

/* ---------- 通知中心（小红书式归类） ---------- */

/** 分类：赞和收藏 / 评论和@ / 约稿通知（重要） */
const NOTICE_CATS = {
  like:    { title: "赞和收藏", types: ["like", "fav"] },
  comment: { title: "评论和@",  types: ["comment"] },
  order:   { title: "约稿通知", types: ["order", "system"] },
};

const catOfNotice = n =>
  Object.keys(NOTICE_CATS).find(k => NOTICE_CATS[k].types.includes(n.type)) || null;

function renderNoticeDot() {
  $("#nDot").style.display = NOTICES.some(n => n.unread) ? "block" : "none";
  renderMsgEntries();
}

/** 消息页顶部：分类入口磁贴（带未读角标） */
function renderMsgEntries() {
  const box = $("#msgEntries");
  if (!box) return;
  box.innerHTML = Object.keys(NOTICE_CATS).map(k => {
    const c = NOTICE_CATS[k];
    const unread = NOTICES.filter(n => c.types.includes(n.type) && n.unread).length;
    return `<div class="me-tile" onclick="openNotices('${k}')">
      <span class="me-ic me-ic-${k}">${k === "like" ? "♥" : k === "comment" ? "评" : "约"}</span>
      <b>${c.title}</b>
      ${unread ? `<i class="me-badge">${unread}</i>` : ""}</div>`;
  }).join("");
}

/** 打开通知：不传 cat 看全部，传 cat 只看该分类 */
function openNotices(cat) {
  const c = cat && NOTICE_CATS[cat];
  const list = c ? NOTICES.filter(n => c.types.includes(n.type)) : NOTICES;
  $("#noticeTitle").textContent = c ? c.title : "通知";
  $("#noticeList").innerHTML = list.length
    ? list.map(n => noticeHTML(n, NOTICES.indexOf(n))).join("")
    : emptyHTML("这里还没有通知");
  $("#ovNotice").classList.add("show");
}

/** 一键全部已读 */
function markAllNotices() {
  if (!NOTICES.some(n => n.unread)) return toast("没有未读提示啦");
  NOTICES.forEach(n => { n.unread = false; });
  renderNoticeDot();
  $("#noticeList").innerHTML = NOTICES.map(noticeHTML).join("");
  toast("提示已全部标记为已读 ✓");
}

/** 点击通知：标记已读并跳转对应页面 */
function noticeGo(i) {
  const n = NOTICES[i];
  n.unread = false;
  renderNoticeDot();
  if (n.type === "like" || n.type === "fav" || n.type === "comment") { openNoticeDetail(i); return; }
  closeOverlay("ovNotice");
  if (n.type === "order") openOrders();
  else if (n.type === "fan") {
    switchTab($$(".tab[data-scr='scr-me']")[0] || $$(".tab")[4]);
    openFollow("fans");
  }
  else toast("已阅平台提示");
}

/* ---------- 通知详情（赞/收藏/评论/@） ---------- */

let ndCurrent = null;

function openNoticeDetail(i) {
  const n = NOTICES[i];
  ndCurrent = i;
  $("#ndTitle").textContent =
    n.type === "fav" ? "收藏详情"
    : n.type === "like" ? "点赞详情"
    : n.icon === "@" ? "@ 我的" : "评论详情";
  $("#ndBody").innerHTML = noticeDetailHTML(n);
  $("#ovNoticeDetail").classList.add("show");
}

/** 详情内打开关联作品：跳到我的主页作品区 */
function ndOpenWork(title) {
  closeOverlay("ovNoticeDetail");
  closeOverlay("ovNotice");
  switchTab($$(".tab[data-scr='scr-me']")[0]);
  const card = $$("#myWorks .mini-work").find(el => el.textContent.includes(title));
  if (card) { card.scrollIntoView({ block: "center" }); card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 1600); }
  toast(`已定位到作品《${title}》`);
}

/** 详情内打开关联帖子 */
function ndOpenPost(idx) {
  closeOverlay("ovNoticeDetail");
  closeOverlay("ovNotice");
  switchTab($$(".tab[data-scr='scr-comm']")[0] || $$(".tab")[1]);
  openPost(idx);
}

/** 详情内打开用户主页 */
function ndOpenUser(name) {
  closeOverlay("ovNoticeDetail");
  closeOverlay("ovNotice");
  openArtistByName(name);
}

/** 赞评论（详情内） */
function ndLikeCmt(el) {
  const n = NOTICES[ndCurrent];
  n.cmtLiked = !n.cmtLiked;
  el.classList.toggle("on", n.cmtLiked);
  el.innerHTML = `${n.cmtLiked ? "♥" : "♡"} 赞`;
}

/** 回复评论（详情内） */
function ndReply() {
  const input = $("#ndReplyInput");
  const v = input.value.trim();
  if (!v) return;
  const n = NOTICES[ndCurrent];
  const me = state.profile.name || "我";
  $("#ndReplies").insertAdjacentHTML("beforeend", `
    <div class="nd-cmt nd-mine">
      <div class="avatar" style="background:${avatarBg(me)}">${esc(me[0])}</div>
      <div class="nd-cmt-body"><b>${esc(me)}·回复 ${esc((n.from || [])[0] || "")}</b><p>${esc(v)}</p><span>刚刚</span></div>
    </div>`);
  input.value = "";
  toast("回复成功，对方会收到通知");
}

/* ---------- 消息 ---------- */

function renderMessages() {
  $("#msgList").innerHTML = MESSAGES.filter(m => !state.blocked.has(m.name)).map(messageHTML).join("");
  renderMsgEntries();
}

/** 消息列表一键全部已读 */
function markAllMessages() {
  if (!MESSAGES.some(m => m.unread)) return toast("没有未读消息啦");
  MESSAGES.forEach(m => { m.unread = 0; });
  renderMessages();
  toast("消息已全部标记为已读 ✓");
}

/* ---------- 好友系统（添加好友 / 二维码 / 扫一扫 / 分享应用） ---------- */

/** 每个用户的专属 ID：我用注册 ID，其余用户由圈名确定性生成 */
function uidOf(name) {
  if (!name) return "quqi_000000";
  if (name === state.profile.name) return state.profile.uid || "quqi_000000";
  let h = 7;
  for (const c of name) h = (h * 131 + c.codePointAt(0)) % 900000;
  return "quqi_" + (100000 + h);
}

/** 全站可添加的用户池（音乐人 + 普通用户） */
const friendPool = () => [...new Set([...ARTISTS.map(a => a.name), ...allUserNames()])];

const bioOf = n => ARTISTS.find(a => a.name === n)?.bio || USERS_EXTRA[n]?.bio || "曲境用户";

/** 小红书式：互相关注即好友 */
const isFriend = n => state.following.has(n) && FANS.includes(n);

/** 好友场景按钮：互关好友=发消息；否则复用关注钮（关注/回关/已关注） */
function afBtnHTML(name) {
  const n = esc(name);
  if (isFriend(name))
    return `<button class="fbtn off" onclick="event.stopPropagation();closeScan();closeOverlay('ovAddFriend');closeOverlay('ovArtist');openChat('${n}')">发消息</button>`;
  return followBtnHTML(name);
}

/** 关注状态变化后刷新好友相关界面 */
function refreshFriendUI(name) {
  if ($("#ovAddFriend").classList.contains("show") && $("#afInput")) afSearch();
  const w = $("#scanBtnWrap");
  if (w && w.dataset.name === name) w.innerHTML = afBtnHTML(name);
}

/** 新朋友（关注了我的人）回关：互相关注即成为好友 */
function followBack(name) {
  const r = FRIEND_REQS.find(x => x.name === name && x.status === "pending");
  if (r) r.status = "accepted";
  if (!FANS.includes(name)) FANS.push(name);
  if (!state.following.has(name)) toggleFollow(name);
  else refreshFriendUI(name);
}

/** 消息页「＋」菜单（微信式） */
function openMsgPlus() {
  openSheet("更多功能", `
    <div class="af-entry" onclick="closeSheet();openGroupPicker()"><span>群</span><div><b>发起群聊</b><i>拉互关好友建讨论组</i></div><em>›</em></div>
    <div class="af-entry" onclick="closeSheet();openAddFriend()"><span>友</span><div><b>添加好友</b><i>搜索关注，互关即好友</i></div><em>›</em></div>
    <div class="af-entry" onclick="closeSheet();openScan()"><span>扫</span><div><b>扫一扫</b><i>扫描好友二维码</i></div><em>›</em></div>
    <div class="af-entry" onclick="closeSheet();openMyQR()"><span>▦</span><div><b>我的二维码</b><i>让对方扫码加我</i></div><em>›</em></div>
    <div class="af-entry" onclick="closeSheet();shareApp()"><span>↗</span><div><b>分享应用</b><i>把「曲境」推荐给朋友</i></div><em>›</em></div>`);
}

/* --- 添加好友页 --- */

function openAddFriend() {
  $("#afBody").innerHTML = `
    <div class="af-search">
      <div class="search-box"><span class="si" data-icon="search"></span>
        <input id="afInput" placeholder="搜圈名 / ID（如 quqi_123456）" oninput="afSearch()">
      </div>
    </div>
    <div id="afResults"></div>`;
  injectIcons();
  afSearch();
  $("#ovAddFriend").classList.add("show");
}

function afSearch() {
  const kw = $("#afInput").value.trim().toLowerCase();
  const pool = friendPool();
  if (kw) {
    const hits = pool.filter(n => n.toLowerCase().includes(kw) || uidOf(n).toLowerCase().includes(kw));
    $("#afResults").innerHTML = hits.length
      ? `<div class="search-sec">搜索结果<small>${hits.length}</small></div>` + hits.map(afRowHTML).join("")
      : emptyHTML(`没有找到相关用户，核对圈名或 ID 后再试`);
    return;
  }
  const pending = FRIEND_REQS.filter(r => r.status === "pending");
  $("#afResults").innerHTML = `
    <div class="af-myid">我的 ID：<b>${esc(uidOf(state.profile.name))}</b></div>
    <div class="af-entry" onclick="openScan()"><span>扫</span><div><b>扫一扫</b><i>扫描对方的好友二维码</i></div><em>›</em></div>
    <div class="af-entry" onclick="openMyQR()"><span>▦</span><div><b>我的二维码</b><i>邀请对方扫码关注我</i></div><em>›</em></div>
    ${pending.length ? `<div class="search-sec">新朋友 · 关注了你<small>${pending.length}</small></div>` + pending.map(afReqRowHTML).join("") : ""}
    <div class="search-sec">可能认识的人</div>
    ${pool.filter(n => !state.following.has(n) && !pending.some(r => r.name === n)).slice(0, 6).map(afRowHTML).join("")}`;
}

function afRowHTML(n) {
  return `<div class="person-row" onclick="closeOverlay('ovAddFriend');openArtistByName('${esc(n)}')">
    <div class="avatar" style="background:${avatarBg(n)}">${esc(n[0])}</div>
    <div class="p-info"><b>${esc(n)}</b><span>ID：${uidOf(n)} · ${esc(bioOf(n))}</span></div>
    ${afBtnHTML(n)}</div>`;
}

function afReqRowHTML(r) {
  return `<div class="person-row" onclick="closeOverlay('ovAddFriend');openArtistByName('${esc(r.name)}')">
    <div class="avatar" style="background:${avatarBg(r.name)}">${esc(r.name[0])}</div>
    <div class="p-info"><b>${esc(r.name)}</b><span>${esc(r.msg)} · ${r.time}</span></div>
    <button class="fbtn" onclick="event.stopPropagation();followBack('${esc(r.name)}')">回关</button></div>`;
}

/* --- 二维码（装饰性示意码，由 ID 确定性生成） --- */

function qrSVG(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  const rnd = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const n = 25;
  const g = Array.from({ length: n }, () => Array(n).fill(false));
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++)
      g[oy + y][ox + x] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) { g[6][i] = i % 2 === 0; g[i][6] = i % 2 === 0; }
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    if (!inFinder(x, y) && x !== 6 && y !== 6) g[y][x] = rnd() < .46;
  let rects = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
    if (g[y][x]) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="#17181A">${rects}</svg>`;
}

function openMyQR() {
  closeSheet();
  const uid = uidOf(state.profile.name);
  $("#qrCard").innerHTML = `
    <div class="qr-user">
      <div class="avatar">${avatarInnerHTML()}</div>
      <div><b>${esc(state.profile.name || "未注册")}</b><span>ID：${esc(uid)}</span></div>
    </div>
    <div class="qr-box">${qrSVG("quqi-friend:" + uid)}</div>
    <p class="qr-tip">扫一扫上面的二维码图案，关注我 · 互关即好友</p>`;
  $("#qrActs").innerHTML = `
    <button class="qr-act" onclick="saveCardImage()">保存名片</button>
    <button class="qr-act" onclick="shareCard()">↗ 分享名片</button>
    <button class="qr-act qr-act-close" onclick="closeQR()">✕ 关闭</button>`;
  $("#qrMask").classList.add("show");
}

function closeQR() { $("#qrMask").classList.remove("show"); }

/* --- 保存 / 分享名片：canvas 绘制名片图 --- */

/** 从 avatarBg 渐变串里取两个色停，给 canvas 用 */
function gradStops(name) {
  const m = avatarBg(name).match(/#[0-9A-Fa-f]{3,6}/g) || ["#2152FF", "#6B8CFF"];
  return [m[0], m[1] || m[0]];
}

/** 绘制名片图，完成后回调 cb(canvas) */
function buildCardCanvas(cb) {
  const name = state.profile.name || "未注册";
  const uid = uidOf(name);
  const W = 640, H = 840;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const ctx = cv.getContext("2d");
  // 底色：用户色渐变打底 + 白卡
  const [c1, c2] = gradStops(name);
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath(); ctx.roundRect(36, 36, W - 72, H - 72, 28); ctx.fill();

  const drawRest = avatarDone => {
    // 名字 / ID
    ctx.fillStyle = "#17181A"; ctx.font = "700 34px 'Noto Serif SC', serif";
    ctx.fillText(name, 180, 118);
    ctx.fillStyle = "#9A9DA6"; ctx.font = "400 20px -apple-system, sans-serif";
    ctx.fillText("ID：" + uid, 180, 152);
    // 二维码
    const svg = qrSVG("quqi-friend:" + uid);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = () => {
      URL.revokeObjectURL(url);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, (W - 400) / 2, 210, 400, 400);
      ctx.imageSmoothingEnabled = true;
      ctx.fillStyle = "#9A9DA6"; ctx.font = "400 19px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("扫一扫关注我 · 互关即好友", W / 2, 660);
      ctx.fillStyle = "#5C5F66"; ctx.font = "600 21px 'Noto Serif SC', serif";
      ctx.fillText("曲境 · 古风音乐约稿平台", W / 2, 736);
      ctx.textAlign = "left";
      cb(cv);
    };
    img.onerror = () => { URL.revokeObjectURL(url); cb(cv); };
    img.src = url;
  };

  // 头像：自定义图片裁圆，否则渐变圆 + 首字
  const ax = 90, ay = 88, ar = 44;
  if (state.profile.avatar) {
    const av = new Image();
    av.onload = () => {
      ctx.save();
      ctx.beginPath(); ctx.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(av, ax, ay, ar * 2, ar * 2);
      ctx.restore();
      drawRest();
    };
    av.onerror = () => drawRest();
    av.src = state.profile.avatar;
  } else {
    const g = ctx.createLinearGradient(ax, ay, ax + ar * 2, ay + ar * 2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(ax + ar, ay + ar, ar, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.font = "700 38px 'Noto Serif SC', serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(name[0], ax + ar, ay + ar + 2);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    drawRest();
  }
}

/** 保存名片：生成 PNG 下载 */
function saveCardImage() {
  buildCardCanvas(cv => {
    cv.toBlob(blob => {
      if (!blob) return toast("生成失败，请重试");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `曲境名片-${uidOf(state.profile.name)}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      toast("名片已保存，去下载/相册里看看吧");
    }, "image/png");
  });
}

/** 分享名片：生成预览图 + 平台选择 */
function shareCard() {
  buildCardCanvas(cv => {
    const src = cv.toDataURL("image/png");
    closeQR();
    const plats = [["微", "微信好友"], ["圈", "朋友圈"], ["Q", "QQ"], ["博", "微博"], ["红", "小红书"]];
    openSheet("分享名片", `
      <img src="${src}" alt="名片预览" class="card-preview">
      <div class="share-grid">
        ${plats.map(([e, p]) => `<div class="share-it" onclick="closeSheet();toast('名片已分享到${p}（Demo）')"><span>${e}</span><b>${p}</b></div>`).join("")}
        <div class="share-it" onclick="saveCardImage()"><span>存</span><b>保存图片</b></div>
      </div>`);
  });
}

/* --- 扫一扫（Demo 模拟识别） --- */

let scanTimer = null;

function openScan() {
  closeSheet();
  $("#scanStage").innerHTML = `
    <div class="scan-frame"><i class="scan-line"></i></div>
    <p class="scan-tip">将好友二维码放入框内即可自动识别（Demo 模拟）</p>`;
  $("#ovScan").classList.add("show");
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    const pool = friendPool().filter(n => !isFriend(n));
    const n = pool[Math.floor(Math.random() * pool.length)];
    $("#scanStage").innerHTML = `
      <div class="scan-result">
        <div class="avatar" style="background:${avatarBg(n)};width:56px;height:56px;font-size:20px">${esc(n[0])}</div>
        <b>${esc(n)}</b><span>ID：${uidOf(n)}</span>
        <p>${esc(bioOf(n))}</p>
        <div id="scanBtnWrap" data-name="${esc(n)}">${afBtnHTML(n)}</div>
        <em onclick="openScan()">↻ 继续扫</em>
      </div>`;
  }, 1800);
}

function closeScan() { clearTimeout(scanTimer); $("#ovScan").classList.remove("show"); }

/* --- 分享应用 --- */

const APP_SHARE_URL = "https://miawork.github.io/quqing-demo/";

function shareApp() {
  closeSheet();
  const plats = [["微", "微信好友"], ["圈", "朋友圈"], ["Q", "QQ"], ["博", "微博"]];
  openSheet("分享「曲境」给朋友", `
    <div class="share-app-qr">${qrSVG("quqing-app:" + APP_SHARE_URL)}</div>
    <p class="qr-tip">扫码体验「曲境 · 古风音乐约稿平台」</p>
    <div class="share-grid">
      ${plats.map(([e, p]) => `<div class="share-it" onclick="closeSheet();toast('已分享到${p}（Demo）↗')"><span>${e}</span><b>${p}</b></div>`).join("")}
      <div class="share-it" onclick="copyAppLink()"><span>链</span><b>复制链接</b></div>
    </div>`);
}

function copyAppLink() {
  closeSheet();
  navigator.clipboard?.writeText(APP_SHARE_URL).catch(() => {});
  toast("应用链接已复制，快去分享吧");
}

/* ---------- 沉浸式作品浏览 ---------- */

/** @param idx state.filteredWorks 的下标；打开后滚动定位到该作品 */
function openViewer(idx) {
  const scroller = $("#vscroll");
  scroller.innerHTML = state.filteredWorks.map(slideHTML).join("");
  $("#viewer").classList.add("show");
  requestAnimationFrame(() => { scroller.scrollTop = scroller.clientHeight * idx; });
}

function closeViewer() {
  $("#viewer").classList.remove("show");
}

/* ---------- 音乐人主页浮层 ---------- */

let currentArtistName = null;

function openArtist(idx) {
  currentArtistName = ARTISTS[idx].name;
  $("#ovArtistBody").innerHTML = artistProfileHTML(ARTISTS[idx]);
  updateArtFollowBtn();
  $("#ovArtist").classList.add("show");
}

/* ---------- 关注 / 粉丝（小红书式） ---------- */

function toggleFollow(name) {
  if (state.blocked.has(name)) { confirmUnblock(name); return; }
  if (state.following.has(name)) {
    state.following.delete(name);
    toast("已取消关注");
  } else {
    state.following.add(name);
    if (FANS.includes(name)) {
      if (!CHATS[name]) { // 首次互关：对方打招呼，成为好友
        const greet = "我们互相关注啦，随时可以聊企划～";
        MESSAGES.unshift({ name, txt: greet, time: "刚刚", unread: 1 });
        CHATS[name] = [{ who: "them", type: "text", txt: greet }];
        renderMessages();
      }
      toast(`你和「${name}」互相关注，成为好友啦`);
    } else toast("关注成功");
  }
  renderFollowStats();
  renderFollowList();
  updateArtFollowBtn();
  refreshFriendUI(name);
  if (state.homeMode === "artist") renderHome(); // 刷新卡片上的关注钮
}

function toggleFollowCurrent() {
  if (currentArtistName) toggleFollow(currentArtistName); // 保留：供旧入口调用
}

function updateArtFollowBtn() {
  if (!currentArtistName) return;
  const wrap = $("#artFollowWrap");
  if (wrap) wrap.innerHTML = followBtnHTML(currentArtistName);
}

function renderFollowStats() {
  $("#statFollowing").textContent = state.following.size;
  $("#statFans").textContent = FANS.length;
}

function openFollow(tab) {
  state.followTab = tab;
  renderFollowList();
  $("#ovFollow").classList.add("show");
}

function setFollowTab(tab) {
  state.followTab = tab;
  renderFollowList();
}

function renderFollowList() {
  const isFollowing = state.followTab === "following";
  $("#followTitle").textContent = isFollowing ? "我的关注" : "我的粉丝";
  $("#tabFollowing").classList.toggle("on", isFollowing);
  $("#tabFans").classList.toggle("on", !isFollowing);
  const names = isFollowing ? [...state.following] : FANS;
  $("#followList").innerHTML = names.length
    ? names.map(personRowHTML).join("")
    : emptyHTML(isFollowing ? "还没有关注任何人，去首页逛逛" : "暂无粉丝，发布作品吸引同好吧");
}

/* ---------- 订单 / 钱包 ---------- */

const ORDER_TABS = ["全部", "待付款", "进行中", "待验收", "已完成"];

function openOrders(filter = "全部") {
  state.orderFilter = filter;
  renderOrders();
  $("#ovOrders").classList.add("show");
}

function setOrderFilter(f) {
  state.orderFilter = f;
  renderOrders();
}

function renderOrders() {
  $("#orderTabs").innerHTML = ORDER_TABS.map(t => `
    <div class="chip ${t === state.orderFilter ? "on" : ""}" onclick="setOrderFilter('${t}')">${t}</div>`).join("");
  const list = ORDERS.filter(o => state.orderFilter === "全部" || o.status === state.orderFilter);
  $("#orderList").innerHTML = list.map(orderCardHTML).join("") || emptyHTML("该状态下暂无订单");
  renderOrderEntry();
  renderWallet();
}

/** 「我的主页」订单入口：四格状态 + 角标数 */
function renderOrderEntry() {
  $("#orderEntry").innerHTML = ORDER_TABS.slice(1).map(t => {
    const n = ORDERS.filter(o => o.status === t).length;
    return `<div class="oe-item" onclick="openOrders('${t}')">
      <b>${n}</b><span>${t}</span></div>`;
  }).join("");
}

/** 钱包：托管中 = 进行中/待验收订单已托管金额；可提现 = 已完成接稿收入 - 已提现 */
function walletBalance() {
  const income = ORDERS.filter(o => o.status === "已完成" && o.mine === "接稿")
    .reduce((s, o) => s + o.amount, 0);
  return income - wallet.withdrawn;
}

function renderWallet() {
  const escrow = ORDERS.filter(o => ["进行中", "待验收"].includes(o.status))
    .reduce((s, o) => s + o.paid, 0);
  $("#wEscrow").textContent = "¥" + escrow.toLocaleString();
  $("#wBalance").textContent = "¥" + walletBalance().toLocaleString();
}

/* ---------- 提现（钱包 → 银行卡/支付宝，T+1 到账） ---------- */

const wallet = {
  withdrawn: 0,
  accounts: [
    { key: "bank", name: "招商银行储蓄卡", tail: "尾号 6688", icon: "银" },
    { key: "alipay", name: "支付宝", tail: "luo***@qq.com", icon: "支" },
  ],
  records: [], // { amount, fee, to, time, status }
};

let wdCtx = null;

function openWithdraw() {
  const bal = walletBalance();
  if (bal <= 0 && !wallet.records.length) return toast("暂无可提现余额，完成接稿订单后再来");
  wdCtx = { to: wallet.accounts[0].key };
  renderWithdraw();
  $("#wdMask").classList.add("show");
}
function closeWithdraw() { $("#wdMask").classList.remove("show"); }

function setWdAccount(key) { wdCtx.to = key; renderWithdraw(); }

function wdFeeOf(amt) { return Math.max(1, Math.round(amt * 0.006)); } // 0.6%，最低 ¥1

function renderWithdraw() {
  const bal = walletBalance();
  $("#wdBody").innerHTML = `
    <div class="wd-bal"><span>可提现余额</span><b>¥${bal.toLocaleString()}</b></div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">提现金额</label>
    <div class="code-row">
      <input id="wdAmt" type="number" min="1" max="${bal}" placeholder="最多 ¥${bal.toLocaleString()}" oninput="updateWdFee()">
      <button class="btn ghost" onclick="$('#wdAmt').value=${bal};updateWdFee()">全部</button>
    </div>
    <p class="se-note" id="wdFee">手续费 0.6%（最低 ¥1），T+1 到账；每日限提 1 笔</p>
    <label style="font-size:12px;font-weight:700;display:block;margin:8px 0 6px">到账方式</label>
    <div class="pay-channels">
      ${wallet.accounts.map(a => `
        <div class="pch ${wdCtx.to === a.key ? "on" : ""}" onclick="setWdAccount('${a.key}')">
          <span>${a.icon}</span><b>${a.name}</b><small>${a.tail}</small>
          <i>${wdCtx.to === a.key ? "●" : "○"}</i>
        </div>`).join("")}
      <div class="pch" onclick="toast('Demo：绑定新卡需实名认证 + 银行预留手机验证')">
        <span>+</span><b>添加新卡</b><i></i></div>
    </div>
    <button class="btn primary" style="width:100%" onclick="submitWithdraw()">确认提现</button>
    ${wallet.records.length ? `
    <div class="wd-recs"><h5>提现记录</h5>
      ${wallet.records.map(r => `
        <div class="wd-rec">
          <div><b>-¥${r.amount.toLocaleString()}</b><span>${r.to} · 手续费 ¥${r.fee}</span></div>
          <div class="wd-st ${r.status === "已到账" ? "ok" : ""}">${r.status}<span>${r.time}</span></div>
        </div>`).join("")}
    </div>` : ""}`;
}

function updateWdFee() {
  const amt = parseInt($("#wdAmt").value, 10) || 0;
  $("#wdFee").textContent = amt > 0
    ? `手续费 ¥${wdFeeOf(amt).toLocaleString()} · 预计到账 ¥${(amt - wdFeeOf(amt)).toLocaleString()} · T+1 到账`
    : "手续费 0.6%（最低 ¥1），T+1 到账；每日限提 1 笔";
}

function submitWithdraw() {
  const bal = walletBalance();
  const amt = parseInt($("#wdAmt").value, 10) || 0;
  if (amt <= 0) return toast("请输入提现金额");
  if (amt > bal) return toast(`超出可提现余额 ¥${bal.toLocaleString()}`);
  const today = new Date().toISOString().slice(0, 10);
  if (wallet.records.some(r => r.time.startsWith(today))) return toast("今日已提现过一笔，明天再来 ⏳");
  const acc = wallet.accounts.find(a => a.key === wdCtx.to);
  wallet.withdrawn += amt;
  wallet.records.unshift({
    amount: amt, fee: wdFeeOf(amt), to: acc.name,
    time: today + " " + new Date().toTimeString().slice(0, 5),
    status: "处理中",
  });
  renderWallet();
  renderWithdraw();
  toast(`提现申请已提交，¥${(amt - wdFeeOf(amt)).toLocaleString()} 预计明日到账 ${acc.icon}`);
  /* Demo：模拟 T+1 到账 */
  setTimeout(() => {
    const r = wallet.records.find(x => x.status === "处理中");
    if (r) { r.status = "已到账"; if ($("#wdMask").classList.contains("show")) renderWithdraw(); }
  }, 4000);
}

const findOrder = id => ORDERS.find(o => o.id === id);

/* ---------- 收银台（米画师式托管付款） ---------- */

/** 付款上下文：stage = deposit 定金 | full 全款 | rest 尾款 */
let payCtx = null;

const payAmountOf = (o, stage) =>
  stage === "deposit" ? Math.round(o.amount / 2)
  : stage === "rest" ? o.amount - o.paid
  : o.amount;

const PAY_CHANNELS = [
  { key: "支付宝", icon: "支" },
  { key: "微信支付", icon: "微" },
  { key: "曲境余额", icon: "余" },
];

function openPay(id, stage) {
  payCtx = { id, stage, channel: "支付宝" };
  renderPay();
  $("#payMask").classList.add("show");
}
function closePay() { $("#payMask").classList.remove("show"); }
function setPayChannel(c) { payCtx.channel = c; renderPay(); }

function renderPay() {
  const o = findOrder(payCtx.id);
  const amt = payAmountOf(o, payCtx.stage);
  const stageTxt = { deposit: "定金（50%）", full: "全款", rest: "尾款" }[payCtx.stage];
  const balance = ORDERS.filter(x => x.status === "已完成" && x.mine === "接稿")
    .reduce((s, x) => s + x.amount, 0);
  $("#payBody").innerHTML = `
    <div class="pay-order">
      <b>${esc(o.title)}</b>
      <span>${esc(o.who)} · 单号 ${o.id}</span>
    </div>
    <div class="pay-rows">
      <div class="pay-row"><span>稿酬总额</span><b>¥${o.amount.toLocaleString()}</b></div>
      ${o.paid > 0 ? `<div class="pay-row"><span>已托管</span><b>¥${o.paid.toLocaleString()}</b></div>` : ""}
      <div class="pay-row total"><span>本次支付 · ${stageTxt}</span><b>¥${amt.toLocaleString()}</b></div>
    </div>
    <div class="pay-channels">
      ${PAY_CHANNELS.map(c => `
        <div class="pch ${payCtx.channel === c.key ? "on" : ""}" onclick="setPayChannel('${c.key}')">
          <span>${c.icon}</span><b>${c.key}</b>
          ${c.key === "曲境余额" ? `<small>可用 ¥${balance.toLocaleString()}</small>` : ""}
          <i>${payCtx.channel === c.key ? "●" : "○"}</i>
        </div>`).join("")}
    </div>
    <p class="escrow-note">款项由平台托管，验收通过后才结算给接稿方；协议期内可申请退款 / 仲裁</p>
    <button class="btn primary" style="width:100%" onclick="confirmPay()">确认支付 ¥${amt.toLocaleString()}</button>`;
}

function confirmPay() {
  const o = findOrder(payCtx.id);
  const amt = payAmountOf(o, payCtx.stage);
  if (payCtx.channel === "曲境余额") {
    const balance = ORDERS.filter(x => x.status === "已完成" && x.mine === "接稿")
      .reduce((s, x) => s + x.amount, 0);
    if (balance < amt) { toast("余额不足，换个支付方式吧"); return; }
  }
  o.paid += amt;
  closePay();
  if (payCtx.stage === "rest") {
    settleOrder(o);
    toast(`已通过${payCtx.channel}支付尾款 ¥${amt.toLocaleString()}，验收完成`);
  } else {
    o.status = "进行中";
    o.note = payCtx.stage === "deposit"
      ? `定金 ¥${amt.toLocaleString()} 已托管 · 尾款验收时支付 · 对方可开工`
      : "稿酬已全额托管 · 对方已开工";
    toast(`已通过${payCtx.channel}托管 ¥${amt.toLocaleString()}`);
  }
  renderOrders();
}

/** 待付款时约稿方可取消订单 */
function cancelOrder(id) {
  const o = findOrder(id);
  o.status = "已取消";
  o.note = "订单已取消 · 未产生托管款项";
  renderOrders();
  toast("订单已取消");
}

/* ---------- 交付（须上传订单对应的作品文件） ---------- */

let deliverCtx = null;

function openDeliver(id) {
  deliverCtx = { id, file: null };
  renderDeliver();
  $("#deliverMask").classList.add("show");
}
function closeDeliver() { $("#deliverMask").classList.remove("show"); }

function renderDeliver() {
  const o = findOrder(deliverCtx.id);
  const f = deliverCtx.file;
  $("#deliverBody").innerHTML = `
    <div class="pay-order">
      <b>${esc(o.title)}</b>
      <span>${esc(o.who)} · 单号 ${o.id}</span>
    </div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">作品文件 <b style="color:var(--red)">*</b></label>
    <div class="upload-row">
      <div class="upload-btn" onclick="pickDeliverFile()">上传作品文件</div>
      <span class="upload-name ${f ? "has" : ""}">${f ? `${esc(f.name)}（${f.ext} · ${f.size}）` : "未选择文件"}</span>
    </div>
    <p class="se-note">成品 / 工程 / 分轨等任意格式，单个文件不超过 2G；文件将托管至平台，验收通过后对方可下载源文件</p>
    <textarea id="deliverNote" rows="2" placeholder="交付说明（选填）：版本、修改点、使用注意…"></textarea>
    <div class="rate-acts">
      <button class="btn ghost" onclick="closeDeliver()">取消</button>
      <button class="btn primary" onclick="submitDeliver()">提交交付</button>
    </div>`;
}

function pickDeliverFile() { $("#deliverFile").click(); }

function onDeliverFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024 * 1024) {
    toast("文件超过 2G 上限，请压缩后再传");
    input.value = "";
    return;
  }
  const gb = 1024 * 1024 * 1024, mb = 1024 * 1024;
  const sizeTxt = file.size >= gb ? (file.size / gb).toFixed(2) + " GB"
    : file.size >= mb ? (file.size / mb).toFixed(1) + " MB"
    : Math.max(1, Math.round(file.size / 1024)) + " KB";
  deliverCtx.file = { name: file.name, size: sizeTxt, ext: (file.name.split(".").pop() || "文件").toUpperCase() };
  renderDeliver();
  toast("作品文件已就绪");
  input.value = "";
}

function submitDeliver() {
  if (!deliverCtx.file) { toast("请先上传订单对应的作品文件"); return; }
  const o = findOrder(deliverCtx.id);
  const note = $("#deliverNote").value.trim();
  o.file = deliverCtx.file;
  o.status = "待验收";
  o.note = (o.paid < o.amount
    ? `成品已交付 · 验收时需补齐尾款 ¥${(o.amount - o.paid).toLocaleString()}`
    : "成品已交付 · 等待对方验收")
    + (note ? ` · 交付说明：${note}` : "");
  closeDeliver();
  renderOrders();
  toast("交付已提交，文件已托管，等待对方验收");
}

/** 验收：有尾款先走收银台，全款单直接结算 */
function confirmOrder(id) {
  const o = findOrder(id);
  if (o.paid < o.amount) { openPay(id, "rest"); return; }
  settleOrder(o);
  renderOrders();
  toast("验收完成，稿酬已结算");
}

/** 结算：托管款打给接稿方，订单完成待互评 */
function settleOrder(o) {
  o.paid = o.amount;
  o.status = "已完成";
  o.rated = false;
  o.note = "验收通过 · 托管稿酬已结算给对方 · 源文件可随时下载 · 待您评价";
}

/* ---------- 要求修改（待验收 · 约稿方，3 次免费返修） ---------- */

let reviseId = null;

function openRevise(id) {
  reviseId = id;
  const o = findOrder(id);
  const used = o.revUsed || 0;
  $("#reviseBody").innerHTML = `
    <div class="pay-order"><b>${esc(o.title)}</b><span>${esc(o.who)} · 单号 ${o.id}</span></div>
    <p class="se-note" style="margin-bottom:10px">协议含 3 次免费修改，已用 ${used}/3${used >= 3 ? "，本次返修需与对方协商加价" : ""}</p>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">修改意见 <b style="color:var(--red)">*</b></label>
    <textarea id="reviseTxt" rows="4" maxlength="200" placeholder="请具体描述需要调整的部分：段落、配器、混音音量、音色偏好…"></textarea>
    <div class="rate-acts">
      <button class="btn ghost" onclick="closeRevise()">取消</button>
      <button class="btn primary" onclick="submitRevise()">提交修改意见</button>
    </div>`;
  $("#reviseMask").classList.add("show");
}
function closeRevise() { $("#reviseMask").classList.remove("show"); }

function submitRevise() {
  const txt = $("#reviseTxt").value.trim();
  if (!txt) return toast("请写明修改意见，方便对方返修 ✎");
  const o = findOrder(reviseId);
  o.revUsed = (o.revUsed || 0) + 1;
  o.status = "进行中";
  o.note = `第 ${o.revUsed} 次返修中 · 修改意见：${txt.slice(0, 40)}${txt.length > 40 ? "…" : ""}`;
  closeRevise();
  renderOrders();
  toast(`修改意见已发送，对方返修后将重新交付（${o.revUsed}/3 次）✎`);
}

/* ---------- 申请售后 / 退款（平台介入仲裁） ---------- */

let asCtx = null; // { id, type: "refund" | "aftersale", reason }

const AS_REASONS = {
  refund: ["对方拖延交付", "需求变更不再需要", "对方失联", "其他原因"],
  aftersale: ["成品与需求不符", "质量未达约定标准", "涉嫌抄袭/侵权", "其他原因"],
};

function openAfterSale(id, type) {
  asCtx = { id, type, reason: AS_REASONS[type][0] };
  const o = findOrder(id);
  $("#asTitle").textContent = type === "refund" ? "申请退款" : "申请售后";
  $("#asBody").innerHTML = `
    <div class="pay-order"><b>${esc(o.title)}</b><span>已托管 ¥${o.paid.toLocaleString()} · 单号 ${o.id}</span></div>
    <label style="font-size:12px;font-weight:700;display:block;margin-bottom:6px">${type === "refund" ? "退款" : "售后"}原因</label>
    <div class="chip-row" id="asReasons">${AS_REASONS[type].map(r =>
      `<div class="chip ${r === asCtx.reason ? "on" : ""}" onclick="setAsReason('${r}',this)">${r}</div>`).join("")}</div>
    <label style="font-size:12px;font-weight:700;display:block;margin:10px 0 6px">补充说明与证据</label>
    <textarea id="asTxt" rows="3" maxlength="200" placeholder="描述经过，可附聊天记录/文件截图（Demo 略）…"></textarea>
    <p class="escrow-note">提交后托管款项冻结，双方先协商（48h）；协商不成平台仲裁，按协议与证据裁定退款比例</p>
    <div class="rate-acts">
      <button class="btn ghost" onclick="closeAfterSale()">取消</button>
      <button class="btn primary" onclick="submitAfterSale()">提交申请</button>
    </div>`;
  $("#asMask").classList.add("show");
}
function closeAfterSale() { $("#asMask").classList.remove("show"); }

function setAsReason(r, el) {
  asCtx.reason = r;
  $$("#asReasons .chip").forEach(c => c.classList.toggle("on", c === el));
}

function submitAfterSale() {
  const o = findOrder(asCtx.id);
  o.as = { type: asCtx.type, reason: asCtx.reason, desc: $("#asTxt").value.trim() };
  o.note = `${asCtx.type === "refund" ? "退款" : "售后"}申请已提交 · 托管款已冻结 · 等待对方响应（48h）`;
  closeAfterSale();
  renderOrders();
  toast("申请已提交，平台已冻结托管款项");
}

function cancelAfterSale(id) {
  const o = findOrder(id);
  const t = o.as.type === "refund" ? "退款" : "售后";
  o.as = null;
  o.note = `${t}申请已撤销 · 订单恢复正常流程`;
  renderOrders();
  toast(`${t}申请已撤销，托管款解冻`);
}

/* ---------- 文件下载（待验收约稿方仅水印预览，验收后解锁源文件） ---------- */

let dlTimer = null;

function openDownload(id) {
  const o = findOrder(id);
  const locked = o.status === "待验收" && o.mine === "约稿";
  $("#dlBody").innerHTML = `
    <div class="pay-order">
      <b>${esc(o.file.name)}</b>
      <span>${o.file.ext} · ${o.file.size} · 来自订单 ${o.id}</span>
    </div>
    ${locked ? `
      <div class="dl-lock">源文件已托管加锁<br><small>验收通过后自动解锁高清源文件，现可在线预览水印版</small></div>
      <div class="rate-acts">
        <button class="btn ghost" onclick="previewWatermark('${o.id}')">预览水印版</button>
        <button class="btn primary" onclick="closeDownload();confirmOrder('${o.id}')">${o.paid < o.amount ? "补尾款并验收" : "验收并解锁"}</button>
      </div>`
    : `
      <div class="dl-bar"><div class="dl-fill" id="dlFill"></div></div>
      <div class="dl-stat" id="dlStat">准备下载…</div>
      <div class="rate-acts">
        <button class="btn ghost" onclick="closeDownload()">关闭</button>
        <button class="btn primary" id="dlBtn" onclick="startDownload('${o.id}')">开始下载</button>
      </div>`}`;
  $("#dlMask").classList.add("show");
}

function closeDownload() {
  clearInterval(dlTimer);
  $("#dlMask").classList.remove("show");
}

function startDownload(id) {
  const o = findOrder(id);
  const btn = $("#dlBtn");
  btn.disabled = true;
  btn.textContent = "下载中…";
  let pct = 0;
  clearInterval(dlTimer);
  dlTimer = setInterval(() => {
    pct = Math.min(100, pct + 7 + Math.random() * 14);
    $("#dlFill").style.width = pct + "%";
    $("#dlStat").textContent = pct < 100
      ? `下载中 ${Math.floor(pct)}% · ${o.file.size}`
      : "下载完成，已保存到「文件」App";
    if (pct >= 100) {
      clearInterval(dlTimer);
      btn.disabled = false;
      btn.textContent = "打开文件";
      btn.onclick = () => toast(`Demo：调用系统打开 ${o.file.name}`);
      toast("下载完成");
    }
  }, 180);
}

function previewWatermark(id) {
  const o = findOrder(id);
  toast(`Demo：在线播放水印版《${o.file.name}》，含语音水印，验收后解锁`);
}

/* ---------- 交易方式（按单设定，接稿方在对方付款前可改） ---------- */

function setOrderPayMode(id, mode) {
  const o = findOrder(id);
  if (o.payMode === mode) return;
  o.payMode = mode;
  renderOrders();
  toast(mode === "定金" ? "本单已开启定金模式：对方可先付 50%" : "本单已设为一次性全款托管");
}

/* ---------- 评价（订单完成后互评，主页公开，开关在设置里） ---------- */

function toggleMyReviews() {
  state.showMyReviews = !state.showMyReviews;
  renderMyReviews();
  toast(state.showMyReviews ? "评价已公开展示在主页" : "评价已整体隐藏，访客不可见");
}

function renderMyReviews() {
  $("#myReviews").innerHTML = state.showMyReviews
    ? MY_REVIEWS.map(reviewItemHTML).join("")
    : `<div class="rev-hint">评价已对外隐藏 · 访客不可见，可在设置中重新公开</div>`;
}

/* ---------- 评价管理（查看 / 删除 / 公开开关） ---------- */

function openReviewManage() {
  const sw = `<div class="switch ${state.showMyReviews ? "" : "off"}" onclick="toggleMyReviews();openReviewManage()"></div>`;
  openSheet(`评价管理 · ${MY_REVIEWS.length}`, `
    <div class="set-item" style="margin-bottom:12px"><span>公开展示在我的主页</span>${sw}</div>
    ${MY_REVIEWS.length
      ? MY_REVIEWS.map((r, i) => `<div class="person-row" onclick="viewReview(${i})" style="cursor:pointer">
          <div class="avatar" style="background:${avatarBg(r.from)}">${esc(r.from[0])}</div>
          <div class="p-info"><b>${esc(r.from)} <small style="color:var(--gold)">${starsTxt(r.stars)}</small></b>
            <span>${esc(r.txt)}</span></div>
          <button class="fbtn off" onclick="event.stopPropagation();confirmDelReview(${i})">删除</button></div>`).join("")
      : `<div class="rev-hint">还没有收到评价</div>`}`);
}

function viewReview(i) {
  const r = MY_REVIEWS[i];
  if (!r) return;
  openSheet("评价详情", `
    <div class="person-row">
      <div class="avatar" style="background:${avatarBg(r.from)}">${esc(r.from[0])}</div>
      <div class="p-info"><b>${esc(r.from)}</b><span>${r.date} · 来自已完成的合作订单</span></div>
      <span style="color:var(--gold);font-size:13px">${starsTxt(r.stars)}</span></div>
    <p style="font-size:13.5px;line-height:1.9;margin:6px 2px 4px">${esc(r.txt)}</p>
    <div class="rate-acts" style="margin-top:14px">
      <button class="btn ghost" onclick="openReviewManage()">‹ 返回列表</button>
      <button class="btn primary danger-btn" onclick="confirmDelReview(${i})">删除这条</button>
    </div>`);
}

function confirmDelReview(i) {
  const r = MY_REVIEWS[i];
  if (!r) return;
  openSheet("删除评价", `
    <p class="se-note">删除「${esc(r.from)}」的这条评价后不可恢复，主页好评率会重新计算。</p>
    <div class="rate-acts" style="margin-top:14px">
      <button class="btn ghost" onclick="openReviewManage()">取消</button>
      <button class="btn primary danger-btn" onclick="doDelReview(${i})">确认删除</button>
    </div>`);
}

function doDelReview(i) {
  MY_REVIEWS.splice(i, 1);
  renderMyReviews();
  openReviewManage();
  toast("评价已删除");
}

function openRate(id) {
  state.rateOrderId = id;
  state.rateStars = 5;
  renderStars();
  $("#rateTxt").value = "";
  $("#rateMask").classList.add("show");
}

function closeRate() {
  $("#rateMask").classList.remove("show");
}

function setRateStars(n) {
  state.rateStars = n;
  renderStars();
}

function renderStars() {
  $("#starRow").innerHTML = [1, 2, 3, 4, 5].map(n =>
    `<i class="${n <= state.rateStars ? "on" : ""}" onclick="setRateStars(${n})">★</i>`).join("");
}

function submitRate() {
  const o = findOrder(state.rateOrderId);
  const txt = $("#rateTxt").value.trim() || "合作顺利，体验很好！";
  (REVIEWS[o.who] = REVIEWS[o.who] || []).unshift({
    from: state.profile.name || "洛云笙", stars: state.rateStars, txt, date: "09-16",
  });
  o.rated = true;
  o.note = "双方已互评 · 订单归档";
  closeRate();
  renderOrders();
  toast("评价成功，已公开展示在对方主页");
}

/* ---------- 通用底稿 / 需求详情与投递 / 约稿邀约处理 ---------- */

function openSheet(title, bodyHTML) {
  $("#sheetTitle").textContent = title;
  $("#sheetBody").innerHTML = bodyHTML;
  $("#sheetMask").classList.add("show");
}

function closeSheet() {
  $("#sheetMask").classList.remove("show");
}

/** 招募需求详情 + 投递报名 */
function openDemandDetail(i) {
  const d = DEMANDS[i];
  if (!d) return;
  openSheet("招募详情", `
    <div class="dtitle" style="margin:2px 0 6px">${esc(d.title)}</div>
    <div class="dtags" style="margin-bottom:8px">${bizTagHTML(d.biz)}${d.tags.map(t => `<span class="tag gray">${esc(t)}</span>`).join("")}</div>
    <p style="font-size:13px;color:var(--ink-2);line-height:1.7;margin:0 0 10px">${esc(d.desc)}</p>
    <div class="pay-rows">
      <div class="pay-row"><span>发布方</span><b>${esc(d.who)}</b></div>
      <div class="pay-row total"><span>预算</span><b>${esc(d.budget)}</b></div>
    </div>
    ${d.applied
      ? `<p class="escrow-note">已投递 · 对方通过后将私信与你签约，稿酬经平台托管</p>`
      : `<textarea id="applyNote" rows="3" placeholder="自荐留言：擅长风格、代表作、档期…（选填）"></textarea>
         <div class="rate-acts">
           <button class="btn ghost" onclick="closeSheet()">再看看</button>
           <button class="btn primary" onclick="applyDemand(${i})">投递报名</button>
         </div>`}`);
}

function applyDemand(i) {
  const d = DEMANDS[i];
  d.applied = true;
  d.appliedNote = ($("#applyNote")?.value || "").trim();
  closeSheet();
  renderHome();
  toast("投递成功，对方通过后会私信你");
}

/** 接稿方：接受约稿邀约 → 进入待付款（等对方托管） */
function acceptInvite(id) {
  const o = findOrder(id);
  o.status = "待付款";
  o.note = "已接受邀约 · 协议已生效，等待对方托管稿酬";
  renderOrders();
  toast("已接受约稿，等待对方托管稿酬 ✓");
}

/** 接稿方：婉拒邀约 */
function declineInvite(id) {
  const o = findOrder(id);
  o.status = "已取消";
  o.note = "已婉拒邀约 · 已通知对方";
  renderOrders();
  toast("已婉拒该邀约");
}

/** 删除已取消订单记录 */
function deleteOrder(id) {
  const idx = ORDERS.findIndex(o => o.id === id);
  if (idx > -1) ORDERS.splice(idx, 1);
  renderOrders();
  toast("订单记录已删除");
}

/** 订单完成后查看双方互评 */
function viewOrderReviews(id) {
  const o = findOrder(id);
  const myName = state.profile.name || "洛云笙";
  const mine = (REVIEWS[o.who] || []).find(r => r.from === myName);
  const theirs = MY_REVIEWS.find(r => r.from === o.who);
  const block = (label, r) => `
    <div style="font-size:12px;color:var(--ink-3);margin:8px 0 4px">${label}</div>
    ${r ? reviewItemHTML(r) : `<div class="rev-hint">尚未评价</div>`}`;
  openSheet(`双方互评 · ${o.id}`, block("我给对方的评价", mine) + block(`${esc(o.who)} 给我的评价`, theirs));
}

/* ---------- 聊天（小红书式） ---------- */

/** 聊天标题：群聊显示人数 */
const chatTitle = name => GROUPS[name] ? `${name}（${GROUPS[name].members.length + 1}）` : name;

function openChat(name) {
  state.currentChat = name;
  const m = MESSAGES.find(x => x.name === name);
  if (m) m.unread = 0;
  renderMessages();
  if (!CHATS[name]) CHATS[name] = [];
  $("#chatName").textContent = chatTitle(name);
  $("#stickerTray").classList.remove("show");
  renderChat();
  $("#ovChat").classList.add("show");
}

function renderChat() {
  const body = $("#chatBody");
  body.innerHTML = `<div class="chat-day">今天</div>`
    + CHATS[state.currentChat].map(m => chatBubbleHTML(m, state.currentChat)).join("");
  body.scrollTop = body.scrollHeight;
  $("#stickerTray").innerHTML = stickerTrayHTML();
}

function sendChatText() {
  const input = $("#chatInput");
  const v = input.value.trim();
  if (!v) return;
  if (state.blocked.has(state.currentChat)) return toast("你已拉黑对方，解除后才能发送消息");
  CHATS[state.currentChat].push({ who: "me", type: "text", txt: v });
  input.value = "";
  renderChat();
  autoReply();
}

function toggleStickerTray() {
  $("#stickerTray").classList.toggle("show");
}

function sendSticker(key) {
  CHATS[state.currentChat].push({ who: "me", type: "sticker", key });
  $("#stickerTray").classList.remove("show");
  renderChat();
  autoReply();
}

/** 发送已导入的表情包 */
function sendStickerImg(i) {
  CHATS[state.currentChat].push({ who: "me", type: "img", src: state.myStickers[i] });
  $("#stickerTray").classList.remove("show");
  renderChat();
  autoReply();
}

/** 从相册导入表情包 */
function pickStickerImg() {
  $("#stickerFile").click();
}

function onStickerImg(input) {
  const f = input.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = e => {
    state.myStickers.push(e.target.result);
    CHATS[state.currentChat].push({ who: "me", type: "img", src: e.target.result });
    renderChat();
    toast("表情包已添加，下次可在表情面板直接发送");
    autoReply();
  };
  reader.readAsDataURL(f);
  input.value = "";
}

/** Demo 自动回复，营造对话感；群聊里随机一位成员接话 */
function autoReply() {
  const name = state.currentChat;
  setTimeout(() => {
    if (state.currentChat !== name || !$("#ovChat").classList.contains("show")) return;
    const g = GROUPS[name];
    if (g && g.members.length) {
      const who = g.members[Math.floor(Math.random() * g.members.length)];
      const lines = ["收到！", "好嘞，稍后看～", "这就去听！", "同步啦，辛苦～"];
      CHATS[name].push({ who: "them", name: who, type: "text", txt: lines[Math.floor(Math.random() * lines.length)] });
    } else {
      CHATS[name].push({ who: "them", type: "text", txt: "收到～稍后回复您" });
    }
    renderChat();
  }, 900);
}

/* ---------- 群聊（讨论组，小红书式） ---------- */

let gpTarget = null; // null = 新建群聊；否则为待添加成员的群名

/** 可邀请对象：互关好友（排除已拉黑 / 已在群内） */
function gpCandidates(excl) {
  return friendPool().filter(n => isFriend(n) && !state.blocked.has(n) && !(excl || []).includes(n));
}

/** 选人面板：groupName 传入则为「添加成员」；preset 为预选中的人（单聊拉群） */
function openGroupPicker(groupName, preset) {
  gpTarget = groupName || null;
  const g = groupName ? GROUPS[groupName] : null;
  let cands = gpCandidates(g ? g.members : []);
  if (preset && !cands.includes(preset)) cands = [preset, ...cands];
  if (!cands.length) return toast(g ? "好友都已在群里啦" : "暂无可邀请的好友，互相关注后才能拉群");
  openSheet(g ? "添加群成员" : "发起群聊", `
    <p class="se-note" style="margin-bottom:10px">互相关注的好友才能加入群聊</p>
    ${g ? "" : `<input class="post-input" id="gpName" placeholder="群聊名称（选填，默认用成员名）">`}
    ${cands.map(n => `<div class="person-row gp-row${preset === n ? " sel" : ""}" data-name="${esc(n)}" onclick="gpToggle(this)">
      <div class="avatar" style="background:${avatarBg(n)}">${esc(n[0])}</div>
      <div class="p-info"><b>${esc(n)}</b><span>${esc(bioOf(n))}</span></div>
      <i class="gp-check">✓</i></div>`).join("")}
    <button class="btn primary" style="width:100%;margin-top:12px" id="gpBtn" disabled onclick="gpConfirm()"></button>`);
  gpUpdateBtn();
}

function gpToggle(el) {
  el.classList.toggle("sel");
  gpUpdateBtn();
}

function gpUpdateBtn() {
  const n = $$(".gp-row.sel").length;
  const btn = $("#gpBtn");
  if (!btn) return;
  if (gpTarget) {
    btn.disabled = n < 1;
    btn.textContent = n ? `添加（${n}）` : "选择要邀请的好友";
  } else {
    btn.disabled = n < 2;
    btn.textContent = n >= 2 ? `发起群聊（${n + 1} 人）` : "至少选 2 位好友";
  }
}

function gpConfirm() {
  const sel = [...$$(".gp-row.sel")].map(el => el.dataset.name);
  if (gpTarget) { // 往现有群里拉人
    const g = GROUPS[gpTarget];
    if (!g || !sel.length) return;
    g.members.push(...sel);
    CHATS[gpTarget].push({ who: "sys", type: "sys", txt: `你邀请 ${sel.join("、")} 加入了群聊` });
    closeSheet();
    if (state.currentChat === gpTarget) {
      $("#chatName").textContent = chatTitle(gpTarget);
      renderChat();
    }
    renderMessages();
    toast(`已邀请 ${sel.length} 位好友进群`);
    return;
  }
  if (sel.length < 2) return toast("至少选择 2 位好友才能发起群聊");
  let gname = ($("#gpName")?.value || "").trim()
    || sel.slice(0, 3).join("、") + (sel.length > 3 ? "等" : "") + "的群聊";
  if (GROUPS[gname] || CHATS[gname]) gname += " " + (Object.keys(GROUPS).length + 1);
  GROUPS[gname] = { members: [...sel], owner: "me" };
  CHATS[gname] = [{ who: "sys", type: "sys", txt: `你邀请 ${sel.join("、")} 加入了群聊` }];
  MESSAGES.unshift({ name: gname, txt: "群聊已创建，打个招呼开始讨论吧", time: "刚刚", unread: 0, group: true });
  closeSheet();
  renderMessages();
  openChat(gname);
  toast("群聊已创建");
}

/** 聊天页右上角「⋯」：单聊 / 群聊分别给出操作 */
function openChatMore() {
  const name = state.currentChat;
  if (!name) return;
  if (name === "平台助手")
    return openSheet("聊天设置", `
      <div class="af-entry" onclick="closeSheet();toast('Demo：已开启消息免打扰')"><span>静</span><div><b>消息免打扰</b><i>系统通知不再提醒</i></div><em>›</em></div>`);
  const g = GROUPS[name];
  if (g) {
    openSheet("群聊设置", `
      <div class="af-entry" onclick="closeSheet();openGroupMembers()"><span>员</span><div><b>群成员</b><i>共 ${g.members.length + 1} 人${g.owner === "me" ? " · 我是群主" : ""}</i></div><em>›</em></div>
      <div class="af-entry" onclick="closeSheet();openGroupPicker('${esc(name)}')"><span>拉</span><div><b>添加成员</b><i>邀请互关好友进群</i></div><em>›</em></div>
      <div class="af-entry" onclick="closeSheet();openGroupRename()"><span>名</span><div><b>修改群聊名称</b><i>${esc(name)}</i></div><em>›</em></div>
      <div class="af-entry danger" onclick="closeSheet();confirmQuitGroup()"><span>退</span><div><b>退出群聊</b><i>退出后不再接收群消息</i></div><em>›</em></div>`);
  } else {
    const blocked = state.blocked.has(name);
    openSheet("聊天设置", `
      <div class="af-entry" onclick="closeSheet();openArtistByName('${esc(name)}')"><span>主</span><div><b>查看主页</b><i>看看 TA 的作品与动态</i></div><em>›</em></div>
      <div class="af-entry" onclick="closeSheet();openGroupPicker(null,'${esc(name)}')"><span>群</span><div><b>拉人组建群聊</b><i>和 TA 一起建个讨论组</i></div><em>›</em></div>
      <div class="af-entry danger" onclick="closeSheet();${blocked ? `confirmUnblock('${esc(name)}')` : `confirmBlock('${esc(name)}')`}"><span>黑</span><div><b>${blocked ? "解除拉黑" : "拉黑"}</b><i>${blocked ? "恢复关注与私信" : "不再接收 TA 的消息与互动"}</i></div><em>›</em></div>
      <div class="af-entry" onclick="closeSheet();openReportUser('${esc(name)}')"><span>报</span><div><b>举报</b><i>冒充 / 辱骂 / 广告等违规行为</i></div><em>›</em></div>`);
  }
}

/** 群成员列表：点行进主页；我是群主可移除成员 */
function openGroupMembers() {
  const name = state.currentChat, g = GROUPS[name];
  if (!g) return;
  const meOwner = g.owner === "me";
  const me = state.profile.name || "我";
  const row = (n, isMe) => `<div class="person-row" ${isMe ? "" : `onclick="closeSheet();openArtistByName('${esc(n)}')" style="cursor:pointer"`}>
    <div class="avatar" style="background:${avatarBg(n)}">${esc(n[0])}</div>
    <div class="p-info"><b>${esc(n)}${isMe ? "（我）" : ""}${(isMe && meOwner) || g.owner === n ? " · 群主" : ""}</b><span>${isMe ? "就是你呀" : esc(bioOf(n))}</span></div>
    ${meOwner && !isMe ? `<button class="fbtn off" onclick="event.stopPropagation();gpRemove('${esc(n)}')">移除</button>` : ""}</div>`;
  openSheet(`群成员（${g.members.length + 1}）`,
    row(me, true) + g.members.map(n => row(n)).join("")
    + `<div class="af-entry" style="margin-top:10px" onclick="closeSheet();openGroupPicker('${esc(name)}')"><span>＋</span><div><b>添加成员</b><i>邀请互关好友进群</i></div><em>›</em></div>`);
}

function gpRemove(n) {
  const name = state.currentChat, g = GROUPS[name];
  g.members = g.members.filter(x => x !== n);
  CHATS[name].push({ who: "sys", type: "sys", txt: `你将 ${n} 移出了群聊` });
  $("#chatName").textContent = chatTitle(name);
  renderChat();
  renderMessages();
  openGroupMembers();
  toast(`已将「${n}」移出群聊`);
}

function openGroupRename() {
  const name = state.currentChat;
  openSheet("修改群聊名称", `
    <input class="post-input" id="gnInput" value="${esc(name)}" maxlength="16">
    <button class="btn primary" style="width:100%;margin-top:6px" onclick="saveGroupRename()">保存</button>`);
}

function saveGroupRename() {
  const old = state.currentChat;
  const v = ($("#gnInput")?.value || "").trim();
  if (!v) return toast("群名不能为空");
  if (v === old) { closeSheet(); return; }
  if (GROUPS[v] || CHATS[v]) return toast("这个名字被占用啦，换一个试试");
  GROUPS[v] = GROUPS[old]; delete GROUPS[old];
  CHATS[v] = CHATS[old]; delete CHATS[old];
  const m = MESSAGES.find(x => x.name === old);
  if (m) m.name = v;
  CHATS[v].push({ who: "sys", type: "sys", txt: `你将群名修改为「${v}」` });
  state.currentChat = v;
  $("#chatName").textContent = chatTitle(v);
  closeSheet();
  renderChat();
  renderMessages();
  toast("群名已修改");
}

function confirmQuitGroup() {
  const name = state.currentChat;
  openSheet("退出群聊", `
    <p class="se-note">退出后将不再接收「${esc(name)}」的消息，聊天记录同步清空。</p>
    <button class="btn primary danger-btn" style="width:100%;margin-top:14px" onclick="doQuitGroup()">确认退出</button>`);
}

function doQuitGroup() {
  const name = state.currentChat;
  delete GROUPS[name];
  delete CHATS[name];
  const i = MESSAGES.findIndex(x => x.name === name);
  if (i >= 0) MESSAGES.splice(i, 1);
  closeSheet();
  closeOverlay("ovChat");
  renderMessages();
  toast("已退出群聊");
}

/* ---------- 拉黑 / 举报（小红书式） ---------- */

/** 用户主页右上角「⋯」 */
function openUserMore() {
  const name = currentArtistName;
  if (!name) return;
  const blocked = state.blocked.has(name);
  openSheet("更多操作", `
    ${isFriend(name) && !blocked ? `<div class="af-entry" onclick="closeSheet();openChat('${esc(name)}')"><span>信</span><div><b>发消息</b><i>你们是互关好友</i></div><em>›</em></div>` : ""}
    <div class="af-entry danger" onclick="closeSheet();${blocked ? `confirmUnblock('${esc(name)}')` : `confirmBlock('${esc(name)}')`}"><span>黑</span><div><b>${blocked ? "解除拉黑" : "加入黑名单"}</b><i>${blocked ? "恢复关注与私信" : "TA 将无法关注、私信、评论你"}</i></div><em>›</em></div>
    <div class="af-entry" onclick="closeSheet();openReportUser('${esc(name)}')"><span>报</span><div><b>举报用户</b><i>冒充 / 辱骂 / 广告等违规行为</i></div><em>›</em></div>`);
}

function confirmBlock(name) {
  openSheet("拉黑用户", `
    <p class="se-note">拉黑后，「${esc(name)}」将无法关注你、给你发私信或评论你的作品；你们将自动解除关注关系。可在「设置 › 黑名单管理」中解除。</p>
    <button class="btn primary danger-btn" style="width:100%;margin-top:14px" onclick="doBlock('${esc(name)}')">确认拉黑</button>`);
}

function doBlock(name) {
  state.blocked.add(name);
  state.following.delete(name);
  closeSheet();
  if (state.currentChat === name) closeOverlay("ovChat");
  renderMessages();
  renderFollowStats();
  renderFollowList();
  updateArtFollowBtn();
  if ($("#ovSettings").classList.contains("show")) renderSettings();
  toast(`已拉黑「${name}」`);
}

function confirmUnblock(name) {
  openSheet("解除拉黑", `
    <p class="se-note">解除后，「${esc(name)}」可以重新关注你、给你发私信和评论。</p>
    <button class="btn primary" style="width:100%;margin-top:14px" onclick="doUnblock('${esc(name)}')">解除拉黑</button>`);
}

function doUnblock(name) {
  state.blocked.delete(name);
  closeSheet();
  renderMessages();
  renderFollowList();
  updateArtFollowBtn();
  if ($("#ovSettings").classList.contains("show")) renderSettings();
  toast(`已解除对「${name}」的拉黑`);
}

/** 设置 › 黑名单管理 */
function openBlocklist() {
  const list = [...state.blocked];
  openSheet("黑名单管理", list.length
    ? list.map(n => `<div class="person-row">
        <div class="avatar" style="background:${avatarBg(n)}">${esc(n[0])}</div>
        <div class="p-info"><b>${esc(n)}</b><span>${esc(bioOf(n))}</span></div>
        <button class="fbtn off" onclick="doUnblock('${esc(n)}');openBlocklist()">解除</button></div>`).join("")
    : `<div class="rev-hint">黑名单空空如也，和气生财～</div>`);
}

function openReportUser(name) {
  const reasons = ["冒充他人 / 盗用作品", "辱骂攻击", "垃圾广告营销", "色情低俗", "侵权搬运", "其他违规"];
  openSheet(`举报「${name}」`, `
    <p class="se-note" style="margin-bottom:10px">请选择举报原因，我们会尽快核实处理</p>
    ${reasons.map(r => `<div class="af-entry" onclick="closeSheet();toast('已收到举报，审核团队将在 24 小时内处理')"><span>报</span><div><b>${r}</b></div><em>›</em></div>`).join("")}`);
}

/** 打开任意用户主页：音乐人走完整主页，其余用户走简版名片页 */
function openArtistByName(name) {
  const idx = ARTISTS.findIndex(a => a.name === name);
  if (idx >= 0) { openArtist(idx); return; }
  currentArtistName = name;
  $("#ovArtistBody").innerHTML = userProfileHTML(name);
  $("#ovArtist").classList.add("show");
}

/** 全站已知用户（音乐人之外：粉丝/补充资料/社区/私信） */
function allUserNames() {
  const names = new Set([...FANS, ...Object.keys(USERS_EXTRA)]);
  POSTS.forEach(p => {
    names.add(p.name);
    if (p.origin) names.add(p.origin.name);
    (p.comments || []).forEach(c => names.add(c.name));
  });
  MESSAGES.forEach(m => names.add(m.name));
  names.delete("平台助手"); // 系统账号不当用户
  ARTISTS.forEach(a => names.delete(a.name));
  names.delete(state.profile.name);
  return [...names];
}

function closeOverlay(id) {
  $("#" + id).classList.remove("show");
}

/* ---------- 发布面板 / 发布编辑器 ---------- */

function openPublish()  { $("#pubMask").classList.add("show"); }
function closePublish() { $("#pubMask").classList.remove("show"); }

/** 发布面板入口：上架到橱窗（复用橱窗商品编辑器） */
function openShopPub() {
  closePublish();
  openMgEdit("shop", -1);
}

/** 发布草稿状态（每次打开编辑器重置） */
let pubState = null;

/** @param mode "work" 作品 | "demand" 企划招募 */
function openPubForm(mode) {
  closePublish();
  pubState = { mode, types: [], biz: [], roles: [], tags: {}, cover: null, media: null, dur: null, attach: null };
  $("#pubTitle").textContent = mode === "work" ? "发布作品" : "发布企划招募";
  $("#pubBody").innerHTML = mode === "work" ? pubWorkFormHTML() : pubDemandFormHTML();
  $("#ovPub").classList.add("show");
}

/** 品类多选；根据已选品类联动展示小样/词作区块与必填标记 */
function pubToggleType(t, el) {
  const i = pubState.types.indexOf(t);
  i >= 0 ? pubState.types.splice(i, 1) : pubState.types.push(t);
  el.classList.toggle("on", i < 0);
  const rules = pubState.types.map(x => CONFIG.mediaRules[x]);
  const needAV = rules.some(r => r === "av" || r === "video");
  $("#pubMediaBlock").style.display = pubState.types.some(x => x !== "作词") ? "" : "none";
  $("#pubLyricBlock").style.display = pubState.types.includes("作词") ? "" : "none";
  $("#pubMediaLabel").innerHTML = "音频 / 视频小样" + (needAV ? " <b>*</b>" : "");
  $("#pubCoverLabel").innerHTML = "封面" + (rules.includes("image") ? " <b>*</b>" : "");
}

function pubToggleBiz(b, el) {
  const i = pubState.biz.indexOf(b);
  i >= 0 ? pubState.biz.splice(i, 1) : pubState.biz.push(b);
  el.classList.toggle("on", i < 0);
}

function pubToggleRole(r, el) {
  const i = pubState.roles.indexOf(r);
  i >= 0 ? pubState.roles.splice(i, 1) : pubState.roles.push(r);
  el.classList.toggle("on", i < 0);
}

/** 发布表单「其他」：自定义招募工种，命名后插入选中 chip */
function pubAddCustomRole(btn) {
  askRoleName(r => {
    if (!pubState.roles.includes(r)) pubState.roles.push(r);
    btn.parentElement.insertBefore(makeCustomChip(r, el => pubToggleRole(r, el)), btn);
  });
}

/** 发布表单「其他」：自定义作品品类（无强制小样规则） */
function pubAddCustomType(btn) {
  askRoleName(t => {
    if (!pubState.types.includes(t)) pubState.types.push(t);
    btn.parentElement.insertBefore(makeCustomChip(t, el => pubToggleType(t, el)), btn);
  });
}

function makeCustomChip(text, onToggle) {
  const chip = document.createElement("div");
  chip.className = "chip on";
  chip.textContent = text;
  chip.onclick = () => onToggle(chip);
  return chip;
}

/** 风格/用途标签多选（与首页标签检索对齐） */
function pubToggleTag(group, tag, el) {
  const sel = pubState.tags[group] || (pubState.tags[group] = []);
  const i = sel.indexOf(tag);
  i >= 0 ? sel.splice(i, 1) : sel.push(tag);
  el.classList.toggle("on", i < 0);
}

function pubPickCover() { $("#pubCoverFile").click(); }
function pubPickMedia() { $("#pubMediaFile").click(); }
function pubPickAttach() { $("#pubAttachFile").click(); }

/** 附件：任意格式，单个不超过 2G */
function onPubAttach(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024 * 1024) {
    toast("文件超过 2G 上限，请压缩后再传");
    input.value = "";
    return;
  }
  const gb = 1024 * 1024 * 1024, mb = 1024 * 1024;
  const sizeTxt = file.size >= gb ? (file.size / gb).toFixed(2) + " GB"
    : file.size >= mb ? (file.size / mb).toFixed(1) + " MB"
    : Math.max(1, Math.round(file.size / 1024)) + " KB";
  const ext = (file.name.split(".").pop() || "文件").toUpperCase();
  pubState.attach = { name: file.name, size: sizeTxt, ext };
  const label = $("#pubAttachName");
  label.textContent = `${file.name}（${ext} · ${sizeTxt}）`;
  label.classList.add("has");
  toast(`附件已就绪：${sizeTxt}，将随作品一同发布`);
  input.value = "";
}

/** 封面：支持图片/视频，自动识别格式，上传后可点击预览 */
function onPubCover(input) {
  const file = input.files[0];
  if (!file) return;
  const kind = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : null;
  if (!kind) { toast("封面仅支持图片或视频格式"); input.value = ""; return; }
  const reader = new FileReader();
  reader.onload = e => {
    pubState.cover = { kind, url: e.target.result };
    const prev = $("#pubCoverPrev");
    prev.innerHTML = kind === "image"
      ? `<img src="${pubState.cover.url}">`
      : `<video src="${pubState.cover.url}"></video><span class="play-mini">▶</span>`;
    prev.classList.add("has");
    toast(`已识别封面：${kind === "image" ? "图片" : "视频"} · 点击缩略图可查看`);
  };
  reader.readAsDataURL(file);
  input.value = "";
}

/** 小样：自动识别音频/视频格式与时长，上传后可点击预览 */
function onPubMedia(input) {
  const file = input.files[0];
  if (!file) return;
  const kind = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : null;
  if (!kind) { toast("小样仅支持音频或视频格式"); input.value = ""; return; }
  const ext = (file.name.split(".").pop() || "").toUpperCase();
  const url = URL.createObjectURL(file);
  pubState.media = { kind, name: file.name, url };
  const label = $("#pubMediaName");
  label.textContent = `${file.name}（${ext} ${kind === "video" ? "视频" : "音频"}）· 点击预览`;
  label.classList.add("has");
  // 读取真实时长（失败则留空）
  const probe = document.createElement(kind === "video" ? "video" : "audio");
  probe.preload = "metadata";
  probe.onloadedmetadata = () => {
    const s = Math.round(probe.duration);
    pubState.dur = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };
  probe.src = url;
  input.value = "";
}

/* 上传内容预览 */
function openPreview(html) {
  $("#prevBox").innerHTML = html;
  $("#prevMask").classList.add("show");
}
function closePreview() {
  $("#prevBox").innerHTML = ""; // 停止播放
  $("#prevMask").classList.remove("show");
}
function previewCover() {
  if (!pubState?.cover) return;
  const { kind, url } = pubState.cover;
  openPreview(kind === "image" ? `<img src="${url}">` : `<video src="${url}" controls autoplay></video>`);
}
function previewMedia() {
  if (!pubState?.media) return;
  const { kind, url } = pubState.media;
  openPreview(kind === "video"
    ? `<video src="${url}" controls autoplay></video>`
    : `<div class="audio-wrap"><audio src="${url}" controls autoplay></audio></div>`);
}

/** 回到首页对应模式并刷新 */
function backHomeAs(mode) {
  state.homeMode = mode;
  state.tagSel = {};
  $$("#modeTabs .mode-tab").forEach((t, i) =>
    t.classList.toggle("on", i === (mode === "works" ? 0 : mode === "artist" ? 1 : 2)));
  renderCategories();
  renderHome();
  switchTab($('.tab[data-scr="scr-home"]'));
}

function submitPublish() {
  const title = $("#pubName").value.trim();
  if (!title) { toast("请先填写标题"); return; }
  const p = state.profile;
  const author = p.name || "我";

  if (pubState.mode === "work") {
    if (!pubState.types.length) { toast("请至少选择一个作品品类"); return; }
    // 按已选品类逐一校验必需内容（格式已在上传时自动识别）
    const hasAudio = pubState.media?.kind === "audio";
    const hasVideo = pubState.media?.kind === "video" || pubState.cover?.kind === "video";
    const lyric = pubState.types.includes("作词") ? $("#pubLyric").value.trim() : "";
    for (const t of pubState.types) {
      const rule = CONFIG.mediaRules[t];
      if (rule === "av" && !hasAudio && !hasVideo) {
        toast(`「${t}」品类需上传音频或视频小样`); return;
      }
      if (rule === "video" && !hasVideo) { toast(`「${t}」品类需上传视频`); return; }
      if (rule === "image" && pubState.cover?.kind !== "image") { toast(`「${t}」品类需上传封面图片`); return; }
      if (rule === "lyric" && !lyric) { toast(`「${t}」品类需填写词作正文`); return; }
    }

    const coverCss = pubState.cover?.kind === "image"
      ? `url(${pubState.cover.url}) center/cover`
      : pubState.cover?.kind === "video"
        ? "linear-gradient(160deg,#1E2A24,#2FA36B)" : null;
    WORKS.unshift({
      id: Date.now(), type: pubState.types, title,
      author, role: state.myRoles.join(" / ") || "新人音乐人",
      biz: pubState.biz, price: $("#pubPrice").value.trim() || "价格可议",
      tags: [...(pubState.tags["风格"] || []), ...(pubState.tags["用途"] || [])],
      audio: hasAudio && !hasVideo,
      video: hasVideo,
      cover: coverCss, glyph: coverCss ? title[title.startsWith("《") ? 1 : 0] : "♪",
      lyric: !coverCss && lyric ? lyric : undefined,
      dur: pubState.dur || "—", ch: 140 + (title.length * 13) % 60,
      attach: pubState.attach || undefined,
      desc: $("#pubDesc").value.trim() || "（暂无简介）",
      detail: $("#pubDetail").value.trim() || "约稿细节请私信沟通。",
    });
    closeOverlay("ovPub");
    backHomeAs("works");
    toast("作品已发布");
  } else {
    DEMANDS.unshift({
      title, desc: $("#pubDesc").value.trim() || "（暂无描述）",
      biz: pubState.biz,
      tags: [
        ...(pubState.roles.length ? pubState.roles.map(r => "招" + r) : ["招合作"]),
        ...(pubState.tags["风格"] || []), ...(pubState.tags["用途"] || []),
      ],
      who: author + " 发起", budget: $("#pubPrice").value.trim() || "预算可议",
      cover: pubState.cover?.kind === "image" ? `url(${pubState.cover.url}) center/cover` : null,
      hasVideo: pubState.cover?.kind === "video" || pubState.media?.kind === "video",
      hasAudio: pubState.media?.kind === "audio",
    });
    closeOverlay("ovPub");
    backHomeAs("demand");
    toast("招募已发布，等待音乐人投递");
  }
}

/* ---------- 注册 · 基本资料 + 工种选择 ---------- */

const randomUid = () => "quqi_" + Math.floor(100000 + Math.random() * 900000);

/** 当前头像：自定义优先，否则按性别生成简笔画 */
function avatarInnerHTML() {
  const p = state.profile;
  return p.avatar ? `<img src="${p.avatar}" alt="头像">` : stickAvatarSVG(p.gender);
}

function renderAvatarPreview() {
  $("#avatarPreview").innerHTML = avatarInnerHTML();
}

function setGender(g, el) {
  state.profile.gender = g;
  $$("#genderRow .chip").forEach(c => c.classList.toggle("on", c === el));
  renderAvatarPreview();
}

/** 头像可随时更换：注册预览与主页头像共用同一选择器 */
function pickAvatar() {
  $("#avatarFile").click();
}

/* ---------- 图片裁剪（拖动平移 + 滑杆缩放）：头像圆形 / 名片背景矩形 ---------- */

let cropCtx = null;  // { img, z, x, y, w, h, out, q, done }
let cropDrag = null;

function onAvatarFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = "";
  openCrop(URL.createObjectURL(file), {
    w: 240, h: 240, round: true, title: "裁剪头像", out: 480, q: .9,
    done(dataURL) {
      state.profile.avatar = dataURL;
      if ($("#regOverlay").classList.contains("show")) renderAvatarPreview();
      renderMyProfile();
      toast("头像已更新 ✓");
    },
  });
}

function openCrop(src, opts) {
  const img = new Image();
  img.onload = () => {
    cropCtx = { img, z: 1, x: 0, y: 0, ...opts };
    const view = $(".crop-view");
    view.style.width = opts.w + "px";
    view.style.height = opts.h + "px";
    $("#cropTitle").textContent = opts.title;
    $("#cropMask").classList.toggle("rect", !opts.round);
    $("#cropImg").src = src;
    $("#cropZoom").value = 100;
    cropApply();
    $("#cropMask").classList.add("show");
  };
  img.onerror = () => {
    URL.revokeObjectURL(src);
    toast("图片无法读取，请换一张 JPG / PNG 试试");
  };
  img.src = src;
}

function cropApply() {
  const { img, z, x, y, w, h } = cropCtx;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * z;
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  const el = $("#cropImg");
  el.style.width = dw + "px";
  el.style.height = dh + "px";
  el.style.left = (w / 2 + x - dw / 2) + "px";
  el.style.top = (h / 2 + y - dh / 2) + "px";
}

function cropSetZoom(v) { if (cropCtx) { cropCtx.z = v / 100; cropApply(); } }
function cropDown(e) {
  if (!cropCtx) return;
  cropDrag = { sx: e.clientX, sy: e.clientY, ox: cropCtx.x, oy: cropCtx.y };
  e.currentTarget.setPointerCapture?.(e.pointerId);
}
function cropMove(e) {
  if (!cropDrag || !cropCtx) return;
  cropCtx.x = cropDrag.ox + e.clientX - cropDrag.sx;
  cropCtx.y = cropDrag.oy + e.clientY - cropDrag.sy;
  cropApply();
}
function cropUp() { cropDrag = null; }
function closeCrop() {
  const src = $("#cropImg").src;
  if (src.startsWith("blob:")) URL.revokeObjectURL(src);
  $("#cropMask").classList.remove("show");
  cropCtx = null; cropDrag = null;
}

function confirmCrop() {
  if (!cropCtx) return;
  const { img, z, x, y, w, h, out, q, done } = cropCtx;
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * z;
  const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
  const left = w / 2 + x - dw / 2, top = h / 2 + y - dh / 2;
  const cv = document.createElement("canvas");
  cv.width = out;
  cv.height = Math.round(out * h / w);
  cv.getContext("2d").drawImage(img, -left / s, -top / s, w / s, h / s, 0, 0, cv.width, cv.height);
  const dataURL = cv.toDataURL("image/jpeg", q);
  closeCrop();
  done(dataURL);
}

/* ---------- 名片背景（边缘景深模糊） ---------- */

function heroBgMenu() {
  openSheet("名片背景", `
    <div class="set-item" onclick="closeSheet();$('#heroBgFile').click()"><span>从相册选择背景</span><i>›</i></div>
    <div class="set-item" onclick="closeSheet();resetHeroBg()"><span>↩︎ 恢复默认底色</span><i>›</i></div>`);
}

function onHeroBgFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = "";
  openCrop(URL.createObjectURL(file), {
    w: 272, h: 150, round: false, title: "裁剪名片背景", out: 1200, q: .82,
    done(dataURL) {
      state.profile.heroBg = dataURL;
      applyHeroBg();
      toast("名片背景已更换");
    },
  });
}

function resetHeroBg() {
  state.profile.heroBg = null;
  applyHeroBg();
  toast("已恢复默认底色");
}

function applyHeroBg() {
  const hero = $("#myHero");
  if (state.profile.heroBg) {
    hero.classList.add("has-bg");
    hero.style.setProperty("--hero-bg", `url(${state.profile.heroBg})`);
  } else {
    hero.classList.remove("has-bg");
    hero.style.removeProperty("--hero-bg");
  }
}

function showRegStep(n) {
  state.regStep = n;
  const isReg = state.roleSetupMode === "register";
  $("#regStep1").style.display = n === 1 ? "" : "none";
  $("#regStep2").style.display = n === 2 ? "" : "none";
  if (n === 1) {
    $("#regSkip").style.display = "none";
    $("#regBtn").textContent = "下一步";
    renderAvatarPreview();
  } else {
    $("#regTitle").textContent = isReg ? "选择你的工种" : "编辑我的工种";
    $("#regSub").textContent = isReg
      ? "可多选 · 跳过可稍后在「我的主页」中设置"
      : "可多选 · 主页将只展示所选工种";
    $("#regSkip").style.display = isReg ? "" : "none";
    $("#regBtn").textContent = isReg ? "完成注册" : "保存";
    renderRoleGrid();
  }
}

/** 底部主按钮：步骤一校验圈名后进入步骤二；步骤二即确认 */
function regNext() {
  if (state.roleSetupMode === "register" && state.regStep === 1) {
    const name = $("#fName").value.trim();
    if (!name) { toast("圈名为必填项"); return; }
    state.profile.name = name;
    state.profile.uid = $("#fUid").value.trim() || randomUid();
    state.profile.bio = $("#fBio").value.trim();
    showRegStep(2);
  } else {
    confirmRoles();
  }
}

function renderRoleGrid() {
  $("#roleGrid").innerHTML = [...CONFIG.roles, ...state.customRoles].map(r => `
    <div class="role-item ${state.myRoles.includes(r) ? "on" : ""}" onclick="toggleRole('${r}', this)">
      <div class="icon">${CONFIG.roleIcons[r] || CONFIG.icons.pencil}</div><b>${r}</b><span class="check">✓</span>
    </div>`).join("") + `
    <div class="role-item" onclick="addCustomMyRole()">
      <div class="icon">${CONFIG.icons.plus}</div><b>其他</b><span class="check">✎</span>
    </div>`;
}

/** 注册/编辑工种「其他」：自定义命名后直接选中 */
function addCustomMyRole() {
  askRoleName(r => {
    if (!state.myRoles.includes(r)) state.myRoles.push(r);
    renderRoleGrid();
  });
}

function toggleRole(r, el) {
  const i = state.myRoles.indexOf(r);
  i >= 0 ? state.myRoles.splice(i, 1) : state.myRoles.push(r);
  el.classList.toggle("on", i < 0);
}

/* ---------- 自定义工种命名弹层（注册 / 发布均复用） ---------- */

let roleNameCb = null;

function askRoleName(cb) {
  roleNameCb = cb;
  $("#roleNameInput").value = "";
  $("#roleNameMask").classList.add("show");
  setTimeout(() => $("#roleNameInput").focus(), 80);
}

function closeRoleName() {
  $("#roleNameMask").classList.remove("show");
  roleNameCb = null;
}

function confirmRoleName() {
  const name = $("#roleNameInput").value.trim().replace(/['"<>`\\]/g, "");
  if (!name) { toast("请填写工种名称"); return; }
  const cb = roleNameCb;
  closeRoleName();
  registerCustomRole(name);
  cb && cb(name);
  toast(`已添加自定义工种「${name}」`);
}

/** 全局登记自定义工种：进入工种池与首页「工种」检索标签 */
function registerCustomRole(name) {
  if (!CONFIG.roles.includes(name) && !state.customRoles.includes(name))
    state.customRoles.push(name);
  const g = CONFIG.tagGroups.find(g => g.key === "工种");
  if (g && !g.tags.includes(name)) g.tags.push(name);
  renderCategories();
}

/** @param mode "register" 注册引导（可跳过） | "edit" 主页二次编辑 */
function openRoleSetup(mode) {
  state.roleSetupMode = mode;
  showRegStep(mode === "register" ? 1 : 2);
  $("#regOverlay").classList.add("show");
}

function skipRoles() {
  $("#regOverlay").classList.remove("show");
  renderMyProfile();
  toast("已跳过，可稍后在「我的主页」选择工种");
}

function confirmRoles() {
  $("#regOverlay").classList.remove("show");
  renderMyProfile();
  toast(state.roleSetupMode === "register"
    ? (state.myRoles.length ? "注册完成，欢迎入驻曲境" : "注册完成，可稍后补选工种")
    : "工种已更新 ✓");
}

/** 个人主页：头像 / 圈名 / ID / 简介 / 工种标签（不展示“xx 经验”等词条） */
function renderMyProfile() {
  const p = state.profile;
  $("#myAvatar").innerHTML = avatarInnerHTML();
  $("#myName").textContent = p.name || "未注册";
  $("#myUid").textContent = "ID: " + (p.uid || "—");
  const bio = $("#myBio");
  bio.textContent = p.bio;
  bio.style.display = p.bio ? "" : "none";
  $("#myRoles").innerHTML = state.myRoles.length
    ? state.myRoles.map(r => `<span class="tag">${r}</span>`).join("")
    : `<span class="tag gray">未设置工种 · 点击选择 ›</span>`;
  $("#statWorks").textContent = MY_WORKS.filter(w => !w.hidden).length;
  applyHeroBg();
  renderMyStyleShop();
}

/** 名片「作品」数字 → 我的作品清单 */
function openMyWorksList() {
  const list = MY_WORKS.filter(w => !w.hidden)
    .sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0));
  openSheet(`我的作品清单 · ${list.length}`, list.map(w => `
    <div class="search-row" onclick="toast('Demo：作品《${esc(w.title)}》')">
      <div class="sr-glyph" style="background:${w.grad};color:#fff">${esc(w.glyph)}</div>
      <div class="sr-info"><b>${esc(w.title)}${w.top ? " · 置顶" : ""}</b><span>${esc(w.role)} · 播放 ${esc(w.plays)}</span></div>
      <span class="art-arrow">›</span></div>`).join("")
    || `<div class="rev-hint">暂无公开作品 · 去发布页上传</div>`);
}

/** 名片「好评率」 → 别人给我的评价 */
function openMyReviewsSheet() {
  openSheet(`我收到的评价 · ${MY_REVIEWS.length}`,
    MY_REVIEWS.map(reviewItemHTML).join("")
    || `<div class="rev-hint">还没有收到评价</div>`);
}

/* ---------- 个人风格 / 我的橱窗 / 报价 / 作品（米画师式，均可管理） ---------- */

function renderMyStyleShop() {
  $("#myStyle").innerHTML = `<div class="style-box">
    <div class="style-tags">${MY_STYLE.tags.map(t => `<span class="stag">${esc(t)}</span>`).join("")}</div>
    <p>${esc(MY_STYLE.desc)}</p></div>`;
  const shop = MY_SHOP.filter(s => !s.off);
  $("#myShop").innerHTML = shop.length
    ? shop.map((s, i) => shopCardHTML(s, state.profile.name || "洛云笙", i)).join("")
    : `<div class="rev-hint" style="width:100%">橱窗空空如也 · 点右上「管理」上架第一件商品</div>`;
  renderMyPrices();
  renderMyWorks();
}

function renderMyPrices() {
  $("#myPrices").innerHTML = MY_PRICES.map(p => `
    <div class="price-item">
      <div class="pl">${esc(p.t)}<small>${esc(p.note)}</small></div>
      <div><span class="tag ${p.biz === "商业" ? "biz" : "nonbiz"}">${p.biz}</span>
        <span class="price">${esc(p.price.replace(" 起", ""))}${p.price.includes("起") ? "<small> 起</small>" : ""}</span></div>
    </div>`).join("") || `<div class="rev-hint">暂无报价 · 点「编辑」新增</div>`;
}

function renderMyWorks() {
  const list = MY_WORKS.filter(w => !w.hidden)
    .sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0));
  $("#myWorks").innerHTML = list.map(w => `
    <div class="mini-work" onclick="toast('Demo：作品《${esc(w.title)}》')">
      <div class="cover" style="background:${w.grad}">${esc(w.glyph)}${w.top ? `<i class="mw-top">置顶</i>` : ""}</div>
      <b>${esc(w.title)}</b><span>${esc(w.role)} · 播放 ${esc(w.plays)}</span>
    </div>`).join("") || `<div class="rev-hint" style="width:100%">暂无公开作品 · 去发布页上传</div>`;
}

/* ---------- 橱窗购买（现货一次性买断 / 企划打包约稿） ---------- */

let sbCtx = null; // { owner, item, channel }

function shopPriceOf(item) { return parseInt(item.price.replace(/[^\d]/g, ""), 10) || 0; }

function openShopBuy(owner, idx) {
  const myName = state.profile.name || "洛云笙";
  if (owner === myName) { openManage("shop"); return; } // 自己的商品 → 去管理
  const artist = ARTISTS.find(a => a.name === owner);
  const item = artist && artist.shop[idx];
  if (!item) { toast("商品不存在或已下架"); return; }
  sbCtx = { owner, item, channel: "支付宝" };
  renderShopBuy();
  $("#shopBuyMask").classList.add("show");
}
function closeShopBuy() { $("#shopBuyMask").classList.remove("show"); }
function setSbChannel(c) { sbCtx.channel = c; renderShopBuy(); }

function previewShopCover() {
  const c = sbCtx && sbCtx.item.cover;
  if (!c) return;
  openPreview(c.kind === "image"
    ? `<img src="${c.url}">` : `<video src="${c.url}" controls autoplay></video>`);
}

function previewShopMedia() {
  const m = sbCtx && sbCtx.item.media;
  if (!m) return;
  if (!m.url) { toast(`Demo：试听『${m.name}』`); return; }
  openPreview(m.kind === "video"
    ? `<video src="${m.url}" controls autoplay></video>`
    : `<div class="audio-wrap"><audio src="${m.url}" controls autoplay></audio></div>`);
}

function renderShopBuy() {
  const { owner, item } = sbCtx;
  const isBundle = item.kind === "bundle";
  const amt = shopPriceOf(item);
  const balance = ORDERS.filter(x => x.status === "已完成" && x.mine === "接稿")
    .reduce((s, x) => s + x.amount, 0);

  const hasImg = item.cover && item.cover.kind === "image";
  const coverBg = hasImg ? `url(${item.cover.url}) center/cover` : item.grad;
  const hero = `
    <div class="sb-hero">
      <div class="sb-cover ${isBundle ? "bundle" : ""}" style="background:${coverBg}"
        ${item.cover ? `onclick="previewShopCover()" title="点击查看"` : ""}>
        ${hasImg ? "" : esc(item.glyph)}${item.cover && item.cover.kind === "video" ? `<span class="play-mini">▶</span>` : ""}
      </div>
      <div class="sb-info">
        <b>${esc(item.title)}</b>
        <span>卖家 ${esc(owner)} · ${isBundle ? `企划打包 · ${item.count} 项` : `现货成品 · <i class="tag ${item.biz === "商业" ? "biz" : "nonbiz"}">${item.biz}</i>`}</span>
      </div>
    </div>
    ${item.desc ? `<p class="sb-desc">${esc(item.desc)}</p>` : ""}
    ${item.media || item.doc ? `<div class="sb-files">
      ${item.media ? `<div class="sb-file" onclick="previewShopMedia()">试听小样 · ${esc(item.media.name)} ›</div>` : ""}
      ${item.doc ? `<div class="sb-file" onclick="toast('Demo：预览文档『${esc(item.doc.name)}』')">说明文档 · ${esc(item.doc.name)}（${esc(item.doc.size)}） ›</div>` : ""}
    </div>` : ""}`;

  if (isBundle) {
    // 企划整体约稿：歌单式打包，需先商定方案再托管
    $("#sbBody").innerHTML = `${hero}
      <div class="pay-rows">
        <div class="pay-row"><span>项目数</span><b>${item.count} 项</b></div>
        <div class="pay-row total"><span>打包价</span><b>${esc(item.price)}</b></div>
      </div>
      <p class="escrow-note">企划打包为定制约稿：发起后与卖家商定曲目构成、档期与分期方案，双方确认后再按期托管</p>
      <div class="rate-acts">
        <button class="btn ghost" onclick="closeShopBuy();openChat('${esc(owner)}')">私信沟通</button>
        <button class="btn primary" onclick="confirmShopBuy()">发起约稿订单</button>
      </div>`;
    return;
  }

  // 现货：一次性买断，全款托管 → 卖家交源文件 → 验收解冻
  $("#sbBody").innerHTML = `${hero}
    <div class="pay-rows">
      <div class="pay-row"><span>交易方式</span><b>一次性买断（全款）</b></div>
      <div class="pay-row"><span>交付内容</span><b>成品源文件（工程/分轨）</b></div>
      <div class="pay-row"><span>授权范围</span><b>${item.biz === "商业" ? "商用买断 · 可商用可二改" : "非商买断 · 署名使用"}</b></div>
      <div class="pay-row"><span>交付时效</span><b>托管后 24h 内上传</b></div>
      <div class="pay-row total"><span>买断价</span><b>¥${amt.toLocaleString()}</b></div>
    </div>
    <div class="pay-channels">
      ${PAY_CHANNELS.map(c => `
        <div class="pch ${sbCtx.channel === c.key ? "on" : ""}" onclick="setSbChannel('${c.key}')">
          <span>${c.icon}</span><b>${c.key}</b>
          ${c.key === "曲境余额" ? `<small>可用 ¥${balance.toLocaleString()}</small>` : ""}
          <i>${sbCtx.channel === c.key ? "●" : "○"}</i>
        </div>`).join("")}
    </div>
    <p class="escrow-note">买断款由平台托管冻结，卖家交付源文件、您确认后才结算；确认前仅可水印预览</p>
    <button class="btn primary" style="width:100%" onclick="confirmShopBuy()">一次性买断 ¥${amt.toLocaleString()}</button>`;
}

function confirmShopBuy() {
  const { owner, item } = sbCtx;
  const isBundle = item.kind === "bundle";
  const amt = shopPriceOf(item);
  if (!isBundle && sbCtx.channel === "曲境余额") {
    const balance = ORDERS.filter(x => x.status === "已完成" && x.mine === "接稿")
      .reduce((s, x) => s + x.amount, 0);
    if (balance < amt) { toast("余额不足，换个支付方式吧"); return; }
  }
  const d = new Date();
  const id = `QX-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
  const date = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  ORDERS.unshift(isBundle
    ? {
        id, title: item.title, who: owner, mine: "约稿",
        amount: amt, paid: 0, payMode: "分期", status: "待付款", date,
        note: "企划打包约稿 · 与卖家商定曲目与分期方案后开始托管",
      }
    : {
        id, title: item.title, who: owner, mine: "约稿",
        amount: amt, paid: amt, payMode: "全款", status: "进行中", date,
        note: `现货买断 · 全款 ¥${amt.toLocaleString()} 已托管冻结 · 等待卖家上传源文件`,
      });
  closeShopBuy();
  $("#ovArtist").classList.remove("show"); // 关掉音乐人主页浮层
  renderOrders();
  const meTab = [...$$(".tab")].find(t => t.dataset.scr === "scr-me");
  if (meTab) switchTab(meTab); // 跳到「我的」查看订单
  toast(isBundle
    ? "约稿订单已发起 · 商定方案后托管"
    : `已通过${sbCtx.channel}托管 ¥${amt.toLocaleString()} 卖家交付后验收解冻`);
}

/* ---------- 发起约稿（邀约式：发送 → 对方接受 → 托管付款） ---------- */

let cmCtx = null; // { to, types: [], payMode, attach }

/** @param to 约稿对象 @param refTitle 参考作品标题（从作品浏览页进入时预填） */
/** 我发布的企划招募（未注册时作者记为「我」） */
function myDemands() {
  const names = [`${state.profile.name} 发起`, "我 发起"];
  return DEMANDS.filter(d => names.includes(d.who));
}

function openCommission(to, refTitle) {
  if (!to) { toast("Demo：约稿对象不存在"); return; }
  const p = state.profile;
  if (to === p.name) { toast("不能约自己的稿哦"); return; }
  cmCtx = { to, types: [], payMode: "全款", instN: 2, attach: null, fromDemand: null };
  const cats = CONFIG.categories.filter(c => c !== "全部");
  const mines = myDemands();
  $("#cmBody").innerHTML = `
    <label>约稿对象</label>
    <div class="pay-order" style="margin-bottom:12px">
      <b>${esc(to)}</b>
      <span>开放约稿中 · 平均响应 2 小时</span>
    </div>
    ${mines.length ? `
    <label>从我的企划招募邀约（选填）</label>
    <div id="cmDemList">
      ${mines.map((d, i) => `<div class="cm-demand" onclick="cmPickDemand(${i}, this)">
        <b>${esc(d.title)}</b>
        <span>${esc(d.budget)} · ${d.tags.slice(0, 3).map(esc).join(" / ")}</span>
      </div>`).join("")}
    </div>
    <p class="se-note">选中后自动带入企划标题、描述与预算，对方接受即视为加入企划</p>` : ""}
    <label>约稿项目标题 <b>*</b></label>
    <input id="cmT" maxlength="30" placeholder="如：古风单曲《…》作曲+编曲" value="${refTitle ? esc(refTitle) + " · 同风格约稿" : ""}">
    <label>约稿品类（可多选） <b>*</b></label>
    <div class="gender-row" style="flex-wrap:wrap">
      ${cats.map(c => `<div class="chip" onclick="cmToggleType('${c}', this)">${c}</div>`).join("")}
      ${state.customRoles.map(c => `<div class="chip" onclick="cmToggleType('${c}', this)">${c}</div>`).join("")}
      <div class="chip" onclick="cmAddCustomType(this)">＋ 其他</div>
    </div>
    <label>需求描述 <b>*</b></label>
    <textarea id="cmDesc" rows="4" placeholder="风格参考、用途（同人/商用）、时长、交付内容（小样/分轨/工程）…"></textarea>
    <label>参考文件（选填）</label>
    <div class="upload-row">
      <div class="upload-btn" onclick="$('#cmAttachFile').click()">上传参考</div>
      <span class="upload-name" id="cmAttachName">未选择文件</span>
    </div>
    <p class="se-note">参考曲 / 文案 / 分镜脚本等任意格式，单个不超过 2G</p>
    <label>预算（元） <b>*</b></label>
    <input id="cmBudget" type="number" min="1" placeholder="如：2000" oninput="cmFillInstAvg()">
    <label>期望交付日期（选填）</label>
    <input id="cmDue" type="date">
    <label>期望付款方式</label>
    <div class="chip-row">
      <div class="chip on" onclick="cmSetPay('全款', this)">全款托管</div>
      <div class="chip" onclick="cmSetPay('分期', this)">分期付款</div>
    </div>
    <div id="cmInstBlock" style="display:none">
      <label>分几期（2–6 期）</label>
      <input id="cmInstN" type="number" min="2" max="6" value="2" oninput="cmSetInstN(this.value)">
      <label>每期金额（元）</label>
      <div id="cmInstRows"></div>
      <p class="se-note" id="cmInstSum"></p>
    </div>`;
  $("#ovCommission").classList.add("show");
  $("#cmBody").scrollTop = 0;
}

function cmToggleType(t, el) {
  const i = cmCtx.types.indexOf(t);
  i >= 0 ? cmCtx.types.splice(i, 1) : cmCtx.types.push(t);
  el.classList.toggle("on", i < 0);
}

/** 选用自己发布的企划招募：预填标题/描述/预算/品类，再点取消 */
function cmPickDemand(i, el) {
  const d = myDemands()[i];
  if (!d) return;
  const picked = el.classList.contains("on");
  [...$$("#cmDemList .cm-demand")].forEach(c => c.classList.remove("on"));
  if (picked) { // 取消选用
    cmCtx.fromDemand = null;
    $("#cmT").value = "";
    $("#cmDesc").value = "";
    toast("已取消选用企划");
    return;
  }
  el.classList.add("on");
  cmCtx.fromDemand = d.title;
  $("#cmT").value = `${d.title} · 定向邀约`;
  $("#cmDesc").value = d.desc;
  const m = d.budget.replace(/,/g, "").match(/\d+/);
  if (m) { $("#cmBudget").value = m[0]; cmFillInstAvg(); }
  // 按企划「招 X」标签勾选对应品类 chips
  const roles = d.tags.filter(t => t.startsWith("招") && t !== "招合作").map(t => t.slice(1).trim());
  cmCtx.types = [];
  [...$$("#cmBody .gender-row .chip")].forEach(c => {
    const t = c.textContent.trim();
    const hit = roles.includes(t);
    c.classList.toggle("on", hit);
    if (hit) cmCtx.types.push(t);
  });
  toast("已带入企划内容，可继续补充修改");
}

function cmAddCustomType(btn) {
  askRoleName(t => {
    if (!cmCtx.types.includes(t)) cmCtx.types.push(t);
    btn.parentElement.insertBefore(makeCustomChip(t, el => cmToggleType(t, el)), btn);
  });
}

function cmSetPay(m, el) {
  cmCtx.payMode = m;
  el.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === el));
  $("#cmInstBlock").style.display = m === "分期" ? "" : "none";
  if (m === "分期") cmFillInstAvg();
}

/** 输入分期期数（2–6） */
function cmSetInstN(v) {
  const n = parseInt(v, 10);
  if (!n || n < 2 || n > 6) return; // 输入中/超出范围时不重绘，失焦由 change 児正
  cmCtx.instN = n;
  cmFillInstAvg();
}

/** 按预算均分填充每期金额（末期兜底取整），可手动改 */
function cmFillInstAvg() {
  if (cmCtx.payMode !== "分期") return;
  const amt = parseInt($("#cmBudget").value, 10) || 0;
  const n = cmCtx.instN;
  const per = Math.floor(amt / n);
  const vals = Array.from({ length: n }, (_, i) => (i === n - 1 ? amt - per * (n - 1) : per));
  $("#cmInstRows").innerHTML = vals.map((v, i) => `
    <div class="code-row" style="margin-bottom:6px">
      <span style="font-size:11.5px;color:var(--ink-3);flex:none;width:52px">第 ${i + 1} 期</span>
      <input type="number" min="1" class="cm-inst" value="${v || ""}" oninput="cmUpdateInstSum()">
    </div>`).join("");
  cmUpdateInstSum();
}

function cmInstAmounts() {
  return [...$$(".cm-inst")].map(i => parseInt(i.value, 10) || 0);
}

function cmUpdateInstSum() {
  const amt = parseInt($("#cmBudget").value, 10) || 0;
  const sum = cmInstAmounts().reduce((s, v) => s + v, 0);
  const el = $("#cmInstSum");
  el.textContent = `各期合计 ¥${sum.toLocaleString()} / 预算 ¥${amt.toLocaleString()}${sum === amt && amt > 0 ? " ✓" : "，需与预算一致"}`;
  el.style.color = sum === amt && amt > 0 ? "var(--green)" : "var(--red)";
}

function onCmAttach(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024 * 1024) { toast("文件超过 2G 上限"); input.value = ""; return; }
  const mb = 1024 * 1024;
  const sizeTxt = file.size >= mb ? (file.size / mb).toFixed(1) + " MB"
    : Math.max(1, Math.round(file.size / 1024)) + " KB";
  cmCtx.attach = { name: file.name, size: sizeTxt };
  const label = $("#cmAttachName");
  label.textContent = `${file.name}（${sizeTxt}）`;
  label.classList.add("has");
  toast("参考文件已就绪，将随邀约一并发送");
  input.value = "";
}

function submitCommission() {
  const title = $("#cmT").value.trim();
  const desc = $("#cmDesc").value.trim();
  const amt = parseInt($("#cmBudget").value, 10);
  if (!title) { toast("请填写约稿项目标题"); return; }
  if (!cmCtx.types.length) { toast("请至少选择一个约稿品类"); return; }
  if (!desc) { toast("请填写需求描述"); return; }
  if (!amt || amt < 1) { toast("请填写预算"); return; }
  let instTxt = "";
  if (cmCtx.payMode === "分期") {
    const nVal = parseInt($("#cmInstN").value, 10);
    if (!nVal || nVal < 2 || nVal > 6) { toast("期数需在 2–6 之间"); return; }
    if (nVal !== cmCtx.instN) { cmCtx.instN = nVal; cmFillInstAvg(); }
    const insts = cmInstAmounts();
    if (insts.some(v => v < 1)) { toast("每期金额需大于 0"); return; }
    const sum = insts.reduce((s, v) => s + v, 0);
    if (sum !== amt) { toast(`各期合计 ¥${sum.toLocaleString()} 与预算不一致`); return; }
    instTxt = ` · 分 ${insts.length} 期（${insts.map(v => "¥" + v.toLocaleString()).join(" / ")}）`;
  }
  const due = $("#cmDue").value;
  const d = new Date();
  const id = `QX-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
  const date = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const to = cmCtx.to;
  ORDERS.unshift({
    id, title: `${title}（${cmCtx.types.join("/")}）`, who: to, mine: "约稿",
    amount: amt, paid: 0, payMode: cmCtx.payMode, status: "待接稿", date,
    note: `约稿邀约已发出${instTxt}${due ? ` · 期望 ${due} 前交付` : ""}${cmCtx.attach ? " · 含参考文件" : ""}${cmCtx.fromDemand ? ` · 来自企划「${cmCtx.fromDemand}」` : ""} · 等待对方接受`,
  });
  closeOverlay("ovCommission");
  $("#ovArtist").classList.remove("show");
  renderOrders();
  const meTab = [...$$(".tab")].find(t => t.dataset.scr === "scr-me");
  if (meTab) switchTab(meTab);
  toast(`约稿邀约已发送给 ${to}`);
  // Demo：模拟对方稍后接受邀约 → 进入待付款（托管）
  setTimeout(() => {
    const o = ORDERS.find(x => x.id === id);
    if (!o || o.status !== "待接稿") return;
    o.status = "待付款";
    o.note = "对方已接受约稿 · 协议已签署 · 请托管稿酬后开工";
    renderOrders();
    toast(`${to} 接受了你的约稿，去托管稿酬吧`);
  }, 4000);
}

/* ---------- 收藏夹（歌单式分类） ---------- */

let favCtx = null;    // 待收藏的作品 id
let favOpenIdx = -1;  // 当前打开的收藏夹；-1 = 夹列表

const findWork = id => WORKS.find(w => w.id === id);
const isFaved = id => state.favFolders.some(f => f.ids.includes(id));

/** 作品小封面（收藏夹封面/列表行通用） */
function workMiniCover(w) {
  if (!w) return `<span class="fav-glyph">♡</span>`;
  const bg = w.cover || "linear-gradient(150deg,#3B4252,#7B88A8)";
  return `<span class="fav-bg" style="background:${bg}"></span>
    <span class="fav-glyph">${w.lyric ? "词" : esc(w.glyph || "♪")}</span>`;
}

const favCoverHTML = f => workMiniCover(findWork(f.ids[0]));

/* --- 收藏动作：选夹 / 新建 --- */

function openFavPick(id) {
  favCtx = id;
  renderFavPick();
  $("#favMask").classList.add("show");
}
function closeFavPick() { $("#favMask").classList.remove("show"); }

function renderFavPick() {
  const id = favCtx;
  $("#favPickBody").innerHTML = state.favFolders.map((f, i) => {
    const has = f.ids.includes(id);
    return `<div class="fav-pick-row" onclick="favToggleIn(${i})">
      <div class="fav-mini">${favCoverHTML(f)}</div>
      <div class="fav-pick-info"><b>${esc(f.name)}</b><span>${f.ids.length} 个内容</span></div>
      <i class="${has ? "on" : ""}">${has ? "✓ 已收藏" : "收藏"}</i>
    </div>`;
  }).join("") + `
    <div class="code-row" style="margin-top:10px">
      <input id="favNewName" maxlength="10" placeholder="新建收藏夹，如：战歌参考" onkeydown="if(event.key==='Enter')favNewFolder()">
      <button class="btn ghost" onclick="favNewFolder()">新建</button>
    </div>`;
}

/** 在指定收藏夹中收藏/取消当前作品 */
function favToggleIn(i) {
  const f = state.favFolders[i];
  const at = f.ids.indexOf(favCtx);
  at >= 0 ? f.ids.splice(at, 1) : f.ids.push(favCtx);
  renderFavPick();
  updateFavBtns();
  toast(at >= 0 ? `已从「${f.name}」移除` : `已收藏到「${f.name}」♥`);
}

function favNewFolder() {
  const name = $("#favNewName").value.trim();
  if (!name) { toast("给收藏夹起个名字吧"); return; }
  state.favFolders.push({ name, ids: favCtx != null ? [favCtx] : [] });
  renderFavPick();
  updateFavBtns();
  toast(`已新建「${name}」并收藏 ♥`);
}

/** 同步浏览页收藏按钮文案 + 我的主页收藏栏 */
function updateFavBtns() {
  $$("[data-fav]").forEach(b => {
    b.textContent = isFaved(+b.dataset.fav) ? "已收藏 ♥" : "收藏 ♡";
  });
  renderFavStrip();
}

/* --- 我的主页：横向收藏夹栏 --- */

function renderFavStrip() {
  const el = $("#favStrip");
  if (!el) return;
  el.innerHTML = state.favFolders.map((f, i) => `
    <div class="fav-folder" onclick="openFavs(${i})">
      <div class="fav-cover">${favCoverHTML(f)}<i>${f.ids.length}</i></div>
      <b>${esc(f.name)}</b>
    </div>`).join("")
    || `<p class="se-note" style="margin:0 16px">还没有收藏夹，浏览作品时点「收藏」即可创建</p>`;
}

/* --- 收藏夹页面（夹列表 → 歌单详情） --- */

function openFavs(idx) {
  favOpenIdx = typeof idx === "number" ? idx : -1;
  renderFavs();
  $("#ovFavs").classList.add("show");
}

function favBack() {
  if (favOpenIdx >= 0) { favOpenIdx = -1; renderFavs(); }
  else closeOverlay("ovFavs");
}

function renderFavs() {
  if (favOpenIdx < 0) {
    $("#favTitle").textContent = "我的收藏夹";
    $("#favBody").innerHTML = `
      <div class="fav-grid">${state.favFolders.map((f, i) => `
        <div class="fav-folder" onclick="favOpenIdx=${i};renderFavs()">
          <div class="fav-cover">${favCoverHTML(f)}<i>${f.ids.length}</i></div>
          <b>${esc(f.name)}</b>
        </div>`).join("")}</div>
      <div class="code-row" style="margin:4px 16px 16px">
        <input id="favNewName2" maxlength="10" placeholder="新建收藏夹" onkeydown="if(event.key==='Enter')favNewFolderFromList()">
        <button class="btn ghost" onclick="favNewFolderFromList()">新建</button>
      </div>`;
    return;
  }
  const f = state.favFolders[favOpenIdx];
  $("#favTitle").textContent = f.name;
  const rows = f.ids.map(id => {
    const w = findWork(id);
    if (!w) return "";
    return `<div class="fav-item" onclick="favOpenWork(${id})">
      <div class="fi-cover">${workMiniCover(w)}</div>
      <div class="fi-info">
        <b>${esc(w.title)}</b>
        <span>${esc(w.author)} · ${Array.isArray(w.type) ? w.type.join("/") : w.type} · ${w.price}</span>
      </div>
      <div class="fi-del" onclick="event.stopPropagation();favRemove(${id})" title="移出收藏夹">✕</div>
    </div>`;
  }).join("");
  $("#favBody").innerHTML = `
    <div class="fav-head">
      <span>${f.ids.length} 个内容 · 点击可直接浏览</span>
      <button class="mini-btn" style="margin-left:auto" onclick="favRenameToggle()">重命名</button>
      <button class="mini-btn danger" onclick="favDelFolder()">删除</button>
    </div>
    <div id="favRenameRow" class="code-row" style="display:none;margin:0 16px 10px">
      <input id="favRenameIn" maxlength="10" value="${esc(f.name)}">
      <button class="btn ghost" onclick="favRenameSave()">保存</button>
    </div>
    ${rows || emptyHTML("这个收藏夹还是空的 ♡ 去首页收藏作品吧")}`;
}

function favNewFolderFromList() {
  const name = $("#favNewName2").value.trim();
  if (!name) { toast("给收藏夹起个名字吧"); return; }
  state.favFolders.push({ name, ids: [] });
  renderFavs();
  renderFavStrip();
  toast(`收藏夹「${name}」已创建`);
}

/** 从收藏夹直接进入沉浸式浏览 */
function favOpenWork(id) {
  const w = findWork(id);
  if (!w) return;
  state.filteredWorks = [w];
  openViewer(0);
}

function favRemove(id) {
  const f = state.favFolders[favOpenIdx];
  f.ids.splice(f.ids.indexOf(id), 1);
  renderFavs();
  updateFavBtns();
  toast("已移出收藏夹");
}

function favRenameToggle() {
  const row = $("#favRenameRow");
  row.style.display = row.style.display === "none" ? "" : "none";
}

function favRenameSave() {
  const name = $("#favRenameIn").value.trim();
  if (!name) { toast("名字不能为空"); return; }
  state.favFolders[favOpenIdx].name = name;
  renderFavs();
  renderFavStrip();
  toast("已重命名");
}

function favDelFolder() {
  const f = state.favFolders.splice(favOpenIdx, 1)[0];
  favOpenIdx = -1;
  renderFavs();
  updateFavBtns();
  toast(`收藏夹「${f.name}」已删除（作品本身不受影响）`);
}

/* ---------- 管理页（橱窗 / 报价 / 作品） ---------- */

let mgKind = null; // "shop" | "price" | "work"

function openManage(kind) {
  mgKind = kind;
  renderManage();
  $("#ovManage").classList.add("show");
}

function renderManage() {
  const T = { shop: "橱窗管理", price: "报价编辑", work: "作品管理" };
  $("#mgTitle").textContent = T[mgKind];
  let html = "";

  if (mgKind === "shop") {
    html = `<button class="btn primary mg-add" onclick="openMgEdit('shop',-1)">＋ 上架新商品</button>
      <p class="se-note" style="margin:0 0 10px">可挂零散待售作品（现货直购），或企划整体约稿打包（歌单式）</p>`
      + MY_SHOP.map((s, i) => `
      <div class="mg-item ${s.off ? "off" : ""}">
        <div class="mg-cover" style="background:${s.cover && s.cover.kind === "image" ? `url(${s.cover.url}) center/cover` : s.grad}">${s.cover && s.cover.kind === "image" ? "" : esc(s.glyph)}</div>
        <div class="mg-info">
          <b>${esc(s.title)}</b>
          <span>${s.kind === "bundle" ? `企划打包 · ${s.count} 项` : `现货 · ${s.biz}`} · ${esc(s.price)}${[s.media && "小样", s.doc && "文档"].filter(Boolean).join(" ") ? " · " + [s.media && "小样", s.doc && "文档"].filter(Boolean).join(" ") : ""}${s.off ? " · <i>已下架</i>" : ""}</span>
        </div>
        <div class="mg-acts">
          <button class="mini-btn" onclick="openMgEdit('shop',${i})">编辑</button>
          <button class="mini-btn" onclick="mgShopToggle(${i})">${s.off ? "上架" : "下架"}</button>
          <button class="mini-btn danger" onclick="mgDel('shop',${i})">删除</button>
        </div>
      </div>`).join("");

  } else if (mgKind === "price") {
    html = `<button class="btn primary mg-add" onclick="openMgEdit('price',-1)">＋ 新增报价</button>`
      + MY_PRICES.map((p, i) => `
      <div class="mg-item">
        <div class="mg-info">
          <b>${esc(p.t)} <span class="tag ${p.biz === "商业" ? "biz" : "nonbiz"}">${p.biz}</span></b>
          <span>${esc(p.note)} · ${esc(p.price)}</span>
        </div>
        <div class="mg-acts">
          <button class="mini-btn" onclick="openMgEdit('price',${i})">编辑</button>
          <button class="mini-btn danger" onclick="mgDel('price',${i})">删除</button>
        </div>
      </div>`).join("");

  } else {
    html = `<p class="se-note" style="margin:0 0 10px">新作品请从「发布」页上传；此处可置顶、隐藏或删除已发布作品</p>`
      + MY_WORKS.map((w, i) => `
      <div class="mg-item ${w.hidden ? "off" : ""}">
        <div class="mg-cover" style="background:${w.grad}">${esc(w.glyph)}</div>
        <div class="mg-info">
          <b>${esc(w.title)}${w.top ? " · 置顶" : ""}</b>
          <span>${esc(w.role)} · 播放 ${esc(w.plays)}${w.hidden ? " · <i>已隐藏</i>" : ""}</span>
        </div>
        <div class="mg-acts">
          <button class="mini-btn" onclick="mgWorkTop(${i})">${w.top ? "取消置顶" : "置顶"}</button>
          <button class="mini-btn" onclick="mgWorkHide(${i})">${w.hidden ? "公开" : "隐藏"}</button>
          <button class="mini-btn danger" onclick="mgDel('work',${i})">删除</button>
        </div>
      </div>`).join("");
  }
  $("#mgBody").innerHTML = html;
}

function mgShopToggle(i) {
  MY_SHOP[i].off = !MY_SHOP[i].off;
  renderManage(); renderMyStyleShop();
  toast(MY_SHOP[i].off ? "已下架，橱窗不再展示" : "已重新上架");
}

function mgWorkTop(i) {
  MY_WORKS[i].top = !MY_WORKS[i].top;
  renderManage(); renderMyWorks();
  toast(MY_WORKS[i].top ? "已置顶，主页优先展示" : "已取消置顶");
}

function mgWorkHide(i) {
  MY_WORKS[i].hidden = !MY_WORKS[i].hidden;
  renderManage(); renderMyWorks();
  toast(MY_WORKS[i].hidden ? "已隐藏，访客不可见" : "已重新公开");
}

function mgDel(kind, i) {
  const pool = { shop: MY_SHOP, price: MY_PRICES, work: MY_WORKS }[kind];
  const name = pool[i].title || pool[i].t;
  pool.splice(i, 1);
  renderManage(); renderMyStyleShop();
  toast(`已删除「${name}」`);
}

/* ---------- 管理 · 编辑弹层（风格 / 橱窗商品 / 报价项） ---------- */

let mgEditCtx = null; // { kind, idx, shopKind?, tags? }

function openMgEdit(kind, idx) {
  mgEditCtx = { kind, idx };

  if (kind === "shop") {
    const s = idx >= 0 ? MY_SHOP[idx] : null;
    mgEditCtx.shopKind = s ? s.kind : "work";
    mgEditCtx.cover = s && s.cover ? s.cover : null;
    mgEditCtx.media = s && s.media ? s.media : null;
    mgEditCtx.doc = s && s.doc ? s.doc : null;
    $("#shopPubTitle").textContent = s ? "编辑商品" : "上架橱窗商品";
    $("#shopPubBtn").textContent = s ? "保存修改" : "确认上架";
    $("#shopPubBody").innerHTML = `
      <label>商品类型</label>
      <div class="chip-row" id="mgShopKind">
        <div class="chip ${mgEditCtx.shopKind === "work" ? "on" : ""}" onclick="setShopKind('work')">零散待售作品</div>
        <div class="chip ${mgEditCtx.shopKind === "bundle" ? "on" : ""}" onclick="setShopKind('bundle')">企划整体打包</div>
      </div>
      <label>标题</label>
      <input id="mgT" maxlength="24" placeholder="如：《关山月》成品曲买断" value="${s ? esc(s.title) : ""}">
      <label>价格</label>
      <input id="mgP" maxlength="12" placeholder="如：¥2,400 或 ¥6,800 起" value="${s ? esc(s.price) : ""}">
      <label>作品封面（图片 / 视频，选填）</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="$('#mgCoverFile').click()">上传封面</div>
        <div class="upload-prev" id="mgCoverPrev" onclick="previewMgCover()" title="点击查看"></div>
      </div>
      <label>试听小样（音频 / 视频，选填）</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="$('#mgMediaFile').click()">上传小样</div>
        <span class="upload-name" id="mgMediaName">未选择文件</span>
      </div>
      <label>说明文档（歌词 / 授权书 / 企划案，选填）</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="$('#mgDocFile').click()">上传文档</div>
        <span class="upload-name" id="mgDocName">未选择文件</span>
      </div>
      <label>商品描述</label>
      <textarea id="mgDesc" rows="3" maxlength="80" placeholder="交付内容、风格、授权范围、时效…">${s && s.desc ? esc(s.desc) : ""}</textarea>
      <div id="mgShopExtra"></div>`;
    renderShopExtra(s);
    renderMgUploads();
    $("#ovShopPub").classList.add("show");
    $("#shopPubBody").scrollTop = 0;
    return;
  } else if (kind === "price") {
    const p = idx >= 0 ? MY_PRICES[idx] : null;
    mgEditCtx.biz = p ? p.biz : "商业";
    $("#mgEditTitle").textContent = p ? "编辑报价" : "新增报价";
    $("#mgEditBody").innerHTML = `
      <label>项目名称</label>
      <input id="mgT" maxlength="20" placeholder="如：古风作曲（含小样）" value="${p ? esc(p.t) : ""}">
      <label>类型</label>
      <div class="chip-row">
        <div class="chip ${mgEditCtx.biz === "商业" ? "on" : ""}" onclick="setMgBiz('商业',this)">商业</div>
        <div class="chip ${mgEditCtx.biz === "非商业" ? "on" : ""}" onclick="setMgBiz('非商业',this)">非商业</div>
      </div>
      <label>价格</label>
      <input id="mgP" maxlength="12" placeholder="如：¥1,800 起" value="${p ? esc(p.price) : ""}">
      <label>说明（交付方式 / 工期）</label>
      <input id="mgN" maxlength="30" placeholder="如：商用 · 全款托管 · 15 个工作日" value="${p ? esc(p.note) : ""}">`;
  }
  $("#mgEditMask").classList.add("show");
}

function setShopKind(k) {
  mgEditCtx.shopKind = k;
  $$("#mgShopKind .chip").forEach(c => c.classList.toggle("on",
    (k === "work") === (c.textContent === "零散待售作品")));
  renderShopExtra(mgEditCtx.idx >= 0 ? MY_SHOP[mgEditCtx.idx] : null);
}

function renderShopExtra(s) {
  $("#mgShopExtra").innerHTML = mgEditCtx.shopKind === "bundle"
    ? `<label>包含项目数</label>
       <input id="mgC" type="number" min="2" max="20" value="${s && s.count ? s.count : 3}">`
    : `<label>授权类型</label>
       <div class="chip-row" id="mgBizRow">
         <div class="chip ${!s || s.biz === "商业" ? "on" : ""}" onclick="setMgBiz('商业',this)">商业</div>
         <div class="chip ${s && s.biz === "非商业" ? "on" : ""}" onclick="setMgBiz('非商业',this)">非商业</div>
       </div>`;
  mgEditCtx.biz = s && s.biz ? s.biz : "商业";
}

/* 橱窗商品上传：封面（图/视频） / 试听小样（音/视频） / 说明文档 */

function renderMgUploads() {
  const prev = $("#mgCoverPrev");
  if (prev) {
    const c = mgEditCtx.cover;
    prev.innerHTML = !c ? ""
      : c.kind === "image" ? `<img src="${c.url}">`
      : `<video src="${c.url}"></video><span class="play-mini">▶</span>`;
    prev.classList.toggle("has", !!c);
  }
  const mn = $("#mgMediaName");
  if (mn) {
    mn.textContent = mgEditCtx.media
      ? `${mgEditCtx.media.kind === "video" ? "视频" : "音频"} · ${mgEditCtx.media.name}` : "未选择文件";
    mn.classList.toggle("has", !!mgEditCtx.media);
  }
  const dn = $("#mgDocName");
  if (dn) {
    dn.textContent = mgEditCtx.doc
      ? `${mgEditCtx.doc.name}（${mgEditCtx.doc.size}）` : "未选择文件";
    dn.classList.toggle("has", !!mgEditCtx.doc);
  }
}

function onMgCover(input) {
  const file = input.files[0];
  if (!file) return;
  const kind = file.type.startsWith("video") ? "video" : file.type.startsWith("image") ? "image" : null;
  if (!kind) { toast("封面仅支持图片或视频格式"); input.value = ""; return; }
  const reader = new FileReader();
  reader.onload = e => {
    mgEditCtx.cover = { kind, url: e.target.result };
    renderMgUploads();
    toast(`已识别封面：${kind === "image" ? "图片" : "视频"} · 点击缩略图可查看`);
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function previewMgCover() {
  const c = mgEditCtx && mgEditCtx.cover;
  if (!c) return;
  openPreview(c.kind === "image"
    ? `<img src="${c.url}">` : `<video src="${c.url}" controls autoplay></video>`);
}

function onMgMedia(input) {
  const file = input.files[0];
  if (!file) return;
  const kind = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : null;
  if (!kind) { toast("小样仅支持音频或视频格式"); input.value = ""; return; }
  mgEditCtx.media = { kind, name: file.name, url: URL.createObjectURL(file) };
  renderMgUploads();
  toast(`试听小样已就绪（${kind === "video" ? "视频" : "音频"}）`);
  input.value = "";
}

function onMgDoc(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024 * 1024) { toast("文件超过 2G 上限"); input.value = ""; return; }
  const mb = 1024 * 1024;
  const sizeTxt = file.size >= mb ? (file.size / mb).toFixed(1) + " MB"
    : Math.max(1, Math.round(file.size / 1024)) + " KB";
  mgEditCtx.doc = { name: file.name, size: sizeTxt, ext: (file.name.split(".").pop() || "文件").toUpperCase() };
  renderMgUploads();
  toast("说明文档已就绪");
  input.value = "";
}

function setMgBiz(b, el) {
  mgEditCtx.biz = b;
  el.parentElement.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === el));
}

function closeMgEdit() { $("#mgEditMask").classList.remove("show"); }

const SHOP_GRADS = [
  "linear-gradient(150deg,#2FA36B,#6ED3A0)", "linear-gradient(150deg,#2152FF,#6B8CFF)",
  "linear-gradient(150deg,#3B4252,#7B88A8)", "linear-gradient(150deg,#8F9B1E,#C6D92E)",
];

function saveMgEdit() {
  const { kind, idx } = mgEditCtx;

  if (kind === "style") {
    const desc = $("#mgD").value.trim();
    if (!mgEditCtx.tags.length) return toast("至少保留一个风格标签");
    if (!desc) return toast("写一句风格描述吧 ✎");
    MY_STYLE.tags = [...mgEditCtx.tags];
    MY_STYLE.desc = desc;
    renderMyStyleShop(); closeMgEdit();
    return toast("个人风格已更新");
  }

  const t = $("#mgT").value.trim();
  const p = $("#mgP").value.trim();
  if (!t) return toast("标题不能为空");
  if (!p) return toast("请填写价格");

  if (kind === "shop") {
    const item = idx >= 0 ? MY_SHOP[idx] : {
      glyph: t.replace(/[《》〈〉\s]/g, "")[0] || "♪",
      grad: SHOP_GRADS[MY_SHOP.length % SHOP_GRADS.length],
    };
    item.kind = mgEditCtx.shopKind;
    item.title = t;
    item.price = p;
    item.desc = $("#mgDesc").value.trim()
      || (item.kind === "bundle" ? "整体打包，风格统一" : "");
    item.cover = mgEditCtx.cover || undefined;
    item.media = mgEditCtx.media || undefined;
    item.doc = mgEditCtx.doc || undefined;
    if (item.kind === "bundle") {
      item.count = Math.max(2, parseInt($("#mgC").value, 10) || 2);
      delete item.biz;
    } else {
      item.biz = mgEditCtx.biz;
      delete item.count;
    }
    if (idx < 0) MY_SHOP.unshift(item);
    toast(idx < 0 ? "已上架到橱窗" : "商品已更新");
    if (mgKind) renderManage();
    renderMyStyleShop();
    closeOverlay("ovShopPub");
    return;
  } else if (kind === "price") {
    const item = idx >= 0 ? MY_PRICES[idx] : {};
    item.t = t; item.price = p;
    item.biz = mgEditCtx.biz;
    item.note = $("#mgN").value.trim() || (item.biz === "商业" ? "商用 · 全款托管" : "非商用 · 标注署名即可");
    if (idx < 0) MY_PRICES.push(item);
    toast(idx < 0 ? "报价已新增" : "报价已更新");
  }
  renderManage(); renderMyStyleShop();
  closeMgEdit();
}

/* ---------- 个人风格编辑（标签 chips + 描述） ---------- */

function openStyleEdit() {
  mgEditCtx = { kind: "style", tags: [...MY_STYLE.tags] };
  $("#mgEditTitle").textContent = "编辑个人风格";
  $("#mgEditBody").innerHTML = `
    <label>风格标签（最多 6 个，点击移除）</label>
    <div class="style-tags" id="mgTags"></div>
    <div class="code-row">
      <input id="mgTagIn" maxlength="8" placeholder="新标签，如：戏腔 / 燃向">
      <button class="btn ghost" onclick="addStyleTag()">添加</button>
    </div>
    <label>风格描述（人设一句话）</label>
    <textarea id="mgD" rows="3" maxlength="80" placeholder="擅长什么、偏爱什么、不接什么…">${esc(MY_STYLE.desc)}</textarea>`;
  renderStyleTags();
  $("#mgEditMask").classList.add("show");
}

function renderStyleTags() {
  $("#mgTags").innerHTML = mgEditCtx.tags.map((t, i) =>
    `<span class="stag" onclick="rmStyleTag(${i})">${esc(t)} ✕</span>`).join("")
    || `<span class="se-note">暂无标签，添加一个吧</span>`;
}

function addStyleTag() {
  const v = $("#mgTagIn").value.trim();
  if (!v) return;
  if (mgEditCtx.tags.length >= 6) return toast("最多 6 个标签");
  if (mgEditCtx.tags.includes(v)) return toast("标签已存在");
  mgEditCtx.tags.push(v);
  $("#mgTagIn").value = "";
  renderStyleTags();
}

function rmStyleTag(i) {
  mgEditCtx.tags.splice(i, 1);
  renderStyleTags();
}

/* ---------- 设置（小红书式） ---------- */

const maskEmail = e => e.replace(/^(.{2}).*(@.*)$/, "$1***$2");
const maskPhone = p => p.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");

function openSettings() {
  renderSettings();
  $("#ovSettings").classList.add("show");
}

function renderSettings() {
  const s = state.settings, p = state.profile;
  const sw = (on, fn) => `<div class="switch ${on ? "" : "off"}" onclick="${fn}"></div>`;
  $("#setBody").innerHTML = `
    <div class="set-group"><h4>账号与安全</h4>
      <div class="set-item" onclick="openSetEdit('uid')"><span>修改曲境 ID</span><b>${esc(p.uid || "未设置")}</b><i>›</i></div>
      <div class="set-item" onclick="openSetEdit('email')"><span>绑定邮箱</span><b>${s.email ? esc(maskEmail(s.email)) : "未绑定"}</b><i>›</i></div>
      <div class="set-item" onclick="openSetEdit('phone')"><span>绑定手机号</span><b>${s.phone ? maskPhone(s.phone) : "未绑定"}</b><i>›</i></div>
      <div class="set-item" onclick="openSetEdit('password')"><span>修改密码</span><b>${s.password ? "已设置" : "未设置"}</b><i>›</i></div>
    </div>
    <div class="set-group"><h4>隐私设置</h4>
      <div class="set-item"><span>公开我的关注 / 粉丝列表</span>${sw(s.privacy.showFollow, "togglePriv('showFollow',this)")}</div>
      <div class="set-item"><span>允许陌生人私信我</span>${sw(s.privacy.allowDM, "togglePriv('allowDM',this)")}</div>
      <div class="set-item"><span>允许通过手机号找到我</span>${sw(s.privacy.findByPhone, "togglePriv('findByPhone',this)")}</div>
      <div class="set-item"><span>个性化推荐</span>${sw(s.privacy.personalized, "togglePriv('personalized',this)")}</div>
      <div class="set-item"><span>公开我收到的评价</span>${sw(state.showMyReviews, "toggleMyReviews();renderSettings()")}</div>
      <div class="set-item" onclick="openBlocklist()"><span>黑名单管理</span><b>${state.blocked.size ? state.blocked.size + " 人" : "空"}</b><i>›</i></div>
    </div>
    <div class="set-group"><h4>通用</h4>
      <div class="set-item" onclick="openClearCache()"><span>清理缓存</span><b>${cacheSizeLabel()}</b><i>›</i></div>
      <div class="set-item" onclick="openThemeSheet()"><span>夜间模式</span><b>${THEME_LABELS[s.theme]}</b><i>›</i></div>
    </div>
    <div class="set-group"><h4>关于曲境</h4>
      <div class="set-item" onclick="openTerms('terms')"><span>我们的条约（用户协议）</span><i>›</i></div>
      <div class="set-item" onclick="openTerms('pact')"><span>社区公约</span><i>›</i></div>
      <div class="set-item" onclick="openTerms('privacy')"><span>隐私政策</span><i>›</i></div>
      <div class="set-item"><span>版本</span><b>v2.6.0（Demo）</b></div>
    </div>
    <button class="btn ghost logout-btn" onclick="toast('Demo：已退出登录，下次再会')">退出登录</button>`;
}

function togglePriv(key, el) {
  state.settings.privacy[key] = !state.settings.privacy[key];
  el.classList.toggle("off", !state.settings.privacy[key]);
  toast(state.settings.privacy[key] ? "已开启 ✓" : "已关闭");
}

/* ---------- 设置 · 清理缓存 ---------- */

function cacheSizeLabel() {
  const m = state.settings.cacheMB;
  return m <= 0 ? "0 B" : m.toFixed(1) + " MB";
}

function openClearCache() {
  const m = state.settings.cacheMB;
  if (m <= 0) { toast("已经很干净啦"); return; }
  const row = (name, mb) => `<div class="set-item"><span>${name}</span><b>${mb.toFixed(1)} MB</b></div>`;
  openSheet("清理缓存", `
    ${row("图片缓存", m * .58)}
    ${row("音频试听缓存", m * .31)}
    ${row("其他数据", m * .11)}
    <p class="se-note" style="margin-top:10px">清理后作品图片与试听音频需重新加载，不影响草稿与聊天记录</p>
    <button class="btn primary" style="width:100%;margin-top:14px" id="ccBtn" onclick="doClearCache()">清理 ${m.toFixed(1)} MB</button>`);
}

function doClearCache() {
  const btn = $("#ccBtn");
  if (btn) { btn.disabled = true; btn.textContent = "清理中…"; }
  setTimeout(() => {
    const m = state.settings.cacheMB;
    state.settings.cacheMB = 0;
    closeSheet();
    renderSettings();
    toast(`已清理 ${m.toFixed(1)} MB`);
  }, 700);
}

/* ---------- 设置 · 夜间模式 ---------- */

const THEME_LABELS = { system: "跟随系统", light: "浅色", dark: "夜间" };

function applyTheme() {
  const t = state.settings.theme;
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.settings.theme === "system") applyTheme();
});

function openThemeSheet() {
  const opt = (key, desc) => `
    <div class="set-item" onclick="setTheme('${key}')">
      <span>${THEME_LABELS[key]}</span>
      <b style="font-size:11px;opacity:.7">${desc}</b>
      <i>${state.settings.theme === key ? "✓" : ""}</i>
    </div>`;
  openSheet("夜间模式", `
    ${opt("system", "随系统自动切换")}
    ${opt("light", "始终宣纸浅色")}
    ${opt("dark", "始终夜色水墨")}`);
}

function setTheme(t) {
  state.settings.theme = t;
  applyTheme();
  closeSheet();
  renderSettings();
  toast(t === "dark" ? "已切换夜色水墨" : t === "light" ? "已切换宣纸浅色" : "已跟随系统");
}

/* 设置 · 编辑弹层（改 ID / 绑邮箱 / 绑手机） */

let setEditKind = null;
let sentCode = null;
let codeTimer = null;

function openSetEdit(kind) {
  setEditKind = kind;
  sentCode = null;
  clearInterval(codeTimer);
  const s = state.settings;
  const cfg = {
    uid: {
      title: "修改曲境 ID",
      body: `<label>新 ID（4-16 位字母 / 数字 / 下划线）</label>
        <input id="seInput" maxlength="16" value="${esc(state.profile.uid || "")}">
        <p class="se-note">每 30 天仅可修改一次，修改后旧 ID 立即释放</p>`,
    },
    email: {
      title: s.email ? "更换绑定邮箱" : "绑定邮箱",
      body: `<label>邮箱地址</label>
        <input id="seInput" maxlength="40" placeholder="name@example.com" value="${esc(s.email)}">
        <label>邮件验证码</label>
        <div class="code-row">
          <input id="seCode" maxlength="6" placeholder="6 位验证码">
          <button class="btn ghost" id="seCodeBtn" onclick="sendVerifyCode()">发送验证邮件</button>
        </div>
        <p class="se-note">我们会向该邮箱发送一封验证邮件，填入邮件中的 6 位验证码完成绑定；绑定后可用于登录、找回密码与接收订单提醒</p>`,
    },
    phone: {
      title: s.phone ? "更换手机号" : "绑定手机号",
      body: `<label>手机号</label>
        <input id="seInput" maxlength="11" placeholder="11 位手机号" value="${s.phone}">
        <label>短信验证码</label>
        <div class="code-row">
          <input id="seCode" maxlength="6" placeholder="6 位验证码">
          <button class="btn ghost" id="seCodeBtn" onclick="sendVerifyCode()">获取验证码</button>
        </div>
        <p class="se-note">验证码短信可能有延迟，60 秒内请勿重复获取</p>`,
    },
    password: {
      title: s.password ? "修改密码" : "设置密码",
      body: `${s.password ? `<label>当前密码</label>
        <input id="seOld" type="password" maxlength="24" placeholder="请输入当前密码">` : ""}
        <label>新密码（8-24 位，需同时包含字母和数字）</label>
        <input id="seInput" type="password" maxlength="24" placeholder="请输入新密码">
        <label>确认新密码</label>
        <input id="seConfirm" type="password" maxlength="24" placeholder="再输入一次新密码">
        <p class="se-note">修改成功后其他设备需重新登录；请勿使用生日、连续数字等弱密码</p>`,
    },
  }[kind];
  $("#seTitle").textContent = cfg.title;
  $("#seBody").innerHTML = cfg.body;
  $("#setEditMask").classList.add("show");
}

function closeSetEdit() {
  clearInterval(codeTimer);
  $("#setEditMask").classList.remove("show");
}

function sendVerifyCode() {
  const v = $("#seInput").value.trim();
  if (setEditKind === "email") {
    if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return toast("请先输入正确的邮箱地址");
    sentCode = "135790";
    toast(`验证邮件已发至 ${maskEmail(v)}（Demo 验证码：135790）`);
  } else {
    if (!/^1\d{10}$/.test(v)) return toast("请先输入正确的 11 位手机号");
    sentCode = "246810";
    toast("验证码短信已发送（Demo 验证码：246810）");
  }
  startCodeCountdown();
}

/** 发码按钮 60s 倒计时防重发 */
function startCodeCountdown() {
  const btn = $("#seCodeBtn");
  if (!btn) return;
  let n = 60;
  btn.disabled = true;
  btn.textContent = `${n}s 后重发`;
  clearInterval(codeTimer);
  codeTimer = setInterval(() => {
    n--;
    if (n <= 0) {
      clearInterval(codeTimer);
      btn.disabled = false;
      btn.textContent = "重新发送";
    } else btn.textContent = `${n}s 后重发`;
  }, 1000);
}

function saveSetEdit() {
  const v = $("#seInput").value.trim();
  const s = state.settings;
  if (setEditKind === "uid") {
    if (!/^\w{4,16}$/.test(v)) return toast("ID 需 4-16 位字母 / 数字 / 下划线");
    state.profile.uid = v;
    renderMyProfile();
    toast("ID 修改成功");
  } else if (setEditKind === "email") {
    if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(v)) return toast("邮箱格式不正确");
    if (!sentCode) return toast("请先点「发送验证邮件」获取验证码");
    if ($("#seCode").value.trim() !== sentCode) return toast("验证码不正确，再检查一下邮件～");
    s.email = v;
    sentCode = null;
    toast("邮箱验证通过，绑定成功");
  } else if (setEditKind === "phone") {
    if (!/^1\d{10}$/.test(v)) return toast("手机号格式不正确");
    if (!sentCode) return toast("请先点「获取验证码」");
    if ($("#seCode").value.trim() !== sentCode) return toast("验证码不正确，再检查一下～");
    s.phone = v;
    sentCode = null;
    toast("手机号绑定成功");
  } else if (setEditKind === "password") {
    if (s.password && $("#seOld").value !== s.password) return toast("当前密码不正确");
    if (!/^(?=.*[A-Za-z])(?=.*\d)\S{8,24}$/.test(v)) return toast("密码需 8-24 位，且同时包含字母和数字");
    if ($("#seConfirm").value !== v) return toast("两次输入的密码不一致");
    s.password = v;
    toast("密码修改成功，请妥善保管");
  }
  closeSetEdit();
  renderSettings();
}

/* 条约 / 公约 / 隐私政策 */

const TERMS = {
  terms: {
    title: "曲境用户条约",
    html: `
      <h5>第一条 · 总则</h5>
      <p>曲境是面向古风音乐创作者与约稿方的撮合平台。注册即表示您已阅读并同意本条约全部内容。</p>
      <h5>第二条 · 账号</h5>
      <p>每位用户仅可注册一个主账号；圈名与 ID 不得冒用他人或含违规内容；ID 每 30 天可修改一次。</p>
      <h5>第三条 · 约稿与交易</h5>
      <p>商用约稿应通过平台签订电子协议并托管稿酬；交易方式（定金 / 全款）由接稿方按单设定；站外交易产生的纠纷平台不予保障。</p>
      <h5>第四条 · 版权</h5>
      <p>作品版权归属以双方电子协议约定为准；未经授权不得商用、二改或转售他人作品。</p>
      <h5>第五条 · 违规处理</h5>
      <p>刷单、骗稿、恶意跳单等行为将视情节限流、冻结或封禁账号，并公示处理结果。</p>`,
  },
  pact: {
    title: "曲境社区公约",
    html: `
      <h5>以茶会友，以音会知</h5>
      <p>尊重每一位创作者：不人身攻击、不地域引战、不恶意比较报价。</p>
      <h5>避雷曝光区规范</h5>
      <p>曝光需提供聊天记录、转账凭证等实锤；不得恶意抓一送百、伪造证据，误伤将被反向处置。</p>
      <h5>原创与搬运</h5>
      <p>发布内容需为原创或已获授权；AI 辅助创作需主动标注。</p>
      <h5>广告与引流</h5>
      <p>接单信息请发布在作品与报价单，社区内频繁刷单引流将被限流。</p>`,
  },
  privacy: {
    title: "隐私政策",
    html: `
      <h5>我们收集什么</h5>
      <p>仅收集为提供服务所必需的信息：账号资料、绑定的邮箱 / 手机号、交易记录与设备基础信息。</p>
      <h5>我们如何使用</h5>
      <p>用于账号安全验证、订单通知与个性化推荐（可在隐私设置中关闭）。</p>
      <h5>我们不会做什么</h5>
      <p>不向第三方出售您的个人信息；未经同意不公开您的联系方式。</p>
      <h5>您的权利</h5>
      <p>可随时导出、更正或注销账号数据；注销后交易凭证按法律要求留存。</p>`,
  },
};

function openTerms(kind) {
  const t = TERMS[kind];
  $("#termsTitle").textContent = t.title;
  $("#termsBody").innerHTML = t.html;
  $("#ovTerms").classList.add("show");
}

/* ---------- 底部导航 / 接稿开关 / Toast ---------- */

function switchTab(el) {
  $$(".tab").forEach(t => t.classList.remove("on"));
  el.classList.add("on");
  $$(".screen").forEach(s => s.classList.remove("active"));
  $("#" + el.dataset.scr).classList.add("active");
}

/** 跳到「我的」主页 tab */
function goMyProfile() {
  const tab = [...$$(".tab")].find(t => t.dataset.scr === "scr-me");
  if (tab) switchTab(tab);
}

function toggleAccepting(el) {
  state.accepting = !state.accepting;
  el.classList.toggle("off", !state.accepting);
  const label = $(".status-row .st");
  label.textContent = state.accepting ? "接稿状态：开放约稿中" : "接稿状态：暂停接稿";
  label.style.color = state.accepting ? "var(--green)" : "var(--ink-3)";
}

let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, CONFIG.ui.toastDuration);
}

/* ---------- 全局搜索（作品 / 音乐人 / 招募 / 帖子 / 资讯） ---------- */

const SEARCH_HOT = ["古风", "戏腔", "编曲", "水墨PV", "作词", "混音", "干音", "国风电子"];

function openSearch() {
  $("#ovSearch").classList.add("show");
  $("#searchInput").value = "";
  doSearch();
  setTimeout(() => $("#searchInput").focus(), 250);
}

function clearSearchInput() {
  $("#searchInput").value = "";
  doSearch();
  $("#searchInput").focus();
}

/** 点热词/历史直接搜 */
function searchGo(kw) {
  $("#searchInput").value = kw;
  doSearch(true);
}

function clearSearchHistory() {
  state.searchHistory = [];
  doSearch();
}

/** 搜索结果统一跳转：先关搜索层与可能残留的浮层，再在下一帧执行目标动作，避免层叠遮挡 */
function searchJump(fn) {
  closeOverlay("ovSearch");
  ["ovArtist", "ovPost", "ovArticle", "ovFollow"].forEach(id => $("#" + id)?.classList.remove("show"));
  fn();
}

/** 命中判定：多关键词（空格分隔）全部出现即命中 */
function searchHit(text, kws) {
  const t = text.toLowerCase();
  return kws.every(k => t.includes(k));
}

function doSearch(commit) {
  const q = $("#searchInput").value.trim();
  $("#searchClear").style.display = q ? "block" : "none";

  /* 空输入：热搜 + 历史 */
  if (!q) {
    $("#searchBody").innerHTML = `
      <div class="search-sec">热门搜索</div>
      <div class="search-chips">${SEARCH_HOT.map(k => `<div class="chip" onclick="searchGo('${esc(k)}')">${esc(k)}</div>`).join("")}</div>
      ${state.searchHistory.length ? `
        <div class="search-sec">搜索历史 <span class="search-hclear" onclick="clearSearchHistory()">清空</span></div>
        <div class="search-chips">${state.searchHistory.map(k => `<div class="chip" onclick="searchGo('${esc(k)}')">${esc(k)}</div>`).join("")}</div>` : ""}`;
    return;
  }

  /* 记历史（回车/点热词时） */
  if (commit) {
    state.searchHistory = [q, ...state.searchHistory.filter(k => k !== q)].slice(0, 8);
  }

  const kws = q.toLowerCase().split(/\s+/).filter(Boolean);

  const works = WORKS.filter(w => searchHit([
    w.title, w.author, Array.isArray(w.type) ? w.type.join("/") : w.type,
    w.role, w.biz, (w.tags || []).join("/"), w.desc || "",
  ].join("/"), kws));

  const artists = ARTISTS.filter(a => searchHit([
    a.name, a.roles.join("/"), a.bio,
    a.style ? a.style.tags.join("/") : "",
  ].join("/"), kws));

  const users = allUserNames().filter(n =>
    searchHit(n + "/" + uidOf(n) + "/" + (USERS_EXTRA[n]?.bio || "曲境用户"), kws));

  /* 命中自己：跳转到我的主页 */
  const me = state.profile.name && searchHit(
    state.profile.name + "/" + uidOf(state.profile.name) + "/" + (state.profile.bio || ""), kws);

  const demands = DEMANDS.filter(d => searchHit(
    [d.title, d.desc, d.who, d.biz, d.tags.join("/")].join("/"), kws));

  const posts = POSTS.filter(p => searchHit(
    [p.title, p.txt, p.name, p.topic || ""].join("/"), kws));

  const articles = ARTICLES.filter(a => searchHit(
    [a.title, a.kicker, a.sections.map(s => (s.h || "") + s.p).join("/")].join("/"), kws));

  const total = works.length + artists.length + users.length + demands.length + posts.length + articles.length + (me ? 1 : 0);
  if (!total) {
    $("#searchBody").innerHTML = emptyHTML(`没有找到与「${esc(q)}」相关的内容，换个词试试`);
    return;
  }

  const sec = (label, n) => `<div class="search-sec">${label}<small>${n}</small></div>`;
  $("#searchBody").innerHTML = [
    works.length ? sec("作品", works.length) + works.map(w => `
      <div class="search-row" onclick="searchJump(()=>favOpenWork(${w.id}))">
        <div class="fi-cover">${workMiniCover(w)}</div>
        <div class="sr-info"><b>${esc(w.title)}</b><span>${esc(w.author)} · ${esc(Array.isArray(w.type) ? w.type.join("/") : w.type)} · ${esc(w.price)}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
    artists.length ? sec("音乐人", artists.length) + artists.map(a => `
      <div class="search-row" onclick="searchJump(()=>openArtistByName('${esc(a.name)}'))">
        <div class="avatar" style="background:${avatarBg(a.name)}">${esc(a.name[0])}</div>
        <div class="sr-info"><b>${esc(a.name)}</b><span>${esc(a.roles.join(" / "))} · ${esc(a.bio)}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
    (users.length || me) ? sec("用户", users.length + (me ? 1 : 0)) + (me ? `
      <div class="search-row" onclick="searchJump(goMyProfile)">
        <div class="avatar" style="background:${avatarBg(state.profile.name)}">${esc(state.profile.name[0])}</div>
        <div class="sr-info"><b>${esc(state.profile.name)}</b><span>我自己 · 点击前往我的主页</span></div>
        <span class="art-arrow">›</span></div>` : "") + users.map(n => `
      <div class="search-row" onclick="searchJump(()=>openArtistByName('${esc(n)}'))">
        <div class="avatar" style="background:${avatarBg(n)}">${esc(n[0])}</div>
        <div class="sr-info"><b>${esc(n)}</b><span>${esc(USERS_EXTRA[n]?.bio || "曲境用户")}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
    demands.length ? sec("企划招募", demands.length) + demands.map(d => `
      <div class="search-row" onclick="searchJump(()=>openDemandDetail(${DEMANDS.indexOf(d)}))">
        <div class="sr-glyph">募</div>
        <div class="sr-info"><b>${esc(d.title)}</b><span>${esc(d.who)} · ${esc(d.budget)}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
    posts.length ? sec("社区帖子", posts.length) + posts.map(p => `
      <div class="search-row" onclick="searchJump(()=>openPost(${POSTS.indexOf(p)}))">
        <div class="avatar" style="background:${avatarBg(p.name)}">${esc(p.name[0])}</div>
        <div class="sr-info"><b>${esc(p.title)}</b><span>${esc(p.name)} · ${p.topic ? "# " + esc(p.topic) : "动态"} · ♡ ${p.like}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
    articles.length ? sec("平台资讯", articles.length) + articles.map(a => `
      <div class="search-row" onclick="searchJump(()=>openArticle(${a.id}))">
        <div class="sr-glyph" style="background:${a.grad};color:#fff">${a.glyph}</div>
        <div class="sr-info"><b>${esc(a.title)}</b><span>${esc(a.author)} · 阅读 ${a.read.toLocaleString()}</span></div>
        <span class="art-arrow">›</span></div>`).join("") : "",
  ].join("");
}

/* ---------- 平台资讯（公众号式文章，头图/社区共用入口） ---------- */

function findArticle(id) { return ARTICLES.find(a => a.id === id); }

function openArticle(id) {
  const a = findArticle(id);
  if (!a) return;
  a.read += 1;
  state.currentArticle = id;
  renderArticle();
  renderCommunity(); // 同步社区卡片阅读数
  $("#ovArticle").classList.add("show");
  $("#articleBody").scrollTop = 0;
}

function renderArticle() {
  const a = findArticle(state.currentArticle);
  $("#articleBody").innerHTML = `
    <div class="art-hero" style="background:${a.grad}"><span>${a.glyph}</span></div>
    <div class="art-main">
      <i class="art-kicker">${esc(a.kicker)}</i>
      <h2 class="art-title">${esc(a.title)}</h2>
      <div class="art-meta">
        <div class="avatar" style="background:linear-gradient(135deg,#2152FF,#C6D92E);width:30px;height:30px;font-size:12px">曲</div>
        <b>${esc(a.author)}</b><span>${a.date} · 阅读 ${a.read.toLocaleString()}</span>
      </div>
      ${a.sections.map(s => `${s.h ? `<h4 class="art-h">${esc(s.h)}</h4>` : ""}<p class="art-p">${esc(s.p)}</p>`).join("")}
      ${a.cta ? `<button class="btn primary art-cta" onclick="articleCta(${a.id})">${esc(a.cta.txt)}</button>` : ""}
      <div class="art-foot">
        <span class="${a.liked ? "on" : ""}" onclick="toggleArticleLike(${a.id})">${a.liked ? "♥" : "♡"} ${a.like}</span>
        <span onclick="toast('已复制文章链接，可分享给好友')">↗ 分享</span>
      </div>
    </div>`;
}

function toggleArticleLike(id) {
  const a = findArticle(id);
  a.liked = !a.liked;
  a.like += a.liked ? 1 : -1;
  renderArticle();
}

/** 文章尾部行动按钮 */
function articleCta(id) {
  const a = findArticle(id);
  closeOverlay("ovArticle");
  if (a.cta.act === "demand") { backHomeAs("demand"); toast("已跳转企划招募"); }
  else if (a.cta.act === "topic") { switchTab($('.tab[data-scr="scr-comm"]')); goHotTopic(); }
  else toast("报名成功！首单免佣资格已到账");
}

/* ---------- 首页头图轮播 ---------- */

let bannerIdx = 0, bannerTimer = null;

function renderBanner() {
  $("#bannerTrack").innerHTML = BANNERS.map((b, i) => `
    <div class="banner" style="background:${b.grad}" onclick="bannerGo(${i})">
      <span class="bn-glyph">${b.glyph}</span>
      <div class="bn-txt">
        <i>${b.kicker}</i>
        <b>${b.title}</b>
        <span>${b.sub}</span>
      </div>
    </div>`).join("");
  $("#bannerDots").innerHTML = BANNERS.map((_, i) =>
    `<i class="${i === bannerIdx ? "on" : ""}"></i>`).join("");
  startBannerAuto();
  /* 手动滑动时同步圆点并重计自动播放 */
  $("#bannerTrack").onscroll = () => {
    const t = $("#bannerTrack");
    const i = Math.round(t.scrollLeft / t.clientWidth);
    if (i !== bannerIdx) {
      bannerIdx = i;
      $$("#bannerDots i").forEach((d, j) => d.classList.toggle("on", j === i));
      startBannerAuto();
    }
  };
}

function bannerGo(i) { BANNERS[i].act(); }

function startBannerAuto() {
  clearInterval(bannerTimer);
  bannerTimer = setInterval(() => {
    bannerIdx = (bannerIdx + 1) % BANNERS.length;
    const t = $("#bannerTrack");
    t.scrollTo({ left: bannerIdx * t.clientWidth, behavior: "smooth" });
    $$("#bannerDots i").forEach((d, j) => d.classList.toggle("on", j === bannerIdx));
  }, 4500);
}

/* ---------- 启动 ---------- */
applyTheme();
injectIcons();
renderBanner();
renderCategories();
renderHome();
renderCommunity();
renderMessages();
renderMyProfile();
renderFollowStats();
renderOrders();
renderMyReviews();
renderFavStrip();
renderNoticeDot();
openRoleSetup("register"); // Demo：模拟注册流程，进入资料填写 → 工种选择
