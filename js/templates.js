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
  return `<span class="who"><span class="tag gray" style="margin-right:5px">${esc(d.whoType)}</span><a href="javascript:;" class="who-link" onclick="event.stopPropagation();closeSheet();closeOverlay('ovDemand');${open}">${esc(d.whoName)}</a></span>`;
}

function demandCardHTML(d) {
  const sampleCount = (d.samples || []).length;
  const cover = d.cover
    ? `<div class="dcover" style="background:${d.cover}">
        <span class="dglyph">${esc(d.glyph || "企")}</span>
        ${d.hasVideo ? `<div class="vplay">▶</div>` : ""}
        ${sampleCount ? `<span class="d-sample-badge">♪ ${sampleCount} 首可试听</span>` : ""}</div>`
    : d.hasVideo || d.hasAudio
      ? `<div class="dmedia-hint">${d.hasVideo ? "含介绍视频" : "含参考音频"}</div>` : "";
  return `<div class="demand-card" role="button" tabindex="0"
    onclick="openDemandDetail(${DEMANDS.indexOf(d)})"
    onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();openDemandDetail(${DEMANDS.indexOf(d)})}">
    ${cover}
    <div class="dtitle">${esc(d.title)}</div>
    <div class="ddesc">${esc(d.desc)}</div>
    <div class="d-preview-line"><span>${sampleCount ? "♪" : "详"}</span>
      ${sampleCount ? `已有 ${sampleCount} 首成品 / Demo，点开试听` : "查看完整企划与招募要求"}<b>›</b></div>
    <div class="dtags">${bizTagHTML(d.biz)}${(d.status || "招募中") !== "招募中" ? `<span class="tag cat">${esc(d.status)}</span>` : ""}${d.tags.map(t => `<span class="tag gray">${esc(t)}</span>`).join("")}${d.applied ? `<span class="tag cat">已投递</span>` : ""}</div>
    <div class="demand-foot">${demandWhoHTML(d)}
      <span class="price" style="font-size:13.5px">${d.budget}</span></div></div>`;
}

/** 企划详情：已有作品 / Demo 使用全站悬浮播放器 */
function demandSampleHTML(sample, d) {
  return `<div class="d-sample">
    <div class="ds-cover" style="background:${sample.cover || d.cover || "linear-gradient(145deg,#2152FF,#6B8CFF)"}">${esc(sample.glyph || d.glyph || "♪")}</div>
    <div class="ds-info"><b>${esc(sample.title)}</b><span>${esc(sample.type || "企划 Demo")} · ${esc(sample.dur || "--:--")}</span></div>
    <button class="ds-play" data-play-work="${sample.id}" onclick="toggleWorkPlayback(${sample.id}, event)" aria-label="播放《${esc(sample.title)}》">▶</button>
  </div>`;
}

