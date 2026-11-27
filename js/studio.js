/* ============================================================
 * 造曲台 · 私密音乐项目工作区
 * Inspired by the workflow of modern WIP-music libraries:
 * projects, folders, versions, timestamped notes, share controls,
 * offline pins, upload/record, and a lightweight edit suite.
 * ============================================================ */

const STUDIO_PROJECTS = [
  {
    id: "tide",
    title: "潮汐来信",
    meta: "EP 草稿 · 今天更新",
    color: "ocean",
    private: true,
    folder: "进行中",
    collaborators: ["洛", "陈"],
    description: "主歌已经收稳，等最后一版人声与混音反馈。",
    tracks: [
      { id: "tide-7", title: "潮汐来信", note: "主混音 · 最新", version: 7, duration: 198, added: "12 分钟前", offline: true, plays: 18,
        comments: [
          { id: 1, at: 42, author: "陈末", text: "这里的人声可以再近一点。" },
          { id: 2, at: 76, author: "你", text: "第二遍副歌保留这层和声。" },
          { id: 3, at: 132, author: "小野", text: "鼓组进来的瞬间很舒服。" },
        ],
        versions: [
          { version: 7, label: "mix 07 · vocal up", date: "今天 14:32", current: true },
          { version: 6, label: "mix 06 · new drums", date: "昨天 23:18" },
          { version: 5, label: "rough mix", date: "11 月 23 日" },
        ]
      },
      { id: "tide-inst", title: "潮汐来信 (伴奏)", note: "Instrumental", version: 3, duration: 194, added: "昨天", offline: false, plays: 7, comments: [], versions: [{ version: 3, label: "instrumental 03", date: "昨天", current: true }] },
      { id: "tide-vox", title: "主唱 comp", note: "Vocal stem", version: 4, duration: 186, added: "昨天", offline: false, plays: 4, comments: [], versions: [{ version: 4, label: "vocal comp 04", date: "昨天", current: true }] },
      { id: "tide-demo", title: "最初的手机 Demo", note: "Voice memo", version: 1, duration: 72, added: "11 月 18 日", offline: true, plays: 12, comments: [], versions: [{ version: 1, label: "voice memo", date: "11 月 18 日", current: true }] }
    ]
  },
  {
    id: "night",
    title: "夜航",
    meta: "3 首 Demo · 昨天更新",
    color: "ember",
    private: true,
    folder: "进行中",
    collaborators: ["洛"],
    description: "更暗、更慢一点的夜间试验。",
    tracks: [
      { id: "night-4", title: "Window Seat", note: "Demo · 最新", version: 4, duration: 164, added: "昨天", offline: false, plays: 9, comments: [{ id: 1, at: 28, author: "你", text: "贝斯从这里再留白两拍。" }], versions: [{ version: 4, label: "demo 04", date: "昨天", current: true }, { version: 3, label: "demo 03", date: "11 月 22 日" }] },
      { id: "night-idea", title: "凌晨的和弦", note: "Voice memo", version: 2, duration: 91, added: "11 月 21 日", offline: true, plays: 5, comments: [], versions: [{ version: 2, label: "idea 02", date: "11 月 21 日", current: true }] }
    ]
  },
  {
    id: "garden",
    title: "花与风",
    meta: "单曲企划 · 4 天前更新",
    color: "moss",
    private: false,
    folder: "待发布",
    collaborators: ["洛", "野", "M"],
    description: "等待母带与封面。",
    tracks: [
      { id: "garden-master", title: "花与风", note: "Pre-master", version: 9, duration: 216, added: "4 天前", offline: true, plays: 31, comments: [{ id: 1, at: 109, author: "Mori", text: "桥段的空间感已经对了。" }], versions: [{ version: 9, label: "pre-master 09", date: "4 天前", current: true }, { version: 8, label: "mix 08", date: "11 月 19 日" }] }
    ]
  }
];

const studioState = {
  view: "library",
  libraryTab: "projects",
  projectId: "tide",
  trackId: "tide-7",
  sheet: null,
  search: "__closed",
  playing: false,
  currentTime: 0,
  speed: 1,
  pitch: 0,
  loop: false,
  trimStart: 0,
  trimEnd: 100,
  playerPanel: "edit",
  folders: ["进行中", "待发布", "灵感碎片"],
  uploadMode: "track",
  recording: false,
  recordSeconds: 0,
  projects: STUDIO_PROJECTS,
  share: { access: "link", password: false, download: false, expires: "7 天" }
};

let studioLastFocus = null;
let stCtx = null;
let stSource = null;
let stGain = null;
let stDemoBuffer = null;
let stAudio = null;
let stClock = null;
let stStartedAt = 0;
let stStartOffset = 0;
let stRecorder = null;
let stRecordStream = null;
let stRecordChunks = [];
let stRecordClock = null;

function stEsc(value) {
  return String(value == null ? "" : value).replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}

function stToast(message) {
  if (typeof toast === "function") toast(message);
}

function stIcon(name, size = 20) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const paths = {
    close: `<path d="m6 6 12 12M18 6 6 18"/>`,
    back: `<path d="m15 18-6-6 6-6"/>`,
    search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>`,
    plus: `<path d="M12 5v14M5 12h14"/>`,
    dots: `<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>`,
    lock: `<rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10"/>`,
    share: `<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.8 7.4-4.5M8.3 13.2l7.4 4.5"/>`,
    folder: `<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5z"/>`,
    library: `<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 4v16M12 8h5M12 12h5M12 16h3"/>`,
    inbox: `<path d="M4 5h16l-1 14H5z"/><path d="M4.5 14h4l1.5 2h4l1.5-2h4"/>`,
    download: `<path d="M12 3v12m-4-4 4 4 4-4M5 20h14"/>`,
    user: `<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>`,
    play: `<path d="m9 6 10 6-10 6z" fill="currentColor" stroke="none"/>`,
    pause: `<path d="M9 6v12M15 6v12" stroke-width="2.5"/>`,
    prev: `<path d="M7 6v12M18 6l-8 6 8 6z" fill="currentColor" stroke="none"/>`,
    next: `<path d="M17 6v12M6 6l8 6-8 6z" fill="currentColor" stroke="none"/>`,
    comment: `<path d="M20 15a4 4 0 0 1-4 4H8l-4 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z"/>`,
    versions: `<path d="M6 7h12M6 12h12M6 17h8"/><circle cx="3" cy="7" r=".8" fill="currentColor"/><circle cx="3" cy="12" r=".8" fill="currentColor"/><circle cx="3" cy="17" r=".8" fill="currentColor"/>`,
    sliders: `<path d="M4 7h8M16 7h4M4 17h4M12 17h8"/><circle cx="14" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>`,
    mic: `<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>`,
    upload: `<path d="M12 16V4m-4 4 4-4 4 4M5 20h14"/>`,
    wifiOff: `<path d="m3 3 18 18M8.5 8.5A8.5 8.5 0 0 1 20 9M5 9a10.5 10.5 0 0 1 1.6-1.2M8 13a6 6 0 0 1 5.5-1.4M12 18h.01"/>`,
    chevron: `<path d="m9 18 6-6-6-6"/>`,
    copy: `<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>`,
    spark: `<path d="m12 3 1.3 4.7L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.3zM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z"/>`,
    check: `<path d="m5 12 4 4L19 6"/>`,
    trash: `<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/>`,
    stop: `<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none"/>`
  };
  return `<svg ${common}>${paths[name] || paths.dots}</svg>`;
}

