/* ============================================================
 * templates.js — 纯渲染函数（数据 → HTML 字符串）
 * 无状态、无副作用；交互通过 onclick 调用 app.js 中的全局函数
 * ============================================================ */

/** HTML 转义（用户内容一律经过此函数，防 XSS） */
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/** 按名字 hash 取头像渐变色 */
function avatarBg(name) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return CONFIG.avatarColors[hash % CONFIG.avatarColors.length];
}

/** 简笔画小人头像（SVG），按性别区分：男/女/保密 */
function stickAvatarSVG(gender) {
  const s = "#5A4634";
  const bg = gender === "女" ? "#F3DFDA" : gender === "男" ? "#DCE6E4" : "#E9E2D2";
  const hair = gender === "女"
    ? `<circle cx="18.5" cy="19" r="5.5" fill="${s}"/><circle cx="45.5" cy="19" r="5.5" fill="${s}"/>
       <path d="M20.5 25 Q22.5 15 32 15 Q41.5 15 43.5 25 Z" fill="${s}"/>`
    : gender === "男"
    ? `<path d="M20.5 24 Q22.5 14 32 14 Q41.5 14 43.5 24 Z" fill="${s}"/>`
    : `<path d="M21 22.5 Q25.5 14.5 32 14.5 Q38.5 14.5 43 22.5" fill="none" stroke="${s}" stroke-width="2.2" stroke-linecap="round"/>`;
  const blush = gender === "女"
    ? `<circle cx="24" cy="32" r="2" fill="#E1988A" opacity=".65"/><circle cx="40" cy="32" r="2" fill="#E1988A" opacity=".65"/>`
    : "";
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect width="64" height="64" fill="${bg}"/>
    <circle cx="32" cy="27" r="12.5" fill="#FDF8EF" stroke="${s}" stroke-width="2"/>
    ${hair}
    <circle cx="27" cy="28.5" r="1.6" fill="${s}"/><circle cx="37" cy="28.5" r="1.6" fill="${s}"/>
    <path d="M28.5 33.5 Q32 36.5 35.5 33.5" fill="none" stroke="${s}" stroke-width="1.8" stroke-linecap="round"/>
    ${blush}
    <path d="M16 60 Q19 45 32 45 Q45 45 48 60 Z" fill="#FDF8EF" stroke="${s}" stroke-width="2"/>
  </svg>`;
}

/** 商用性质标签（可选、可并存："商业" | "非商业" | "待定" | 数组） */
function bizTagHTML(biz) {
  const list = Array.isArray(biz) ? biz : biz ? [biz] : [];
  return list.map(b => b === "商业"
    ? `<span class="tag biz">可商用</span>`
    : b === "非商业"
      ? `<span class="tag nonbiz">可非商用</span>`
      : `<span class="tag gray">商用情况待定</span>`).join("");
}

/** 伪波形条（正弦取高，视觉装饰用） */
function barsHTML(count, cls = "bars") {
  const maxH = cls === "vwave" ? 26 : 18;
  let items = "";
  for (let i = 0; i < count; i++) {
    items += `<i style="height:${6 + Math.round(Math.abs(Math.sin(i * 1.5)) * maxH)}px"></i>`;
  }
  return `<div class="${cls}">${items}</div>`;
}

const emptyHTML = text => `<div class="empty">${text}</div>`;

/* ---------- 瀑布流卡片 ---------- */

/**
 * 封面区自动适配，优先级：视频 > 封面图 > 词作模板 > 音频模板
 */
function workCoverHTML(w) {
  const h = w.ch || CONFIG.ui.coverHeightDefault;
  if (w.video) {
    return `<div class="mcover" style="background:${w.cover};height:${h}px">
      <span class="glyph">${esc(w.glyph || "♪")}</span>
      <div class="vplay">▶</div><span class="mbadge">视频 ${w.dur}</span></div>`;
  }
  if (w.cover) {
    return `<div class="mcover" style="background:${w.cover};height:${h}px">
      <span class="glyph">${esc(w.glyph || "♪")}</span>
      ${w.audio ? `<span class="mbadge">♪ ${w.dur}</span>` : ""}</div>`;
  }
  if (w.lyric) {
    return `<div class="mcover tpl-lyric">
      <p>${esc(w.lyric).replace(/\n/g, "<br>")}</p><span class="seal-mini">词</span></div>`;
  }
  return `<div class="mcover tpl-audio" style="height:${h}px">
    <div class="disc"></div>${barsHTML(CONFIG.ui.waveBarsCard)}
    <span class="mbadge">♪ ${w.dur}</span></div>`;
}

/** 品类标签（支持单个或多个） */
function typeTagsHTML(type) {
  return (Array.isArray(type) ? type : [type])
    .map(t => `<span class="tag cat">${t}</span>`).join("");
}

/** @param idx 当前筛选列表中的下标（供沉浸式浏览定位） */
function workCardHTML(w, idx) {
  return `<div class="mcard" onclick="openViewer(${idx})">
    ${workCoverHTML(w)}
    <div class="mbody">
      <div class="mtitle">${esc(w.title)}</div>
      <div class="mtags">${typeTagsHTML(w.type)}${bizTagHTML(w.biz)}</div>
      <div class="mfoot">
        <div class="mauthor">
          <div class="mavatar" style="background:${avatarBg(w.author)}">${esc(w.author[0])}</div>${esc(w.author)}
        </div>
        <div class="mprice">${w.price}</div>
      </div>
    </div></div>`;
}

/* ---------- 音乐人卡 / 招募卡 ---------- */

/** 小红书式关注钮：未关注=红底「关注」；已关注=灰边「已关注」；对方关注我时互关/回关 */
function followBtnHTML(name) {
  if (state.blocked.has(name))
    return `<button class="fbtn blocked"
      onclick="event.stopPropagation();confirmUnblock('${esc(name)}')">已拉黑</button>`;
  const followed = state.following.has(name);
  const isFan = FANS.includes(name);
  const label = followed ? (isFan ? "互相关注" : "已关注") : (isFan ? "回关" : "关注");
  return `<button class="fbtn ${followed ? "off" : ""}"
    onclick="event.stopPropagation();toggleFollow('${esc(name)}')">${label}</button>`;
}

function artistCardHTML(a, idx) {
  return `<div class="artist-card" onclick="openArtist(${idx})">
    <div class="avatar" style="background:${avatarBg(a.name)}">${esc(a.name[0])}</div>
    <div class="artist-info">
      <div class="row1"><span class="name">${esc(a.name)}</span>
        ${a.roles.map(r => `<span class="tag cat">${r}</span>`).join("")}
        <span style="margin-left:auto">${followBtnHTML(a.name)}</span></div>
      <div class="bio">${esc(a.bio)}</div>
      <div class="meta">
        <span class="stats">作品 ${a.works} · 合作 ${a.deals} · 好评 ${a.rate}</span>
        <span class="price" style="font-size:13px">${a.price}</span>
      </div>
    </div></div>`;
}

/* ---------- 关注 / 粉丝列表行 ---------- */

function personRowHTML(name) {
  const artist = ARTISTS.find(a => a.name === name);
  const bio = artist ? artist.bio : (USERS_EXTRA[name]?.bio || "曲境用户");
  return `<div class="person-row" onclick="closeOverlay('ovFollow');openArtistByName('${esc(name)}')">
    <div class="avatar" style="background:${avatarBg(name)}">${esc(name[0])}</div>
    <div class="p-info"><b>${esc(name)}</b><span>${esc(bio)}</span></div>
    ${followBtnHTML(name)}</div>`;
}

/** 非音乐人用户的简版主页（关注/粉丝/社区/搜索入口通用） */
function userProfileHTML(name) {
  const bio = USERS_EXTRA[name]?.bio || "曲境用户";
  const posts = POSTS.filter(p => p.name === name);
  return `
    <div class="profile-hero" style="margin:0 0 14px">
      <div class="ph-top">
        <div class="avatar" style="background:${avatarBg(name)}">${esc(name[0])}</div>
        <div style="flex:1">
          <div class="ph-name-row"><h2>${esc(name)}</h2><span id="artFollowWrap">${followBtnHTML(name)}</span></div>
          <div class="uid">ID：${uidOf(name)}${FANS.includes(name) ? " · TA 关注了我" : ""} · 暂未开通接稿主页</div>
        </div>
      </div>
    </div>
    <div class="detail-section"><h4>简介</h4><p>${esc(bio)}</p></div>
    <div class="detail-section"><h4>社区动态</h4></div>
    ${posts.length
      ? posts.map(p => `<div class="pay-order" style="margin-bottom:8px;cursor:pointer" onclick="closeOverlay('ovArtist');openPost(${POSTS.indexOf(p)})">
          <b>${esc(p.title)}</b>
          <span>${p.topic ? "# " + esc(p.topic) + " · " : ""}♡ ${p.like} · 评论 ${(p.comments || []).length}</span>
        </div>`).join("")
      : `<div class="rev-hint">TA 还没有公开动态</div>`}`;
}

/* ---------- 订单 ---------- */

const ORDER_STATUS_CLS = { 待接稿: "od-wait", 待付款: "od-pay", 进行中: "od-going", 待验收: "od-check", 已完成: "od-done", 已取消: "od-cancel" };

/** 按订单状态与我的角色生成操作按钮（交易方式由接稿方设定） */
function orderActionsHTML(o) {
  /* 售后中：锁定其它操作，仅可撤销或查看进度 */
  if (o.as)
    return o.mine === "约稿"
      ? `<button class="btn ghost obtn" onclick="cancelAfterSale('${o.id}')">撤销申请</button>
         <button class="btn ghost obtn" onclick="toast('平台客服已接入，证据材料审核中')">查看进度</button>`
      : `<button class="btn ghost obtn" onclick="toast('对方发起了${o.as.type === "refund" ? "退款" : "售后"}，请在工单中提交你的说明')">响应工单</button>`;
  if (o.status === "待接稿")
    return o.mine === "约稿"
      ? `<button class="btn ghost obtn" onclick="toast('已提醒对方查看约稿邀约')">提醒对方</button>
         <button class="btn ghost obtn" onclick="cancelOrder('${o.id}')">撤回邀约</button>`
      : `<button class="btn primary obtn" onclick="acceptInvite('${o.id}')">接受约稿</button>
         <button class="btn ghost obtn" onclick="declineInvite('${o.id}')">婉拒</button>`;
  if (o.status === "待付款") {
    if (o.mine !== "约稿")
      return `<button class="btn ghost obtn" onclick="toast('已提醒对方托管稿酬')">提醒付款</button>`;
    return (o.payMode === "定金"
      ? `<button class="btn ghost obtn" onclick="openPay('${o.id}','deposit')">付定金 ¥${Math.round(o.amount / 2).toLocaleString()}</button>
         <button class="btn primary obtn" onclick="openPay('${o.id}','full')">付全款</button>`
      : `<button class="btn primary obtn" onclick="openPay('${o.id}','full')">付款并托管</button>`)
      + `<button class="btn ghost obtn" onclick="cancelOrder('${o.id}')">取消</button>`;
  }
  if (o.status === "进行中")
    return o.mine === "接稿"
      ? `<button class="btn primary obtn" onclick="openDeliver('${o.id}')">提交交付</button>`
      : `<button class="btn ghost obtn" onclick="toast('已提醒对方交付')">提醒交付</button>
         <button class="btn ghost obtn" onclick="openAfterSale('${o.id}','refund')">申请退款</button>`;
  if (o.status === "待验收")
    return o.mine === "约稿"
      ? `<button class="btn primary obtn" onclick="confirmOrder('${o.id}')">${o.paid < o.amount ? "补尾款并验收" : "确认验收"}</button>
         <button class="btn ghost obtn" onclick="openRevise('${o.id}')">要求修改</button>
         <button class="btn ghost obtn" onclick="openAfterSale('${o.id}','aftersale')">申请售后</button>`
      : `<button class="btn ghost obtn" onclick="toast('已催促验收')">催验收</button>`;
  if (o.status === "已取消")
    return `<button class="btn ghost obtn" onclick="deleteOrder('${o.id}')">删除记录</button>`;
  return o.rated
    ? `<button class="btn ghost obtn" onclick="viewOrderReviews('${o.id}')">查看评价</button>`
    : `<button class="btn primary obtn" onclick="openRate('${o.id}')">评价对方</button>`;
}

function orderCardHTML(o) {
  const paidInfo = o.paid > 0 && o.paid < o.amount
    ? `<small style="font-size:10px;color:var(--ink-3);font-weight:400"> 已托管 ¥${o.paid.toLocaleString()}</small>` : "";
  /* 交易方式按单设定：接稿方在对方付款前可改，其余只读展示 */
  const editable = o.mine === "接稿" && o.status === "待付款";
  const modeTag = editable
    ? `<span class="pm-row">
        <span class="pm-opt ${o.payMode === "定金" ? "on" : ""}" onclick="setOrderPayMode('${o.id}','定金')">定金 50% + 尾款</span>
        <span class="pm-opt ${o.payMode === "全款" ? "on" : ""}" onclick="setOrderPayMode('${o.id}','全款')">一次性全款</span>
      </span>`
    : `<span class="tag gray">${o.payMode === "定金" ? "定金 50% + 尾款" : o.payMode === "分期" ? "分期付款" : "一次性全款"}</span>`;
  return `<div class="order-card">
    <div class="o-top">
      <span class="tag ${o.mine === "接稿" ? "nonbiz" : "biz"}">${o.mine === "接稿" ? "我接的单" : "我约的稿"}</span>
      ${modeTag}
      <span class="o-status ${ORDER_STATUS_CLS[o.status]}" style="margin-left:auto">${o.status}</span>
    </div>
    <div class="o-title">${esc(o.title)}</div>
    <div class="o-meta">${esc(o.who)} · ${o.date} · 单号 ${o.id}</div>
    <div class="o-note">${esc(o.note)}</div>
    ${o.as ? `<div class="as-banner">${o.as.type === "refund" ? "退款" : "售后"}处理中 · ${esc(o.as.reason)} · 平台 48h 内介入</div>` : ""}
    ${(o.revUsed || 0) > 0 ? `<div class="rev-count">已返修 ${o.revUsed}/3 次${o.revUsed >= 3 ? " · 再改需另付费" : ""}</div>` : ""}
    ${o.file ? `<div class="o-file" onclick="openDownload('${o.id}')">
      <b>${esc(o.file.name)}</b><small>${o.file.ext} · ${o.file.size}</small><span>${o.status === "待验收" && o.mine === "约稿" ? "预览 ›" : "下载 ›"}</span></div>` : ""}
    <div class="o-foot">
      <span class="price">¥${o.amount.toLocaleString()}${paidInfo}</span>
      <div class="o-acts">${orderActionsHTML(o)}</div>
    </div></div>`;
}

/* ---------- 评价 ---------- */

const starsTxt = n => "★".repeat(n) + "☆".repeat(5 - n);

function reviewItemHTML(r) {
  return `<div class="review-item">
    <div class="r-top">
      <div class="avatar" style="background:${avatarBg(r.from)};width:26px;height:26px;font-size:11px">${esc(r.from[0])}</div>
      <b>${esc(r.from)}</b><span class="r-stars">${starsTxt(r.stars)}</span>
      <span class="r-date">${r.date}</span>
    </div>
    <p>${esc(r.txt)}</p></div>`;
}

/** 企划发起方：身份 tag + 可点击的用户名（「我」跳自己主页） */
function demandWhoHTML(d) {
  const me = d.whoName === "我" || d.whoName === state.profile.name;
  const open = me
    ? `switchTab(document.querySelector('.tab[data-scr=\\'scr-me\\']'))`
    : `openArtistByName('${esc(d.whoName)}')`;
  return `<span class="who"><span class="tag gray" style="margin-right:5px">${esc(d.whoType)}</span><a href="javascript:;" class="who-link" onclick="event.stopPropagation();closeSheet();${open}">${esc(d.whoName)}</a></span>`;
}

function demandCardHTML(d) {
  const cover = d.cover
    ? `<div class="dcover" style="background:${d.cover}">${d.hasVideo ? `<div class="vplay">▶</div>` : ""}</div>`
    : d.hasVideo || d.hasAudio
      ? `<div class="dmedia-hint">${d.hasVideo ? "含介绍视频" : "含参考音频"}</div>` : "";
  return `<div class="demand-card" onclick="openDemandDetail(${DEMANDS.indexOf(d)})">
    ${cover}
    <div class="dtitle">${esc(d.title)}</div>
    <div class="ddesc">${esc(d.desc)}</div>
    <div class="dtags">${bizTagHTML(d.biz)}${d.tags.map(t => `<span class="tag gray">${esc(t)}</span>`).join("")}${d.applied ? `<span class="tag cat">已投递</span>` : ""}</div>
    <div class="demand-foot">${demandWhoHTML(d)}
      <span class="price" style="font-size:13.5px">${d.budget}</span></div></div>`;
}

/* ---------- 平台资讯（社区入口卡片） ---------- */

function articleCardHTML(a) {
  return `<div class="art-card" onclick="openArticle(${a.id})">
    <div class="art-thumb" style="background:${a.grad}">${a.glyph}</div>
    <div class="art-info">
      <b>${esc(a.title)}</b>
      <span>${esc(a.author)} · ${a.date} · 阅读 ${a.read.toLocaleString()}</span>
    </div>
    <span class="art-arrow">›</span></div>`;
}

/* ---------- 社区帖子 ---------- */

/** 正文 hashtag 高亮：识别「#内容 + 空格/结尾」变色 */
function hashtagHTML(s) {
  return esc(s).replace(/#([^#\s]+)(?=\s|$)/g, `<b class="htag">#$1</b>`);
}