function demandDetailHTML(d, i) {
  const mine = d.whoName === "我" || d.whoName === state.profile.name
    || d.whoName === `${state.profile.name} 发起` || d.whoName === "我 发起";
  const samples = d.samples || [];
  return `
    <div class="dd-hero" style="background:${d.cover || "linear-gradient(145deg,#26334C,#6B8CFF)"}">
      <span class="dd-glyph">${esc(d.glyph || "企")}</span>
      <div class="dd-status">${esc(d.status || "招募中")}</div>
      <div class="dd-hero-copy"><span>${esc(d.whoType)}</span><h2>${esc(d.title)}</h2></div>
    </div>
    <div class="dd-main">
      <div class="dd-tags">${bizTagHTML(d.biz)}${(d.status || "招募中") !== "招募中" ? `<span class="tag cat">${esc(d.status)}</span>` : ""}${d.tags.map(t => `<span class="tag gray">${esc(t)}</span>`).join("")}${d.applied ? `<span class="tag cat">已投递</span>` : ""}</div>
      <div class="dd-owner">${demandWhoHTML(d)}<span>发起的企划</span></div>
      <p class="dd-desc">${esc(d.desc)}</p>

      <div class="dd-facts">
        <div><span>预算</span><b>${esc(d.budget)}</b></div>
        <div><span>招募截止</span><b>${esc(d.deadline || "招满即止")}</b></div>
        <div class="wide"><span>当前进度</span><b>${esc(d.progress || "企划筹备中")}</b></div>
        <div class="wide"><span>交付内容</span><b>${esc(d.deliverable || "具体交付内容请与发起方沟通")}</b></div>
      </div>

      <section class="dd-section">
        <div class="dd-section-title"><h3>已有作品 / Demo</h3><span>${samples.length ? `${samples.length} 首可试听` : "暂无公开试听"}</span></div>
        ${samples.length
          ? `<div class="d-samples">${samples.map(s => demandSampleHTML(s, d)).join("")}</div>`
          : `<div class="dd-empty">发起方暂未上传公开试听，可私信索取参考资料</div>`}
      </section>

      <section class="dd-section">
        <div class="dd-section-title"><h3>招募要求</h3><span>投递前请确认</span></div>
        <div class="dd-requirements">${(d.requirements || ["请附代表作与近期档期"]).map((r, n) => `<p><i>${n + 1}</i>${esc(r)}</p>`).join("")}</div>
      </section>

      ${mine
        ? `<div class="dd-owner-tools"><button class="btn ghost" onclick="editCover('demand',${i})">${d.cover ? "更换企划封面" : "添加企划封面"}</button><button class="btn ghost" onclick="openDemandEditor(${i})">编辑企划资料</button></div>`
        : (d.status || "招募中") !== "招募中"
          ? `<div class="dd-empty">该企划当前为“${esc(d.status)}”，暂不接收新的报名。</div>`
          : d.applied
          ? `<div class="dd-applied">✓ 已投递报名${d.appliedNote ? `<span>自荐留言：${esc(d.appliedNote)}</span>` : ""}<small>对方通过后会通过私信联系，并在平台签订协议。</small></div>`
          : `<div class="dd-apply-note"><label for="applyNote">自荐留言 <span>选填</span></label><textarea id="applyNote" rows="4" maxlength="300" placeholder="介绍擅长风格、代表作和近期档期…"></textarea></div>`}
    </div>`;
}