function stProject(id = studioState.projectId) {
  return studioState.projects.find(project => project.id === id) || studioState.projects[0];
}

function stTrack(id = studioState.trackId) {
  for (const project of studioState.projects) {
    const track = project.tracks.find(item => item.id === id);
    if (track) return track;
  }
  return stProject()?.tracks[0];
}

function stTrackProject(id = studioState.trackId) {
  return studioState.projects.find(project => project.tracks.some(track => track.id === id)) || stProject();
}

function stFormatTime(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function stWave(seed, count = 64) {
  let code = 0;
  for (let i = 0; i < String(seed).length; i++) code = (code * 31 + String(seed).charCodeAt(i)) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    const pulse = Math.abs(Math.sin(index * .63 + code * .0007));
    const phrase = .38 + .62 * Math.abs(Math.sin(index * .14 + code * .00011));
    return Math.round(15 + 73 * pulse * phrase);
  });
}

function stWaveHTML(track, count = 64, interactive = false) {
  const bars = stWave(track.id, count).map(height => `<i style="--h:${height}%"></i>`).join("");
  return `<div class="st-wave ${interactive ? "is-interactive" : ""}" style="--progress:${Math.min(100, (studioState.currentTime / Math.max(1, track.duration)) * 100)}%" ${interactive ? 'onclick="studioSeekFromEvent(event)" role="slider" tabindex="0" aria-label="播放进度"' : ""}>${bars}</div>`;
}

function stCover(project, className = "") {
  return `<div class="st-cover st-cover-${project.color} ${className}" aria-hidden="true"><span></span><i></i><b>曲</b></div>`;
}

function openStudio() {
  studioLastFocus = document.activeElement;
  if (typeof playerState !== "undefined" && playerState.playing && typeof togglePlayerPlayback === "function") togglePlayerPlayback();
  const overlay = document.getElementById("studio");
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  renderStudio();
  setTimeout(() => overlay.querySelector("button")?.focus(), 30);
}

function closeStudio() {
  studioPausePlayback();
  studioStopRecording(true);
  const overlay = document.getElementById("studio");
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
  studioLastFocus?.focus?.();
}

function completeStudio() {
  closeStudio();
  stToast("造曲台已保存本次进度");
}

function renderStudio() {
  const app = document.getElementById("studioApp");
  if (!app) return;
  let content = "";
  if (studioState.view === "project") content = stProjectView();
  else if (studioState.view === "player") content = stPlayerView();
  else if (studioState.view === "inbox") content = stInboxView();
  else if (studioState.view === "offline") content = stOfflineView();
  else content = stLibraryView();
  app.innerHTML = `<main class="st-shell ${studioState.view === "player" ? "st-shell-player" : ""}">${content}${stBottomNav()}</main>${stSheetView()}`;
  requestAnimationFrame(studioUpdatePlayerDOM);
}

function stTopBar(title, backAction = "closeStudio()", actions = "") {
  return `<header class="st-header">
    <button class="st-icon-btn" onclick="${backAction}" aria-label="返回">${stIcon(backAction.includes("closeStudio") ? "close" : "back", 21)}</button>
    <div class="st-header-title">${title}</div>
    <div class="st-header-actions">${actions}</div>
  </header>`;
}

function stLibraryView() {
  const query = studioState.search === "__closed" ? "" : studioState.search.trim().toLowerCase();
  const projects = studioState.projects.filter(project => !query || project.title.toLowerCase().includes(query) || project.tracks.some(track => track.title.toLowerCase().includes(query)));
  const body = studioState.libraryTab === "folders" ? stFolderList() : studioState.libraryTab === "shared" ? stSharedList() : stProjectList(projects);
  return `
    ${stTopBar('<span class="st-wordmark">[ 造曲台 ]</span>', "closeStudio()", `<button class="st-icon-btn" onclick="studioToggleSearch()" aria-label="搜索">${stIcon("search")}</button><button class="st-add-btn" onclick="studioOpenSheet('add')" aria-label="添加">${stIcon("plus")}</button>`)}
    <section class="st-library-head">
      <div><span>你的音乐草稿库</span><h1>还没完成，也值得被好好收着。</h1></div>
      <div class="st-sync"><i></i> 已同步</div>
    </section>
    ${studioState.search !== "__closed" ? `<label class="st-search"><span>${stIcon("search",18)}</span><input value="${stEsc(studioState.search === "__closed" ? "" : studioState.search)}" oninput="studioSearch(this.value)" placeholder="搜索项目或音轨" autofocus><button onclick="studioToggleSearch()">${stIcon("close",17)}</button></label>` : ""}
    <nav class="st-segment" aria-label="资料库分类">
      ${[["projects","项目"],["folders","文件夹"],["shared","分享中"]].map(([key,label]) => `<button class="${studioState.libraryTab === key ? "on" : ""}" onclick="studioSetLibraryTab('${key}')">${label}</button>`).join("")}
    </nav>
    <section class="st-scroll st-library-body">
      ${body}
      <div class="st-safe-note">${stIcon("lock",14)} <span>草稿默认为私密，只有你明确分享的人能访问。</span></div>
    </section>`;
}

function stProjectList(projects) {
  if (!projects.length) return `<div class="st-empty"><b>没有找到这个项目</b><span>换个关键词，或新建一个空项目。</span></div>`;
  const featured = projects[0];
  return `
    <div class="st-section-line"><h2>最近打开</h2><span>${projects.length} 个项目</span></div>
    <article class="st-featured" data-st-search="${stEsc(featured.title.toLowerCase())}" onclick="studioOpenProject('${featured.id}')">
      ${stCover(featured, "st-featured-cover")}
      <div class="st-featured-copy"><span class="st-eyebrow">继续创作</span><h3>${stEsc(featured.title)}</h3><p>${stEsc(featured.description)}</p><div><b>${featured.tracks.length} 首</b><span>更新于 ${featured.tracks[0]?.added || "刚刚"}</span></div></div>
      <button onclick="event.stopPropagation();studioPlayProject('${featured.id}')" aria-label="播放项目">${stIcon("play",18)}</button>
    </article>
    <div class="st-section-line st-all-line"><h2>全部项目</h2><button onclick="studioOpenSheet('sort')">最近更新⌄</button></div>
    <div class="st-project-list">
      ${projects.map(project => `<article class="st-project-row" data-st-search="${stEsc(`${project.title} ${project.tracks.map(track => track.title).join(" ")}`.toLowerCase())}" onclick="studioOpenProject('${project.id}')">
        ${stCover(project, "st-project-thumb")}
        <div class="st-project-copy"><h3>${stEsc(project.title)}</h3><p>${stEsc(project.meta)}</p><span>${project.private ? stIcon("lock",12) + " 仅自己" : stIcon("share",12) + " 已分享"}</span></div>
        <div class="st-avatar-stack">${project.collaborators.slice(0,3).map(name => `<i>${stEsc(name)}</i>`).join("")}</div>
        <button onclick="event.stopPropagation();studioOpenProjectMenu('${project.id}')" aria-label="项目菜单">${stIcon("dots",18)}</button>
      </article>`).join("")}
    </div>`;
}