/** 微博式转发：引用原帖框 */
function originBoxHTML(o) {
  return `<div class="origin-box">
    <b>@${esc(o.name)}：${esc(o.title)}</b>
    <p>${hashtagHTML(o.txt)}</p></div>`;
}

function postHTML(p) {
  const idx = POSTS.indexOf(p);
  return `<div class="post" onclick="openPost(${idx})">
    <div class="ptop">
      <div class="avatar" style="background:${avatarBg(p.name)}" onclick="event.stopPropagation();openArtistByName('${esc(p.name)}')">${esc(p.name[0])}</div>
      <div><div class="pname">${esc(p.name)}</div><div class="ptime">${p.time}</div></div>
      ${p.topic ? `<span class="tag cat ptopic" onclick="event.stopPropagation();setTopic('${p.topic}')"># ${p.topic}</span>` : ""}
    </div>
    <div class="ptitle">${esc(p.title)}</div>
    <div class="ptxt">${hashtagHTML(p.txt)}</div>
    ${p.origin ? originBoxHTML(p.origin) : ""}
    <div class="pacts">
      <span class="${p.liked ? "act-on" : ""}" onclick="event.stopPropagation();toggleLike(${idx})">${p.liked ? "♥" : "♡"} ${p.like}</span>
      <span onclick="event.stopPropagation();openPost(${idx}, true)">评 ${p.comments.length}</span>
      <span onclick="event.stopPropagation();openRepost(${idx})">转 ${p.reposts || 0}</span>
      <span onclick="event.stopPropagation();openShare(${idx})">⤴ 分享</span>
    </div></div>`;
}

/** 评论：文字 / 贴纸表情 / 图片 */
function commentItemHTML(c) {
  let body;
  if (c.type === "sticker") {
    const s = CONFIG.stickers.find(x => x.key === c.key);
    body = `<div class="cmt-sticker"><span>${s ? s.e : "♪"}</span><b>${s ? s.t : ""}</b></div>`;
  } else if (c.type === "img") {
    body = `<img class="cmt-img" src="${c.src}" alt="图片">`;
  } else {
    body = `<p>${hashtagHTML(c.txt)}</p>`;
  }
  return `<div class="cmt-item">
    <div class="avatar" style="background:${avatarBg(c.name)}" onclick="closeOverlay('ovPost');openArtistByName('${esc(c.name)}')">${esc(c.name[0])}</div>
    <div class="cmt-body">
      <div class="cmt-top"><b>${esc(c.name)}</b><span>${c.time}</span></div>
      ${body}
    </div></div>`;
}

/** 帖子详情：正文 + 赞/转/分享 + 评论区 */
function postDetailHTML(p, idx) {
  return `<div class="post" style="cursor:default">
    <div class="ptop">
      <div class="avatar" style="background:${avatarBg(p.name)}" onclick="closeOverlay('ovPost');openArtistByName('${esc(p.name)}')">${esc(p.name[0])}</div>
      <div><div class="pname">${esc(p.name)}</div><div class="ptime">${p.time}</div></div>
      ${p.topic ? `<span class="tag cat ptopic"># ${p.topic}</span>` : ""}
    </div>
    <div class="ptitle">${esc(p.title)}</div>
    <div class="ptxt" style="-webkit-line-clamp:99">${hashtagHTML(p.txt)}</div>
    ${p.origin ? originBoxHTML(p.origin) : ""}
    <div class="pacts">
      <span class="${p.liked ? "act-on" : ""}" onclick="toggleLike(${idx})">${p.liked ? "♥" : "♡"} ${p.like}</span>
      <span>评 ${p.comments.length}</span>
      <span onclick="openRepost(${idx})">转 ${p.reposts || 0}</span>
      <span onclick="openShare(${idx})">⤴ 分享</span>
    </div></div>
    <div class="detail-section" style="margin-top:14px"><h4>评论 ${p.comments.length}</h4></div>
    ${p.comments.map(commentItemHTML).join("") || `<div class="rev-hint">还没有评论，坐个沙发吧</div>`}`;
}

/* ---------- 首页提示（铃铛通知） ---------- */

function noticeHTML(n, i) {
  return `<div class="notice-item ${n.unread ? "unread" : ""}" onclick="noticeGo(${i})">
    <span class="n-icon">${n.icon}</span>
    <div class="n-body"><p>${esc(n.txt)}</p><span>${n.time}</span></div>
    ${n.unread ? `<i class="ndot-i"></i>` : ""}</div>`;
}

/* ---------- 通知详情（赞/收藏/评论/@） ---------- */

/** 详情内的关联对象卡：我的作品 / 社区帖子 */
function ndTargetHTML(t) {
  if (!t) return "";
  if (t.kind === "work") {
    const w = MY_WORKS.find(x => x.title === t.title);
    return `<div class="nd-target" onclick="ndOpenWork('${esc(t.title)}')">
      <div class="nd-cover" style="background:${w ? w.grad : "var(--card)"}">${w ? w.glyph : "♪"}</div>
      <div class="nd-tinfo"><b>《${esc(t.title)}》</b><span>${w ? esc(w.role) + " · 播放 " + esc(w.plays) : "我的作品"}</span></div>
      <i>›</i></div>`;
  }
  const p = POSTS[t.idx];
  return `<div class="nd-target" onclick="ndOpenPost(${t.idx})">
    <div class="nd-cover nd-post-ic">帖</div>
    <div class="nd-tinfo"><b>${esc(p.title)}</b><span>${esc(p.txt.slice(0, 26))}…</span></div>
    <i>›</i></div>`;
}

/** 详情内的用户行（可进主页 / 关注） */
function ndPersonHTML(name) {
  const artist = ARTISTS.find(a => a.name === name);
  const bio = artist ? artist.bio : (USERS_EXTRA[name]?.bio || "曲境用户");
  return `<div class="person-row" onclick="ndOpenUser('${esc(name)}')">
    <div class="avatar" style="background:${avatarBg(name)}">${esc(name[0])}</div>
    <div class="p-info"><b>${esc(name)}</b><span>${esc(bio)}</span></div>
    ${followBtnHTML(name)}</div>`;
}

function noticeDetailHTML(n) {
  const who = n.from || [];
  if (n.type === "comment") {
    const name = who[0];
    return `
      ${ndTargetHTML(n.target)}
      <div class="nd-sec">${n.icon === "@" ? "@ 提到你" : "评论内容"}</div>
      <div class="nd-cmt">
        <div class="avatar" style="background:${avatarBg(name)}" onclick="ndOpenUser('${esc(name)}')">${esc(name[0])}</div>
        <div class="nd-cmt-body">
          <b>${esc(name)}</b>
          <p>${esc(n.cmt || "")}</p>
          <span>${n.time}</span>
          <div class="nd-cmt-acts">
            <em class="${n.cmtLiked ? "on" : ""}" onclick="ndLikeCmt(this)">${n.cmtLiked ? "♥" : "♡"} 赞</em>
          </div>
        </div>
      </div>
      <div class="nd-reply">
        <input id="ndReplyInput" placeholder="回复 ${esc(name)}…" onkeydown="if(event.key==='Enter')ndReply()">
        <button class="btn primary send-btn" onclick="ndReply()">回复</button>
      </div>
      <div id="ndReplies"></div>`;
  }
  /* like / fav：谁赞了 / 谁收藏了 */
  return `
    ${ndTargetHTML(n.target)}
    ${n.fold ? `<div class="nd-fold">收藏到：「${esc(n.fold)}」</div>` : ""}
    <div class="nd-sec">${n.type === "fav" ? "收藏的人" : "点赞的人"}（${who.length}）</div>
    ${who.map(ndPersonHTML).join("")}`;
}

/* ---------- 消息 / 聊天 ---------- */

/** 群聊头像：成员首字拼贴（小红书式九宫格，取前 4 人含自己） */
function groupAvatarHTML(gname) {
  const g = GROUPS[gname];
  const ms = [state.profile.name || "我", ...g.members].slice(0, 4);
  return `<div class="avatar gavatar">${ms.map(n =>
    `<i style="background:${avatarBg(n)}">${esc(n[0])}</i>`).join("")}</div>`;
}

function messageHTML(m) {
  const muted = state.muted.has(m.name);
  return `<div class="msg-item" onclick="openChat('${esc(m.name)}')">
    ${GROUPS[m.name]
      ? groupAvatarHTML(m.name)
      : `<div class="avatar" style="background:${avatarBg(m.name)}">${esc(m.name[0])}</div>`}
    <div class="msg-body">
      <div class="r1"><span class="mname">${esc(m.name)}${muted ? `<i class="mute-ic" title="免打扰">⋘</i>` : ""}</span><span class="time">${m.time}</span></div>
      <div class="txt">${esc(m.txt)}</div>
    </div>
    ${m.unread ? (muted ? `<div class="mute-dot"></div>` : `<div class="badge">${m.unread}</div>`) : ""}</div>`;
}

/** 聊天气泡：文字 / 默认贴纸 / 相册导入表情包 */
function chatBubbleHTML(m, name) {
  if (m.type === "sys") return `<div class="chat-sys">${esc(m.txt)}</div>`;
  const mine = m.who === "me";
  const isGroup = !!GROUPS[name];
  const av = mine ? (state.profile.name || "我") : (m.name || name);
  let content;
  if (m.type === "sticker") {
    const s = CONFIG.stickers.find(x => x.key === m.key);
    content = `<div class="sticker"><span>${s ? s.e : "♪"}</span><b>${s ? s.t : ""}</b></div>`;
  } else if (m.type === "img") {
    content = `<img class="c-img" src="${m.src}" alt="表情包">`;
  } else {
    content = `<div class="bubble">${esc(m.txt)}</div>`;
  }
  if (isGroup && !mine) content = `<div class="c-col"><div class="chat-sender">${esc(av)}</div>${content}</div>`;
  const avClick = !mine && av !== "平台助手"
    ? ` onclick="openArtistByName('${esc(av)}')" style="background:${avatarBg(av)};cursor:pointer"`
    : ` style="background:${avatarBg(av)}"`;
  return `<div class="chat-row ${mine ? "me" : ""}">
    <div class="avatar"${avClick}>${esc(av[0])}</div>
    ${content}</div>`;
}

/** 表情面板：默认贴纸 + 已导入表情包 + 导入入口 */
function stickerTrayHTML() {
  return CONFIG.stickers.map(s => `
    <div class="tray-item" onclick="sendSticker('${s.key}')"><span>${s.e}</span><b>${s.t}</b></div>`).join("")
    + state.myStickers.map((src, i) => `
    <div class="tray-item" onclick="sendStickerImg(${i})"><img src="${src}" alt="表情包"></div>`).join("")
    + `<div class="tray-item tray-add" onclick="pickStickerImg()"><span>＋</span><b>相册导入</b></div>`;
}

/* ---------- 沉浸式浏览（单张 slide） ---------- */

/** 媒体区，与瀑布流封面同样的适配优先级 */
function slideMediaHTML(w) {
  if (w.video) {
    return `<div class="smedia" style="background:${w.cover}">
      <span class="cover-glyph">${esc(w.glyph || "♪")}</span>
      <div class="bigplay" onclick="toast('Demo：播放视频 ▶')">▶</div>
      <span class="tpl-label">视频 · ${w.dur}</span></div>`;
  }
  if (w.cover) {
    return `<div class="smedia" style="background:${w.cover}">
      <span class="cover-glyph">${esc(w.glyph || "♪")}</span>
      ${w.audio
        ? `<div class="bigplay" onclick="toast('Demo：播放音频 ▶')">▶</div>
           <span class="tpl-label">封面 + 音频 · ${w.dur}</span>`
        : `<span class="tpl-label">封面图</span>`}</div>`;
  }
  if (w.lyric) {
    return `<div class="smedia tpl-lyric">
      <div class="lseal">词</div>
      <div class="lyric-lines">${esc(w.lyric).replace(/\n/g, "<br>")}</div>
      <span class="tpl-label">默认词作模板 · 歌词自动排版</span></div>`;
  }
  return `<div class="smedia">
    <div class="disc-big"></div>
    ${barsHTML(CONFIG.ui.waveBarsViewer, "vwave")}
    <div class="bigplay" onclick="toast('Demo：播放小样 ▶')">▶</div>
    <span class="tpl-label">默认音频模板 · 无封面 · ${w.dur}</span></div>`;
}

function slideInfoHTML(w) {
  return `<div class="sinfo">
    <div class="stitle">${esc(w.title)}</div>
    <div class="srow">${typeTagsHTML(w.type)}${bizTagHTML(w.biz)}
      <span class="tag gray">可开电子协议</span>
      <span class="mprice" style="margin-left:auto;font-size:15px">${w.price}</span></div>
    <div class="sauthor" onclick="closeViewer();openArtistByName('${esc(w.author)}')">
      <div class="avatar" style="background:${avatarBg(w.author)};width:32px;height:32px;font-size:13px">${esc(w.author[0])}</div>
      <div><div style="font-size:12.5px;font-weight:700">${esc(w.author)}</div>
        <div style="font-size:10px;color:var(--ink-3);margin-top:1px">${esc(w.role)}</div></div>
      <span class="go">主页 ›</span></div>
    <div class="sdesc">${esc(w.desc)}<br>
      <b style="color:var(--ink)">约稿须知：</b>${esc(w.detail)}</div>
    <div class="sbtns">
      <button class="btn ghost fav-btn" data-fav="${w.id}" onclick="openFavPick(${w.id})">${isFaved(w.id) ? "已收藏 ♥" : "收藏 ♡"}</button>
      <button class="btn primary" onclick="closeViewer();openCommission('${esc(w.author)}', '${esc(w.title)}')">发起约稿</button>
    </div></div>`;
}

const slideHTML = w => `<div class="slide">${slideMediaHTML(w)}${slideInfoHTML(w)}</div>`;

/* ---------- 个人风格 / 主页橱窗（米画师式） ---------- */

/** 风格人设：标签 chips + 描述 */
function styleSectionHTML(style) {
  if (!style) return "";
  return `<div class="detail-section"><h4>个人风格</h4></div>
    <div class="style-box">
      <div class="style-tags">${style.tags.map(t => `<span class="stag">${esc(t)}</span>`).join("")}</div>
      <p>${esc(style.desc)}</p>
    </div>`;
}

/** 橱窗卡片：work 零散待售现货 | bundle 企划整体约稿（歌单式）；点击进购买页 */
function shopCardHTML(item, owner, idx) {
  const isBundle = item.kind === "bundle";
  const hasImg = item.cover && item.cover.kind === "image";
  const bg = hasImg ? `url(${item.cover.url}) center/cover` : item.grad;
  return `<div class="shop-card ${isBundle ? "bundle" : ""}" onclick="openShopBuy('${esc(owner)}', ${idx})">
    <div class="sc-cover" style="background:${bg}">
      ${hasImg ? "" : `<span>${esc(item.glyph)}</span>`}
      ${item.cover && item.cover.kind === "video" ? `<span class="play-mini">▶</span>` : ""}
      <i class="sc-kind">${isBundle ? `企划打包 · ${item.count} 项` : "现货买断"}</i>
    </div>
    <b>${esc(item.title)}</b>
    ${isBundle
      ? `<small>${esc(item.desc)}</small>`
      : `<span class="tag ${item.biz === "商业" ? "biz" : "nonbiz"}">${item.biz}</span>`}
    <div class="sc-price">${item.price}</div></div>`;
}

function shopRowHTML(shop, owner) {
  if (!shop || !shop.length) return "";
  return `<div class="detail-section"><h4>主页橱窗</h4></div>
    <div class="shop-row">${shop.map((s, i) => shopCardHTML(s, owner, i)).join("")}</div>`;
}

/* ---------- 音乐人主页浮层 ---------- */

function artistProfileHTML(a) {
  return `
    <div class="profile-hero" style="margin:0 0 14px">
      <div class="ph-top">
        <div class="avatar" style="background:${avatarBg(a.name)}">${esc(a.name[0])}</div>
        <div style="flex:1">
          <div class="ph-name-row"><h2>${esc(a.name)}</h2><span id="artFollowWrap">${followBtnHTML(a.name)}</span></div>
          <div class="uid">ID：${uidOf(a.name)} · 开放约稿中 · 平均响应 2 小时</div>
          <div class="ph-roles">${a.roles.map(r => `<span class="tag">${r}</span>`).join("")}</div>
        </div>
      </div>
      <div class="ph-stats">
        <div><b>${a.works}</b><span>作品</span></div>
        <div><b>${a.deals}</b><span>合作</span></div>
        <div><b>${a.rate}</b><span>好评率</span></div>
      </div>
    </div>
    <div class="detail-section"><h4>简介</h4><p>${esc(a.bio)}</p></div>
    ${styleSectionHTML(a.style)}
    ${shopRowHTML(a.shop, a.name)}
    <div class="detail-section"><h4>报价单</h4></div>
    <div class="price-list" style="margin:0 0 16px">
      ${a.prices.map(([label, biz, price]) => `<div class="price-item">
        <div class="pl">${esc(label)}</div>
        <div><span class="tag ${biz === "商业" ? "biz" : "nonbiz"}">${biz}</span>
          <span class="price" style="font-size:13.5px">${price}</span></div>
      </div>`).join("")}
    </div>
    <div class="detail-section"><h4>收到的评价</h4></div>
    <div style="margin:0 0 16px">
      ${a.showReviews === false
        ? `<div class="rev-hint">该音乐人已隐藏评价</div>`
        : (REVIEWS[a.name] || []).map(reviewItemHTML).join("") || `<div class="rev-hint">暂无公开评价</div>`}
    </div>
    <div class="detail-section"><h4>代表作品</h4></div>
    <div style="display:flex;gap:10px;overflow-x:auto">
      ${WORKS.filter(w => w.author === a.name).map((w, i) => `<div class="mini-work" onclick="openArtistWork('${esc(a.name)}', ${i})">
        <div class="cover" style="background:${w.cover || avatarBg(w.title)}">${esc(w.glyph || w.title[w.title.startsWith("《") ? 1 : 0] || "♪")}</div>
        <b>${esc(w.title)}</b><span>${esc(w.type)} · ${w.dur || w.biz}</span></div>`).join("")
      || `<div class="rev-hint">暂无公开作品</div>`}
    </div>`;
}

/* ---------- 发布编辑器表单 ---------- */

/** 授权选择 chips（可多选：可商用 / 可非商用） */
function pubBizChipsHTML() {
  return `<label>授权方式（可多选）</label>
    <div class="gender-row">
      <div class="chip" onclick="pubToggleBiz('商业', this)">可商用</div>
      <div class="chip" onclick="pubToggleBiz('非商业', this)">可非商用</div>
      <div class="chip" onclick="pubToggleBiz('待定', this)">商用情况待定</div>
    </div>`;
}

/** 检索标签 chips（风格/用途，与首页标签检索对齐） */
function pubTagChipsHTML() {
  return CONFIG.tagGroups.filter(g => g.key === "风格" || g.key === "用途").map(g => `
    <label>${g.key}标签（可多选，供首页检索）</label>
    <div class="gender-row" style="flex-wrap:wrap">
      ${g.tags.map(t => `<div class="chip" onclick="pubToggleTag('${g.key}','${t}', this)">${t}</div>`).join("")}
    </div>`).join("");
}

/** 作品发布表单（品类可多选） */
function pubWorkFormHTML() {
  const cats = CONFIG.categories.filter(c => c !== "全部");
  return `
    <label>作品品类 <b>*</b></label>
    <div class="gender-row" style="flex-wrap:wrap" id="pubTypeRow">
      ${cats.map(c => `<div class="chip" onclick="pubToggleType('${c}', this)">${c}</div>`).join("")}
      <div class="chip" onclick="pubAddCustomType(this)">＋ 其他</div>
    </div>
    <label>标题 <b>*</b></label>
    <input id="pubName" maxlength="30">
    <label id="pubCoverLabel">封面</label>
    <div class="upload-row">
      <div class="upload-btn" onclick="pubPickCover()">上传封面（图片/视频）</div>
      <div class="upload-prev" id="pubCoverPrev" onclick="previewCover()" title="点击查看"></div>
    </div>
    <div id="pubMediaBlock" style="display:none">
      <label id="pubMediaLabel">音频 / 视频小样</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="pubPickMedia()">上传小样</div>
        <span class="upload-name" id="pubMediaName" onclick="previewMedia()">未选择文件</span>
      </div>
    </div>
    <div id="pubLyricBlock" style="display:none">
      <label>词作正文 <b>*</b></label>
      <textarea id="pubLyric" rows="4" placeholder="每行一句，将自动排版为词作模板"></textarea>
    </div>
    <label>作品源文件 / 附件（选填）</label>
    <div class="upload-row">
      <div class="upload-btn" onclick="pubPickAttach()">上传文件</div>
      <span class="upload-name" id="pubAttachName">未选择文件</span>
    </div>
    <p class="se-note">支持工程 / 分轨 / 压缩包等任意格式，单个文件不超过 2G</p>
    ${pubTagChipsHTML()}
    ${pubBizChipsHTML()}
    <label>报价（选填）</label>
    <input id="pubPrice" maxlength="20" placeholder="如：¥800 起">
    <label>作品简介</label>
    <textarea id="pubDesc" rows="3"></textarea>
    <label>约稿须知（选填）</label>
    <textarea id="pubDetail" rows="2"></textarea>`;
}

/** 企划招募发布表单 */
function pubDemandFormHTML() {
  return `
    <label>企划标题 <b>*</b></label>
    <input id="pubName" maxlength="30">
    <label>封面</label>
    <div class="upload-row">
      <div class="upload-btn" onclick="pubPickCover()">上传封面（图片/视频）</div>
      <div class="upload-prev" id="pubCoverPrev" onclick="previewCover()" title="点击查看"></div>
    </div>
    <label>介绍视频 / 参考音频</label>
    <div class="upload-row">
      <div class="upload-btn" onclick="pubPickMedia()">上传小样</div>
      <span class="upload-name" id="pubMediaName" onclick="previewMedia()">未选择文件</span>
    </div>
    <label>发起方身份</label>
    <div class="gender-row" style="flex-wrap:wrap">
      ${CONFIG.demandWhoTypes.map(t => `<div class="chip${t === "个人企划" ? " on" : ""}" onclick="pubSetWhoType('${t}', this)">${t}</div>`).join("")}
    </div>
    <label>招募工种（可多选）</label>
    <div class="gender-row" style="flex-wrap:wrap" id="pubRoleRow">
      ${CONFIG.roles.map(r => `<div class="chip" onclick="pubToggleRole('${r}', this)">${r}</div>`).join("")}
      <div class="chip" onclick="pubAddCustomRole(this)">＋ 其他</div>
    </div>
    ${pubTagChipsHTML()}
    ${pubBizChipsHTML()}
    <label>预算（选填）</label>
    <input id="pubPrice" maxlength="20" placeholder="如：¥2,000 / 可议">
    <label>需求描述</label>
    <textarea id="pubDesc" rows="4" placeholder="企划背景、风格参考、交付要求、周期…"></textarea>`;
}