/** 我的企划资料编辑器 */
function demandEditFormHTML(d, i) {
  const whoType = d.whoType || "个人企划";
  const biz = Array.isArray(d.biz) ? (d.biz[0] || "待定") : (d.biz || "待定");
  const status = d.status || "招募中";
  const requirements = d.requirements?.length ? d.requirements : [""];
  const samples = d.samples || [];
  return `
    <section class="de-section">
      <div class="de-section-head"><h4>基本资料</h4><span>列表与详情同步更新</span></div>
      <label for="deTitle">企划标题 <b>*</b></label>
      <input id="deTitle" maxlength="40" value="${esc(d.title)}">
      <label for="deDesc">需求描述 <b>*</b></label>
      <textarea id="deDesc" rows="5" maxlength="500">${esc(d.desc)}</textarea>
      <div class="de-cover-row">
        <div class="de-cover-copy"><b>企划封面</b><span>${d.cover ? "已设置，可重新裁剪上传" : "尚未设置封面"}</span></div>
        <button class="mini-btn" type="button" onclick="editCover('demand',${i})">${d.cover ? "更换封面" : "添加封面"}</button>
      </div>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>招募设置</h4><span>可随时暂停或结束</span></div>
      <label>招募状态</label>
      <div class="gender-row" id="deStatusRow" style="flex-wrap:wrap">
        ${["招募中", "暂停招募", "已结束"].map(v => `<div class="chip${v === status ? " on" : ""}" onclick="demandEditPick('status','${v}',this)">${v}</div>`).join("")}
      </div>
      <label>发起方身份</label>
      <div class="gender-row" id="deWhoTypeRow" style="flex-wrap:wrap">
        ${CONFIG.demandWhoTypes.map(v => `<div class="chip${v === whoType ? " on" : ""}" onclick="demandEditPick('whoType','${v}',this)">${v}</div>`).join("")}
      </div>
      <label>授权方式</label>
      <div class="gender-row" id="deBizRow" style="flex-wrap:wrap">
        ${["商业", "非商业", "待定"].map(v => `<div class="chip${v === biz ? " on" : ""}" onclick="demandEditPick('biz','${v}',this)">${v}</div>`).join("")}
      </div>
      <label for="deTags">招募工种与标签</label>
      <input id="deTags" maxlength="120" value="${esc((d.tags || []).join("、"))}" placeholder="如：招作曲、古风、原创企划">
      <p class="se-note">使用顿号、逗号或换行分隔，保存后会显示为独立标签。</p>
      <div class="de-two">
        <div><label for="deBudget">预算</label><input id="deBudget" maxlength="30" value="${esc(d.budget || "")}" placeholder="如：¥2,000–3,000"></div>
        <div><label for="deDeadline">招募截止</label><input id="deDeadline" maxlength="30" value="${esc(d.deadline || "")}" placeholder="如：招满即止"></div>
      </div>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>制作信息</h4><span>让报名者快速判断档期</span></div>
      <label for="deProgress">当前进度</label>
      <input id="deProgress" maxlength="100" value="${esc(d.progress || "")}" placeholder="如：词曲完成 · 编曲制作中">
      <label for="deDeliverable">交付内容</label>
      <textarea id="deDeliverable" rows="3" maxlength="300" placeholder="文件格式、工程文件、修改次数等">${esc(d.deliverable || "")}</textarea>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>招募要求</h4><span>逐条增删，按当前顺序展示</span></div>
      <div class="de-list" id="deRequirements">
        ${requirements.map(r => `<div class="de-list-row"><input class="de-req" maxlength="120" value="${esc(r)}" placeholder="填写一条招募要求"><button class="de-remove" type="button" onclick="removeDemandEditRow(this)" aria-label="删除要求">×</button></div>`).join("")}
      </div>
      <button class="de-add" type="button" onclick="addDemandRequirement()">＋ 添加一条要求</button>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>成品 / Demo</h4><span>${samples.length} 首试听资料</span></div>
      <div class="de-list" id="deSamples">
        ${samples.map(s => demandEditSampleRowHTML(s)).join("")}
      </div>
      <button class="de-add" type="button" onclick="addDemandSample()">＋ 添加 Demo 信息</button>
      <p class="se-note">此原型可编辑试听条目的名称、类型和时长；新增条目会使用站内模拟播放器。</p>
    </section>`;
}