function stFolderList() {
  return `<div class="st-section-line"><h2>文件夹</h2><span>${studioState.folders.length} 个</span></div>
    <div class="st-folder-grid">
      ${studioState.folders.map((folder, index) => {
        const items = studioState.projects.filter(project => project.folder === folder);
        return `<button onclick="studioOpenFolder('${stEsc(folder)}')"><span class="st-folder-icon tone-${index % 3}">${stIcon("folder",25)}</span><b>${stEsc(folder)}</b><small>${items.length} 个项目</small></button>`;
      }).join("")}
      <button class="st-new-folder" onclick="studioOpenSheet('folder')"><span class="st-folder-icon">${stIcon("plus",24)}</span><b>新建文件夹</b><small>整理你的灵感</small></button>
    </div>`;
}

function stSharedList() {
  const projects = studioState.projects.filter(project => !project.private);
  return `<div class="st-section-line"><h2>正在分享</h2><span>链接访问记录</span></div>
    ${projects.map(project => `<article class="st-share-card" onclick="studioOpenProject('${project.id}')">${stCover(project,"st-share-cover")}<div><h3>${stEsc(project.title)}</h3><p>7 天内 · 12 位听众 · 38 次播放</p><span><i></i> 链接有效</span></div>${stIcon("chevron",18)}</article>`).join("")}
    <div class="st-listen-card"><span>${stIcon("user",22)}</span><div><b>小野刚刚收听了《花与风》</b><small>听到了 2:41 · 8 分钟前</small></div></div>`;
}

function stProjectView() {
  const project = stProject();
  if (!project) return "";
  const trackRows = project.tracks.map((track, index) => stTrackRow(track, index)).join("");
  return `
    ${stTopBar("项目", "studioGoLibrary()", `<button class="st-icon-btn" onclick="studioOpenProjectMenu('${project.id}')">${stIcon("dots")}</button>`)}
    <section class="st-scroll st-project-view">
      <div class="st-project-hero">
        ${stCover(project,"st-project-cover")}
        <div class="st-project-label">${project.private ? `${stIcon("lock",12)} 私密项目` : `${stIcon("share",12)} 通过链接分享`}</div>
        <h1>${stEsc(project.title)}</h1>
        <p>${stEsc(project.description)}</p>
        <div class="st-project-people"><div class="st-avatar-stack">${project.collaborators.map(name => `<i>${stEsc(name)}</i>`).join("")}</div><span>${project.collaborators.length > 1 ? `${project.collaborators.length} 位协作者` : "仅你可见"}</span></div>
        <div class="st-project-actions">
          <button class="st-primary-action" onclick="studioPlayProject('${project.id}')">${stIcon("play",17)} 播放全部</button>
          <button onclick="studioOpenSheet('share')">${stIcon("share",17)} 分享</button>
        </div>
      </div>
      <div class="st-track-heading"><h2>音轨 <span>${project.tracks.length}</span></h2><button onclick="studioChooseFiles('track')">${stIcon("plus",16)} 添加音乐</button></div>
      <div class="st-track-list">${trackRows}</div>
      <button class="st-drop-zone" onclick="studioChooseFiles('track')">${stIcon("upload",18)}<span><b>导入音频</b><small>支持 MP3、WAV、M4A</small></span></button>
    </section>
    ${studioState.playing || studioState.currentTime > 0 ? stMiniPlayer() : ""}`;
}

function stTrackRow(track, index) {
  const active = studioState.trackId === track.id && studioState.playing;
  return `<article class="st-track-row" onclick="studioOpenTrack('${track.id}')">
    <button class="st-track-play ${active ? "on" : ""}" onclick="event.stopPropagation();studioQuickPlay('${track.id}')" aria-label="${active ? "暂停" : "播放"}">${stIcon(active ? "pause" : "play",15)}</button>
    <div class="st-track-number">${String(index + 1).padStart(2,"0")}</div>
    <div class="st-track-main"><h3>${stEsc(track.title)}</h3><p><span>v${track.version}</span> ${stEsc(track.note)} · ${stFormatTime(track.duration)}</p><div>${stWaveHTML(track,32)}</div></div>
    <div class="st-track-state">${track.offline ? stIcon("download",14) : ""}<small>${track.comments?.length ? `${track.comments.length} 条注释` : track.added}</small></div>
    <button class="st-track-more" onclick="event.stopPropagation();studioOpenTrackMenu('${track.id}')">${stIcon("dots",17)}</button>
  </article>`;
}

function stPlayerView() {
  const track = stTrack();
  const project = stTrackProject();
  if (!track || !project) return "";
  return `
    ${stTopBar(stEsc(project.title), "studioBackToProject()", `<button class="st-icon-btn" onclick="studioOpenTrackMenu('${track.id}')">${stIcon("dots")}</button>`)}
    <section class="st-scroll st-player-view">
      <div class="st-player-art-wrap">${stCover(project,"st-player-art")}<span>${track.offline ? `${stIcon("download",12)} 离线可用` : "已安全同步"}</span></div>
      <div class="st-player-meta"><div><span>${stEsc(project.title)}</span><h1>${stEsc(track.title)}</h1><p>${stEsc(track.note)} · ${track.plays || 0} 次播放</p></div><button onclick="studioOpenSheet('versions')">v${track.version} ${stIcon("chevron",14)}</button></div>
      <div class="st-wave-wrap">
        ${stWaveHTML(track,76,true)}
        <div class="st-time-row"><span class="st-current-time">${stFormatTime(studioState.currentTime)}</span><span>-${stFormatTime(Math.max(0, track.duration - studioState.currentTime))}</span></div>
      </div>
      <div class="st-transport">
        <button onclick="studioPreviousTrack()" aria-label="上一首">${stIcon("prev",23)}</button>
        <button class="st-main-play ${studioState.playing ? "on" : ""}" onclick="studioTogglePlayback()" aria-label="${studioState.playing ? "暂停" : "播放"}">${stIcon(studioState.playing ? "pause" : "play",25)}</button>
        <button onclick="studioNextTrack()" aria-label="下一首">${stIcon("next",23)}</button>
      </div>
      <div class="st-quick-tools">
        <button onclick="studioNudgePitch()"><span>${studioState.pitch > 0 ? "+" : ""}${studioState.pitch}</span><small>移调</small></button>
        <button onclick="studioCycleSpeed()"><span>${studioState.speed.toFixed(2)}×</span><small>速度</small></button>
        <button class="${studioState.loop ? "on" : ""}" onclick="studioToggleLoop()"><span>↻</span><small>循环</small></button>
        <button onclick="studioToggleOffline('${track.id}')"><span>${track.offline ? "✓" : "↓"}</span><small>离线</small></button>
      </div>
      <nav class="st-player-tabs">
        ${[["edit","编辑"],["comments",`注释 ${track.comments?.length || 0}`],["info","信息"]].map(([key,label]) => `<button class="${studioState.playerPanel === key ? "on" : ""}" onclick="studioSetPlayerPanel('${key}')">${label}</button>`).join("")}
      </nav>
      <div class="st-player-panel">${stPlayerPanel(track)}</div>
    </section>`;
}

