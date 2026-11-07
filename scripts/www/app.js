(function(){
  // ============================================================
  // 常量与工具
  // ============================================================
  const PRESET_COLORS = ['#EAA6B2','#A3C9B6','#98B4D4','#D4C4B7','#BFA5D6','#F0B59F','#E8D5A1','#A2B5C8','#DDA0A9','#9DC8C5'];
  const FONT_COLORS = ['#3e2a31','#EAA6B2','#98B4D4','#A3C9B6','#BFA5D6','#F0B59F','#A2B5C8','#DDA0A9'];
  const MOODS = [
    { key:'happy', label:'开心', color:'#FFB6C1' },
    { key:'calm', label:'平静', color:'#B0E0E6' },
    { key:'sad', label:'难过', color:'#C7CEEA' },
    { key:'angry', label:'生气', color:'#FF9AA2' },
    { key:'tired', label:'疲惫', color:'#D8BFD8' }
  ];
  const CREATIVE_BGS = [
    { key:'white', label:'纯白', cls:'bg-plain-white' },
    { key:'pink', label:'浅粉', cls:'bg-plain-pink' },
    { key:'cream', label:'奶油', cls:'bg-plain-cream' },
    { key:'dark', label:'深色', cls:'bg-plain-dark' },
    { key:'line', label:'横线', cls:'bg-texture-line' },
    { key:'moon', label:'月夜', cls:'bg-moon' },
    { key:'cloud', label:'云朵', cls:'bg-cloud' },
    { key:'leaf', label:'小叶子', cls:'bg-leaf' },
    { key:'mountain', label:'极简山', cls:'bg-mountain' }
  ];
  const FONT_MAP = { system: "'Segoe UI','PingFang SC',Roboto,sans-serif", kai: "'KaiTi','STKaiti','楷体',serif", song: "'SimSun','Songti SC','宋体',serif" };

  function genId(){ return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
  function escapeHtml(t){ const d=document.createElement('div'); d.textContent=t==null?'':t; return d.innerHTML; }
  function nowTime(){ const d=new Date(), pad=n=>String(n).padStart(2,'0'); return `${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function todayKey(){ const d=new Date(), pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function showToast(msg){ const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),2000); }
  function formatRelativeTime(iso){ const now=Date.now(), t=new Date(iso).getTime(); const diff=Math.floor((now-t)/1000); if(diff<60) return '刚刚'; if(diff<3600) return Math.floor(diff/60)+'分钟前'; if(diff<86400) return Math.floor(diff/3600)+'小时前'; const d=new Date(iso), pad=n=>String(n).padStart(2,'0'); return `${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function updateClock(){ const el = document.getElementById('currentTime'); if(!el) return; const d = new Date(); el.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
  setInterval(updateClock, 10000); updateClock();

  // ============================================================
  // 主题逻辑
  // ============================================================
  const THEMES = ['theme-white', 'theme-cream', 'theme-green', 'theme-blue'];
  let currentThemeIndex = 0;
  function loadTheme() {
    const savedTheme = localStorage.getItem('room_theme') || 'theme-white';
    currentThemeIndex = THEMES.indexOf(savedTheme); if (currentThemeIndex === -1) currentThemeIndex = 0;
    document.body.classList.add(THEMES[currentThemeIndex]);
  }
  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.remove(THEMES[currentThemeIndex]);
    currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
    document.body.classList.add(THEMES[currentThemeIndex]);
    localStorage.setItem('room_theme', THEMES[currentThemeIndex]);
    showToast('主题已切换');
  });

  // ============================================================
  // 数据层
  // ============================================================
  let chatLists = [], dynamics = [], diaries = {};
  function saveChats(){ try{ localStorage.setItem('room_chats', JSON.stringify(chatLists)); }catch(e){} }
  function loadChats(){ try{ const r=localStorage.getItem('room_chats'); if(r) chatLists=JSON.parse(r); }catch(e){} }
  function saveDynamics(){ try{ localStorage.setItem('room_dynamics', JSON.stringify(dynamics)); }catch(e){} }
  function loadDynamics(){ try{ const r=localStorage.getItem('room_dynamics'); if(r) dynamics=JSON.parse(r); }catch(e){} }
  function saveDiaries(){ try{ localStorage.setItem('room_diaries', JSON.stringify(diaries)); }catch(e){} }
  function loadDiaries(){ try{ const r=localStorage.getItem('room_diaries'); if(r) diaries=JSON.parse(r); }catch(e){} }

  // IndexedDB
  let db = null;
  function openDB(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open('room_creative_db', 1);
      req.onupgradeneeded = e=>{
        const d = e.target.result;
        if(!d.objectStoreNames.contains('books')){ d.createObjectStore('books', { keyPath:'id' }); }
        if(!d.objectStoreNames.contains('chapters')){ d.createObjectStore('chapters', { keyPath:'id' }); }
      };
      req.onsuccess = e=>{ db = e.target.result; resolve(db); };
      req.onerror = e=>{ reject(e.target.error); };
    });
  }
  function dbGetAll(storeName){ return new Promise((resolve, reject)=>{ if(!db) return resolve([]); const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll(); req.onsuccess = ()=> resolve(req.result || []); req.onerror = ()=> reject(req.error); }); }
  function dbPut(storeName, data){ return new Promise((resolve, reject)=>{ if(!db) return reject('no db'); const req = db.transaction(storeName, 'readwrite').objectStore(storeName).put(data); req.onsuccess = ()=> resolve(); req.onerror = ()=> reject(req.error); }); }
  function dbDelete(storeName, id){ return new Promise((resolve, reject)=>{ if(!db) return reject('no db'); const req = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id); req.onsuccess = ()=> resolve(); req.onerror = ()=> reject(req.error); }); }

  // ============================================================
  // 通用确认弹层
  // ============================================================
  let confirmCallback = null;
  const confirmSheet = document.getElementById('confirmSheet');
  const confirmSheetTitle = document.getElementById('confirmSheetTitle');
  function showConfirm(title, cb){ confirmSheetTitle.textContent = title; confirmCallback = cb; confirmSheet.classList.add('show'); }
  document.getElementById('confirmSheetCancel').addEventListener('click', ()=>{ confirmSheet.classList.remove('show'); confirmCallback=null; });
  document.getElementById('confirmSheetOk').addEventListener('click', ()=>{ confirmSheet.classList.remove('show'); if(confirmCallback){ confirmCallback(); confirmCallback=null; } });

  // ============================================================
  // 底部导航
  // ============================================================
  const pages = { chat: document.getElementById('pageChat'), dynamic: document.getElementById('pageDynamic'), diary: document.getElementById('pageDiary'), creative: document.getElementById('pageCreative') };
  document.querySelectorAll('.nav-item').forEach(item=>{
    item.addEventListener('click', ()=>{
      const tab = item.dataset.tab;
      if(tab !== 'chat' && chatDetail.classList.contains('active')){ chatDetail.classList.remove('active'); document.getElementById('chatListContainer').style.display = ''; }
      if(tab !== 'creative' && creativeManager.classList.contains('show')){ creativeManager.classList.remove('show'); }
      if(tab !== 'diary' && diaryEditorPage.classList.contains('show')){ diaryEditorPage.classList.remove('show'); renderCalendar(); }
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active')); item.classList.add('active');
      Object.keys(pages).forEach(k=>{ pages[k].classList.toggle('active', k===tab); });
      if(tab==='dynamic') renderDynamics(); if(tab==='diary') renderCalendar(); if(tab==='creative') renderCreativeList();
    });
  });

  // ============================================================
  // 模块一：对话
  // ============================================================
  const chatDetail = document.getElementById('chatDetail');
  const chatTitle = document.getElementById('chatTitle');
  const quickRoleBar = document.getElementById('quickRoleBar');
  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const listContainer = document.getElementById('listContainer');
  let currentListId = null, currentRoleId = null, openSwipeItem = null;

  function closeAllSwipeItems(){ if(openSwipeItem){ openSwipeItem.inner.style.transform = 'translateX(0)'; openSwipeItem = null; } }

  function renderChatList(){
    if(chatLists.length===0){ listContainer.innerHTML = `<div class="empty-tip">还没有对话，点右上角设置新建</div>`; return; }
    let html='';
    chatLists.forEach(list=>{
      const dots = list.roles.slice(0,4).map(r=>`<div class="list-color-dot" style="background:${r.color};"></div>`).join('');
      const main = list.roles.find(r=>r.isMain);
      html += `<div class="chat-list-swipe-wrap" data-list-id="${list.id}">
        <div class="chat-list-delete-bg" data-delete-id="${list.id}">删除</div>
        <div class="chat-list-swipe-inner">
          <div class="chat-list-item" data-id="${list.id}">
            <div class="list-colors">${dots}</div>
            <div class="list-info">
              <div class="list-title">${escapeHtml(list.title)}</div>
              <div class="list-badge">${list.roles.length>=3?'群聊':'双人'} · 主要：${escapeHtml(main?main.name:'未设置')}</div>
            </div>
          </div>
        </div>
      </div>`;
    });
    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.chat-list-item').forEach(item=>{ item.addEventListener('click', ()=>{ if(openSwipeItem){ closeAllSwipeItems(); return; } enterChat(item.dataset.id); }); });
    listContainer.querySelectorAll('.chat-list-delete-bg').forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation(); const listId = btn.dataset.deleteId;
        showConfirm('删除这个对话列表？', ()=>{ chatLists = chatLists.filter(l=>l.id!==listId); saveChats(); closeAllSwipeItems(); renderChatList(); });
      });
    });

    listContainer.querySelectorAll('.chat-list-swipe-wrap').forEach(wrap=>{
      const inner = wrap.querySelector('.chat-list-swipe-inner');
      let startX=0, startY=0, currentX=0, isSwiping=false, isHorizontal=false; const maxSwipe = 80;
      const onStart = (x,y)=>{ startX=x; startY=y; currentX=0; isSwiping=false; isHorizontal=false; inner.style.transition='none'; if(openSwipeItem && openSwipeItem.inner!==inner) closeAllSwipeItems(); };
      const onMove = (x,y,e)=>{
        if(!startX && !startY) return; const dx=x-startX, dy=y-startY;
        if(!isHorizontal && !isSwiping){ if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>6){ isHorizontal=true; isSwiping=true; } else if(Math.abs(dy)>6){ return; } }
        if(isHorizontal){ if(e && e.cancelable) e.preventDefault(); let move = dx; if(move>0) move=0; if(move<-maxSwipe) move=-maxSwipe; currentX = move; inner.style.transform = `translateX(${move}px)`; }
      };
      const onEnd = ()=>{ inner.style.transition='transform .2s ease'; if(currentX < -40){ inner.style.transform=`translateX(-${maxSwipe}px)`; openSwipeItem={wrap,inner}; } else { inner.style.transform='translateX(0)'; if(openSwipeItem && openSwipeItem.inner===inner) openSwipeItem=null; } startX=0; startY=0; currentX=0; isSwiping=false; isHorizontal=false; };
      wrap.addEventListener('touchstart', e=>{ const t=e.touches[0]; onStart(t.clientX,t.clientY); }, {passive:true});
      wrap.addEventListener('touchmove', e=>{ const t=e.touches[0]; onMove(t.clientX,t.clientY,e); }, {passive:false});
      wrap.addEventListener('touchend', onEnd); wrap.addEventListener('touchcancel', onEnd);
      wrap.addEventListener('mousedown', e=>{ if(e.button!==0) return; onStart(e.clientX,e.clientY); const mm=ev=>onMove(ev.clientX,ev.clientY,ev); const mu=()=>{ onEnd(); document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu); }; document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu); });
    });
  }
  document.addEventListener('click', e=>{ if(openSwipeItem && !openSwipeItem.wrap.contains(e.target)) closeAllSwipeItems(); });

  function enterChat(listId){
    const list = chatLists.find(l=>l.id===listId); if(!list) return;
    currentListId = listId; chatTitle.textContent = list.title;
    const main = list.roles.find(r=>r.isMain); currentRoleId = main ? main.id : list.roles[0]?.id;
    renderQuickRoleBar(); renderMessages();
    document.getElementById('chatListContainer').style.display='none'; chatDetail.classList.add('active');
  }
  document.getElementById('backBtn').addEventListener('click', ()=>{ chatDetail.classList.remove('active'); document.getElementById('chatListContainer').style.display=''; renderChatList(); });

  function renderQuickRoleBar(){
    const list = chatLists.find(l=>l.id===currentListId); if(!list){ quickRoleBar.innerHTML=''; return; }
    let html=''; list.roles.forEach(role=>{ html += `<div class="quick-role-chip ${role.id===currentRoleId?'active':''}" data-role-id="${role.id}"><span class="chip-dot" style="background:${role.color};"></span>${escapeHtml(role.name)}${role.isMain?'<span class="chip-main-tag">主</span>':''}</div>`; });
    quickRoleBar.innerHTML = html;
    quickRoleBar.querySelectorAll('.quick-role-chip').forEach(chip=>{ chip.addEventListener('click', ()=>{ currentRoleId = chip.dataset.roleId; renderQuickRoleBar(); }); });
  }

  function renderMessages(){
    const list = chatLists.find(l=>l.id===currentListId); if(!list) return;
    const msgs = list.messages || [];
    if(msgs.length===0){ messagesContainer.innerHTML = `<div style="text-align:center;color:var(--text-sub);padding:40px 0;font-size:14px;">开始对话吧</div>`; return; }
    const mainRole = list.roles.find(r=>r.isMain); const mainId = mainRole ? mainRole.id : null;
    let html='';
    msgs.forEach(msg=>{
      const isRight = msg.senderId===mainId; const role = list.roles.find(r=>r.id===msg.senderId); const color = role?role.color:'#ccc';
      html += `<div class="message ${isRight?'right':'left'}">
        <div class="message-sender"><span class="sender-dot" style="background:${color};"></span>${escapeHtml(msg.senderName)}</div>
        <div class="message-bubble" style="background:${color};" data-msg-id="${msg.id}">${escapeHtml(msg.text)}</div>
        <div class="message-time">${escapeHtml(msg.time||'')}</div>
      </div>`;
    });
    messagesContainer.innerHTML = html;
    messagesContainer.querySelectorAll('.message-bubble').forEach(b=>{
      b.addEventListener('click', ()=>{
        const msgId = b.dataset.msgId;
        document.getElementById('msgActionSheet').classList.add('show');
        document.getElementById('msgActionSheet').dataset.msgId = msgId;
      });
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 消息编辑与删除
  document.getElementById('msgCancelBtn').addEventListener('click', ()=> document.getElementById('msgActionSheet').classList.remove('show'));
  document.getElementById('msgDeleteBtn').addEventListener('click', ()=>{
    const msgId = document.getElementById('msgActionSheet').dataset.msgId;
    document.getElementById('msgActionSheet').classList.remove('show');
    showConfirm('删除这条消息？', ()=>{
      const list = chatLists.find(l=>l.id===currentListId);
      list.messages = list.messages.filter(m=>m.id!==msgId); saveChats(); renderMessages();
    });
  });
  document.getElementById('msgEditBtn').addEventListener('click', ()=>{
    const msgId = document.getElementById('msgActionSheet').dataset.msgId;
    document.getElementById('msgActionSheet').classList.remove('show');
    const list = chatLists.find(l=>l.id===currentListId);
    const msg = list.messages.find(m=>m.id===msgId);
    if(!msg) return;
    document.getElementById('editMsgInput').value = msg.text;
    document.getElementById('editMsgModal').classList.add('show');
    document.getElementById('editMsgModal').dataset.msgId = msgId;
  });
  document.getElementById('editMsgCloseBtn').addEventListener('click', ()=> document.getElementById('editMsgModal').classList.remove('show'));
  document.getElementById('editMsgCancelBtn').addEventListener('click', ()=> document.getElementById('editMsgModal').classList.remove('show'));
  document.getElementById('editMsgConfirmBtn').addEventListener('click', ()=>{
    const msgId = document.getElementById('editMsgModal').dataset.msgId;
    const text = document.getElementById('editMsgInput').value.trim();
    if(text){
      const list = chatLists.find(l=>l.id===currentListId);
      const msg = list.messages.find(m=>m.id===msgId);
      if(msg){ msg.text = text; saveChats(); renderMessages(); }
    }
    document.getElementById('editMsgModal').classList.remove('show');
  });

  // 发送消息与多行输入
  messageInput.addEventListener('input', function() { this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px'; });
  messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); this.style.height = 'auto'; }
  });
  document.getElementById('sendBtn').addEventListener('click', ()=>{ sendMessage(); messageInput.style.height = 'auto'; });
  function sendMessage(){
    const text = messageInput.value.trim();
    if(!text || !currentListId || !currentRoleId) return;
    const list = chatLists.find(l=>l.id===currentListId); const role = list.roles.find(r=>r.id===currentRoleId); if(!role) return;
    if(!list.messages) list.messages=[];
    list.messages.push({ id:genId(), senderId:role.id, senderName:role.name, text, time:nowTime() });
    messageInput.value=''; saveChats(); renderMessages();
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (chatDetail.classList.contains('active')) { setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 100); }
    });
  }

  // 顶部菜单
  const homeSettingsSheet = document.getElementById('homeSettingsSheet');
  document.getElementById('chatSettingsBtn').addEventListener('click', ()=> homeSettingsSheet.classList.add('show'));
  document.getElementById('homeMenuCancelBtn').addEventListener('click', ()=> homeSettingsSheet.classList.remove('show'));
  document.getElementById('menuNewChatBtn').addEventListener('click', ()=>{ homeSettingsSheet.classList.remove('show'); openCreateModal(); });
  document.getElementById('menuImportBtn').addEventListener('click', ()=>{ homeSettingsSheet.classList.remove('show'); document.getElementById('importTextarea').value=''; document.getElementById('importFileInput').value=''; document.getElementById('importModal').classList.add('show'); });
  document.getElementById('menuBackupBtn').addEventListener('click', async ()=>{
    homeSettingsSheet.classList.remove('show');
    try {
      const chapters = await dbGetAll('chapters'); const books = await dbGetAll('books');
      const backupData = { chats: chatLists, dynamics, diaries, creative: { books, chapters } };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Room_Backup_${todayKey()}.json`; a.click();
      showToast('备份文件已生成');
    } catch(e){ showToast('备份失败'); }
  });

  const chatMoreSheet = document.getElementById('chatMoreSheet');
  document.getElementById('chatMoreBtn').addEventListener('click', ()=> chatMoreSheet.classList.add('show'));
  document.getElementById('chatMoreCancelBtn').addEventListener('click', ()=> chatMoreSheet.classList.remove('show'));
  document.getElementById('menuRenameChatBtn').addEventListener('click', ()=>{
    chatMoreSheet.classList.remove('show');
    const list = chatLists.find(l=>l.id===currentListId); if(!list) return;
    document.getElementById('renameInput').value = list.title;
    document.getElementById('renameModal').classList.add('show');
    setTimeout(()=> document.getElementById('renameInput').focus(), 100);
  });
  document.getElementById('menuExportChatBtn').addEventListener('click', ()=>{
    chatMoreSheet.classList.remove('show');
    const list = chatLists.find(l=>l.id===currentListId); if(!list) return;
    const data = JSON.stringify(list, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${(list.title||'chat').replace(/[\\/:*?"<>|]/g,'_')}.json`; a.click();
    showToast('已导出');
  });
  document.getElementById('menuExportChatImgBtn').addEventListener('click', ()=>{
    chatMoreSheet.classList.remove('show');
    exportChatToImage();
  });

  document.getElementById('renameCloseBtn').addEventListener('click', ()=> document.getElementById('renameModal').classList.remove('show'));
  document.getElementById('renameCancelBtn').addEventListener('click', ()=> document.getElementById('renameModal').classList.remove('show'));
  document.getElementById('renameConfirmBtn').addEventListener('click', ()=>{
    const title = document.getElementById('renameInput').value.trim(); if(!title) return;
    const list = chatLists.find(l=>l.id===currentListId);
    if(list){ list.title = title; chatTitle.textContent = title; saveChats(); renderChatList(); showToast('已重命名'); }
    document.getElementById('renameModal').classList.remove('show');
  });

  // 角色管理
  let editingMode='create', editingRoles=[], tempRoleCounter=0, manageListId=null;
  const modalOverlay = document.getElementById('modalOverlay'), modalTitleText = document.getElementById('modalTitleText'), modalHint = document.getElementById('modalHint'), roleCardsContainer = document.getElementById('roleCardsContainer'), confirmAddBtn = document.getElementById('confirmAddBtn');

  function openCreateModal(){
    editingMode='create'; manageListId=null; modalTitleText.textContent='新建聊天'; confirmAddBtn.textContent='创建';
    editingRoles = [ { tempId:'tmp_'+(++tempRoleCounter), name:'', color:PRESET_COLORS[0], isMain:true }, { tempId:'tmp_'+(++tempRoleCounter), name:'', color:PRESET_COLORS[1], isMain:false } ];
    renderRoleCards(); modalOverlay.classList.add('show');
  }
  function openManageRolesModal(){
    const list = chatLists.find(l=>l.id===currentListId); if(!list) return;
    editingMode='manage'; manageListId=list.id; modalTitleText.textContent='管理角色'; confirmAddBtn.textContent='保存';
    editingRoles = list.roles.map(r=>({ tempId:'tmp_'+(++tempRoleCounter), originalId:r.id, name:r.name, color:r.color, isMain:r.isMain }));
    renderRoleCards(); modalOverlay.classList.add('show');
  }
  function getUsedColors(excludeTempId){ return editingRoles.filter(r=>r.tempId!==excludeTempId).map(r=>r.color); }
  function renderRoleCards(){
    let html='';
    editingRoles.forEach((role,index)=>{
      const usedColors = getUsedColors(role.tempId); let colorHtml='';
      PRESET_COLORS.forEach(c=>{ const isUsed = usedColors.includes(c); colorHtml += `<div class="color-option ${role.color===c?'selected':''} ${isUsed?'used':''}" style="background:${c};" data-color="${c}" data-tempid="${role.tempId}"></div>`; });
      const canRemove = editingRoles.length>2;
      html += `<div class="role-card" data-tempid="${role.tempId}">
        <div class="role-card-header"><div class="role-card-title">角色 ${index+1} ${role.isMain?'<span class="main-badge">主要</span>':''}</div>${canRemove?`<button class="role-remove" data-tempid="${role.tempId}">×</button>`:'<button class="role-remove" disabled>×</button>'}</div>
        <input type="text" class="role-input" placeholder="角色名字" maxlength="16" value="${escapeHtml(role.name)}" data-tempid="${role.tempId}">
        <div class="color-grid">${colorHtml}</div>
        <label class="main-role-toggle"><input type="radio" name="mainRoleRadio" value="${role.tempId}" ${role.isMain?'checked':''}> 设为主要角色（消息右侧）</label>
      </div>`;
    });
    roleCardsContainer.innerHTML = html;
    roleCardsContainer.querySelectorAll('.role-input').forEach(input=>{ input.addEventListener('input', e=>{ const r = editingRoles.find(r=>r.tempId===e.target.dataset.tempid); if(r) r.name = e.target.value; updateConfirmState(); }); });
    roleCardsContainer.querySelectorAll('.color-option').forEach(el=>{ el.addEventListener('click', ()=>{ const tempId = el.dataset.tempid, color = el.dataset.color; if(getUsedColors(tempId).includes(color)){ showToast('颜色已被使用'); return; } const r = editingRoles.find(r=>r.tempId===tempId); if(r){ r.color=color; renderRoleCards(); } }); });
    roleCardsContainer.querySelectorAll('input[name="mainRoleRadio"]').forEach(radio=>{ radio.addEventListener('change', e=>{ const sel = e.target.value; editingRoles.forEach(r=>{ r.isMain = r.tempId===sel; }); renderRoleCards(); }); });
    roleCardsContainer.querySelectorAll('.role-remove[data-tempid]').forEach(btn=>{ btn.addEventListener('click', ()=>{ if(editingRoles.length<=2) return; const tempId = btn.dataset.tempid; const wasMain = editingRoles.find(r=>r.tempId===tempId)?.isMain; editingRoles = editingRoles.filter(r=>r.tempId!==tempId); if(wasMain && editingRoles.length>0) editingRoles[0].isMain = true; renderRoleCards(); }); });
    updateConfirmState();
  }
  function updateConfirmState(){
    const ok = editingRoles.every(r=>r.name.trim()) && editingRoles.some(r=>r.isMain) && new Set(editingRoles.map(r=>r.color)).size===editingRoles.length && editingRoles.length>=2;
    confirmAddBtn.disabled = !ok;
  }
  confirmAddBtn.addEventListener('click', ()=>{
    if(confirmAddBtn.disabled) return;
    if(editingMode==='create'){
      const roles = editingRoles.map(r=>({ id:genId(), name:r.name.trim(), color:r.color, isMain:r.isMain }));
      let title = roles.map(r=>r.name).join('、'); if(title.length>18) title = title.slice(0,18)+'...';
      const newList = { id:genId(), title, roles, messages:[] };
      chatLists.push(newList); saveChats(); renderChatList(); modalOverlay.classList.remove('show'); enterChat(newList.id);
    } else {
      const list = chatLists.find(l=>l.id===manageListId); if(!list) return;
      const newRoles = editingRoles.map(r=>{ const ex = r.originalId ? list.roles.find(x=>x.id===r.originalId) : null; return { id: ex?ex.id:genId(), name:r.name.trim(), color:r.color, isMain:r.isMain }; });
      const nameMap = {}; list.roles.forEach(o=>{ const nr = editingRoles.find(er=>er.originalId===o.id); if(nr) nameMap[o.id]=nr.name.trim(); });
      (list.messages||[]).forEach(m=>{ if(nameMap[m.senderId]) m.senderName=nameMap[m.senderId]; });
      list.roles = newRoles;
      if(!newRoles.find(r=>r.id===currentRoleId)){ const main = newRoles.find(r=>r.isMain); currentRoleId = main?main.id:newRoles[0]?.id; }
      saveChats(); renderQuickRoleBar(); renderMessages(); renderChatList(); modalOverlay.classList.remove('show'); showToast('角色已更新');
    }
  });

  document.getElementById('manageRolesBtn').addEventListener('click', openManageRolesModal);
  document.getElementById('modalCloseBtn').addEventListener('click', ()=>modalOverlay.classList.remove('show'));
  document.getElementById('cancelAddBtn').addEventListener('click', ()=>modalOverlay.classList.remove('show'));
  document.getElementById('addRoleBtn').addEventListener('click', ()=>{
    const used = editingRoles.map(r=>r.color);
    const avail = PRESET_COLORS.find(c=>!used.includes(c));
    if(!avail){ showToast('没有更多颜色'); return; }
    editingRoles.push({ tempId:'tmp_'+(++tempRoleCounter), name:'', color:avail, isMain:false }); renderRoleCards();
  });

  // 导入
  const importModal = document.getElementById('importModal');
  document.getElementById('importCloseBtn').addEventListener('click', ()=>importModal.classList.remove('show'));
  document.getElementById('importCancelBtn').addEventListener('click', ()=>importModal.classList.remove('show'));
  document.getElementById('importFileInput').addEventListener('change', e=>{
    const f=e.target.files[0]; if(!f) return; const r=new FileReader(); r.onload=ev=>{ document.getElementById('importTextarea').value = ev.target.result; }; r.readAsText(f);
  });
  document.getElementById('importConfirmBtn').addEventListener('click', ()=>{
    const text = document.getElementById('importTextarea').value.trim();
    if(!text){ showToast('请输入内容'); return; }
    try {
      const data = JSON.parse(text);
      if(data.chats) chatLists = data.chats; if(data.dynamics) dynamics = data.dynamics; if(data.diaries) diaries = data.diaries;
      if(data.creative){
        if(data.creative.books) data.creative.books.forEach(b=> dbPut('books', b));
        if(data.creative.chapters) data.creative.chapters.forEach(c=> dbPut('chapters', c));
      }
      saveChats(); saveDynamics(); saveDiaries();
      renderChatList(); renderDynamics(); renderCalendar(); renderCreativeList();
      importModal.classList.remove('show'); showToast('数据已恢复');
    } catch(e){ showToast('JSON 格式错误'); }
  });

  // ============================================================
  // 模块二：动态
  // ============================================================
  let dynamicRoleId = null;
  const dynamicRoleBtn = document.getElementById('dynamicRoleBtn'), dynamicRoleDot = document.getElementById('dynamicRoleDot'), dynamicRoleName = document.getElementById('dynamicRoleName'), dynamicList = document.getElementById('dynamicList'), rolePickSheet = document.getElementById('rolePickSheet'), rolePickList = document.getElementById('rolePickList');

  function getAllRoles(){ const seen = new Set(), roles = []; chatLists.forEach(list=>{ list.roles.forEach(r=>{ const key = r.name+'|'+r.color; if(!seen.has(key)){ seen.add(key); roles.push(r); } }); }); return roles; }
  function updateDynamicRoleUI(){ const role = getAllRoles().find(r=>r.id===dynamicRoleId); if(role){ dynamicRoleDot.style.background = role.color; dynamicRoleName.textContent = role.name; } else { dynamicRoleDot.style.background='#ddd'; dynamicRoleName.textContent='选择角色'; } }
  dynamicRoleBtn.addEventListener('click', ()=>{
    const roles = getAllRoles(); if(roles.length===0){ showToast('请先在对话里创建角色'); return; }
    let html = ''; roles.forEach(r=>{ html += `<button class="action-btn" data-role-id="${r.id}" style="display:flex;align-items:center;gap:10px;text-align:left;"><span style="width:22px;height:22px;border-radius:50%;background:${r.color};border:2px solid #fff;flex-shrink:0;"></span><span>${escapeHtml(r.name)}</span></button>`; });
    rolePickList.innerHTML = html; rolePickList.querySelectorAll('button').forEach(btn=>{ btn.addEventListener('click', ()=>{ dynamicRoleId = btn.dataset.roleId; updateDynamicRoleUI(); rolePickSheet.classList.remove('show'); }); }); rolePickSheet.classList.add('show');
  });
  document.getElementById('rolePickCancel').addEventListener('click', ()=>rolePickSheet.classList.remove('show'));

  function renderDynamics(){
    if(dynamics.length===0){ dynamicList.innerHTML = `<div class="empty-tip">还没有动态，发一条吧</div>`; return; }
    const sorted = [...dynamics].sort((a,b)=>b.time-a.time); let html='';
    sorted.forEach(d=>{ html += `<div class="dynamic-item" data-id="${d.id}"><div class="dynamic-header"><div class="dynamic-avatar" style="background:${d.roleColor};">${escapeHtml(d.roleName.charAt(0))}</div><div class="dynamic-meta"><div class="dynamic-name">${escapeHtml(d.roleName)}</div><div class="dynamic-time">${formatRelativeTime(d.time)}</div></div></div><div class="dynamic-content">${escapeHtml(d.text)}</div><div class="dynamic-actions"><button class="dynamic-action like-btn ${d.liked?'liked':''}" data-id="${d.id}">${d.liked?'已赞':'赞'} ${d.likes||0}</button><button class="dynamic-action danger delete-btn" data-id="${d.id}">删除</button></div></div>`; });
    dynamicList.innerHTML = html;
    dynamicList.querySelectorAll('.like-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ const d = dynamics.find(x=>x.id===btn.dataset.id); if(!d) return; d.liked = !d.liked; d.likes = (d.likes||0)+(d.liked?1:-1); if(d.likes<0) d.likes=0; saveDynamics(); renderDynamics(); }); });
    dynamicList.querySelectorAll('.delete-btn').forEach(btn=>{ btn.addEventListener('click', ()=>{ showConfirm('删除这条动态？', ()=>{ dynamics = dynamics.filter(x=>x.id!==btn.dataset.id); saveDynamics(); renderDynamics(); }); }); });
  }
  document.getElementById('publishBtn').addEventListener('click', ()=>{
    const text = document.getElementById('dynamicInput').value.trim();
    if(!text){ showToast('写点什么吧'); return; } if(!dynamicRoleId){ showToast('请先选择发布身份'); return; }
    const role = getAllRoles().find(r=>r.id===dynamicRoleId); if(!role){ showToast('角色不存在'); return; }
    dynamics.push({ id:genId(), roleId:role.id, roleName:role.name, roleColor:role.color, text, time:Date.now(), likes:0, liked:false });
    document.getElementById('dynamicInput').value=''; saveDynamics(); renderDynamics(); showToast('已发布');
  });

  // ============================================================
  // 模块三：日记（全屏直接写）
  // ============================================================
  let calendarYear, calendarMonth, editingDateKey = null, editingMood = MOODS[0].key;
  const diaryEditorPage = document.getElementById('diaryEditorPage');
  const diaryInput = document.getElementById('diaryInput');
  const moodPicker = document.getElementById('moodPicker');

  function initCalendar(){ const now = new Date(); calendarYear = now.getFullYear(); calendarMonth = now.getMonth(); }
  function openDiaryEditor(dateKey){
    editingDateKey = dateKey;
    const existing = diaries[dateKey];
    document.getElementById('diaryEditorDate').textContent = dateKey;
    diaryInput.value = existing ? existing.text : '';
    editingMood = existing ? existing.mood : MOODS[0].key;
    renderMoodPicker();
    diaryEditorPage.classList.add('show');
    setTimeout(()=> diaryInput.focus(), 100);
  }
  document.getElementById('diaryEditorBackBtn').addEventListener('click', ()=>{
    diaryEditorPage.classList.remove('show'); renderCalendar();
  });
  document.getElementById('diarySaveBtn').addEventListener('click', ()=>{
    const text = diaryInput.value.trim();
    if(text){
      diaries[editingDateKey] = { date: editingDateKey, mood: editingMood, text, time: Date.now() };
      saveDiaries(); showToast('已保存');
    }
    diaryEditorPage.classList.remove('show'); renderCalendar();
  });

  function renderCalendar(){
    document.getElementById('calendarTitle').textContent = `${calendarYear}年${calendarMonth+1}月`;
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth+1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const todayStr = todayKey(); let html='';
    for(let i=firstDay-1; i>=0; i--) html += `<div class="cal-day other-month">${daysInPrevMonth-i}</div>`;
    for(let d=1; d<=daysInMonth; d++){
      const pad = n=>String(n).padStart(2,'0'); const key = `${calendarYear}-${pad(calendarMonth+1)}-${pad(d)}`;
      const diary = diaries[key]; const isToday = key===todayStr; const mood = diary ? MOODS.find(m=>m.key===diary.mood) : null;
      let cls = 'cal-day'; if(isToday) cls += ' today'; if(diary) cls += ' has-diary';
      html += `<div class="${cls}" data-date="${key}"><span>${d}</span>${mood?`<span class="mood-dot" style="background:${mood.color};"></span>`:''}</div>`;
    }
    const total = firstDay + daysInMonth; const rest = total%7===0?0:7-(total%7);
    for(let i=1; i<=rest; i++) html += `<div class="cal-day other-month">${i}</div>`;
    document.getElementById('calendarGrid').innerHTML = html;
    document.querySelectorAll('.cal-day[data-date]').forEach(cell=>{ cell.addEventListener('click', ()=> openDiaryEditor(cell.dataset.date)); });

    let legendHtml=''; MOODS.forEach(m=>{ legendHtml += `<div class="legend-item"><span class="legend-dot" style="background:${m.color};"></span>${m.label}</div>`; });
    document.getElementById('diaryLegend').innerHTML = legendHtml;

    const keys = Object.keys(diaries).sort().reverse();
    const diaryList = document.getElementById('diaryList');
    if(keys.length===0){ diaryList.innerHTML=''; return; }
    let listHtml='';
    keys.forEach(k=>{
      const d = diaries[k]; const mood = MOODS.find(m=>m.key===d.mood) || MOODS[0];
      listHtml += `<div class="diary-card" data-date="${k}"><span class="diary-date">${k}</span><span class="diary-mood-tag" style="background:${mood.color};">${mood.label}</span></div>`;
    });
    diaryList.innerHTML = listHtml;
    document.querySelectorAll('.diary-card').forEach(card=>{ card.addEventListener('click', ()=> openDiaryEditor(card.dataset.date)); });
  }
  function renderMoodPicker(){
    let html=''; MOODS.forEach(m=>{ html += `<div class="mood-item ${editingMood===m.key?'selected':''}" data-mood="${m.key}"><div class="mood-color-circle" style="background:${m.color};"></div><div class="mood-label">${m.label}</div></div>`; });
    moodPicker.innerHTML = html;
    moodPicker.querySelectorAll('.mood-item').forEach(item=>{ item.addEventListener('click', ()=>{ editingMood = item.dataset.mood; renderMoodPicker(); }); });
  }
  document.getElementById('prevMonthBtn').addEventListener('click', ()=>{ calendarMonth--; if(calendarMonth<0){ calendarMonth=11; calendarYear--; } renderCalendar(); });
  document.getElementById('nextMonthBtn').addEventListener('click', ()=>{ calendarMonth++; if(calendarMonth>11){ calendarMonth=0; calendarYear++; } renderCalendar(); });

  // ============================================================
  // 模块四：创作（三级结构：书-卷-章节）
  // ============================================================
  const creativeManager = document.getElementById('creativeManager');
  const creativeManagerTitle = document.getElementById('creativeManagerTitle');
  const creativeManagerList = document.getElementById('creativeManagerList');
  let currentManagerMode = 'books'; // 'books' | 'volumes' | 'chapters'
  let currentBookId = null, currentVolumeId = null;
  
  document.getElementById('newCreativeBtn').addEventListener('click', async ()=>{
    if(currentManagerMode === 'books'){
      const name = prompt('输入书名：'); if(!name) return;
      const book = { id: genId(), title: name, createdAt: Date.now() };
      await dbPut('books', book); renderCreativeList();
    } else if(currentManagerMode === 'volumes'){
      const name = prompt('输入卷名：'); if(!name) return;
      const vol = { id: genId(), bookId: currentBookId, title: name, createdAt: Date.now() };
      await dbPut('volumes', vol); renderCreativeList();
    } else if(currentManagerMode === 'chapters'){
      const name = prompt('输入章节名：'); if(!name) return;
      const chap = { id: genId(), volumeId: currentVolumeId, title: name, bodyHtml: '', bodyText: '', updatedAt: Date.now() };
      await dbPut('chapters', chap); renderCreativeList();
    }
  });

  document.getElementById('creativeManagerBackBtn').addEventListener('click', ()=>{
    if(currentManagerMode === 'chapters'){ currentManagerMode = 'volumes'; renderCreativeList(); }
    else if(currentManagerMode === 'volumes'){ currentManagerMode = 'books'; renderCreativeList(); }
    else { creativeManager.classList.remove('show'); }
  });

  async function renderCreativeList(){
    if(!db) return;
    creativeManagerTitle.textContent = currentManagerMode === 'books' ? '所有书籍' : (currentManagerMode === 'volumes' ? '分卷列表' : '章节列表');
    document.getElementById('newCreativeBtn').textContent = currentManagerMode === 'books' ? '新建书籍' : '新建';

    let html = '';
    if(currentManagerMode === 'books'){
      const books = await dbGetAll('books');
      if(books.length===0){ creativeManagerList.innerHTML = `<div class="empty-tip">还没有书，点右上角新建</div>`; return; }
      books.sort((a,b)=>b.createdAt-a.createdAt).forEach(b=>{
        html += `<div class="creative-item" data-id="${b.id}"><div><div class="creative-item-title">${escapeHtml(b.title)}</div><div class="creative-item-meta">创建于 ${formatRelativeTime(b.createdAt)}</div></div><button class="small-icon-btn delete-book-btn" data-id="${b.id}">删除</button></div>`;
      });
    } else if(currentManagerMode === 'volumes'){
      const vols = (await dbGetAll('volumes')).filter(v=>v.bookId === currentBookId);
      if(vols.length===0){ creativeManagerList.innerHTML = `<div class="empty-tip">还没有卷，点右上角新建</div>`; return; }
      vols.sort((a,b)=>a.createdAt-b.createdAt).forEach(v=>{
        html += `<div class="creative-item" data-id="${v.id}"><div><div class="creative-item-title">${escapeHtml(v.title)}</div><div class="creative-item-meta">创建于 ${formatRelativeTime(v.createdAt)}</div></div><button class="small-icon-btn delete-vol-btn" data-id="${v.id}">删除</button></div>`;
      });
    } else if(currentManagerMode === 'chapters'){
      const chaps = (await dbGetAll('chapters')).filter(c=>c.volumeId === currentVolumeId);
      if(chaps.length===0){ creativeManagerList.innerHTML = `<div class="empty-tip">还没有章节，点右上角新建</div>`; return; }
      chaps.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).forEach(c=>{
        html += `<div class="creative-item" data-id="${c.id}"><div><div class="creative-item-title">${escapeHtml(c.title)}</div><div class="creative-item-meta">${formatRelativeTime(c.updatedAt)} 修改</div></div><button class="small-icon-btn delete-chap-btn" data-id="${c.id}">删除</button></div>`;
      });
    }
    creativeManagerList.innerHTML = html;
    
    // 绑定事件
    if(currentManagerMode === 'books'){
      creativeManagerList.querySelectorAll('.creative-item').forEach(el=>{ el.addEventListener('click', (e)=>{ if(e.target.tagName === 'BUTTON') return; currentBookId = el.dataset.id; currentManagerMode = 'volumes'; renderCreativeList(); }); });
      creativeManagerList.querySelectorAll('.delete-book-btn').forEach(btn=>{ btn.addEventListener('click', async (e)=>{ e.stopPropagation(); if(confirm('删除整本书？')){ await dbDelete('books', btn.dataset.id); renderCreativeList(); } }); });
    } else if(currentManagerMode === 'volumes'){
      creativeManagerList.querySelectorAll('.creative-item').forEach(el=>{ el.addEventListener('click', (e)=>{ if(e.target.tagName === 'BUTTON') return; currentVolumeId = el.dataset.id; currentManagerMode = 'chapters'; renderCreativeList(); }); });
      creativeManagerList.querySelectorAll('.delete-vol-btn').forEach(btn=>{ btn.addEventListener('click', async (e)=>{ e.stopPropagation(); if(confirm('删除这卷？')){ await dbDelete('volumes', btn.dataset.id); renderCreativeList(); } }); });
    } else if(currentManagerMode === 'chapters'){
      creativeManagerList.querySelectorAll('.creative-item').forEach(el=>{ el.addEventListener('click', (e)=>{ if(e.target.tagName === 'BUTTON') return; openCreativeEditor(el.dataset.id); }); });
      creativeManagerList.querySelectorAll('.delete-chap-btn').forEach(btn=>{ btn.addEventListener('click', async (e)=>{ e.stopPropagation(); if(confirm('删除此章节？')){ await dbDelete('chapters', btn.dataset.id); renderCreativeList(); } }); });
    }
  }

  // 富文本编辑器逻辑
  const creativeEditor = document.getElementById('creativeEditor');
  const creativeTitleInput = document.getElementById('creativeTitleInput');
  const creativeBodyInput = document.getElementById('creativeBodyInput');
  const creativeEditorBody = document.getElementById('creativeEditorBody');
  const creativeWordCount = document.getElementById('creativeWordCount');
  let currentChapterId = null, currentBgKey = 'white', creativeSaveTimer = null;

  // 渲染工具栏颜色和背景
  const toolColorsEl = document.getElementById('toolColors');
  const toolBgsEl = document.getElementById('toolBgs');
  let colorsHtml = ''; FONT_COLORS.forEach(c=>{ colorsHtml += `<div class="tool-color" style="background:${c};" data-color="${c}"></div>`; }); toolColorsEl.innerHTML = colorsHtml;
  toolColorsEl.querySelectorAll('.tool-color').forEach(el=>{ el.addEventListener('click', ()=> document.execCommand('foreColor', false, el.dataset.color)); });

  let bgsHtml = ''; CREATIVE_BGS.forEach(bg=>{ 
    const preview = bg.key==='moon' ? '#1a1f35' : bg.key==='cloud' ? '#e8f0fa' : bg.key==='leaf' ? '#f0f8ee' : bg.key==='mountain' ? '#e8eef4' : bg.key==='line' ? 'repeating-linear-gradient(0deg,#fff8e7,#fff8e7 5px,#e8dcc8 6px)' : bg.key==='dark' ? '#2a2326' : '#ffffff';
    bgsHtml += `<div class="tool-bg" style="background:${preview}" data-bg="${bg.key}" title="${bg.label}"></div>`; 
  }); toolBgsEl.innerHTML = bgsHtml;
  toolBgsEl.querySelectorAll('.tool-bg').forEach(el=>{ el.addEventListener('click', ()=> applyBg(el.dataset.bg)); });

  function applyBg(bgKey){
    const bg = CREATIVE_BGS.find(b=>b.key===bgKey); if(!bg) return;
    CREATIVE_BGS.forEach(b=> creativeEditorBody.classList.remove(b.cls));
    creativeEditorBody.classList.add(bg.cls); currentBgKey = bgKey;
    toolBgsEl.querySelectorAll('.tool-bg').forEach(el=>{ el.classList.toggle('selected', el.dataset.bg===bgKey); });
  }

  document.getElementById('toolBold').addEventListener('click', ()=> document.execCommand('bold'));
  document.getElementById('toolItalic').addEventListener('click', ()=> document.execCommand('italic'));
  document.getElementById('toolUnderline').addEventListener('click', ()=> document.execCommand('underline'));
  document.getElementById('toolClear').addEventListener('click', ()=> document.execCommand('removeFormat'));
  document.getElementById('toolFontSelect').addEventListener('change', (e)=> document.execCommand('fontName', false, FONT_MAP[e.target.value] || FONT_MAP.system));

  async function openCreativeEditor(id){
    const chaps = await dbGetAll('chapters'); const chapter = chaps.find(c=>c.id===id);
    if(!chapter) return;
    currentChapterId = chapter.id; creativeTitleInput.value = chapter.title;
    creativeBodyInput.innerHTML = chapter.bodyHtml || ''; currentBgKey = chapter.bgKey || 'white'; applyBg(currentBgKey);
    updateCreativeWordCount(); creativeEditor.classList.add('show'); setTimeout(()=> creativeBodyInput.focus(), 100);
  }
  document.getElementById('creativeEditorBackBtn').addEventListener('click', ()=>{ saveCreativeArticle(false).then(()=>{ creativeEditor.classList.remove('show'); renderCreativeList(); }); });
  document.getElementById('creativeEditorSaveBtn').addEventListener('click', ()=> saveCreativeArticle(true));

  function updateCreativeWordCount(){ const text = creativeBodyInput.innerText || ''; creativeWordCount.textContent = `${text.length} 字`; }
  function scheduleAutoSave(){ updateCreativeWordCount(); clearTimeout(creativeSaveTimer); creativeSaveTimer = setTimeout(()=> saveCreativeArticle(false), 800); }
  creativeTitleInput.addEventListener('input', scheduleAutoSave); creativeBodyInput.addEventListener('input', scheduleAutoSave);

  async function saveCreativeArticle(showFeedback){
    const title = creativeTitleInput.value.trim(); const bodyHtml = creativeBodyInput.innerHTML; const bodyText = creativeBodyInput.innerText || '';
    if(!title && !bodyText.trim()) return;
    const chaps = await dbGetAll('chapters'); const chapter = chaps.find(c=>c.id===currentChapterId);
    if(chapter){
      chapter.title = title || '无标题'; chapter.bodyHtml = bodyHtml; chapter.bodyText = bodyText; chapter.bgKey = currentBgKey; chapter.updatedAt = Date.now();
      await dbPut('chapters', chapter);
      if(showFeedback) showToast('已保存');
    }
  }

  // 导出长图功能（Canvas 渲染）
  const canvas = document.getElementById('exportCanvas');
  const ctx = canvas.getContext('2d');

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    let words = text.split('');
    let line = '';
    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + '';
      let metrics = context.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else { line = testLine; }
    }
    context.fillText(line, x, y);
    return y;
  }

  document.getElementById('toolExportImg').addEventListener('click', ()=>{
    const bodyText = creativeBodyInput.innerText || '';
    generateLongImage('Room 创作', creativeTitleInput.value, bodyText);
  });

  function exportChatToImage(){
    const list = chatLists.find(l=>l.id===currentListId); if(!list) return;
    let text = '';
    list.messages.forEach(m=>{ text += `【${m.senderName}】\n${m.text}\n\n`; });
    generateLongImage('Room 对话', list.title, text);
  }

  function generateLongImage(headerTitle, subTitle, content){
    const maxWidth = 600; const padding = 40; const lineHeight = 28; const fontSize = 18;
    ctx.font = `${fontSize}px sans-serif`;
    // 粗略计算高度
    let lines = content.split('\n'); let height = padding * 3 + 60;
    lines.forEach(l=>{ height += Math.ceil(ctx.measureText(l).width / (maxWidth - padding*2)) * lineHeight; });
    height = Math.max(height, 800);
    
    canvas.width = maxWidth; canvas.height = height;
    // 背景
    ctx.fillStyle = '#fdfdfd'; ctx.fillRect(0, 0, maxWidth, height);
    // 头部
    ctx.fillStyle = '#2c3e50'; ctx.font = `bold 24px sans-serif`; ctx.fillText(headerTitle, padding, padding + 24);
    ctx.fillStyle = '#999'; ctx.font = `16px sans-serif`; ctx.fillText(subTitle, padding, padding + 56);
    ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(padding, padding+80); ctx.lineTo(maxWidth-padding, padding+80); ctx.stroke();
    
    // 正文
    ctx.fillStyle = '#333'; ctx.font = `${fontSize}px sans-serif`;
    let currentY = padding + 120;
    lines.forEach(line=>{
      currentY = wrapText(ctx, line, padding, currentY, maxWidth - padding*2, lineHeight) + lineHeight;
    });

    // 水印
    ctx.fillStyle = '#ccc'; ctx.font = `14px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText('—— 来自我的专属 Room', maxWidth/2, height - 30);

    // 下载
    const url = canvas.toDataURL('image/jpeg', 0.9);
    const a = document.createElement('a'); a.href = url; a.download = `Room_${Date.now()}.jpg`; a.click();
    showToast('长图已生成');
  }

  // ============================================================
  // 初始化
  // ============================================================
  async function init(){
    loadTheme(); loadChats(); loadDynamics(); loadDiaries(); initCalendar();
    try { await openDB(); } catch(e){ console.warn('DB err', e); }
    if(chatLists.length===0){
      const r1={id:genId(),name:'小明',color:PRESET_COLORS[0],isMain:true};
      const r2={id:genId(),name:'小红',color:PRESET_COLORS[1],isMain:false};
      chatLists.push({ id:genId(), title:'小明、小红', roles:[r1,r2], messages:[{id:genId(),senderId:r1.id,senderName:r1.name,text:'你好',time:nowTime()}] });
    }
    renderChatList(); updateDynamicRoleUI(); renderCalendar(); renderCreativeList();
  }
  init();
})();