function demandEditSampleRowHTML(sample) {
  return `<div class="de-list-row de-sample-edit" data-sample-id="${Number(sample.id) || Date.now()}">
    <div class="de-sample-top">
      <input class="de-sample-title" maxlength="60" value="${esc(sample.title || "")}" placeholder="Demo 名称">
      <button class="de-remove" type="button" onclick="removeDemandEditRow(this)" aria-label="删除 Demo">×</button>
    </div>
    <div class="de-sample-meta">
      <input class="de-sample-type" maxlength="30" value="${esc(sample.type || "企划 Demo")}" placeholder="类型">
      <input class="de-sample-dur" maxlength="8" value="${esc(sample.dur || "")}" placeholder="00:00">
    </div>
  </div>`;
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

/** 社区帖子关联音乐：可试听，也可进入对应作品详情。 */
function postMusicHTML(musicId) {
  const w = WORKS.find(work => Number(work.id) === Number(musicId));
  if (!w) return "";
  const idx = WORKS.indexOf(w);
  return `<div class="post-music" onclick="event.stopPropagation();openViewer(${idx},WORKS)" role="button" tabindex="0">
    <div class="pm-cover" style="background:${w.cover || avatarBg(w.title)}">${esc(w.glyph || "♪")}</div>
    <div class="pm-info"><b>${esc(w.title)}</b><span>${esc(w.author)} · ${esc(w.dur || "--:--")} · 查看作品</span></div>
    <button class="pm-play" data-play-work="${w.id}" onclick="event.stopPropagation();toggleWorkPlayback(${w.id},event)" aria-label="播放《${esc(w.title)}》">▶</button>
  </div>`;
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
    ${p.img ? `<img class="post-img" src="${p.img}" alt="帖子图片">` : ""}
    ${p.musicId ? postMusicHTML(p.musicId) : ""}
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
    ${p.img ? `<img class="post-img" src="${p.img}" alt="帖子图片">` : ""}
    ${p.musicId ? postMusicHTML(p.musicId) : ""}
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

/** 被划掉的铃铛（免打扰标记） */
const muteBellSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.9 17.9 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

function messageHTML(m) {
  const muted = state.muted.has(m.name);
  return `<div class="msg-item${m.pinned ? " pinned" : ""}" onclick="openChat('${esc(m.name)}')">
    ${GROUPS[m.name]
      ? groupAvatarHTML(m.name)
      : `<div class="avatar" style="background:${avatarBg(m.name)}">${esc(m.name[0])}</div>`}
    <div class="msg-body">
      <div class="r1"><span class="mname">${esc(m.name)}${m.pinned ? `<i class="pin-mark">置顶</i>` : ""}${muted ? `<i class="mute-ic" title="免打扰">${muteBellSVG}</i>` : ""}</span><span class="time">${m.time}</span></div>
      <div class="txt">${esc(m.txt)}</div>
    </div>
    <div class="msg-tail">
      ${m.unread ? (muted ? `<div class="mute-dot"></div>` : `<div class="badge">${m.unread}</div>`) : ""}
      <button class="msg-pin${m.pinned ? " on" : ""}" onclick="event.stopPropagation();togglePinMessage('${esc(m.name)}')" aria-label="${m.pinned ? "取消置顶" : "置顶消息"}">${m.pinned ? "取消" : "置顶"}</button>
    </div></div>`;
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

/** 作品详情内播放器：与悬浮播放栏共用同一播放状态。 */
function workAudioPlayerHTML(w) {
  return `<div class="work-player" data-work-player="${w.id}">
    <button class="bigplay" data-play-work="${w.id}" onclick="toggleWorkPlayback(${w.id}, event)" aria-label="播放《${esc(w.title)}》">▶</button>
    <div class="wp-timeline">
      <span class="wp-current">00:00</span>
      <input class="player-seek wp-seek" type="range" min="0" max="100" step="0.1" value="0" aria-label="《${esc(w.title)}》播放进度"
        oninput="seekWorkPlayback(${w.id},this.value,event)" onpointerdown="event.stopPropagation()">
      <span class="wp-duration">${esc(w.dur || "--:--")}</span>
      <button class="wp-stop" data-stop-work="${w.id}" onclick="stopWorkPlayback(${w.id},event)" aria-label="停止播放">■</button>
    </div>
  </div>`;
}

/** 媒体区，与瀑布流封面同样的适配优先级 */
function slideMediaHTML(w) {
  if (w.video) {
    return `<div class="smedia" style="background:${w.cover}">
      <span class="cover-glyph">${esc(w.glyph || "♪")}</span>
      ${w.audio
        ? workAudioPlayerHTML(w)
        : `<button class="bigplay" onclick="event.stopPropagation();toast('Demo：播放视频 ▶')" aria-label="播放视频">▶</button>`}
      <span class="tpl-label">${w.audio ? "视频配乐" : "视频"} · ${w.dur}</span></div>`;
  }
  if (w.cover) {
    return `<div class="smedia" style="background:${w.cover}">
      <span class="cover-glyph">${esc(w.glyph || "♪")}</span>
      ${w.audio
        ? `${workAudioPlayerHTML(w)}<span class="tpl-label">封面 + 音频 · ${w.dur}</span>`
        : ""}</div>`;
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
    ${workAudioPlayerHTML(w)}
    <span class="tpl-label">默认音频模板 · 无封面 · ${w.dur}</span></div>`;
}

const commentBubbleSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9.4 9.4 0 0 1-3.2-.55L4 20l1.45-4.2A7.8 7.8 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z"/></svg>`;

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
    <div class="s-acts">
      <div class="s-act ${state.workLiked.has(w.id) ? "on" : ""}" id="wlike-${w.id}" onclick="toggleWorkLike(${w.id})"><i>${state.workLiked.has(w.id) ? "♥" : "♡"}</i><b>${workLikeCount(w.id)}</b></div>
      <div class="s-act" id="wcmt-${w.id}" onclick="scrollToCmts(${w.id})"><i>${commentBubbleSVG}</i><b>${workCmtsOf(w.id).length}</b></div>
      <div class="s-act" onclick="forwardWork(${w.id})"><i>↻</i><b>转发</b></div>
      <div class="s-act" onclick="openShareWork(${w.id})"><i>↗</i><b>分享</b></div>
    </div>
    <div class="sbtns">
      <button class="btn ghost fav-btn" data-fav="${w.id}" onclick="openFavPick(${w.id})">${isFaved(w.id) ? "已收藏 ♥" : "收藏 ♡"}</button>
      <button class="btn primary" onclick="closeViewer();openCommission('${esc(w.author)}', '${esc(w.title)}')">发起约稿</button>
    </div>
    <div class="s-cmts" id="scmts-${w.id}">
      <div class="work-cmts-head">
        <div><i>${commentBubbleSVG}</i><h4>评论</h4><b id="scmtn-${w.id}">${workCmtsOf(w.id).length}</b></div>
        <span>和大家聊聊这首作品</span>
      </div>
      <div class="work-cmt-composer">
        <div class="avatar" style="background:${avatarBg(state.profile.name || "我")}">${esc((state.profile.name || "我")[0])}</div>
        <input id="wcin-${w.id}" maxlength="100" placeholder="写下你的感受…" onkeydown="if(event.key==='Enter')sendWorkCmt(${w.id})">
        <button onclick="sendWorkCmt(${w.id})" aria-label="发送评论">↑</button>
      </div>
      <div class="work-cmt-list" id="wcl-${w.id}">${workCmtsListHTML(w.id)}</div>
    </div></div>`;
}

const slideHTML = w => `<div class="slide" data-work-id="${w.id}"
  onpointerdown="workSlidePointerDown(${w.id}, event)"
  onpointerup="workSlidePointerUp(${w.id}, event)"
  onpointercancel="workSlidePointerCancel()">${slideMediaHTML(w)}${slideInfoHTML(w)}</div>`;

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
    <section class="de-section">
      <div class="de-section-head"><h4>基本资料</h4><span>发布后仍可编辑</span></div>
      <label for="pubName">企划标题 <b>*</b></label>
      <input id="pubName" maxlength="40" placeholder="填写企划名称">
      <label for="pubDesc">需求描述 <b>*</b></label>
      <textarea id="pubDesc" rows="5" maxlength="500" placeholder="企划背景、风格参考、合作周期等"></textarea>
      <label>企划封面</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="pubPickCover()">上传封面（图片/视频）</div>
        <div class="upload-prev" id="pubCoverPrev" onclick="previewCover()" title="点击查看"></div>
      </div>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>招募设置</h4><span>与编辑企划资料一致</span></div>
      <label>招募状态</label>
      <div class="gender-row" style="flex-wrap:wrap">
        ${["招募中", "暂停招募", "已结束"].map(v => `<div class="chip${v === "招募中" ? " on" : ""}" onclick="pubSetDemandOption('status','${v}',this)">${v}</div>`).join("")}
      </div>
      <label>发起方身份</label>
      <div class="gender-row" style="flex-wrap:wrap">
        ${CONFIG.demandWhoTypes.map(t => `<div class="chip${t === "个人企划" ? " on" : ""}" onclick="pubSetWhoType('${t}', this)">${t}</div>`).join("")}
      </div>
      <label>授权方式</label>
      <div class="gender-row" style="flex-wrap:wrap">
        ${["商业", "非商业", "待定"].map(v => `<div class="chip${v === "待定" ? " on" : ""}" onclick="pubSetDemandOption('demandBiz','${v}',this)">${v}</div>`).join("")}
      </div>
      <label for="pubDemandTags">招募工种与标签</label>
      <input id="pubDemandTags" maxlength="120" placeholder="如：招作曲、古风、原创企划">
      <p class="se-note">可直接填写，也可用下方选项快速添加；发布后会显示为独立标签。</p>
      <label>招募工种（可多选）</label>
      <div class="gender-row" style="flex-wrap:wrap" id="pubRoleRow">
        ${CONFIG.roles.map(r => `<div class="chip" onclick="pubToggleRole('${r}', this)">${r}</div>`).join("")}
        <div class="chip" onclick="pubAddCustomRole(this)">＋ 其他</div>
      </div>
      ${pubTagChipsHTML()}
      <div class="de-two">
        <div><label for="pubPrice">预算</label><input id="pubPrice" maxlength="30" placeholder="如：¥2,000–3,000"></div>
        <div><label for="pubDeadline">招募截止</label><input id="pubDeadline" maxlength="30" placeholder="如：招满即止"></div>
      </div>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>制作信息</h4><span>让报名者快速判断档期</span></div>
      <label for="pubProgress">当前进度</label>
      <input id="pubProgress" maxlength="100" placeholder="如：词曲完成 · 编曲制作中">
      <label for="pubDeliverable">交付内容</label>
      <textarea id="pubDeliverable" rows="3" maxlength="300" placeholder="文件格式、工程文件、修改次数等"></textarea>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>招募要求</h4><span>逐条填写，发布后可增删</span></div>
      <div class="de-list" id="pubRequirements">
        <div class="de-list-row"><input class="pub-demand-req" maxlength="120" placeholder="如：报名请附代表作与近期档期"><button class="de-remove" type="button" onclick="removePubDemandRow(this)" aria-label="删除要求">×</button></div>
      </div>
      <button class="de-add" type="button" onclick="addPubDemandRequirement()">＋ 添加一条要求</button>
    </section>

    <section class="de-section">
      <div class="de-section-head"><h4>成品 / Demo</h4><span>选填，可发布后继续添加</span></div>
      <label>介绍视频 / 参考音频</label>
      <div class="upload-row">
        <div class="upload-btn" onclick="pubPickMedia()">上传小样</div>
        <span class="upload-name" id="pubMediaName" onclick="previewMedia()">未选择文件</span>
      </div>
      <div class="de-list" id="pubSamples">
        <div class="de-list-row de-sample-edit pub-demo-edit" data-sample-id="${Date.now()}">
          <div class="de-sample-top">
            <input class="pub-demo-title" maxlength="60" placeholder="Demo 名称（选填）">
            <button class="de-remove" type="button" onclick="removePubDemandRow(this)" aria-label="删除 Demo">×</button>
          </div>
          <div class="de-sample-meta">
            <input class="pub-demo-type" maxlength="30" value="企划 Demo" placeholder="类型">
            <input class="pub-demo-dur" maxlength="8" placeholder="00:00">
          </div>
        </div>
      </div>
      <button class="de-add" type="button" onclick="addPubDemandSample()">＋ 添加 Demo 信息</button>
      <p class="se-note">上传音频会自动读取时长；仅填写 Demo 名称时会创建站内模拟试听条目。</p>
    </section>`;
}