function stPlayerPanel(track) {
  if (studioState.playerPanel === "comments") {
    return `<div class="st-comment-head"><span>在具体时间点留下反馈</span><button onclick="studioOpenSheet('comment')">${stIcon("plus",15)} 添加注释</button></div>
      <div class="st-comments">${track.comments?.length ? track.comments.map(comment => `<button onclick="studioSeek(${comment.at})"><time>${stFormatTime(comment.at)}</time><span><b>${stEsc(comment.author)}</b><p>${stEsc(comment.text)}</p></span></button>`).join("") : `<div class="st-empty small"><b>还没有注释</b><span>播放到某处时，记录你的第一反应。</span></div>`}</div>`;
  }
  if (studioState.playerPanel === "info") {
    return `<div class="st-info-grid"><div><span>格式</span><b>${track.fileUrl ? "导入音频" : "WAV · 24 bit"}</b></div><div><span>时长</span><b>${stFormatTime(track.duration)}</b></div><div><span>版本</span><b>v${track.version}</b></div><div><span>添加于</span><b>${stEsc(track.added)}</b></div></div><label class="st-note-field"><span>音轨笔记</span><textarea placeholder="歌词、混音想法或待办…">${stEsc(track.note || "")}</textarea></label>`;
  }
  return `<div class="st-edit-suite">
    <div class="st-edit-title"><span>${stIcon("sliders",18)} 快速试听</span><small>不会修改原文件</small></div>
    <label><span><b>移调</b><em>${studioState.pitch > 0 ? "+" : ""}${studioState.pitch} 半音</em></span><input type="range" min="-12" max="12" step="1" value="${studioState.pitch}" oninput="studioSetPitch(this.value)"></label>
    <label><span><b>速度</b><em>${studioState.speed.toFixed(2)}×</em></span><input type="range" min="0.5" max="1.5" step="0.05" value="${studioState.speed}" oninput="studioSetSpeed(this.value)"></label>
    <div class="st-edit-buttons"><button onclick="studioToggleLoop()" class="${studioState.loop ? "on" : ""}">↻ 片段循环</button><button onclick="studioOpenSheet('stems')">${stIcon("spark",15)} 分离音轨</button></div>
    <div class="st-trim-row"><span><b>试听区间</b><em>${studioState.trimStart}% — ${studioState.trimEnd}%</em></span><div><input type="range" min="0" max="90" value="${studioState.trimStart}" oninput="studioSetTrim('start',this.value)"><input type="range" min="10" max="100" value="${studioState.trimEnd}" oninput="studioSetTrim('end',this.value)"></div></div>
  </div>`;
}

function stMiniPlayer() {
  const track = stTrack();
  const project = stTrackProject();
  return `<div class="st-mini-player" onclick="studioOpenTrack('${track.id}')">${stCover(project,"st-mini-cover")}<div><b>${stEsc(track.title)}</b><span>${stEsc(project.title)} · <i class="st-current-time">${stFormatTime(studioState.currentTime)}</i></span></div><button onclick="event.stopPropagation();studioTogglePlayback()">${stIcon(studioState.playing ? "pause" : "play",18)}</button></div>`;
}

function stInboxView() {
  return `${stTopBar("协作收件箱", "studioGoLibrary()", `<button class="st-icon-btn" onclick="studioOpenSheet('add')">${stIcon("plus")}</button>`)}
    <section class="st-scroll st-inbox-view"><div class="st-view-intro"><span>2 个新动态</span><h1>一起把歌做完</h1><p>项目邀请、时间点反馈和收听动态都在这里。</p></div>
    <div class="st-inbox-list">
      <article><span class="st-inbox-avatar violet">野</span><div><h3>小野邀请你加入「雨季练习」</h3><p>“想请你听一下第二段和声。”</p><small>8 分钟前</small><div><button onclick="this.closest('article').classList.add('accepted');stToast('已加入项目')">接受</button><button onclick="this.closest('article').remove()">稍后</button></div></div></article>
      <article><span class="st-inbox-avatar blue">陈</span><div><h3>陈末在 1:16 留了注释</h3><p>潮汐来信 · “第二遍副歌保留这层和声。”</p><small>22 分钟前</small><div><button onclick="studioOpenTrack('tide-7');studioSeek(76)">去听</button></div></div></article>
      <article><span class="st-inbox-avatar green">M</span><div><h3>Mori 听完了「花与风」</h3><p>完整播放 · 3 次重复收听</p><small>昨天</small></div></article>
    </div></section>`;
}

function stOfflineView() {
  const tracks = studioState.projects.flatMap(project => project.tracks.map(track => ({ track, project }))).filter(item => item.track.offline);
  return `${stTopBar("离线音乐", "studioGoLibrary()", `<span class="st-header-count">${tracks.length} 首</span>`)}
    <section class="st-scroll st-offline-view"><div class="st-offline-hero">${stIcon("wifiOff",30)}<div><h1>没有网络，也不会断掉灵感。</h1><p>以下音轨已经保存在这台设备上。</p></div></div>
    <div class="st-track-list">${tracks.map((item,index) => stTrackRow(item.track,index)).join("")}</div></section>
    ${studioState.playing || studioState.currentTime > 0 ? stMiniPlayer() : ""}`;
}

function stBottomNav() {
  if (studioState.view === "player" || studioState.view === "project") return "";
  const current = studioState.view;
  return `<nav class="st-bottom-nav">
    <button class="${current === "library" ? "on" : ""}" onclick="studioNavTo('library')">${stIcon("library",19)}<span>资料库</span></button>
    <button class="${current === "inbox" ? "on" : ""}" onclick="studioNavTo('inbox')"><i class="st-nav-dot"></i>${stIcon("inbox",19)}<span>协作</span></button>
    <button class="st-nav-create" onclick="studioOpenSheet('add')">${stIcon("plus",22)}</button>
    <button class="${current === "offline" ? "on" : ""}" onclick="studioNavTo('offline')">${stIcon("download",19)}<span>离线</span></button>
    <button onclick="stToast('个人工作区设置将在下一版开放')">${stIcon("user",19)}<span>我的</span></button>
  </nav>`;
}

function stSheetView() {
  const type = studioState.sheet;
  if (!type) return "";
  let title = "";
  let body = "";
  if (type === "add") {
    title = "添加到造曲台";
    body = `<div class="st-action-grid">
      <button onclick="studioChooseFiles('track')"><span class="blue">${stIcon("upload",22)}</span><b>导入音频</b><small>从文件选择 Demo 或 stems</small></button>
      <button onclick="studioOpenSheet('record')"><span class="red">${stIcon("mic",22)}</span><b>录下灵感</b><small>随时捕捉旋律和歌词</small></button>
      <button onclick="studioOpenSheet('project')"><span class="violet">${stIcon("library",22)}</span><b>新建项目</b><small>把多个版本放在一起</small></button>
      <button onclick="studioOpenSheet('folder')"><span class="green">${stIcon("folder",22)}</span><b>新建文件夹</b><small>整理不同阶段的创作</small></button>
    </div>`;
  } else if (type === "project") {
    title = "新建项目";
    body = `<div class="st-form"><label><span>项目名称</span><input id="stProjectName" placeholder="例如：下一张 EP" maxlength="24"></label><label><span>放入文件夹</span><select id="stProjectFolder">${studioState.folders.map(folder => `<option>${stEsc(folder)}</option>`).join("")}</select></label><p>${stIcon("lock",14)} 新项目默认为私密</p><button class="st-sheet-primary" onclick="studioCreateProject()">创建项目</button></div>`;
  } else if (type === "folder") {
    title = "新建文件夹";
    body = `<div class="st-form"><label><span>文件夹名称</span><input id="stFolderName" placeholder="例如：等待反馈" maxlength="18"></label><button class="st-sheet-primary" onclick="studioCreateFolder()">创建文件夹</button></div>`;
  } else if (type === "share") {
    const project = stProject();
    title = `分享「${stEsc(project.title)}」`;
    body = `<div class="st-share-sheet">
      <div class="st-link-box"><span>qujing.cn/s/${project.id}-28F</span><button onclick="studioCopyLink()">${stIcon("copy",16)} 复制</button></div>
      <div class="st-option-group"><button onclick="studioSetShareAccess('invite')"><span>${stIcon("lock",18)}<i><b>仅受邀的人</b><small>必须登录并接受邀请</small></i></span><em class="st-radio ${studioState.share.access === "invite" ? "on" : ""}"></em></button><button onclick="studioSetShareAccess('link')"><span>${stIcon("share",18)}<i><b>任何持链接的人</b><small>无需登录即可收听</small></i></span><em class="st-radio ${studioState.share.access === "link" ? "on" : ""}"></em></button></div>
      ${stToggleRow("链接密码", "开启后需输入密码", studioState.share.password, "studioToggleShare('password')")}
      ${stToggleRow("允许下载", "听众可以保存原音频", studioState.share.download, "studioToggleShare('download')")}
      <button class="st-select-row" onclick="studioCycleExpiry()"><span><b>链接有效期</b><small>到期后链接自动失效</small></span><em>${studioState.share.expires} ${stIcon("chevron",14)}</em></button>
      <button class="st-sheet-primary" onclick="studioSaveShare()">保存分享设置</button>
    </div>`;
  } else if (type === "versions") {
    const track = stTrack();
    title = "版本历史";
    body = `<div class="st-version-list">${(track.versions || []).map(version => `<button class="${version.current ? "current" : ""}" onclick="studioUseVersion(${version.version})"><span>v${version.version}</span><i><b>${stEsc(version.label)}</b><small>${stEsc(version.date)}</small></i>${version.current ? `<em>${stIcon("check",15)} 当前</em>` : `<em>切换</em>`}</button>`).join("")}</div><button class="st-outline-wide" onclick="studioChooseFiles('version')">${stIcon("upload",17)} 上传新版本</button>`;
  } else if (type === "comment") {
    title = `在 ${stFormatTime(studioState.currentTime)} 留下注释`;
    body = `<div class="st-form st-comment-form"><label><span>你的反馈</span><textarea id="stCommentText" placeholder="这里的人声、编曲或情绪怎么样？" maxlength="140"></textarea></label><p>注释会固定在当前播放时间点。</p><button class="st-sheet-primary" onclick="studioAddComment()">发布注释</button></div>`;
  } else if (type === "stems") {
    title = "分离音轨";
    body = `<div class="st-stems"><div class="st-ai-note">${stIcon("spark",18)} <span><b>试听级分轨</b><small>调整各部分音量，快速检查混音关系。</small></span></div>${[["人声",86],["鼓组",74],["贝斯",67],["其他",81]].map(([name,value]) => `<label><span><b>${name}</b><em>${value}%</em></span><input type="range" min="0" max="100" value="${value}" oninput="this.previousElementSibling.querySelector('em').textContent=this.value+'%'" /></label>`).join("")}<button class="st-sheet-primary" onclick="studioCloseSheet();stToast('分轨试听设置已应用')">应用到试听</button></div>`;
  } else if (type === "record") {
    title = "录下灵感";
    body = `<div class="st-record-sheet"><div class="st-record-time" id="stRecordTime">${stFormatTime(studioState.recordSeconds)}</div><div class="st-record-wave ${studioState.recording ? "on" : ""}">${Array.from({length:24},(_,i)=>`<i style="--delay:${i * -0.06}s"></i>`).join("")}</div><button class="st-record-button ${studioState.recording ? "on" : ""}" onclick="${studioState.recording ? "studioStopRecording()" : "studioStartRecording()"}">${stIcon(studioState.recording ? "stop" : "mic",26)}</button><p>${studioState.recording ? "正在录音 · 再按一次完成" : "点击开始，录音会加入当前项目"}</p></div>`;
  } else if (type === "trackMenu") {
    const track = stTrack();
    title = stEsc(track.title);
    body = `<div class="st-menu-list"><button onclick="studioOpenSheet('versions')">${stIcon("versions",19)}<span><b>版本历史</b><small>${track.versions?.length || 1} 个版本</small></span>${stIcon("chevron",16)}</button><button onclick="studioToggleOffline('${track.id}');studioCloseSheet()">${stIcon("download",19)}<span><b>${track.offline ? "移除离线下载" : "离线保存"}</b><small>无网络时也能收听</small></span></button><button onclick="studioChooseFiles('version')">${stIcon("upload",19)}<span><b>上传新版本</b><small>保留完整版本历史</small></span></button><button class="danger" onclick="studioDeleteTrack('${track.id}')">${stIcon("trash",19)}<span><b>删除音轨</b><small>仅从本次体验移除</small></span></button></div>`;
  } else if (type === "projectMenu") {
    const project = stProject();
    title = stEsc(project.title);
    body = `<div class="st-menu-list"><button onclick="studioCloseSheet();studioOpenSheet('share')">${stIcon("share",19)}<span><b>分享与权限</b><small>${project.private ? "当前仅自己可见" : "链接正在生效"}</small></span>${stIcon("chevron",16)}</button><button onclick="studioPlayProject('${project.id}');studioCloseSheet()">${stIcon("play",19)}<span><b>从头播放</b><small>${project.tracks.length} 首音轨</small></span></button><button onclick="studioToggleProjectPrivacy('${project.id}')">${stIcon("lock",19)}<span><b>${project.private ? "设为链接分享" : "设为私密"}</b><small>随时可以再次更改</small></span></button></div>`;
  } else if (type === "sort") {
    title = "项目排序";
    body = `<div class="st-menu-list st-sort-menu"><button onclick="studioSortProjects('recent')"><span><b>最近更新</b></span>${stIcon("check",16)}</button><button onclick="studioSortProjects('name')"><span><b>按名称</b></span></button><button onclick="studioSortProjects('tracks')"><span><b>音轨数量</b></span></button></div>`;
  }
  return `<div class="st-sheet-mask" onclick="if(event.target===this)studioCloseSheet()"><section class="st-sheet" role="dialog" aria-modal="true"><div class="st-sheet-handle"></div><header><h2>${title}</h2><button onclick="studioCloseSheet()">${stIcon("close",20)}</button></header><div class="st-sheet-body">${body}</div></section></div>`;
}

function stToggleRow(title, detail, on, action) {
  return `<button class="st-toggle-row" onclick="${action}"><span><b>${title}</b><small>${detail}</small></span><i class="st-switch ${on ? "on" : ""}"><em></em></i></button>`;
}

/* ---------------- Navigation and library ---------------- */

function studioGoLibrary() { studioState.view = "library"; studioState.sheet = null; renderStudio(); }
function studioNavTo(view) { studioState.view = view; studioState.sheet = null; renderStudio(); }
function studioSetLibraryTab(tab) { studioState.libraryTab = tab; renderStudio(); }
function studioSearch(value) {
  studioState.search = value;
  const query = value.trim().toLowerCase();
  document.querySelectorAll("#studio [data-st-search]").forEach(item => {
    item.hidden = Boolean(query) && !item.dataset.stSearch.includes(query);
  });
}
function studioToggleSearch() { studioState.search = studioState.search === "__closed" ? "" : "__closed"; renderStudio(); }

function studioOpenProject(id) {
  studioState.projectId = id;
  const project = stProject(id);
  if (project?.tracks[0] && project.tracks[0].id !== studioState.trackId) studioSelectTrack(project.tracks[0].id);
  else if (!project?.tracks.length) {
    studioPausePlayback();
    studioState.trackId = "";
    studioState.currentTime = 0;
  }
  studioState.view = "project";
  studioState.sheet = null;
  renderStudio();
}

function studioBackToProject() {
  studioState.projectId = stTrackProject()?.id || studioState.projectId;
  studioState.view = "project";
  renderStudio();
}

function studioOpenTrack(id) {
  const changed = studioState.trackId !== id;
  if (changed) studioSelectTrack(id);
  studioState.projectId = stTrackProject(id).id;
  studioState.view = "player";
  studioState.playerPanel = "edit";
  studioState.sheet = null;
  renderStudio();
}

function studioOpenFolder(folder) {
  const project = studioState.projects.find(item => item.folder === folder);
  if (project) studioOpenProject(project.id);
  else stToast("这个文件夹还是空的");
}

function studioOpenSheet(type) { studioState.sheet = type; renderStudio(); }
function studioCloseSheet() { if (studioState.recording) studioStopRecording(true); studioState.sheet = null; renderStudio(); }
function studioOpenTrackMenu(id) { studioState.trackId = id; studioState.projectId = stTrackProject(id).id; studioOpenSheet("trackMenu"); }
function studioOpenProjectMenu(id) { studioState.projectId = id; studioOpenSheet("projectMenu"); }

function studioCreateProject() {
  const name = document.getElementById("stProjectName")?.value.trim();
  const folder = document.getElementById("stProjectFolder")?.value || studioState.folders[0];
  if (!name) return stToast("先给项目起个名字");
  const id = `project-${Date.now()}`;
  studioState.projects.unshift({ id, title: name, meta: "空项目 · 刚刚创建", color: ["ocean","ember","moss"][studioState.projects.length % 3], private: true, folder, collaborators: ["我"], description: "从第一段灵感开始。", tracks: [] });
  studioState.projectId = id;
  studioState.sheet = null;
  studioState.view = "project";
  renderStudio();
  stToast("新项目已创建");
}

function studioCreateFolder() {
  const name = document.getElementById("stFolderName")?.value.trim();
  if (!name) return stToast("先输入文件夹名称");
  if (studioState.folders.includes(name)) return stToast("这个文件夹已经存在");
  studioState.folders.push(name);
  studioState.sheet = null;
  studioState.libraryTab = "folders";
  renderStudio();
}

function studioSortProjects(mode) {
  if (mode === "name") studioState.projects.sort((a,b) => a.title.localeCompare(b.title,"zh-CN"));
  if (mode === "tracks") studioState.projects.sort((a,b) => b.tracks.length - a.tracks.length);
  studioState.sheet = null;
  renderStudio();
}

function studioToggleProjectPrivacy(id) {
  const project = stProject(id);
  project.private = !project.private;
  project.meta = project.meta.replace(/ · .*$/, project.private ? " · 私密" : " · 已分享");
  studioState.sheet = null;
  renderStudio();
  stToast(project.private ? "项目已设为私密" : "分享链接已开启");
}

/* ---------------- Upload and recording ---------------- */

function studioChooseFiles(mode = "track") {
  studioState.uploadMode = mode;
  const input = document.getElementById("stAudioFile");
  if (!input) return;
  input.multiple = mode !== "version";
  input.value = "";
  input.click();
}

function studioHandleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (studioState.uploadMode === "version") {
    const track = stTrack();
    const file = files[0];
    if (track.fileUrl) URL.revokeObjectURL(track.fileUrl);
    track.fileUrl = URL.createObjectURL(file);
    track.version = Math.max(track.version, ...(track.versions || []).map(version => version.version)) + 1;
    track.versions = track.versions || [];
    track.versions.forEach(version => version.current = false);
    track.versions.unshift({ version: track.version, label: file.name.replace(/\.[^.]+$/, ""), date: "刚刚", current: true });
    track.added = "刚刚";
    stReadDuration(track);
    studioState.sheet = null;
    renderStudio();
    return stToast(`已更新到 v${track.version}，旧版本仍可随时切回`);
  }
  let project = stProject();
  if (!project) project = studioState.projects[0];
  files.forEach((file, index) => {
    const id = `upload-${Date.now()}-${index}`;
    const track = { id, title: file.name.replace(/\.[^.]+$/, ""), note: "刚刚导入", version: 1, duration: 180, added: "刚刚", offline: true, plays: 0, comments: [], versions: [{ version: 1, label: file.name, date: "刚刚", current: true }], fileUrl: URL.createObjectURL(file) };
    project.tracks.unshift(track);
    stReadDuration(track);
    studioState.trackId = id;
  });
  studioState.projectId = project.id;
  studioState.view = "project";
  studioState.sheet = null;
  renderStudio();
  stToast(`${files.length} 个音频已加入「${project.title}」`);
}

function stReadDuration(track) {
  const probe = new Audio(track.fileUrl);
  probe.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(probe.duration)) track.duration = Math.round(probe.duration);
    if (document.getElementById("studio")?.classList.contains("show")) renderStudio();
  }, { once: true });
}

async function studioStartRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return stToast("当前环境暂不支持麦克风录音");
  try {
    stRecordStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stRecorder = new MediaRecorder(stRecordStream);
    stRecordChunks = [];
    studioState.recordSeconds = 0;
    stRecorder.ondataavailable = event => { if (event.data.size) stRecordChunks.push(event.data); };
    stRecorder.onstop = stFinishRecording;
    stRecorder.start();
    studioState.recording = true;
    clearInterval(stRecordClock);
    stRecordClock = setInterval(() => {
      studioState.recordSeconds += 1;
      const timer = document.getElementById("stRecordTime");
      if (timer) timer.textContent = stFormatTime(studioState.recordSeconds);
    }, 1000);
    renderStudio();
  } catch (_) {
    stToast("没有获得麦克风权限，可以改用导入音频");
  }
}

function studioStopRecording(silent = false) {
  if (!studioState.recording) return;
  studioState.recording = false;
  clearInterval(stRecordClock);
  stRecordClock = null;
  if (stRecorder && stRecorder.state !== "inactive") stRecorder.stop();
  stRecordStream?.getTracks().forEach(track => track.stop());
  if (!silent) stToast("录音已保存到当前项目");
}

function stFinishRecording() {
  if (!stRecordChunks.length) return;
  const blob = new Blob(stRecordChunks, { type: stRecorder?.mimeType || "audio/webm" });
  const project = stProject();
  const id = `recording-${Date.now()}`;
  project.tracks.unshift({ id, title: `灵感录音 ${new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})}`, note: "Voice memo", version: 1, duration: Math.max(1,studioState.recordSeconds), added: "刚刚", offline: true, plays: 0, comments: [], versions: [{version:1,label:"原始录音",date:"刚刚",current:true}], fileUrl: URL.createObjectURL(blob) });
  studioState.trackId = id;
  studioState.sheet = null;
  studioState.view = "project";
  renderStudio();
}

/* ---------------- Player ---------------- */

function studioSelectTrack(id, reset = true) {
  studioPausePlayback();
  studioState.trackId = id;
  studioState.projectId = stTrackProject(id).id;
  if (reset) studioState.currentTime = 0;
  studioState.speed = 1;
  studioState.pitch = 0;
  stDestroyAudio();
}

function studioQuickPlay(id) {
  if (studioState.trackId !== id) studioSelectTrack(id);
  studioTogglePlayback();
}

function studioPlayProject(id) {
  const project = stProject(id);
  if (!project?.tracks.length) return stToast("先给这个项目添加一首音频");
  studioSelectTrack(project.tracks[0].id);
  studioState.projectId = id;
  studioState.view = "player";
  renderStudio();
  studioStartPlayback();
}

function studioTogglePlayback() { studioState.playing ? studioPausePlayback() : studioStartPlayback(); }
function stToggle() { studioTogglePlayback(); }

function studioStartPlayback() {
  const track = stTrack();
  if (!track) return;
  if (studioState.currentTime >= track.duration - .2) studioState.currentTime = 0;
  if (track.fileUrl) stStartFilePlayback(track);
  else stStartDemoPlayback(track);
  studioState.playing = true;
  track.plays = (track.plays || 0) + 1;
  clearInterval(stClock);
  stClock = setInterval(studioTick, 120);
  studioUpdatePlayerDOM();
}

function stStartFilePlayback(track) {
  if (!stAudio || stAudio.dataset.track !== track.id) {
    stAudio?.pause();
    stAudio = new Audio(track.fileUrl);
    stAudio.dataset.track = track.id;
    stAudio.addEventListener("ended", () => studioHandleEnded());
  }
  stAudio.currentTime = Math.min(studioState.currentTime, Math.max(0, (stAudio.duration || track.duration) - .05));
  stAudio.playbackRate = studioState.speed;
  stAudio.play().catch(() => stToast("点击播放后浏览器才能开始音频"));
}

function stStartDemoPlayback() {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return stToast("当前浏览器暂不支持音频试听");
  if (!stCtx) stCtx = new Ctor();
  stCtx.resume?.();
  if (!stDemoBuffer) stDemoBuffer = stMakeDemoBuffer(stCtx);
  if (stSource) { try { stSource.stop(); } catch (_) {} }
  stSource = stCtx.createBufferSource();
  stGain = stCtx.createGain();
  stSource.buffer = stDemoBuffer;
  stSource.loop = true;
  stSource.playbackRate.value = studioState.speed;
  stSource.detune.value = studioState.pitch * 100;
  stGain.gain.value = .58;
  stSource.connect(stGain).connect(stCtx.destination);
  stStartOffset = studioState.currentTime;
  stStartedAt = stCtx.currentTime;
  stSource.start(0, studioState.currentTime % stDemoBuffer.duration);
}

function stMakeDemoBuffer(ctx) {
  const duration = 24;
  const sampleRate = Math.min(ctx.sampleRate, 24000);
  const buffer = ctx.createBuffer(2, duration * sampleRate, sampleRate);
  const chordRoots = [146.83, 110, 130.81, 98];
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let noise = 71237 + channel * 17;
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const beat = (t * 1.6) % 1;
      const bar = Math.floor(t / 2.5) % 4;
      const root = chordRoots[bar];
      const fade = Math.min(1, t * 1.5, (duration - t) * 1.5);
      const pad = Math.sin(2 * Math.PI * root * t) * .055 + Math.sin(2 * Math.PI * root * 1.5 * t + channel * .3) * .035 + Math.sin(2 * Math.PI * root * 2 * t) * .02;
      const bassEnv = Math.exp(-5 * beat);
      const bass = Math.sin(2 * Math.PI * (root / 2) * t) * .12 * bassEnv;
      const kick = Math.sin(2 * Math.PI * (48 + 75 * Math.exp(-18 * beat)) * t) * Math.exp(-14 * beat) * .22;
      noise = (noise * 1664525 + 1013904223) >>> 0;
      const hatBeat = (t * 3.2) % 1;
      const hat = ((noise / 4294967295) * 2 - 1) * Math.exp(-30 * hatBeat) * .025;
      const leadPhrase = Math.max(0, Math.sin(Math.PI * ((t / 1.25) % 1)));
      const lead = Math.sin(2 * Math.PI * root * (channel ? 2.01 : 2) * t) * .025 * leadPhrase;
      data[i] = Math.max(-.82, Math.min(.82, (pad + bass + kick + hat + lead) * fade));
    }
  }
  return buffer;
}

function studioTick() {
  const track = stTrack();
  if (!track || !studioState.playing) return;
  if (track.fileUrl && stAudio) studioState.currentTime = stAudio.currentTime;
  else if (stCtx) studioState.currentTime = stStartOffset + (stCtx.currentTime - stStartedAt) * studioState.speed;
  const endAt = track.duration * (studioState.trimEnd / 100);
  const startAt = track.duration * (studioState.trimStart / 100);
  if (studioState.currentTime >= endAt) {
    if (studioState.loop) studioSeek(startAt);
    else studioHandleEnded();
  }
  studioUpdatePlayerDOM();
}

function studioHandleEnded() {
  if (studioState.loop) return studioSeek(stTrack().duration * (studioState.trimStart / 100));
  const project = stTrackProject();
  const index = project.tracks.findIndex(track => track.id === studioState.trackId);
  if (index >= 0 && index < project.tracks.length - 1) {
    studioSelectTrack(project.tracks[index + 1].id);
    studioState.currentTime = 0;
    renderStudio();
    studioStartPlayback();
  } else {
    studioPausePlayback();
    studioState.currentTime = 0;
    studioUpdatePlayerDOM();
  }
}

function studioPausePlayback() {
  if (!studioState.playing && !stClock) return;
  if (stTrack()?.fileUrl && stAudio) {
    studioState.currentTime = stAudio.currentTime || studioState.currentTime;
    stAudio.pause();
  } else if (stCtx && studioState.playing) {
    studioState.currentTime = stStartOffset + (stCtx.currentTime - stStartedAt) * studioState.speed;
  }
  if (stSource) { try { stSource.stop(); } catch (_) {} stSource = null; }
  studioState.playing = false;
  clearInterval(stClock);
  stClock = null;
  studioUpdatePlayerDOM();
}

function stDestroyAudio() {
  if (stSource) { try { stSource.stop(); } catch (_) {} stSource = null; }
  if (stAudio) { stAudio.pause(); stAudio = null; }
}

function studioSeek(seconds) {
  const track = stTrack();
  if (!track) return;
  studioState.currentTime = Math.max(0, Math.min(track.duration - .05, Number(seconds) || 0));
  const wasPlaying = studioState.playing;
  if (wasPlaying) {
    studioPausePlayback();
    studioStartPlayback();
  }
  studioUpdatePlayerDOM();
}

function studioSeekFromEvent(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  studioSeek(stTrack().duration * ratio);
}

function studioPreviousTrack() {
  const project = stTrackProject();
  const index = project.tracks.findIndex(track => track.id === studioState.trackId);
  if (studioState.currentTime > 4 || index <= 0) return studioSeek(0);
  const wasPlaying = studioState.playing;
  studioSelectTrack(project.tracks[index - 1].id);
  renderStudio();
  if (wasPlaying) studioStartPlayback();
}

function studioNextTrack() {
  const project = stTrackProject();
  const index = project.tracks.findIndex(track => track.id === studioState.trackId);
  const next = project.tracks[(index + 1) % project.tracks.length];
  const wasPlaying = studioState.playing;
  studioSelectTrack(next.id);
  renderStudio();
  if (wasPlaying) studioStartPlayback();
}

function studioUpdatePlayerDOM() {
  const track = stTrack();
  if (!track) return;
  const progress = Math.max(0, Math.min(100, studioState.currentTime / Math.max(1, track.duration) * 100));
  document.querySelectorAll("#studio .st-wave").forEach(wave => wave.style.setProperty("--progress", `${progress}%`));
  document.querySelectorAll("#studio .st-current-time").forEach(el => el.textContent = stFormatTime(studioState.currentTime));
  const remaining = document.querySelector("#studio .st-time-row span:last-child");
  if (remaining) remaining.textContent = `-${stFormatTime(Math.max(0, track.duration - studioState.currentTime))}`;
  const main = document.querySelector("#studio .st-main-play");
  if (main) main.innerHTML = stIcon(studioState.playing ? "pause" : "play",25);
}

function studioSetSpeed(value) {
  const wasPlaying = studioState.playing;
  if (wasPlaying) studioPausePlayback();
  studioState.speed = Number(value);
  if (wasPlaying) studioStartPlayback();
  const panel = document.querySelector("#studio .st-edit-suite");
  panel?.querySelectorAll("label")[1]?.querySelector("em")?.replaceChildren(document.createTextNode(`${studioState.speed.toFixed(2)}×`));
}

function studioCycleSpeed() {
  const choices = [.75, 1, 1.25, 1.5];
  const next = choices[(choices.indexOf(studioState.speed) + 1) % choices.length] || 1;
  studioSetSpeed(next);
  renderStudio();
}

function studioSetPitch(value) {
  studioState.pitch = Number(value);
  if (studioState.playing && !stTrack()?.fileUrl) { studioPausePlayback(); studioStartPlayback(); }
  const panel = document.querySelector("#studio .st-edit-suite");
  panel?.querySelector("label em")?.replaceChildren(document.createTextNode(`${studioState.pitch > 0 ? "+" : ""}${studioState.pitch} 半音`));
}

function studioNudgePitch() {
  const choices = [0, 2, -2, 4, -4];
  studioSetPitch(choices[(choices.indexOf(studioState.pitch) + 1) % choices.length] ?? 0);
  renderStudio();
}

function studioToggleLoop() { studioState.loop = !studioState.loop; renderStudio(); }
function studioSetTrim(which, value) { studioState[which === "start" ? "trimStart" : "trimEnd"] = Number(value); }
function studioSetPlayerPanel(panel) { studioState.playerPanel = panel; renderStudio(); }

function studioToggleOffline(id) {
  const track = stTrack(id);
  track.offline = !track.offline;
  renderStudio();
  stToast(track.offline ? "已保存到离线音乐" : "已移除离线副本");
}

/* ---------------- Comments, versions, sharing ---------------- */

function studioAddComment() {
  const text = document.getElementById("stCommentText")?.value.trim();
  if (!text) return stToast("先写下一句反馈");
  const track = stTrack();
  track.comments = track.comments || [];
  track.comments.push({ id: Date.now(), at: Math.round(studioState.currentTime), author: "你", text });
  track.comments.sort((a,b) => a.at - b.at);
  studioState.sheet = null;
  studioState.playerPanel = "comments";
  renderStudio();
  stToast("时间点注释已发布");
}

function studioUseVersion(versionNumber) {
  const track = stTrack();
  track.versions.forEach(version => version.current = version.version === versionNumber);
  const selected = track.versions.find(version => version.version === versionNumber);
  if (selected) {
    track.version = selected.version;
    track.note = selected.label;
  }
  studioState.currentTime = 0;
  studioState.sheet = null;
  renderStudio();
  stToast(`已切换到 v${versionNumber}`);
}

function studioSetShareAccess(access) { studioState.share.access = access; renderStudio(); }
function studioToggleShare(key) { studioState.share[key] = !studioState.share[key]; renderStudio(); }
function studioCycleExpiry() {
  const options = ["7 天", "30 天", "永不过期"];
  studioState.share.expires = options[(options.indexOf(studioState.share.expires) + 1) % options.length];
  renderStudio();
}
function studioCopyLink() {
  const link = `https://qujing.cn/s/${stProject().id}-28F`;
  navigator.clipboard?.writeText(link).catch(() => {});
  stToast("分享链接已复制");
}
function studioSaveShare() {
  const project = stProject();
  project.private = studioState.share.access === "invite";
  studioState.sheet = null;
  renderStudio();
  stToast("分享权限已更新");
}

function studioDeleteTrack(id) {
  const project = stTrackProject(id);
  const index = project.tracks.findIndex(track => track.id === id);
  if (index < 0) return;
  const [removed] = project.tracks.splice(index,1);
  if (removed.fileUrl) URL.revokeObjectURL(removed.fileUrl);
  studioPausePlayback();
  studioState.trackId = project.tracks[0]?.id || "";
  studioState.sheet = null;
  studioState.view = "project";
  renderStudio();
  stToast("音轨已从本次体验中移除");
}

document.addEventListener("keydown", event => {
  const overlay = document.getElementById("studio");
  if (!overlay?.classList.contains("show")) return;
  if (event.key === "Escape") studioState.sheet ? studioCloseSheet() : closeStudio();
  if (event.code === "Space" && studioState.view === "player" && !["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    studioTogglePlayback();
  }
});

document.addEventListener("visibilitychange", () => { if (document.hidden) studioPausePlayback(); });

/* 便于从演示链接直接进入造曲台及关键页面。 */
if (window.location.hash.startsWith("#studio")) {
  if (window.location.hash === "#studio-project") studioState.view = "project";
  if (window.location.hash === "#studio-player") studioState.view = "player";
  if (window.location.hash === "#studio-share") { studioState.view = "project"; studioState.sheet = "share"; }
  setTimeout(openStudio, 0);
}
