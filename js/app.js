// ========================================================
// 國小段考（定期成績評量）考務即時管理系統 - 核心邏輯
// 適用臺灣公私立國民小學（一至六年級・導師與班級專屬對應）
// ========================================================

class ExamApp {
  constructor() {
    this.state = this.loadInitialState();
    this.currentView = 'admin';
    this.adminTab = 'matrix';
    this.selectedClassId = (this.state.classrooms && this.state.classrooms[0]) ? this.state.classrooms[0].classId : '101';
    this.filterGrade = 'all';
    this.filterStatus = 'all';
    this.currentUser = JSON.parse(sessionStorage.getItem('TW_EXAM_USER') || 'null');
    this.blackboardCarouselIndex = 0;
    this.carouselTimer = null;
    this.clockTimer = null;

    this.init();
  }

  loadInitialState() {
    try {
      const saved = localStorage.getItem('TW_EXAM_LOCAL_STATE');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 若儲存的舊資料是先前的國中701示範資料，自動清空並轉為國小空白設定
        if (parsed.classrooms && parsed.classrooms.some(c => c.classId === '701')) {
          console.log("偵測到舊版國中資料，已重設為國小全新空白狀態");
          localStorage.removeItem('TW_EXAM_LOCAL_STATE');
          return JSON.parse(JSON.stringify(window.EMPTY_EXAM_DATA));
        }
        if (parsed.config && (!parsed.config.schoolName || parsed.config.schoolName === '國民小學' || parsed.config.schoolName === '測試學校' || parsed.config.schoolName === '臺灣市立明倫國民小學')) {
          parsed.config.schoolName = "臺中市西屯區長安國小";
        }
        return parsed;
      }
    } catch (e) {
      console.warn("讀取本地儲存失敗，使用空白設定:", e);
    }
    // 使用者要求：預設清空所有資料 (全新空白狀態)
    return JSON.parse(JSON.stringify(window.EMPTY_EXAM_DATA));
  }

  init() {
    // 監聽 Firebase 雲端或跨頁籤即時更新
    window.firebaseService.subscribe((newState) => {
      this.state = newState;
      this.render();
      if (this.currentView === 'blackboard' || this.currentView === 'academic') {
        window.soundFX.playChime();
      }
    });

    window.addEventListener('hashchange', () => this.handleRouting());
    this.startTimers();
    this.handleRouting();
  }

  startTimers() {
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.clockTimer = setInterval(() => {
      this.updateLiveClocks();
    }, 1000);

    if (this.carouselTimer) clearInterval(this.carouselTimer);
    this.carouselTimer = setInterval(() => {
      this.stepBlackboardCarousel();
    }, 8000);
  }

  handleRouting() {
    const hash = window.location.hash.replace('#', '') || 'admin';
    const parts = hash.split('/');
    const view = parts[0];
    const sub = parts[1];

    if (['admin', 'blackboard', 'attendance', 'academic', 'invigilator', 'login'].includes(view)) {
      this.currentView = view;
      if (view === 'admin' && sub) {
        this.adminTab = sub;
      }
    } else {
      this.currentView = 'admin';
    }

    this.render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigate(hash) {
    window.location.hash = hash;
  }

  requireAuth(requiredRole = 'any') {
    if (!this.currentUser) {
      alert('⚠️ 權限管制：必須登入帳號與密碼才能修改資料！\n\n【教務管理員】帳號：test ／ 密碼：12345678\n【各班導師】請輸入教師姓名或班級代碼與密碼');
      this.openLoginModal();
      return false;
    }

    if (requiredRole === 'admin' && this.currentUser.role !== 'admin') {
      alert(`⚠️ 權限不足：您目前是以「${this.currentUser.name} (導師)」身分登入。\n此項全校設定與管理功能僅限教務處管理員 (test) 操作！`);
      return false;
    }

    return true;
  }

  async updateState(updater, logAction = null, logDetails = null) {
    const isAuthAction = ['管理員登入', '導師登入', '帳號登出'].includes(logAction);
    const isBlackboardReceipt = logAction === '黑板確認公告';

    if (!isAuthAction && !isBlackboardReceipt && !this.currentUser) {
      console.warn('[權限攔截] 尚未登入帳號密碼，禁止修改考務資料');
      alert('⚠️ 權限管制：必須登入帳號與密碼才能修改資料！');
      this.openLoginModal();
      return false;
    }

    if (typeof updater === 'function') {
      updater(this.state);
    }

    if (logAction) {
      const newLog = {
        id: 'log-' + Date.now(),
        action: logAction,
        operator: this.currentUser ? `${this.currentUser.name} (${this.currentUser.role === 'admin' ? '教務管理' : '導師'})` : '訪客',
        details: logDetails || '',
        timestamp: new Date().toISOString()
      };
      if (!this.state.auditLogs) this.state.auditLogs = [];
      this.state.auditLogs.unshift(newLog);
      if (this.state.auditLogs.length > 100) this.state.auditLogs.pop();
    }

    await window.firebaseService.syncState(this.state);
    this.render();
  }

  // ----------------------------------------------------
  // 帳號驗證與登入
  // ----------------------------------------------------
  login(username, password) {
    username = (username || '').trim();
    password = (password || '').trim();

    if (!username || !password) {
      return { success: false, message: '請輸入帳號與密碼！' };
    }

    // 支援測試管理員帳號：test / 12345678
    if (username.toLowerCase() === 'test' && password === '12345678') {
      this.currentUser = {
        id: 'admin-01',
        name: '教務主任 / 試務組長',
        username: 'test',
        role: 'admin',
        title: '教務處試務組'
      };
      sessionStorage.setItem('TW_EXAM_USER', JSON.stringify(this.currentUser));
      this.updateState(() => {}, '管理員登入', '教務處管理員 (test) 登入成功');
      window.soundFX.playChime();
      return { success: true };
    }

    // 支援教師/導師登入：可使用 教師姓名、班級全稱 (如一年一班)、班級代碼 (如101)、或帳號
    const teacher = (this.state.teachers || []).find(t => 
      t.username.toLowerCase() === username.toLowerCase() ||
      t.name === username ||
      t.assignedClassName === username ||
      t.assignedClassId === username ||
      ('t' + t.assignedClassId) === username.toLowerCase()
    );

    if (teacher) {
      const isPwdMatch = (teacher.password && teacher.password === password) ||
                         (!teacher.password && password === '12345678') ||
                         (password === '12345678');
      if (isPwdMatch) {
        this.currentUser = {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username,
          role: teacher.role || 'invigilator',
          assignedClassId: teacher.assignedClassId || '',
          assignedClassName: teacher.assignedClassName || '',
          department: teacher.department
        };
        sessionStorage.setItem('TW_EXAM_USER', JSON.stringify(this.currentUser));
        this.updateState(() => {}, '導師登入', `導師 ${teacher.name}（負責：${teacher.assignedClassName || '未指派'}）登入成功`);
        window.soundFX.playChime();
        return { success: true };
      }
    }

    return { success: false, message: '帳號或密碼錯誤！\n\n• 管理員帳號：test ／ 密碼：12345678\n• 導師：請輸入教師姓名或班級代碼與密碼' };
  }

  logout() {
    const name = this.currentUser ? this.currentUser.name : '使用者';
    this.currentUser = null;
    sessionStorage.removeItem('TW_EXAM_USER');
    this.updateState(() => {}, '帳號登出', `${name} 已安全登出`);
    alert('已安全登出系統。');
    this.render();
  }

  // ----------------------------------------------------
  // 主畫面渲染入口
  // ----------------------------------------------------
  render() {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    if (this.currentView === 'blackboard') {
      appEl.innerHTML = this.renderBlackboardView();
      this.attachBlackboardEvents();
      return;
    }

    appEl.innerHTML = `
      ${this.renderHeader()}
      <main class="main-container">
        ${this.renderMainContent()}
      </main>
      ${this.renderFooter()}
    `;

    this.attachCommonEvents();
  }

  // ----------------------------------------------------
  // 頂部導覽列 (和風・Header)
  // ----------------------------------------------------
  renderHeader() {
    const isFb = window.firebaseService.isConnected;
    const user = this.currentUser;

    return `
      <header class="site-header no-print">
        <div class="header-inner">
          <a href="#admin" class="brand-group">
            <div class="brand-emblem">評</div>
            <div class="brand-info">
              <h1>${this.escapeHtml(this.state.config.schoolName || '臺中市西屯區長安國小')}</h1>
              <p>${this.escapeHtml(this.state.config.academicYear || '')}・${this.escapeHtml(this.state.config.examName || '定期成績評量')} <span class="stamp stamp-shuin">長安國小考務</span></p>
            </div>
          </a>

          <nav>
            <ul class="nav-links">
              <li>
                <a href="#admin" class="nav-btn ${this.currentView === 'admin' ? 'active' : ''}">
                  <span>🏛️</span> 教務管理中心
                </a>
              </li>
              <li>
                <a href="#blackboard" class="nav-btn ${this.currentView === 'blackboard' ? 'active' : ''}">
                  <span>📺</span> 教室電子黑板
                </a>
              </li>
              <li>
                <a href="#attendance" class="nav-btn ${this.currentView === 'attendance' ? 'active' : ''}">
                  <span>📋</span> 出席即時看板
                </a>
              </li>
              <li>
                <a href="#academic" class="nav-btn ${this.currentView === 'academic' ? 'active' : ''}">
                  <span>🚨</span> 教務處狀況板
                </a>
              </li>
              <li>
                <a href="#invigilator" class="nav-btn ${this.currentView === 'invigilator' ? 'active' : ''}">
                  <span>👨‍🏫</span> 導師/監考工作台
                </a>
              </li>
            </ul>
          </nav>

          <div class="header-actions">
            <button id="btn-open-firebase" class="sync-indicator" title="點擊設定 Firebase 連線">
              <span class="sync-dot ${isFb ? 'firebase' : 'offline'}"></span>
              <span>${isFb ? 'Firebase 雲端同步' : '本機展示模式'}</span>
            </button>

            ${user ? `
              <div class="dropdown-user" style="display:inline-flex; align-items:center; gap:8px;">
                <span class="jp-tag" style="background:#FFF;">
                  <strong>${this.escapeHtml(user.name)}</strong> ${user.assignedClassName ? `(${this.escapeHtml(user.assignedClassName)}導師)` : (user.role === 'admin' ? '(教務處)' : '')}
                </span>
                <button id="btn-logout" class="btn btn-secondary btn-sm">登出</button>
              </div>
            ` : `
              <a href="#login" class="btn btn-primary btn-sm">
                <span>🔑</span> 登入
              </a>
            `}
          </div>
        </div>
      </header>
    `;
  }

  renderMainContent() {
    switch (this.currentView) {
      case 'admin':
        return this.renderAdminView();
      case 'attendance':
        return this.renderAttendanceBoardView();
      case 'academic':
        return this.renderAcademicBoardView();
      case 'invigilator':
        return this.renderInvigilatorView();
      case 'login':
        return this.renderLoginView();
      default:
        return this.renderAdminView();
    }
  }

  // ----------------------------------------------------
  // 1. 教務管理中心 (Admin View)
  // ----------------------------------------------------
  renderAdminView() {
    const classCount = (this.state.classrooms || []).length;
    const teacherCount = (this.state.teachers || []).length;
    const annoCount = (this.state.announcements || []).length;
    const issueCount = (this.state.issues || []).filter(i => i.status !== 'resolved').length;

    const tabs = [
      { id: 'matrix', label: '考場看板', icon: '📊', count: null },
      { id: 'classes', label: '班級與導師設定', icon: '🏫', count: classCount },
      { id: 'teachers', label: '教師名冊管理', icon: '👥', count: teacherCount },
      { id: 'broadcast', label: '公告與試題勘誤', icon: '📢', count: annoCount },
      { id: 'issues', label: '考場通報受理', icon: '🚨', count: issueCount },
      { id: 'assign', label: '監考排程', icon: '📋', count: null },
      { id: 'settings', label: '考程與基本設定', icon: '⚙️', count: null },
      { id: 'reports', label: '報表輸出', icon: '📑', count: null },
      { id: 'logs', label: '操作紀錄', icon: '📜', count: null }
    ];

    return `
      <div class="admin-view-container">
        <!-- 訪客/權限提示橫幅 -->
        ${!this.currentUser ? `
          <div style="background:#FFF9E6; border:1px solid #FFE082; border-left:4px solid var(--c-kohaku); padding:10px 16px; border-radius:var(--radius-sm); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.15rem;">🔒</span>
              <span style="font-size:0.85rem; color:#795548;">
                <strong>目前為訪客檢視模式</strong>：依考務安全規範，<strong>必須登入帳號與密碼才能修改資料</strong>（包含編輯班級、導師名冊、考程時間或發布試題勘誤）。
              </span>
            </div>
            <button class="btn btn-primary btn-sm" onclick="window.app.openLoginModal()">
              <span>🔑</span> 登入管理員 (test / 12345678)
            </button>
          </div>
        ` : (this.currentUser.role !== 'admin' ? `
          <div style="background:#EBF5FB; border:1px solid #AED6F1; border-left:4px solid var(--c-ai); padding:10px 16px; border-radius:var(--radius-sm); margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>👨‍🏫</span>
              <span style="font-size:0.85rem; color:#1B4F72;">
                您目前以 <strong>${this.escapeHtml(this.currentUser.name)} 老師</strong>（負責：${this.escapeHtml(this.currentUser.assignedClassName || '未指派')}）身分登入。教務處管理設定僅限管理員 (test) 修改，班級點名填報請至 <a href="#invigilator" style="font-weight:700; text-decoration:underline;">導師工作台</a>。
              </span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="window.app.openLoginModal()">
              切換管理員登入
            </button>
          </div>
        ` : '')}

        <!-- 次導覽頁籤列 -->
        <div class="toolbar-bar no-print" style="margin-bottom:20px;">
          <div class="toolbar-filters">
            ${tabs.map(t => `
              <button class="chip ${this.adminTab === t.id ? 'active' : ''}" onclick="window.app.switchAdminTab('${t.id}')">
                <span>${t.icon}</span> ${t.label} ${t.count !== null && t.count > 0 ? `<span class="stamp stamp-shuin" style="margin-left:4px;">${t.count}</span>` : ''}
              </button>
            `).join('')}
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="window.app.openQuickAnnouncementModal()">
              <span>➕</span> 發布試題勘誤
            </button>
          </div>
        </div>

        <!-- 分頁主內容 -->
        ${this.renderAdminTabContent()}
      </div>
    `;
  }

  switchAdminTab(tabId) {
    this.adminTab = tabId;
    window.location.hash = `admin/${tabId}`;
    this.render();
  }

  renderAdminTabContent() {
    switch (this.adminTab) {
      case 'matrix':
        return this.renderMatrixTab();
      case 'classes':
        return this.renderClassesTab();
      case 'teachers':
        return this.renderTeachersTab();
      case 'broadcast':
        return this.renderBroadcastTab();
      case 'issues':
        return this.renderIssuesTab();
      case 'assign':
        return this.renderAssignTab();
      case 'settings':
        return this.renderSettingsTab();
      case 'reports':
        return this.renderReportsTab();
      case 'logs':
        return this.renderLogsTab();
      default:
        return this.renderMatrixTab();
    }
  }

  // ----------------------------------------------------
  // 1.1 考場看板 (Matrix Tab)
  // ----------------------------------------------------
  renderMatrixTab() {
    const classrooms = this.state.classrooms || [];
    
    // 若尚未設定班級，顯示引導畫面
    if (classrooms.length === 0) {
      return `
        <div class="jp-card" style="text-align:center; padding:50px 20px;">
          <div style="font-size:3rem; margin-bottom:12px;">🏫</div>
          <h2 class="jp-serif" style="font-size:1.4rem; color:var(--c-ink); margin-bottom:8px;">
            目前為全新空白系統（尚未建立國小班級）
          </h2>
          <p style="font-size:0.9rem; color:var(--c-ink-sub); max-width:540px; margin:0 auto 24px; line-height:1.7;">
            您已清空所有舊資料！現在可以依據您學校的編制新增各年級班級，並為每個老師對應指定一個負責班級；或點擊下方按鈕快速載入國小示範架構。
          </p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-lg" onclick="window.app.switchAdminTab('classes')">
              <span>🏫</span> 前往「班級與導師設定」新增班級
            </button>
            <button class="btn btn-secondary btn-lg" onclick="window.app.loadElementaryTemplate()">
              <span>⚡</span> 載入長安國小32班與導師名冊 (含密碼)
            </button>
          </div>
        </div>
      `;
    }

    const totalExpected = classrooms.reduce((s, c) => s + (Number(c.expectedCount) || 0), 0);
    const totalPresent = classrooms.reduce((s, c) => s + (Number(c.presentCount) || 0), 0);
    const totalAbsent = classrooms.reduce((s, c) => s + (Number(c.absentCount) || 0), 0);
    const reportedCount = classrooms.filter(c => c.statusReported).length;
    const activeIssues = (this.state.issues || []).filter(i => i.status !== 'resolved');

    let filtered = classrooms;
    if (this.filterGrade !== 'all') {
      filtered = filtered.filter(c => String(c.grade) === String(this.filterGrade));
    }
    if (this.filterStatus === 'absent') {
      filtered = filtered.filter(c => (c.absentCount || 0) > 0);
    } else if (this.filterStatus === 'waiting') {
      filtered = filtered.filter(c => !c.statusReported);
    } else if (this.filterStatus === 'all_present') {
      filtered = filtered.filter(c => c.statusReported && (c.absentCount || 0) === 0);
    }

    return `
      <!-- 統計數據橫列 -->
      <div class="matrix-stats-bar">
        <div class="stat-box matcha">
          <div class="stat-label">國小應到學童總數</div>
          <div class="stat-value">${totalExpected}</div>
          <div class="stat-desc">全校共 ${classrooms.length} 間班級試場</div>
        </div>
        <div class="stat-box">
          <div class="stat-label">實到人數 (到考率)</div>
          <div class="stat-value">${totalPresent} <small style="font-size:0.9rem; font-weight:500;">(${totalExpected ? Math.round(totalPresent / totalExpected * 100) : 0}%)</small></div>
          <div class="stat-desc">點名回報完成度: ${reportedCount}/${classrooms.length} 班</div>
        </div>
        <div class="stat-box hiiro">
          <div class="stat-label">缺席學童總數</div>
          <div class="stat-value" style="color:var(--c-hiiro);">${totalAbsent}</div>
          <div class="stat-desc">含公假、事假、病假與未註明</div>
        </div>
        <div class="stat-box kohaku">
          <div class="stat-label">考場突發狀況</div>
          <div class="stat-value" style="color:var(--c-kohaku);">${activeIssues.length}</div>
          <div class="stat-desc">${activeIssues.length > 0 ? '需巡堂或試務人員關注處置' : '全校試場平穩進行中'}</div>
        </div>
      </div>

      <!-- 年級與狀態篩選列 -->
      <div class="toolbar-bar">
        <div class="toolbar-filters">
          <span style="font-size:0.8rem; font-weight:700; color:var(--c-ink-sub);">國小年級：</span>
          <button class="chip ${this.filterGrade === 'all' ? 'active' : ''}" onclick="window.app.setFilterGrade('all')">全校</button>
          <button class="chip ${this.filterGrade === '1' ? 'active' : ''}" onclick="window.app.setFilterGrade('1')">一年級</button>
          <button class="chip ${this.filterGrade === '2' ? 'active' : ''}" onclick="window.app.setFilterGrade('2')">二年級</button>
          <button class="chip ${this.filterGrade === '3' ? 'active' : ''}" onclick="window.app.setFilterGrade('3')">三年級</button>
          <button class="chip ${this.filterGrade === '4' ? 'active' : ''}" onclick="window.app.setFilterGrade('4')">四年級</button>
          <button class="chip ${this.filterGrade === '5' ? 'active' : ''}" onclick="window.app.setFilterGrade('5')">五年級</button>
          <button class="chip ${this.filterGrade === '6' ? 'active' : ''}" onclick="window.app.setFilterGrade('6')">六年級</button>

          <span style="font-size:0.8rem; font-weight:700; color:var(--c-ink-sub); margin-left:12px;">狀態：</span>
          <button class="chip ${this.filterStatus === 'all' ? 'active' : ''}" onclick="window.app.setFilterStatus('all')">全部班級</button>
          <button class="chip ${this.filterStatus === 'absent' ? 'active' : ''}" onclick="window.app.setFilterStatus('absent')">有缺席考場</button>
          <button class="chip ${this.filterStatus === 'waiting' ? 'active' : ''}" onclick="window.app.setFilterStatus('waiting')">等候點名</button>
          <button class="chip ${this.filterStatus === 'all_present' ? 'active' : ''}" onclick="window.app.setFilterStatus('all_present')">全員到齊</button>
        </div>

        <div>
          <button class="btn btn-secondary btn-sm" onclick="window.soundFX.playExamBell()">
            <span>🔔</span> 考場預備鐘聲
          </button>
        </div>
      </div>

      <!-- 班級考場卡片網格 -->
      <div class="classroom-grid">
        ${filtered.map(c => this.renderClassroomCard(c)).join('')}
      </div>
    `;
  }

  setFilterGrade(g) {
    this.filterGrade = g;
    this.render();
  }

  setFilterStatus(s) {
    this.filterStatus = s;
    this.render();
  }

  renderClassroomCard(c) {
    const isReported = c.statusReported;
    const hasAbsent = isReported && (c.absentCount > 0);
    const cardClass = !isReported ? 'waiting' : (hasAbsent ? 'has-absent' : 'all-present');
    const absentList = c.absentStudents || [];
    const hasActiveIssue = (this.state.issues || []).some(i => i.classId === c.classId && i.status !== 'resolved');

    return `
      <div class="class-card ${cardClass} ${hasActiveIssue ? 'has-incident' : ''}" onclick="window.app.openClassDetailModal('${c.classId}')">
        <div class="class-card-head">
          <div class="class-card-id">${this.escapeHtml(c.className)}</div>
          <div>
            ${!isReported ? '<span class="stamp stamp-kohaku">等候回報</span>' : (hasAbsent ? '<span class="stamp stamp-shuin">缺席あり</span>' : '<span class="stamp stamp-matcha">全到濟</span>')}
            ${hasActiveIssue ? '<span class="stamp stamp-shuin" style="margin-left:4px;">🚨 狀況通報</span>' : ''}
          </div>
        </div>

        <div class="class-card-teacher">
          <span>對應導師/監考：</span>
          <strong>${this.escapeHtml(c.assignedTeacherName || c.invigilator || '未指派導師')}</strong>
        </div>

        <div class="attendance-pill-group">
          <div class="att-pill">
            <span class="att-pill-label">應到人數</span>
            <span class="att-pill-num total">${c.expectedCount}</span>
          </div>
          <div class="att-pill">
            <span class="att-pill-label">實到作答</span>
            <span class="att-pill-num present">${isReported ? c.presentCount : '-'}</span>
          </div>
          <div class="att-pill">
            <span class="att-pill-label">缺席人數</span>
            <span class="att-pill-num absent">${isReported ? c.absentCount : '-'}</span>
          </div>
        </div>

        <div class="absent-tags-container">
          ${isReported && absentList.length > 0 ? absentList.map(s => `
            <span class="absent-student-tag">
              ${s.seatNo}號 ${this.escapeHtml(s.name || '')} (${this.escapeHtml(s.reason || '事假')})
            </span>
          `).join('') : (isReported ? '<span style="font-size:0.75rem; color:var(--c-matcha); font-weight:600;">全班準時應考無缺席</span>' : '<span style="font-size:0.75rem; color:var(--c-ink-light);">導師尚未送出點名</span>')}
        </div>

        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--c-border-sub); padding-top:8px;">
          <span style="font-size:0.7rem; color:var(--c-ink-light);">更新: ${c.lastUpdated ? new Date(c.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '未回報'}</span>
          <span style="font-size:0.75rem; color:var(--c-ai); font-weight:700;">點擊查看 / 編輯 ➔</span>
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------
  // 1.2 班級設定與導師配對 (Classes Tab - 重點功能！)
  // ----------------------------------------------------
  renderClassesTab() {
    const classrooms = this.state.classrooms || [];
    const teachers = this.state.teachers || [];

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <div>
            <h2 class="jp-card-title"><span>🏫</span> 國小班級設定與導師一對一配對</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">
              在此新增、編輯國小一至六年級各班，並為每個班級指定對應一位專屬負責老師（導師）。
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.app.openImportCsvModal()">
              <span>📥</span> 批次匯入名冊 (CSV)
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.openAddClassModal()">
              <span>➕</span> 新增單一班級
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.batchGenerateElementaryClasses()">
              <span>⚡</span> 載入長安國小32班
            </button>
            ${classrooms.length > 0 ? `
              <button class="btn btn-danger btn-sm" onclick="window.app.clearAllClasses()">
                <span>🗑️</span> 清空班級
              </button>
            ` : ''}
          </div>
        </div>

        ${classrooms.length === 0 ? `
          <div style="text-align:center; padding:40px; background:var(--c-washi-sub); border-radius:var(--radius-md); border:1px dashed var(--c-border);">
            <p style="font-size:1.05rem; font-weight:700; color:var(--c-ink); margin-bottom:8px;">
              目前尚未建立任何班級！
            </p>
            <p style="font-size:0.85rem; color:var(--c-ink-sub); margin-bottom:16px;">
              您可直接點擊「📥 批次匯入名冊 (CSV)」上傳檔案或貼上文字，或一鍵載入長安國小全校 32 班！
            </p>
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-primary btn-sm" onclick="window.app.openImportCsvModal()">
                <span>📥</span> 批次匯入名冊 (CSV / 文字)
              </button>
              <button class="btn btn-secondary btn-sm" onclick="window.app.batchGenerateElementaryClasses()">
                <span>⚡</span> 一鍵載入長安國小32班與導師
              </button>
            </div>
          </div>
        ` : `
          <div style="overflow-x:auto;">
            <table class="jp-table">
              <thead>
                <tr>
                  <th style="width:90px;">年級</th>
                  <th style="width:140px;">班級名稱 (代碼)</th>
                  <th style="width:110px;">應到人數</th>
                  <th style="min-width:220px;">對應負責導師 (每個老師對應一個班級)</th>
                  <th style="width:120px;">目前出席</th>
                  <th style="width:130px;">管理操作</th>
                </tr>
              </thead>
              <tbody>
                ${classrooms.map(c => `
                  <tr>
                    <td>
                      <span class="stamp stamp-ai">${c.grade} 年級</span>
                    </td>
                    <td>
                      <strong style="font-size:1.05rem;">${this.escapeHtml(c.className)}</strong>
                      <span style="font-size:0.75rem; color:var(--c-ink-light); display:block; font-family:var(--font-mono);">(${c.classId})</span>
                    </td>
                    <td>
                      <strong style="font-family:var(--font-mono); font-size:1.1rem;">${c.expectedCount}</strong> 人
                    </td>
                    <td>
                      <select class="form-select" style="padding:4px 8px; font-size:0.85rem;" onchange="window.app.assignTeacherToClass('${c.classId}', this.value)">
                        <option value="">-- 請選擇對應導師 --</option>
                        ${teachers.map(t => `
                          <option value="${t.id}" ${t.id === c.assignedTeacherId ? 'selected' : ''}>
                            ${t.name} ${t.assignedClassId && t.assignedClassId !== c.classId ? `(已指派至: ${t.assignedClassName})` : '(可指派)'}
                          </option>
                        `).join('')}
                      </select>
                    </td>
                    <td>
                      ${c.statusReported ? `
                        <span style="font-size:0.8rem; color:var(--c-matcha); font-weight:700;">實到 ${c.presentCount} / 缺 ${c.absentCount}</span>
                      ` : `
                        <span style="font-size:0.75rem; color:var(--c-ink-light);">等候回報</span>
                      `}
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="window.app.openEditClassModal('${c.classId}')">編輯</button>
                      <button class="btn btn-danger btn-sm" onclick="window.app.deleteClass('${c.classId}')">刪除</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  // 新增班級彈窗
  openAddClassModal() {
    if (!this.requireAuth('admin')) return;
    const teachers = this.state.teachers || [];
    const modalHtml = `
      <div class="modal-overlay" id="modal-add-class">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>🏫 新增國小班級與配對導師</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-add-class')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">國小年級</label>
              <select id="new-class-grade" class="form-select">
                <option value="1">一年級</option>
                <option value="2">二年級</option>
                <option value="3">三年級</option>
                <option value="4">四年級</option>
                <option value="5">五年級</option>
                <option value="6">六年級</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">班級全稱 (例如：一年一班、三年二班)</label>
              <input type="text" id="new-class-name" class="form-control" placeholder="例：一年一班" value="一年一班">
            </div>

            <div class="form-group">
              <label class="form-label">班級識別代碼 (純數字或簡碼)</label>
              <input type="text" id="new-class-id" class="form-control" placeholder="例：101" value="101">
            </div>

            <div class="form-group">
              <label class="form-label">班級應到學生人數</label>
              <input type="number" id="new-class-expected" class="form-control" value="25" min="1" max="60">
            </div>

            <div class="form-group">
              <label class="form-label">對應負責老師 (每個老師對應一個班級)</label>
              <div style="display:flex; gap:8px;">
                <select id="new-class-teacher-select" class="form-select" style="flex:1;">
                  <option value="">-- 選擇既有教師或於右側直接建立 --</option>
                  ${teachers.map(t => `
                    <option value="${t.id}">${t.name} (${t.department || '教師'})</option>
                  `).join('')}
                </select>
                <input type="text" id="new-class-teacher-new" class="form-control" style="flex:1;" placeholder="或直接輸入新導師姓名">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-add-class')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveNewClass()">建立班級</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  saveNewClass() {
    if (!this.requireAuth('admin')) return;
    const grade = Number(document.getElementById('new-class-grade').value) || 1;
    const className = document.getElementById('new-class-name').value.trim();
    let classId = document.getElementById('new-class-id').value.trim();
    const expectedCount = Number(document.getElementById('new-class-expected').value) || 25;
    const selectedTeacherId = document.getElementById('new-class-teacher-select').value;
    const newTeacherName = document.getElementById('new-class-teacher-new').value.trim();

    if (!className) return alert('請輸入班級名稱！');
    if (!classId) classId = 'c-' + Date.now();

    // 檢查班級代碼是否重複
    if ((this.state.classrooms || []).some(c => c.classId === classId)) {
      return alert('班級代碼已存在，請使用不同代碼！');
    }

    let assignedTeacherId = selectedTeacherId;
    let assignedTeacherName = '';

    // 若直接填寫了新導師姓名，自動為其建立教師帳號
    if (newTeacherName) {
      assignedTeacherId = 'tch-' + Date.now();
      assignedTeacherName = newTeacherName;
      const newTeacher = {
        id: assignedTeacherId,
        name: newTeacherName,
        username: 't' + classId,
        department: `${grade}年級導師`,
        role: 'invigilator',
        assignedClassId: classId,
        assignedClassName: className
      };
      if (!this.state.teachers) this.state.teachers = [];
      this.state.teachers.push(newTeacher);
    } else if (selectedTeacherId) {
      const existing = (this.state.teachers || []).find(t => t.id === selectedTeacherId);
      if (existing) {
        assignedTeacherName = existing.name;
        existing.assignedClassId = classId;
        existing.assignedClassName = className;
      }
    }

    const newClass = {
      classId,
      grade,
      className,
      expectedCount,
      presentCount: 0,
      absentCount: 0,
      absentStudents: [],
      statusReported: false,
      lastUpdated: null,
      assignedTeacherId,
      assignedTeacherName,
      invigilator: assignedTeacherName || '待指派導師',
      periodInvigilatorNames: { "period-1": assignedTeacherName, "period-2": assignedTeacherName, "period-3": assignedTeacherName }
    };

    this.updateState(state => {
      if (!state.classrooms) state.classrooms = [];
      state.classrooms.push(newClass);
      // 依年級與代碼排序
      state.classrooms.sort((a, b) => a.grade - b.grade || a.classId.localeCompare(b.classId));
    }, '新增班級', `建立班級：${className}，對應導師：${assignedTeacherName || '未指定'}`);

    this.closeModal('modal-add-class');
    alert(`班級【${className}】建立成功！`);
  }

  // 編輯班級彈窗
  openEditClassModal(classId) {
    if (!this.requireAuth('admin')) return;
    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (!cls) return;
    const teachers = this.state.teachers || [];

    const modalHtml = `
      <div class="modal-overlay" id="modal-edit-class">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>🏫 編輯班級與導師配對・${cls.className}</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-edit-class')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">班級全稱</label>
              <input type="text" id="edit-class-name" class="form-control" value="${this.escapeHtml(cls.className)}">
            </div>

            <div class="form-group">
              <label class="form-label">國小年級</label>
              <select id="edit-class-grade" class="form-select">
                ${[1, 2, 3, 4, 5, 6].map(g => `
                  <option value="${g}" ${cls.grade === g ? 'selected' : ''}>${g} 年級</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">應到人數</label>
              <input type="number" id="edit-class-exp" class="form-control" value="${cls.expectedCount}">
            </div>

            <div class="form-group">
              <label class="form-label">對應負責老師 (每個老師對應一個班級)</label>
              <select id="edit-class-teacher" class="form-select">
                <option value="">-- 未指派導師 --</option>
                ${teachers.map(t => `
                  <option value="${t.id}" ${t.id === cls.assignedTeacherId ? 'selected' : ''}>
                    ${t.name} (${t.department || '教師'})
                  </option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-edit-class')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveEditedClass('${cls.classId}')">儲存變更</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  saveEditedClass(classId) {
    if (!this.requireAuth('admin')) return;
    const className = document.getElementById('edit-class-name').value.trim();
    const grade = Number(document.getElementById('edit-class-grade').value) || 1;
    const exp = Number(document.getElementById('edit-class-exp').value) || 25;
    const teacherId = document.getElementById('edit-class-teacher').value;
    const teacher = (this.state.teachers || []).find(t => t.id === teacherId);

    this.updateState(state => {
      const cls = state.classrooms.find(c => c.classId === classId);
      if (cls) {
        cls.className = className;
        cls.grade = grade;
        cls.expectedCount = exp;
        cls.assignedTeacherId = teacherId;
        cls.assignedTeacherName = teacher ? teacher.name : '';
        cls.invigilator = teacher ? teacher.name : '待指派導師';
        if (!cls.periodInvigilatorNames) cls.periodInvigilatorNames = {};
        cls.periodInvigilatorNames["period-1"] = teacher ? teacher.name : '';
        cls.periodInvigilatorNames["period-2"] = teacher ? teacher.name : '';
        cls.periodInvigilatorNames["period-3"] = teacher ? teacher.name : '';
      }

      // 同步更新教師端的綁定關係
      state.teachers.forEach(t => {
        if (t.id === teacherId) {
          t.assignedClassId = classId;
          t.assignedClassName = className;
        } else if (t.assignedClassId === classId) {
          t.assignedClassId = '';
          t.assignedClassName = '';
        }
      });
    }, '修訂班級設定', `修改班級 ${className}，指定導師：${teacher ? teacher.name : '未指派'}`);

    this.closeModal('modal-edit-class');
  }

  // 刪除班級
  deleteClass(classId) {
    if (!this.requireAuth('admin')) return;
    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (!cls) return;
    if (confirm(`確定要刪除【${cls.className}】嗎？此動作將連同該班點名紀錄一併移除。`)) {
      this.updateState(state => {
        state.classrooms = state.classrooms.filter(c => c.classId !== classId);
        state.teachers.forEach(t => {
          if (t.assignedClassId === classId) {
            t.assignedClassId = '';
            t.assignedClassName = '';
          }
        });
      }, '刪除班級', `移除班級：${cls.className}`);
    }
  }

  // 指派對應老師
  assignTeacherToClass(classId, teacherId) {
    if (!this.requireAuth('admin')) return;
    const teacher = (this.state.teachers || []).find(t => t.id === teacherId);
    this.updateState(state => {
      const cls = state.classrooms.find(c => c.classId === classId);
      if (cls) {
        cls.assignedTeacherId = teacherId;
        cls.assignedTeacherName = teacher ? teacher.name : '';
        cls.invigilator = teacher ? teacher.name : '待指派導師';
        if (!cls.periodInvigilatorNames) cls.periodInvigilatorNames = {};
        cls.periodInvigilatorNames["period-1"] = teacher ? teacher.name : '';
      }
      state.teachers.forEach(t => {
        if (t.id === teacherId) {
          t.assignedClassId = classId;
          t.assignedClassName = cls ? cls.className : '';
        }
      });
    }, '指派導師', `考場 ${classId} 對應導師：${teacher ? teacher.name : '無'}`);
  }

  // 一鍵載入長安國小全校班級與導師名冊
  batchGenerateElementaryClasses() {
    if (!this.requireAuth('admin')) return;
    if (confirm('確定要載入臺中市西屯區長安國小全校 32 班（一至六年級）與 32 位專屬導師名冊與密碼嗎？')) {
      const sample = JSON.parse(JSON.stringify(window.ELEMENTARY_TEMPLATE_DATA));
      this.updateState(state => {
        state.classrooms = sample.classrooms;
        state.teachers = sample.teachers;
        state.config.periods = sample.config.periods;
      }, '批次建立長安國小班級', '一鍵載入長安國小32班與32位導師專屬密碼');
      alert('已成功載入長安國小全校 32 個班級與 32 位對應導師！');
    }
  }

  // 清空所有班級
  clearAllClasses() {
    if (!this.requireAuth('admin')) return;
    if (confirm('確定要清空全校所有班級資料嗎？')) {
      this.updateState(state => {
        state.classrooms = [];
        state.teachers.forEach(t => {
          t.assignedClassId = '';
          t.assignedClassName = '';
        });
      }, '清空班級', '清空所有班級資料');
    }
  }

  // ----------------------------------------------------
  // CSV 批次匯入與匯出模組 (支援：班級,姓名,密碼)
  // ----------------------------------------------------
  openImportCsvModal() {
    if (!this.requireAuth('admin')) return;
    const modalHtml = `
      <div class="modal-overlay" id="modal-import-csv">
        <div class="modal-dialog" style="max-width:700px;">
          <div class="modal-header">
            <h3>📥 批次匯入班級、導師名冊與專屬密碼 (CSV)</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-import-csv')">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--c-washi-sub); border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:12px; margin-bottom:14px;">
              <p style="font-size:0.85rem; font-weight:700; color:var(--c-ink); margin-bottom:4px;">
                📋 支援檔案格式：<code>班級,姓名,密碼</code>（首行表頭自動識別）
              </p>
              <p style="font-size:0.8rem; color:var(--c-ink-sub); line-height:1.5;">
                每行一筆，例如：<code>一年一班,廖O秀,shiou216</code>。<br>
                系統將自動解析一至六年級班級代碼、建立/對應班級，並為每位導師設定專屬登入密碼。
              </p>
            </div>

            <div class="form-group">
              <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                <span>上傳 CSV / TXT 檔案</span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.fillChanganCsvSample()">
                  📋 填入長安國小 32 班名冊範例
                </button>
              </label>
              <input type="file" id="csv-file-upload" class="form-control" accept=".csv,.txt" onchange="window.app.handleCsvFileSelect(event)">
            </div>

            <div class="form-group">
              <label class="form-label">或直接在此貼上名冊文字內容：</label>
              <textarea id="csv-paste-area" class="form-control" rows="8" style="font-family:var(--font-mono); font-size:0.82rem; line-height:1.5;" placeholder="班級,姓名,密碼&#10;一年一班,廖O秀,shiou216&#10;一年二班,邱O菁,ma640420&#10;..."></textarea>
            </div>

            <div class="form-group" style="margin-top:10px;">
              <label class="form-label">匯入模式選擇：</label>
              <div style="display:flex; gap:20px; font-size:0.85rem;">
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="import-mode" value="sync" checked>
                  <strong>同步配對模式</strong>（更新既有班級導師，自動補足缺少的班級）
                </label>
                <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                  <input type="radio" name="import-mode" value="overwrite">
                  <strong style="color:var(--c-hiiro);">全新覆蓋模式</strong>（清空現有班級與導師，完全以此名冊重新建立）
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-import-csv')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.executeCsvImport()">
              <span>🚀</span> 開始解析並匯入
            </button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  handleCsvFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const area = document.getElementById('csv-paste-area');
      if (area) area.value = text;
    };
    reader.readAsText(file, 'UTF-8');
  }

  fillChanganCsvSample() {
    const area = document.getElementById('csv-paste-area');
    if (area && window.CHANGAN_CSV_RAW) {
      area.value = window.CHANGAN_CSV_RAW;
    }
  }

  parseCsvText(rawText) {
    if (!rawText) return [];
    const digits = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10 };
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const results = [];

    lines.forEach((line, idx) => {
      // 略過表頭行
      if (idx === 0 && (line.includes('班級') || line.includes('姓名') || line.includes('密碼'))) {
        return;
      }
      const parts = line.split(/[,\t]/).map(s => s.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        const className = parts[0];
        const teacherName = parts[1];
        const password = parts[2] || '12345678';

        let grade = 1;
        let classNum = 1;
        const m = className.match(/([一二三四五六七八九1-9])年([一二三四五六七八九1-9]+)班/);
        if (m) {
          grade = digits[m[1]] || Number(m[1]) || 1;
          classNum = digits[m[2]] || Number(m[2]) || 1;
        } else {
          const numMatch = className.match(/^(\d)(\d{2})$/);
          if (numMatch) {
            grade = Number(numMatch[1]);
            classNum = Number(numMatch[2]);
          }
        }
        const classId = `${grade}${classNum < 10 ? '0' + classNum : classNum}`;

        results.push({
          className,
          teacherName,
          password,
          grade,
          classNum,
          classId
        });
      }
    });

    return results;
  }

  executeCsvImport() {
    if (!this.requireAuth('admin')) return;
    const rawText = (document.getElementById('csv-paste-area')?.value || '').trim();
    if (!rawText) return alert('請貼上 CSV 文字或選取檔案！');

    const parsed = this.parseCsvText(rawText);
    if (parsed.length === 0) {
      return alert('未在內容中解析出有效的班級與導師資料，請確認格式為：班級,姓名,密碼');
    }

    const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'sync';

    this.updateState(state => {
      if (mode === 'overwrite') {
        state.classrooms = [];
        state.teachers = [];
      }

      parsed.forEach(item => {
        const teacherId = 'tch-' + item.classId;

        // 1. 更新或建立教師
        let teacher = state.teachers.find(t => t.id === teacherId || t.name === item.teacherName || t.assignedClassId === item.classId);
        if (teacher) {
          teacher.name = item.teacherName;
          teacher.username = item.classId;
          teacher.password = item.password;
          teacher.assignedClassId = item.classId;
          teacher.assignedClassName = item.className;
          teacher.department = `${item.grade}年級導師`;
        } else {
          teacher = {
            id: teacherId,
            name: item.teacherName,
            username: item.classId,
            password: item.password,
            department: `${item.grade}年級導師`,
            role: 'invigilator',
            assignedClassId: item.classId,
            assignedClassName: item.className
          };
          state.teachers.push(teacher);
        }

        // 2. 更新或建立班級
        let cls = state.classrooms.find(c => c.classId === item.classId);
        if (cls) {
          cls.className = item.className;
          cls.grade = item.grade;
          cls.assignedTeacherId = teacher.id;
          cls.assignedTeacherName = item.teacherName;
          cls.invigilator = item.teacherName;
          if (!cls.periodInvigilatorNames) cls.periodInvigilatorNames = {};
          cls.periodInvigilatorNames["period-1"] = item.teacherName;
          cls.periodInvigilatorNames["period-2"] = item.teacherName;
          cls.periodInvigilatorNames["period-3"] = item.teacherName;
          cls.periodInvigilatorNames["period-4"] = item.teacherName;
        } else {
          cls = {
            classId: item.classId,
            grade: item.grade,
            className: item.className,
            expectedCount: 25,
            presentCount: 0,
            absentCount: 0,
            absentStudents: [],
            statusReported: false,
            lastUpdated: null,
            assignedTeacherId: teacher.id,
            assignedTeacherName: item.teacherName,
            invigilator: item.teacherName,
            periodInvigilatorNames: {
              "period-1": item.teacherName,
              "period-2": item.teacherName,
              "period-3": item.teacherName,
              "period-4": item.teacherName
            }
          };
          state.classrooms.push(cls);
        }
      });

      state.classrooms.sort((a, b) => a.grade - b.grade || a.classId.localeCompare(b.classId));
      state.teachers.sort((a, b) => (a.assignedClassId || '').localeCompare(b.assignedClassId || ''));
    }, '批次匯入名冊', `成功匯入 ${parsed.length} 筆班級、導師與專屬密碼`);

    window.soundFX.playChime();
    this.closeModal('modal-import-csv');
    alert(`🎉 成功匯入 ${parsed.length} 位導師與對應班級！\n老師們現在可以使用自己的姓名或班級代碼搭配專屬密碼登入。`);
    this.render();
  }

  // 匯出教師與班級密碼清冊 (CSV)
  exportTeachersCsv() {
    let csv = "\uFEFF班級,姓名,密碼\n";
    (this.state.teachers || []).forEach(t => {
      csv += `"${t.assignedClassName || ''}","${t.name}","${t.password || '12345678'}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `長安國小導師與班級密碼清冊_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // ----------------------------------------------------
  // 1.3 教師帳號管理 (Teachers Tab)
  // ----------------------------------------------------
  renderTeachersTab() {
    const list = this.state.teachers || [];
    const classrooms = this.state.classrooms || [];

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <div>
            <h2 class="jp-card-title"><span>👥</span> 國小教師名冊、對應班級與專屬密碼管理</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">
              維護全校各班導師名冊與專屬登入密碼，支援以 <code>班級,姓名,密碼</code> 格式進行 CSV 批次匯入匯出。
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="window.app.openImportCsvModal()">
              <span>📥</span> 批次匯入名冊 (CSV)
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.exportTeachersCsv()">
              <span>📤</span> 匯出名冊 (CSV)
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.openAddTeacherModal()">
              <span>➕</span> 新增教師帳號
            </button>
          </div>
        </div>

        ${list.length === 0 ? `
          <div style="text-align:center; padding:30px; color:var(--c-ink-sub);">
            目前尚無教師資料。請點擊上方「📥 批次匯入名冊 (CSV)」或「➕ 新增教師帳號」。
          </div>
        ` : `
          <table class="jp-table">
            <thead>
              <tr>
                <th style="width:130px;">教師姓名</th>
                <th style="width:150px;">對應班級 (一對一配對)</th>
                <th style="width:160px;">專屬登入密碼</th>
                <th>登入帳號識別</th>
                <th style="width:120px;">身分 / 角色</th>
                <th style="width:90px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(t => `
                <tr>
                  <td><strong style="font-size:1.05rem;">${this.escapeHtml(t.name)}</strong></td>
                  <td>
                    ${t.assignedClassName ? `
                      <span class="stamp stamp-matcha">對應：${this.escapeHtml(t.assignedClassName)}</span>
                    ` : `
                      <span style="font-size:0.8rem; color:var(--c-ink-light);">未指定班級</span>
                    `}
                  </td>
                  <td>
                    <code style="font-family:var(--font-mono); font-weight:700; color:var(--c-ai); background:var(--c-washi-sub); padding:3px 8px; border-radius:var(--radius-sm); border:1px solid var(--c-border);">
                      ${this.escapeHtml(t.password || '12345678')}
                    </code>
                  </td>
                  <td>
                    <code style="font-family:var(--font-mono);">${this.escapeHtml(t.username)}</code>
                    <small style="color:var(--c-ink-light); display:block; font-size:0.7rem;">(亦可用姓名或「${t.assignedClassName || t.username}」登入)</small>
                  </td>
                  <td>
                    <span class="stamp ${t.role === 'author' ? 'stamp-shuin' : 'stamp-ai'}">
                      ${t.role === 'author' ? '出題老師' : '班級導師/監考'}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-danger btn-sm" onclick="window.app.deleteTeacher('${t.id}')">刪除</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  }

  openAddTeacherModal() {
    if (!this.requireAuth('admin')) return;
    const classrooms = this.state.classrooms || [];
    const modalHtml = `
      <div class="modal-overlay" id="modal-add-teacher">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>👥 新增國小教師帳號</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-add-teacher')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">教師姓名</label>
              <input type="text" id="new-tch-name" class="form-control" placeholder="例：王美玲">
            </div>
            <div class="form-group">
              <label class="form-label">登入帳號</label>
              <input type="text" id="new-tch-user" class="form-control" placeholder="例：t101 或 英文名">
            </div>
            <div class="form-group">
              <label class="form-label">身分別 / 科別</label>
              <input type="text" id="new-tch-dept" class="form-control" placeholder="例：一年級導師、英語科任" value="班級導師">
            </div>
            <div class="form-group">
              <label class="form-label">登入密碼</label>
              <input type="text" id="new-tch-pwd" class="form-control" placeholder="自訂密碼或預設 12345678" value="12345678">
            </div>
            <div class="form-group">
              <label class="form-label">對應負責班級 (每個老師對應一個班級)</label>
              <select id="new-tch-class" class="form-select">
                <option value="">-- 未指派班級 (科任/科展等) --</option>
                ${classrooms.map(c => `
                  <option value="${c.classId}">${c.className}</option>
                `).join('')}
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-add-teacher')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveNewTeacher()">儲存建立</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  saveNewTeacher() {
    if (!this.requireAuth('admin')) return;
    const name = document.getElementById('new-tch-name').value.trim();
    const user = document.getElementById('new-tch-user').value.trim();
    const dept = document.getElementById('new-tch-dept').value.trim() || '導師';
    const pwd = document.getElementById('new-tch-pwd')?.value.trim() || '12345678';
    const classId = document.getElementById('new-tch-class').value;

    if (!name || !user) return alert('請填寫姓名與帳號！');

    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    const newId = 'tch-' + Date.now();

    const newTeacher = {
      id: newId,
      name,
      username: user,
      password: pwd,
      department: dept,
      role: 'invigilator',
      assignedClassId: classId,
      assignedClassName: cls ? cls.className : ''
    };

    this.updateState(state => {
      if (!state.teachers) state.teachers = [];
      state.teachers.push(newTeacher);

      if (cls) {
        cls.assignedTeacherId = newId;
        cls.assignedTeacherName = name;
        cls.invigilator = name;
      }
    }, '新增教師', `建立教師：${name} (${user})，密碼：${pwd}，對應班級：${cls ? cls.className : '無'}`);

    this.closeModal('modal-add-teacher');
  }

  deleteTeacher(id) {
    if (!this.requireAuth('admin')) return;
    const t = (this.state.teachers || []).find(item => item.id === id);
    if (!t) return;
    if (confirm(`確定要刪除【${t.name} 老師】帳號嗎？`)) {
      this.updateState(state => {
        state.teachers = state.teachers.filter(item => item.id !== id);
        state.classrooms.forEach(c => {
          if (c.assignedTeacherId === id) {
            c.assignedTeacherId = '';
            c.assignedTeacherName = '';
            c.invigilator = '待指派導師';
          }
        });
      }, '刪除教師', `移除教師：${t.name}`);
    }
  }

  formatGradeTarget(code) {
    switch (String(code)) {
      case 'all': return '全校各年級';
      case '1': return '僅一年級';
      case '2': return '僅二年級';
      case '3': return '僅三年級';
      case '4': return '僅四年級';
      case '5': return '僅五年級';
      case '6': return '僅六年級';
      case 'low': return '低年級 (1~2年級)';
      case 'mid': return '中年級 (3~4年級)';
      case 'high': return '高年級 (5~6年級)';
      default: return code ? `${code}年級` : '全校各年級';
    }
  }

  // ----------------------------------------------------
  // 1.4 公告與試題勘誤 (Broadcast Tab)
  // ----------------------------------------------------
  renderBroadcastTab() {
    const list = this.state.announcements || [];
    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <div>
            <h2 class="jp-card-title"><span>📢</span> 國小定期評量試題勘誤與考務廣播管理</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">
              在此發布試題勘誤與考務廣播，<strong>指定推播年級（幾年級就只會推播到幾年級）</strong>，並可附帶<strong>試題圖片連結或上傳圖檔</strong>。
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="window.app.openQuickAnnouncementModal()">
            <span>➕</span> 發布勘誤公告
          </button>
        </div>

        <table class="jp-table">
          <thead>
            <tr>
              <th style="width:100px;">類型</th>
              <th style="width:130px;">推播年級</th>
              <th style="width:90px;">科目</th>
              <th>公告標題、內容與試題圖片</th>
              <th style="width:130px;">發布時間</th>
              <th style="width:110px;">黑板回執</th>
              <th style="width:80px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${list.length === 0 ? '<tr><td colspan="7" style="text-align:center; padding:30px; color:var(--c-ink-light);">目前無公告</td></tr>' : list.map(a => `
              <tr>
                <td>
                  <span class="stamp ${a.priority === 'critical' ? 'stamp-shuin' : 'stamp-kohaku'}">
                    ${a.type === 'correction' ? '試題勘誤' : (a.type === 'extension' ? '考程順延' : '一般公告')}
                  </span>
                </td>
                <td>
                  <span class="stamp stamp-ai">${this.formatGradeTarget(a.targetGrade || a.targetAudience)}</span>
                </td>
                <td><strong>${this.escapeHtml(a.subject || '全校')}</strong></td>
                <td>
                  <div style="font-weight:700; color:var(--c-ink); margin-bottom:4px;">${this.escapeHtml(a.title)}</div>
                  <div style="font-size:0.82rem; color:var(--c-ink-sub); line-height:1.4; white-space:pre-wrap;">${this.escapeHtml(a.content)}</div>
                  ${a.imageUrl ? `
                    <div style="margin-top:6px; display:inline-flex; align-items:center; gap:8px;">
                      <img src="${this.escapeHtml(a.imageUrl)}" alt="縮圖" style="height:36px; border-radius:3px; border:1px solid var(--c-border); cursor:pointer;" onclick="window.app.openLightbox('${this.escapeHtml(a.imageUrl)}')">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.openLightbox('${this.escapeHtml(a.imageUrl)}')">
                        <span>🖼️</span> 查看勘誤題目大圖
                      </button>
                    </div>
                  ` : ''}
                </td>
                <td style="font-family:var(--font-mono); font-size:0.8rem;">
                  ${new Date(a.publishedAt).toLocaleTimeString()}
                </td>
                <td>
                  <span class="jp-tag">已確認 ${a.readByClassIds ? a.readByClassIds.length : 0} 班</span>
                </td>
                <td>
                  <button class="btn btn-danger btn-sm" onclick="window.app.deleteAnnouncement('${a.id}')">刪除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ----------------------------------------------------
  // 1.5 考場通報受理 (Issues Tab)
  // ----------------------------------------------------
  renderIssuesTab() {
    const issues = this.state.issues || [];
    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <h2 class="jp-card-title"><span>🚨</span> 國小考場突發狀況雙向受理中心</h2>
          <span class="stamp stamp-shuin">巡堂主管備註</span>
        </div>

        <p style="font-size:0.85rem; color:var(--c-ink-sub); margin-bottom:16px;">
          導師與監考老師於考場回報之試卷缺頁、學童身體不適（如發燒、腸胃不適就醫）、設備故障等，教務處即時受理並給予支援。
        </p>

        <table class="jp-table">
          <thead>
            <tr>
              <th style="width:110px;">班級考場</th>
              <th style="width:110px;">類型</th>
              <th>回報內容與處理狀態</th>
              <th style="width:140px;">通報時間</th>
              <th style="width:110px;">狀態</th>
              <th style="width:140px;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${issues.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--c-ink-light);">無突發通報</td></tr>' : issues.map(i => `
              <tr>
                <td><strong style="font-family:var(--font-mono); font-size:1.05rem;">${i.className}</strong></td>
                <td>
                  <span class="stamp ${i.isUrgent ? 'stamp-shuin' : 'stamp-ai'}">
                    ${i.type === 'paper' ? '試卷短缺' : (i.type === 'student' ? '學童不適' : (i.type === 'facility' ? '設備故障' : '突發狀況'))}
                  </span>
                </td>
                <td>
                  <div style="font-weight:600; color:var(--c-ink);">${this.escapeHtml(i.content)}</div>
                  ${i.reply ? `<div style="margin-top:6px; padding:6px 10px; background:var(--c-washi-sub); border-left:3px solid var(--c-matcha); font-size:0.8rem; color:var(--c-ink-sub);">教務處回覆：${this.escapeHtml(i.reply)} <small>(${this.escapeHtml(i.repliedBy || '')})</small></div>` : ''}
                </td>
                <td style="font-family:var(--font-mono); font-size:0.8rem;">${new Date(i.createdAt).toLocaleTimeString()}</td>
                <td>
                  <span class="stamp ${i.status === 'resolved' ? 'stamp-matcha' : (i.status === 'processing' ? 'stamp-kohaku' : 'stamp-shuin')}">
                    ${i.status === 'resolved' ? '處置完成' : (i.status === 'processing' ? '處置協調中' : '等候受理')}
                  </span>
                </td>
                <td>
                  <button class="btn btn-secondary btn-sm" onclick="window.app.openIssueReplyModal('${i.id}')">回覆 / 結案</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ----------------------------------------------------
  // 1.6 監考排程 (Assign Tab)
  // ----------------------------------------------------
  renderAssignTab() {
    const classrooms = this.state.classrooms || [];
    const periods = this.state.config.periods || [];
    const teachers = this.state.teachers || [];

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <h2 class="jp-card-title"><span>📋</span> 各節次考場監考老師排程</h2>
          <div>
            <button class="btn btn-secondary btn-sm" onclick="window.app.randomAssignTeachers()">
              <span>⚡</span> 自動指派排班
            </button>
          </div>
        </div>

        ${classrooms.length === 0 ? `
          <div style="text-align:center; padding:30px; color:var(--c-ink-sub);">
            請先在「班級與導師設定」中建立班級！
          </div>
        ` : `
          <div style="overflow-x:auto;">
            <table class="jp-table">
              <thead>
                <tr>
                  <th style="width:130px;">班級考場</th>
                  <th style="width:80px;">年級</th>
                  ${periods.map(p => `
                    <th>${this.escapeHtml(p.subject)}<br><small style="font-weight:normal;">${p.startTime}~${p.endTime}</small></th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${classrooms.map(c => `
                  <tr>
                    <td><strong style="font-size:1.05rem;">${c.className}</strong></td>
                    <td>${c.grade} 年級</td>
                    ${periods.map(p => {
                      const assignedTchId = c.periodInvigilators?.[p.id] || c.assignedTeacherId;
                      return `
                        <td>
                          <select class="form-select" style="padding:4px 6px; font-size:0.8rem;" onchange="window.app.assignTeacherToPeriod('${c.classId}', '${p.id}', this.value)">
                            <option value="">-- 未指派 --</option>
                            ${teachers.map(t => `
                              <option value="${t.id}" ${t.id === assignedTchId ? 'selected' : ''}>${t.name} (${t.department})</option>
                            `).join('')}
                          </select>
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  }

  assignTeacherToPeriod(classId, periodId, teacherId) {
    if (!this.requireAuth('admin')) return;
    const teacher = (this.state.teachers || []).find(t => t.id === teacherId);
    this.updateState(state => {
      const cls = state.classrooms.find(c => c.classId === classId);
      if (cls) {
        if (!cls.periodInvigilators) cls.periodInvigilators = {};
        if (!cls.periodInvigilatorNames) cls.periodInvigilatorNames = {};
        cls.periodInvigilators[periodId] = teacherId;
        cls.periodInvigilatorNames[periodId] = teacher ? teacher.name : '';
      }
    }, '監考指派異動', `考場 ${classId} 指派老師：${teacher ? teacher.name : '未指派'}`);
  }

  randomAssignTeachers() {
    if (!this.requireAuth('admin')) return;
    const teachers = this.state.teachers || [];
    const periods = this.state.config.periods || [];
    if (teachers.length === 0) return alert('請先建立教師名單！');

    this.updateState(state => {
      let tIdx = 0;
      state.classrooms.forEach(c => {
        if (!c.periodInvigilators) c.periodInvigilators = {};
        if (!c.periodInvigilatorNames) c.periodInvigilatorNames = {};
        periods.forEach(p => {
          const t = teachers[tIdx % teachers.length];
          c.periodInvigilators[p.id] = t.id;
          c.periodInvigilatorNames[p.id] = t.name;
          tIdx++;
        });
      });
    }, '批次監考排程', '全校各節次考場自動隨機平衡指派');
    alert('已成功完成全校各節次監考指派！');
  }

  // ----------------------------------------------------
  // 1.7 考程與基本設定 (Settings Tab)
  // ----------------------------------------------------
  renderSettingsTab() {
    const cfg = this.state.config;
    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <h2 class="jp-card-title"><span>⚙️</span> 國小考程時段與定期評量基本設定</h2>
          <button class="btn btn-primary btn-sm" onclick="window.app.saveConfigSettings()">儲存基本設定</button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px;">
          <div class="form-group">
            <label class="form-label">學校全銜</label>
            <input type="text" id="cfg-school" class="form-control" value="${this.escapeHtml(cfg.schoolName)}">
          </div>
          <div class="form-group">
            <label class="form-label">學年度與學期</label>
            <input type="text" id="cfg-year" class="form-control" value="${this.escapeHtml(cfg.academicYear)}">
          </div>
          <div class="form-group">
            <label class="form-label">評量考查名稱</label>
            <input type="text" id="cfg-exam" class="form-control" value="${this.escapeHtml(cfg.examName)}">
          </div>
          <div class="form-group">
            <label class="form-label">評量日期</label>
            <input type="date" id="cfg-date" class="form-control" value="${cfg.examDate}">
          </div>
        </div>

        <h3 class="jp-serif" style="margin:24px 0 12px; font-size:1.1rem; border-bottom:1px solid var(--c-border-sub); padding-bottom:6px;">
          國小定期評量各節次考程時間
        </h3>

        <table class="jp-table" style="margin-bottom:20px;">
          <thead>
            <tr>
              <th>節次代號</th>
              <th>評量科目 (國小考科)</th>
              <th>開始時間</th>
              <th>結束時間</th>
              <th>評量對象</th>
            </tr>
          </thead>
          <tbody>
            ${(cfg.periods || []).map((p, idx) => `
              <tr>
                <td>第 ${idx + 1} 節</td>
                <td><input type="text" class="form-control period-subject" data-id="${p.id}" value="${this.escapeHtml(p.subject)}"></td>
                <td><input type="time" class="form-control period-start" data-id="${p.id}" value="${p.startTime}"></td>
                <td><input type="time" class="form-control period-end" data-id="${p.id}" value="${p.endTime}"></td>
                <td>1 ~ 6 年級</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- 系統重設與資料管理區 (使用者特別指示！) -->
        <div style="background:var(--c-hiiro-bg); border:1px solid var(--c-hiiro); border-radius:var(--radius-md); padding:18px; margin-top:24px;">
          <h4 style="color:var(--c-hiiro); font-family:var(--font-serif); margin-bottom:8px;">⚠️ 考務資料清空與範本重設區</h4>
          <p style="font-size:0.85rem; color:var(--c-ink-sub); margin-bottom:14px; line-height:1.6;">
            您可以在此一鍵<strong>清空所有資料</strong>（包含班級、老師、點名、公告），由全新空白狀態重新自訂學校資料；亦可一鍵載入標準國小一至六年級範本。
          </p>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-danger btn-sm" onclick="window.app.resetToEmptyState()">
              <span>🗑️</span> 清空所有資料（空白重頭設定）
            </button>
            <button class="btn btn-secondary btn-sm" onclick="window.app.loadElementaryTemplate()">
              <span>🏫</span> 載入長安國小32班與導師名冊 (含密碼)
            </button>
          </div>
        </div>
      </div>
    `;
  }

  saveConfigSettings() {
    if (!this.requireAuth('admin')) return;
    const school = document.getElementById('cfg-school')?.value;
    const year = document.getElementById('cfg-year')?.value;
    const exam = document.getElementById('cfg-exam')?.value;
    const date = document.getElementById('cfg-date')?.value;

    this.updateState(state => {
      state.config.schoolName = school;
      state.config.academicYear = year;
      state.config.examName = exam;
      state.config.examDate = date;

      document.querySelectorAll('.period-subject').forEach(input => {
        const id = input.dataset.id;
        const p = state.config.periods.find(item => item.id === id);
        if (p) p.subject = input.value;
      });
      document.querySelectorAll('.period-start').forEach(input => {
        const id = input.dataset.id;
        const p = state.config.periods.find(item => item.id === id);
        if (p) p.startTime = input.value;
      });
      document.querySelectorAll('.period-end').forEach(input => {
        const id = input.dataset.id;
        const p = state.config.periods.find(item => item.id === id);
        if (p) p.endTime = input.value;
      });
    }, '修改考程基本設定', '教務處更新基本設定與各節考程時間');

    alert('考程基本設定已成功儲存！');
  }

  // 清空所有資料（回復全新空白狀態）
  resetToEmptyState() {
    if (!this.requireAuth('admin')) return;
    if (confirm('確定要清空所有資料嗎？這將移除所有班級、老師、點名紀錄與通報，讓您從完全空白的狀態開始自訂。')) {
      this.updateState(state => {
        const empty = JSON.parse(JSON.stringify(window.EMPTY_EXAM_DATA));
        Object.keys(empty).forEach(k => {
          state[k] = empty[k];
        });
      }, '清空考務資料', '管理員清空所有班級與考務資料');
      alert('已成功清空所有考務資料，目前為全新空白系統！');
      this.switchAdminTab('classes');
    }
  }

  // 載入國小示範資料
  loadElementaryTemplate() {
    if (!this.requireAuth('admin')) return;
    if (confirm('確定要載入臺中市西屯區長安國小全校 32 班（一至六年級）與 32 位專屬導師名冊與密碼嗎？')) {
      this.updateState(state => {
        const tpl = JSON.parse(JSON.stringify(window.ELEMENTARY_TEMPLATE_DATA));
        Object.keys(tpl).forEach(k => {
          state[k] = tpl[k];
        });
      }, '載入長安國小名冊', '管理員載入長安國小 32 班與 32 位專屬導師及密碼');
      alert('已成功載入長安國小全校 32 個班級與 32 位對應導師及專屬密碼！');
      this.switchAdminTab('matrix');
    }
  }

  // ----------------------------------------------------
  // 1.8 報表輸出 (Reports Tab)
  // ----------------------------------------------------
  renderReportsTab() {
    const classrooms = this.state.classrooms || [];
    const allAbsents = [];
    classrooms.forEach(c => {
      if (c.absentStudents && c.absentStudents.length > 0) {
        c.absentStudents.forEach(s => {
          allAbsents.push({
            className: c.className,
            teacherName: c.assignedTeacherName || c.invigilator || '',
            seatNo: s.seatNo,
            name: s.name,
            reason: s.reason || '事假'
          });
        });
      }
    });

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <h2 class="jp-card-title"><span>📑</span> 國小定期評量缺席學童名冊清單</h2>
          <div class="no-print">
            <button class="btn btn-secondary btn-sm" onclick="window.print()">
              <span>🖨️</span> 列印通報表
            </button>
            <button class="btn btn-primary btn-sm" onclick="window.app.exportAbsentCsv()">
              <span>📥</span> 匯出缺席清單 (CSV)
            </button>
          </div>
        </div>

        <div style="text-align:center; margin:20px 0;">
          <h2 class="jp-serif" style="font-size:1.4rem;">${this.escapeHtml(this.state.config.schoolName)}</h2>
          <h3 style="font-size:1.1rem; color:var(--c-ink-sub); margin-top:4px;">${this.escapeHtml(this.state.config.academicYear)} ${this.escapeHtml(this.state.config.examName)} 缺席學童通報清冊</h3>
          <p style="font-size:0.8rem; color:var(--c-ink-light); margin-top:4px;">造表時間：${new Date().toLocaleString()}</p>
        </div>

        <table class="jp-table">
          <thead>
            <tr>
              <th style="width:60px;">序號</th>
              <th style="width:130px;">班級</th>
              <th style="width:120px;">班級導師</th>
              <th style="width:100px;">座號</th>
              <th style="width:130px;">姓名</th>
              <th>缺席假別與備註</th>
            </tr>
          </thead>
          <tbody>
            ${allAbsents.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:24px;">全校各班級無缺席學童</td></tr>' : allAbsents.map((s, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${s.className}</strong></td>
                <td>${this.escapeHtml(s.teacherName)}</td>
                <td><code style="font-family:var(--font-mono); font-size:1.05rem;">${s.seatNo} 號</code></td>
                <td>${this.escapeHtml(s.name || '（未註明姓名）')}</td>
                <td><span class="stamp stamp-shuin">${this.escapeHtml(s.reason)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  exportAbsentCsv() {
    let csv = "\uFEFF班級,導師,座號,姓名,缺席假別\n";
    (this.state.classrooms || []).forEach(c => {
      (c.absentStudents || []).forEach(s => {
        csv += `"${c.className}","${c.assignedTeacherName || ''}","${s.seatNo}","${s.name || ''}","${s.reason || '事假'}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `國小缺席考生名冊_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // ----------------------------------------------------
  // 1.9 操作紀錄 (Logs Tab)
  // ----------------------------------------------------
  renderLogsTab() {
    const logs = this.state.auditLogs || [];
    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <h2 class="jp-card-title"><span>📜</span> 考務操作日誌與異動審計紀錄</h2>
          <span class="jp-tag">保存最近 100 筆</span>
        </div>

        <table class="jp-table">
          <thead>
            <tr>
              <th style="width:170px;">時間</th>
              <th style="width:150px;">動作</th>
              <th style="width:160px;">操作人員</th>
              <th>詳細紀錄說明</th>
            </tr>
          </thead>
          <tbody>
            ${logs.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px;">尚無紀錄</td></tr>' : logs.map(l => `
              <tr>
                <td style="font-family:var(--font-mono); font-size:0.78rem;">${new Date(l.timestamp).toLocaleString()}</td>
                <td><span class="stamp stamp-ai">${this.escapeHtml(l.action)}</span></td>
                <td><strong>${this.escapeHtml(l.operator)}</strong></td>
                <td style="font-size:0.85rem; color:var(--c-ink-sub);">${this.escapeHtml(l.details)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ----------------------------------------------------
  // 2. 教室電子黑板 (和風深紺黒板 - 國小教室投影)
  // ----------------------------------------------------
  renderBlackboardView() {
    const classrooms = this.state.classrooms || [];
    const cls = classrooms.find(c => c.classId === this.selectedClassId) || classrooms[0] || { className: '尚未建立班級', expectedCount: 0 };
    const periods = this.state.config.periods || [];
    const currentPeriod = periods[0] || { subject: '國語', startTime: '08:40', endTime: '09:20' };

    // 對象幾年級就只會推播到幾年級
    const classGrade = Number(cls.grade) || 1;
    const filteredAnnouncements = (this.state.announcements || []).filter(a => {
      const target = String(a.targetGrade || a.targetAudience || 'all');
      if (target === 'all') return true;
      if (target === String(classGrade)) return true;
      if (target === 'low' && (classGrade === 1 || classGrade === 2)) return true;
      if (target === 'mid' && (classGrade === 3 || classGrade === 4)) return true;
      if (target === 'high' && (classGrade === 5 || classGrade === 6)) return true;
      return false;
    });

    const currentAnno = filteredAnnouncements.length > 0 ? filteredAnnouncements[this.blackboardCarouselIndex % filteredAnnouncements.length] : null;

    return `
      <div class="blackboard-view">
        <header class="bb-header">
          <div class="bb-title-group">
            <h1>${this.escapeHtml(this.state.config.schoolName)}</h1>
            <p>${this.escapeHtml(this.state.config.academicYear)} ${this.escapeHtml(this.state.config.examName)}</p>
          </div>

          <div style="display:flex; align-items:center; gap:20px;">
            <div class="no-print" style="display:flex; align-items:center; gap:8px;">
              <select class="form-select" style="background:#1D2834; color:#FFF; border-color:#2C3D4E; font-size:1.1rem; padding:6px 14px;" onchange="window.app.changeBlackboardClass(this.value)">
                ${classrooms.map(c => `
                  <option value="${c.classId}" ${c.classId === cls.classId ? 'selected' : ''}>${c.className} 電子黑板</option>
                `).join('')}
              </select>
              <button class="btn btn-secondary btn-sm" onclick="window.app.toggleFullscreen()">全螢幕</button>
              <a href="#admin" class="btn btn-primary btn-sm">返回教務處</a>
            </div>

            <div class="bb-clock">
              <div class="bb-clock-time" id="bb-live-clock">--:--:--</div>
              <div class="bb-clock-date">${new Date().toLocaleDateString('zh-TW', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}</div>
            </div>
          </div>
        </header>

        <!-- 試題勘誤輪播跑馬燈 (對象幾年級就只會推播到幾年級，支援圖片連結/放大檢視) -->
        ${filteredAnnouncements.length > 0 && currentAnno ? `
          <div class="bb-announcement-banner">
            <div class="bb-announcement-badge">
              ${currentAnno.type === 'correction' ? '試題勘誤' : '考務公告'} (${(this.blackboardCarouselIndex % filteredAnnouncements.length) + 1}/${filteredAnnouncements.length})
              ${currentAnno.targetGrade && currentAnno.targetGrade !== 'all' ? `<br><span style="font-size:0.75rem; color:#FFE4E4;">【${this.formatGradeTarget(currentAnno.targetGrade)}】</span>` : ''}
            </div>
            <div class="bb-announcement-content" style="flex:1;">
              <h3>【${this.escapeHtml(currentAnno.subject)}】${this.escapeHtml(currentAnno.title)}</h3>
              <p style="white-space:pre-wrap;">${this.escapeHtml(currentAnno.content)}</p>
              ${currentAnno.imageUrl ? `
                <div style="margin-top:10px; display:inline-block; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; border:1px solid var(--c-bb-chalk-gold);">
                  <img src="${this.escapeHtml(currentAnno.imageUrl)}" alt="勘誤題目圖片" style="max-height:220px; max-width:100%; border-radius:4px; cursor:zoom-in; background:#FFF;" onclick="window.app.openLightbox('${this.escapeHtml(currentAnno.imageUrl)}')">
                  <span style="font-size:0.78rem; color:var(--c-bb-chalk-gold); display:block; margin-top:4px; cursor:pointer;" onclick="window.app.openLightbox('${this.escapeHtml(currentAnno.imageUrl)}')">
                    🔍 點擊此處可大螢幕全版放大檢視試題圖樣
                  </span>
                </div>
              ` : ''}
            </div>
            <button class="btn btn-secondary btn-sm no-print" onclick="window.app.confirmReadAnnouncement('${currentAnno.id}', '${cls.classId}')">
              確認收到回執
            </button>
          </div>
        ` : `
          <div style="padding:10px 16px; background:rgba(255,255,255,0.05); border-radius:var(--radius-sm); margin-bottom:20px; font-size:0.9rem; color:var(--c-bb-chalk-gold);">
            📢 ${cls.className ? cls.className : ''} 目前無本年級緊急試題更正，小朋友請仔細閱讀題目、細心作答。
          </div>
        `}

        <div class="bb-grid">
          <div class="bb-panel">
            <div class="bb-panel-title">
              <span>現正進行評量考程</span>
              <span class="stamp stamp-matcha">定期評量進行中</span>
            </div>

            <div class="bb-subject-card">
              <div style="font-size:1.15rem; color:var(--c-bb-chalk-gold); letter-spacing:0.1em; margin-bottom:8px;">
                評量科目
              </div>
              <div class="bb-subject-name">${this.escapeHtml(currentPeriod.subject)}</div>
              <div style="font-size:1.3rem; margin-top:12px; color:var(--c-bb-chalk-white); font-family:var(--font-mono);">
                ${currentPeriod.startTime} ～ ${currentPeriod.endTime}
              </div>
              <div class="bb-countdown" id="bb-countdown-timer">
                考程計時進行中
              </div>
            </div>

            <div style="margin-top:auto;">
              <div class="bb-panel-title" style="font-size:1.05rem; margin-bottom:10px;">今日各節評量考程</div>
              <div style="display:flex; gap:10px; flex-wrap:wrap;">
                ${periods.map((p, idx) => `
                  <div style="background:rgba(0,0,0,0.3); border:1px solid var(--c-bb-border); border-radius:var(--radius-sm); padding:6px 12px; font-size:0.85rem;">
                    第 ${idx + 1} 節 <strong>${this.escapeHtml(p.subject)}</strong> (${p.startTime}~${p.endTime})
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="bb-panel">
            <div class="bb-panel-title">
              <span>${cls.className} 教室應試狀態</span>
              <span class="stamp ${cls.statusReported ? 'stamp-matcha' : 'stamp-kohaku'}">
                ${cls.statusReported ? '點名已回報' : '等候點名'}
              </span>
            </div>

            <div class="bb-att-card">
              <div class="bb-att-item">
                <div style="font-size:0.85rem; color:#A4B3C6;">應到學童</div>
                <div class="val" style="color:var(--c-bb-chalk-white);">${cls.expectedCount || 0}</div>
              </div>
              <div class="bb-att-item present">
                <div style="font-size:0.85rem; color:#A4B3C6;">實到作答</div>
                <div class="val">${cls.statusReported ? cls.presentCount : '-'}</div>
              </div>
              <div class="bb-att-item absent">
                <div style="font-size:0.85rem; color:#A4B3C6;">缺席人數</div>
                <div class="val">${cls.statusReported ? cls.absentCount : '-'}</div>
              </div>
            </div>

            <div style="margin-bottom:16px;">
              <div style="font-size:0.85rem; color:var(--c-bb-chalk-gold); margin-bottom:6px;">缺席座號登記：</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${cls.absentStudents && cls.absentStudents.length > 0 ? cls.absentStudents.map(s => `
                  <span style="background:rgba(240,120,120,0.2); border:1px solid var(--c-bb-chalk-red); color:#FFF; padding:2px 8px; border-radius:4px; font-size:0.85rem;">
                    ${s.seatNo} 號 (${this.escapeHtml(s.reason || '事假')})
                  </span>
                `).join('') : '<span style="font-size:0.85rem; color:#A4B3C6;">（全班到齊或尚未點名）</span>'}
              </div>
            </div>

            <div style="margin-top:auto; background:rgba(0,0,0,0.25); border:1px solid var(--c-bb-border); border-radius:var(--radius-md); padding:14px;">
              <div style="font-size:0.9rem; color:var(--c-bb-chalk-gold); font-weight:700; margin-bottom:6px;">
                📜 國小考場生活常規提醒
              </div>
              <ul style="font-size:0.82rem; color:#C4D1DE; list-style-position:inside; line-height:1.6;">
                <li>預備鐘響起請回到自己座位坐好，桌面保持整潔。</li>
                <li>鐘聲響起即停止作答，放下筆並聽從老師指示收卷。</li>
                <li>寫完題目請務必由頭到尾多檢查幾次，確認寫上姓名。</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  changeBlackboardClass(classId) {
    this.selectedClassId = classId;
    this.render();
  }

  stepBlackboardCarousel() {
    this.blackboardCarouselIndex++;
    if (this.currentView === 'blackboard') {
      const announcements = this.state.announcements || [];
      if (announcements.length > 1) {
        this.render();
      }
    }
  }

  updateLiveClocks() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-TW', { hour12: false });
    const el = document.getElementById('bb-live-clock');
    if (el) el.textContent = timeStr;
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  }

  confirmReadAnnouncement(annoId, classId) {
    this.updateState(state => {
      const a = state.announcements.find(item => item.id === annoId);
      if (a) {
        if (!a.readByClassIds) a.readByClassIds = [];
        if (!a.readByClassIds.includes(classId)) {
          a.readByClassIds.push(classId);
        }
      }
    }, '黑板確認勘誤', `${classId} 教室黑板已確認收到勘誤回執`);
    alert('已回傳黑板收執回執至教務處！');
  }

  // ----------------------------------------------------
  // 3. 全校出席即時看板 (Attendance Board)
  // ----------------------------------------------------
  renderAttendanceBoardView() {
    const classrooms = this.state.classrooms || [];
    const totalExpected = classrooms.reduce((s, c) => s + (Number(c.expectedCount) || 0), 0);
    const totalPresent = classrooms.reduce((s, c) => s + (Number(c.presentCount) || 0), 0);
    const totalAbsent = classrooms.reduce((s, c) => s + (Number(c.absentCount) || 0), 0);

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <div>
            <h2 class="jp-card-title"><span>📋</span> 全校各班考場出席即時看板</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">
              即時彙整各班級實到人數、缺席清冊與點名回報狀態
            </p>
          </div>
          <div class="no-print">
            <button class="btn btn-secondary btn-sm" onclick="window.print()">列印看板</button>
          </div>
        </div>

        <div class="matrix-stats-bar" style="margin-bottom:20px;">
          <div class="stat-box">
            <div class="stat-label">應到總人數</div>
            <div class="stat-value">${totalExpected}</div>
          </div>
          <div class="stat-box matcha">
            <div class="stat-label">實到到考人數</div>
            <div class="stat-value">${totalPresent}</div>
          </div>
          <div class="stat-box hiiro">
            <div class="stat-label">全校缺席人數</div>
            <div class="stat-value" style="color:var(--c-hiiro);">${totalAbsent}</div>
          </div>
        </div>

        ${classrooms.length === 0 ? `
          <div style="text-align:center; padding:30px; color:var(--c-ink-sub);">
            目前尚未設定班級，請至「教務管理中心」->「班級與導師設定」新增班級。
          </div>
        ` : `
          <table class="jp-table">
            <thead>
              <tr>
                <th style="width:120px;">班級名稱</th>
                <th style="width:80px;">應到</th>
                <th style="width:80px;">實到</th>
                <th style="width:80px;">缺席</th>
                <th>缺席座號、姓名與假別明細</th>
                <th style="width:140px;">班級導師</th>
                <th style="width:110px;">回報狀態</th>
              </tr>
            </thead>
            <tbody>
              ${classrooms.map(c => `
                <tr>
                  <td><strong style="font-size:1.05rem;">${c.className}</strong></td>
                  <td style="font-family:var(--font-mono);">${c.expectedCount}</td>
                  <td style="font-family:var(--font-mono); color:var(--c-matcha); font-weight:700;">${c.statusReported ? c.presentCount : '-'}</td>
                  <td style="font-family:var(--font-mono); color:var(--c-hiiro); font-weight:700;">${c.statusReported ? c.absentCount : '-'}</td>
                  <td>
                    ${c.statusReported && c.absentStudents && c.absentStudents.length > 0 ? c.absentStudents.map(s => `
                      <span class="absent-student-tag">${s.seatNo}號 ${this.escapeHtml(s.name || '')} (${this.escapeHtml(s.reason || '事假')})</span>
                    `).join(' ') : (c.statusReported ? '<span style="color:var(--c-matcha); font-size:0.8rem; font-weight:600;">全到</span>' : '<span style="color:var(--c-ink-light); font-size:0.8rem;">等候回報</span>')}
                  </td>
                  <td>${this.escapeHtml(c.assignedTeacherName || c.invigilator || '未指派')}</td>
                  <td>
                    <span class="stamp ${c.statusReported ? 'stamp-matcha' : 'stamp-kohaku'}">
                      ${c.statusReported ? '已回報' : '未回報'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    `;
  }

  // ----------------------------------------------------
  // 4. 教務處狀況板 (Academic Board)
  // ----------------------------------------------------
  renderAcademicBoardView() {
    const activeIssues = (this.state.issues || []).filter(i => i.status !== 'resolved');
    const waitingClasses = (this.state.classrooms || []).filter(c => !c.statusReported);

    return `
      <div class="academic-board-container">
        ${activeIssues.length > 0 ? `
          <div class="incident-alert-strip">
            <div style="display:flex; align-items:center; gap:12px;">
              <span class="stamp stamp-shuin" style="font-size:0.9rem;">🚨 異常警報優先</span>
              <strong style="color:var(--c-hiiro);">${activeIssues.length} 間考場有突發狀況待處理！</strong>
            </div>
            <button class="btn btn-danger btn-sm" onclick="window.soundFX.playEmergency()">播放通報警音</button>
          </div>
        ` : ''}

        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
          <div class="jp-card">
            <div class="jp-card-header">
              <h2 class="jp-card-title"><span>🚨</span> 全校考場異常優先監控流</h2>
              <span class="stamp stamp-shuin">雙向受理</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:12px;">
              ${activeIssues.length === 0 ? `
                <div style="text-align:center; padding:40px; color:var(--c-matcha); font-weight:700;">
                  🟢 目前全校試場一切平穩，無待處理之突發狀況。
                </div>
              ` : activeIssues.map(i => `
                <div style="padding:14px; border:1px solid var(--c-hiiro); background:var(--c-hiiro-bg); border-radius:var(--radius-md);">
                  <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <strong>${i.className}・${this.escapeHtml(i.periodLabel || '本節')}</strong>
                    <span class="stamp stamp-shuin">${i.isUrgent ? '緊急' : '一般狀況'}</span>
                  </div>
                  <p style="font-size:0.9rem; color:var(--c-ink); margin-bottom:8px;">${this.escapeHtml(i.content)}</p>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <small style="color:var(--c-ink-sub);">${new Date(i.createdAt).toLocaleTimeString()}</small>
                    <button class="btn btn-primary btn-sm" onclick="window.app.openIssueReplyModal('${i.id}')">立即受理 / 派員協助</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="jp-card">
            <div class="jp-card-header">
              <h2 class="jp-card-title"><span>⏳</span> 等候點名班級</h2>
              <span class="stamp stamp-kohaku">${waitingClasses.length} 班</span>
            </div>

            <div style="display:flex; flex-direction:column; gap:8px;">
              ${waitingClasses.length === 0 ? `
                <div style="color:var(--c-matcha); font-weight:700; text-align:center; padding:20px;">
                  全校各班點名均已順利回報完成！
                </div>
              ` : waitingClasses.map(c => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px; background:var(--c-washi-sub); border-radius:var(--radius-sm);">
                  <span><strong>${c.className}</strong></span>
                  <span style="font-size:0.75rem; color:var(--c-ink-sub);">${this.escapeHtml(c.assignedTeacherName || c.invigilator || '導師')}</span>
                  <button class="btn btn-secondary btn-sm" onclick="window.app.openClassDetailModal('${c.classId}')">代填點名</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ----------------------------------------------------
  // 5. 導師/監考工作台 (Invigilator Workbench - 每個老師對應一個班級！)
  // ----------------------------------------------------
  renderInvigilatorView() {
    const user = this.currentUser;
    const classrooms = this.state.classrooms || [];
    const teachers = this.state.teachers || [];

    if (!user) {
      return `
        <div class="jp-card" style="max-width:480px; margin:40px auto; padding:32px 24px; text-align:center;">
          <div class="brand-emblem" style="margin:0 auto 16px; width:56px; height:56px; font-size:1.8rem;">🔒</div>
          <h2 class="jp-serif" style="font-size:1.35rem; margin-bottom:8px;">請先登入導師帳號與密碼</h2>
          <p style="font-size:0.85rem; color:var(--c-ink-sub); line-height:1.5; margin-bottom:20px;">
            依考務安全規範，<strong>必須登入帳號與密碼才能修改與送出點名資料</strong>。<br>
            登入後系統將自動為您帶出所負責的對應班級。
          </p>

          <div style="background:var(--c-washi-sub); border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:12px; margin-bottom:20px; font-size:0.82rem; text-align:left;">
            <strong>💡 導師登入提示：</strong><br>
            • <strong>帳號</strong>：輸入<strong>教師姓名</strong>（如 <code>許秀菁</code>）或<strong>班級代碼</strong>（如 <code>101</code>）<br>
            • <strong>密碼</strong>：輸入<strong>該班專屬密碼</strong>（如 <code>101</code>）<br>
            • <strong>教務管理員</strong>：亦可輸入 <code>test</code> ／ 密碼 <code>12345678</code> 登入代填
          </div>

          <form onsubmit="window.app.handleInvigilatorLoginSubmit(event)" style="text-align:left;">
            <div class="form-group">
              <label class="form-label">教師姓名 / 班級代碼</label>
              <input type="text" id="invig-login-user" class="form-control" placeholder="例：許秀菁 或 101" required autofocus>
            </div>
            <div class="form-group">
              <label class="form-label">登入密碼</label>
              <input type="password" id="invig-login-pwd" class="form-control" placeholder="請輸入專屬密碼" required>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top:12px;">
              <span>🔑</span> 驗證並進入工作台
            </button>
          </form>
        </div>
      `;
    }

    // 若老師有綁定班級，自動預選其負責班級
    let defaultClassId = user?.assignedClassId;
    if (!defaultClassId && classrooms.length > 0) {
      defaultClassId = classrooms[0].classId;
    }
    const myClass = classrooms.find(c => c.classId === defaultClassId);

    return `
      <div class="jp-card">
        <div class="jp-card-header">
          <div>
            <h2 class="jp-card-title"><span>👨‍🏫</span> 國小教師工作台・班級點名與通報</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">
              每個老師對應負責一個班級，一鍵完成應到/實到填報、登記缺席座號或通報試場狀況。
            </p>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="jp-tag" style="background:#FFF;">
              目前登入：<strong>${this.escapeHtml(user.name)}</strong>
              ${user.assignedClassName ? `【對應負責：${this.escapeHtml(user.assignedClassName)}】` : (user.role === 'admin' ? '【教務處管理員】' : '')}
            </span>
            <button class="btn btn-secondary btn-sm" onclick="window.app.logout()">
              <span>🚪</span> 登出切換帳號
            </button>
          </div>
        </div>

        ${classrooms.length === 0 ? `
          <div style="text-align:center; padding:30px; color:var(--c-ink-sub);">
            目前尚未設定班級，請教務管理員先至「教務管理中心」->「班級與導師設定」建立班級！
          </div>
        ` : `
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:20px;">
            <!-- 監考點名卡片 -->
            <div style="border:1px solid var(--c-border); border-radius:var(--radius-md); padding:18px; background:#FFF;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h3 class="jp-serif" style="font-size:1.15rem; color:var(--c-ai);">
                  📝 本節評量點名回報
                </h3>
                <span class="stamp stamp-matcha">
                  ${myClass ? myClass.className : '未選班級'}
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">選擇/確認負責班級</label>
                <select id="invig-class-select" class="form-select" onchange="window.app.populateTeacherForm(this.value)">
                  ${classrooms.map(c => `
                    <option value="${c.classId}" ${c.classId === defaultClassId ? 'selected' : ''}>
                      ${c.className} (導師：${c.assignedTeacherName || '未指派'}・應到 ${c.expectedCount} 人)
                    </option>
                  `).join('')}
                </select>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label class="form-label">應到人數</label>
                  <input type="number" id="invig-expected" class="form-control" value="${myClass ? myClass.expectedCount : 25}" readonly style="background:var(--c-washi-sub); font-family:var(--font-mono); font-weight:700;">
                </div>
                <div class="form-group">
                  <label class="form-label">實到人數</label>
                  <input type="number" id="invig-present" class="form-control" value="${myClass && myClass.statusReported ? myClass.presentCount : (myClass ? myClass.expectedCount : 25)}" style="font-family:var(--font-mono); font-weight:700; color:var(--c-matcha);">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">缺席學童座號與假別說明 (多位請以逗號隔開)</label>
                <input type="text" id="invig-absent-notes" class="form-control" placeholder="例：7號(病假), 15號(事假)" value="${myClass && myClass.absentStudents ? myClass.absentStudents.map(s => `${s.seatNo}號(${s.reason || '事假'})`).join(', ') : ''}">
                <small style="color:var(--c-ink-light); font-size:0.75rem; display:block; margin-top:4px;">全班到齊時，直接點擊送出即可完成！</small>
              </div>

              <button class="btn btn-matcha btn-lg" style="width:100%; margin-top:8px;" onclick="window.app.submitInvigilatorRollCall()">
                <span>📤</span> 送出點名回報至教務處
              </button>
            </div>

            <!-- 考場突發狀況通報卡片 -->
            <div style="border:1px solid var(--c-border); border-radius:var(--radius-md); padding:18px; background:#FFF;">
              <h3 class="jp-serif" style="font-size:1.15rem; color:var(--c-hiiro); margin-bottom:12px;">
                🚨 考場突發狀況即時通報
              </h3>

              <div class="form-group">
                <label class="form-label">狀況類型</label>
                <select id="issue-type" class="form-select">
                  <option value="student">學童身體不適 / 就醫 (發燒/嘔吐/受傷)</option>
                  <option value="paper">試卷短缺 / 印製不清 (需補卷)</option>
                  <option value="facility">考場設備故障 (鐘聲/廣播/時鐘/電扇)</option>
                  <option value="urgent">考場突發違規 / 緊急狀況</option>
                  <option value="other">其他考務支援</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">詳細狀況說明</label>
                <textarea id="issue-content" class="form-control" rows="3" placeholder="請具體描述班級考場狀況，教務處試務組將立即派員至教室協助..."></textarea>
              </div>

              <button class="btn btn-danger btn-lg" style="width:100%; margin-top:8px;" onclick="window.app.submitIssueReport()">
                <span>📡</span> 送出突發通報
              </button>
            </div>
          </div>
        `}
      </div>
    `;
  }

  populateTeacherForm(classId) {
    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (!cls) return;
    document.getElementById('invig-expected').value = cls.expectedCount;
    document.getElementById('invig-present').value = cls.statusReported ? cls.presentCount : cls.expectedCount;
    const notes = (cls.absentStudents || []).map(s => `${s.seatNo}號(${s.reason || '事假'})`).join(', ');
    document.getElementById('invig-absent-notes').value = notes;
  }

  submitInvigilatorRollCall() {
    if (!this.requireAuth(['admin', 'invigilator'])) return;

    const classId = document.getElementById('invig-class-select').value;
    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (!cls) return alert('請選擇班級！');

    // 若為導師身分且選擇非自己負責班級，提示確認
    if (this.currentUser.role === 'invigilator' && this.currentUser.assignedClassId && this.currentUser.assignedClassId !== classId) {
      if (!confirm(`⚠️ 提醒：您登記的負責班級為【${this.currentUser.assignedClassName}】。\n確定要替【${cls.className}】代為填報點名嗎？`)) {
        return;
      }
    }

    const expected = Number(document.getElementById('invig-expected').value) || 0;
    const present = Number(document.getElementById('invig-present').value) || 0;
    const absent = Math.max(0, expected - present);
    const notesStr = document.getElementById('invig-absent-notes').value || '';

    const absentStudents = [];
    if (absent > 0) {
      const parts = notesStr.split(/[,，\s]+/);
      parts.forEach((p, idx) => {
        if (!p) return;
        const seatMatch = p.match(/\d+/);
        const seatNo = seatMatch ? Number(seatMatch[0]) : (idx + 1);
        let reason = '事假';
        if (p.includes('病')) reason = '病假';
        else if (p.includes('公')) reason = '公假';
        else if (p.includes('喪')) reason = '喪假';
        else if (p.includes('防') || p.includes('疫')) reason = '防疫假';
        absentStudents.push({ seatNo, name: '', reason });
      });
      while (absentStudents.length < absent) {
        absentStudents.push({ seatNo: absentStudents.length + 1, name: '', reason: '未註明' });
      }
    }

    this.updateState(state => {
      const target = state.classrooms.find(c => c.classId === classId);
      if (target) {
        target.expectedCount = expected;
        target.presentCount = present;
        target.absentCount = absent;
        target.absentStudents = absentStudents;
        target.statusReported = true;
        target.lastUpdated = new Date().toISOString();
      }
    }, '班級點名回報', `${cls.className} 完成點名：實到 ${present}，缺席 ${absent}`);

    window.soundFX.playChime();
    alert(`【${cls.className}】點名回報成功！已即時同步至全校黑板與教務看板。`);
    this.navigate('admin/matrix');
  }

  submitIssueReport() {
    if (!this.requireAuth(['admin', 'invigilator'])) return;

    const classId = document.getElementById('invig-class-select')?.value || '101';
    const cls = (this.state.classrooms || []).find(c => c.classId === classId) || { className: classId };
    const type = document.getElementById('issue-type').value;
    const content = (document.getElementById('issue-content').value || '').trim();
    if (!content) return alert('請填寫狀況內容！');

    const newIssue = {
      id: 'issue-' + Date.now(),
      classId,
      className: cls.className,
      periodId: 'period-1',
      periodLabel: '第1節 國語',
      type,
      content,
      status: 'pending',
      isUrgent: type === 'urgent' || type === 'paper' || type === 'student',
      createdAt: new Date().toISOString(),
      reportedBy: this.currentUser ? this.currentUser.name : '監考老師'
    };

    this.updateState(state => {
      if (!state.issues) state.issues = [];
      state.issues.unshift(newIssue);
    }, '考場狀況通報', `${cls.className} 通報：${content}`);

    window.soundFX.playWarning();
    alert(`【${cls.className}】狀況已通報教務處！試務巡查組將立即派員至教室協助。`);
    document.getElementById('issue-content').value = '';
    this.navigate('academic');
  }

  // ----------------------------------------------------
  // 6. 登入介面 (Login View)
  // ----------------------------------------------------
  renderLoginView() {
    return `
      <div style="max-width:440px; margin:40px auto;">
        <div class="jp-card">
          <div style="text-align:center; margin-bottom:24px;">
            <div class="brand-emblem" style="margin:0 auto 12px; width:52px; height:52px; font-size:1.6rem;">評</div>
            <h2 class="jp-serif" style="font-size:1.45rem;">國小定期評量系統登入</h2>
            <p style="font-size:0.8rem; color:var(--c-ink-sub); margin-top:4px;">教務行政管理端與導師監考工作台</p>
          </div>

          <div style="background:var(--c-washi-sub); border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:12px; margin-bottom:20px; font-size:0.82rem; color:var(--c-ink);">
            <strong>🔑 測試帳號提示：</strong><br>
            帳號：<code style="font-family:var(--font-mono); font-weight:700;">test</code> 密碼：<code style="font-family:var(--font-mono); font-weight:700;">12345678</code><br>
            <button class="btn btn-secondary btn-sm" style="margin-top:6px;" onclick="window.app.fillTestAccount()">
              ⚡ 一鍵填入測試管理員帳號密碼
            </button>
          </div>

          <form onsubmit="window.app.handleLoginSubmit(event)">
            <div class="form-group">
              <label class="form-label">使用者帳號 (管理員或教師姓名/代號)</label>
              <input type="text" id="login-username" class="form-control" placeholder="請輸入帳號 (例如: test 或 t101)" required>
            </div>

            <div class="form-group">
              <label class="form-label">密碼</label>
              <input type="password" id="login-password" class="form-control" placeholder="請輸入密碼 (12345678)" required>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top:12px;">
              登入系統
            </button>
          </form>
        </div>
      </div>
    `;
  }

  fillTestAccount() {
    const u = document.getElementById('login-username');
    const p = document.getElementById('login-password');
    if (u) u.value = 'test';
    if (p) p.value = '12345678';
  }

  handleLoginSubmit(e) {
    e.preventDefault();
    const u = document.getElementById('login-username').value;
    const p = document.getElementById('login-password').value;
    const res = this.login(u, p);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`登入成功！歡迎 ${this.currentUser.name}。`);
      if (this.currentUser.role === 'admin') {
        this.navigate('admin');
      } else {
        this.navigate('invigilator');
      }
    }
  }

  openLoginModal() {
    const modalHtml = `
      <div class="modal-overlay" id="modal-login">
        <div class="modal-dialog" style="max-width:440px;">
          <div class="modal-header">
            <h3>🔑 系統帳號密碼登入認證</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-login')">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--c-washi-sub); border:1px solid var(--c-border); border-radius:var(--radius-sm); padding:12px; margin-bottom:16px; font-size:0.82rem; color:var(--c-ink);">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>💡 帳號密碼說明：</strong>
                <button type="button" class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:2px 8px;" onclick="window.app.fillModalTestAccount()">
                  ⚡ 一鍵帶入管理員
                </button>
              </div>
              <div style="margin-top:6px; font-size:0.8rem; line-height:1.5; color:var(--c-ink-sub);">
                • <strong>教務處管理員</strong>：帳號 <code>test</code> ／ 密碼 <code>12345678</code><br>
                • <strong>各班導師</strong>：帳號請輸入<strong>教師姓名</strong>（如 <code>許秀菁</code>）或<strong>班級代碼</strong>（如 <code>101</code>），密碼為<strong>該班專屬密碼</strong>
              </div>
            </div>

            <form onsubmit="window.app.handleModalLoginSubmit(event)">
              <div class="form-group">
                <label class="form-label">登入帳號 (管理員或教師姓名/代碼)</label>
                <input type="text" id="modal-login-username" class="form-control" placeholder="例：test 或 101" required autofocus>
              </div>

              <div class="form-group">
                <label class="form-label">登入密碼</label>
                <input type="password" id="modal-login-password" class="form-control" placeholder="請輸入密碼" required>
              </div>

              <div style="margin-top:16px; display:flex; gap:10px; justify-content:flex-end;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-login')">取消</button>
                <button type="submit" class="btn btn-primary btn-sm">確認登入</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  fillModalTestAccount() {
    const u = document.getElementById('modal-login-username');
    const p = document.getElementById('modal-login-password');
    if (u) u.value = 'test';
    if (p) p.value = '12345678';
  }

  handleModalLoginSubmit(e) {
    e.preventDefault();
    const u = document.getElementById('modal-login-username').value;
    const p = document.getElementById('modal-login-password').value;
    const res = this.login(u, p);
    if (res.success) {
      this.closeModal('modal-login');
      alert(`登入成功！歡迎 ${this.currentUser.name}。已解鎖修改資料權限！`);
      this.render();
    } else {
      alert(res.message);
    }
  }

  handleInvigilatorLoginSubmit(e) {
    e.preventDefault();
    const u = document.getElementById('invig-login-user').value;
    const p = document.getElementById('invig-login-pwd').value;
    const res = this.login(u, p);
    if (!res.success) {
      alert(res.message);
    } else {
      alert(`登入成功！歡迎 ${this.currentUser.name}。`);
      this.navigate('invigilator');
      this.render();
    }
  }

  // ----------------------------------------------------
  // 彈出視窗與輔助模態框
  // ----------------------------------------------------
  openFirebaseConfigModal() {
    const existing = window.firebaseService.config || window.DEFAULT_FIREBASE_CONFIG || {};
    const modalHtml = `
      <div class="modal-overlay" id="modal-firebase">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>🔥 Google Firebase 資料庫連線設定</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-firebase')">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--c-bg-sub); padding:10px 14px; border-radius:var(--radius-sm); margin-bottom:14px; font-size:0.83rem; color:var(--c-ink-sub); border-left:3px solid var(--c-matsu);">
              ✅ <strong>內建已連線</strong>：本系統已於程式內直接寫入 Google Cloud Firestore 資料庫設定（專案 ID：<code>examsystem-507ea</code>），全校各考場電子黑板、教師端與教務處開啟即時同步，無需手動輸入。若需切換至其他 Firebase 專案，可於下方修改：
            </div>

            <div class="form-group">
              <label class="form-label">apiKey</label>
              <input type="text" id="fb-apiKey" class="form-control" value="${this.escapeHtml(existing.apiKey || '')}" placeholder="AIzaSy...">
            </div>
            <div class="form-group">
              <label class="form-label">authDomain</label>
              <input type="text" id="fb-authDomain" class="form-control" value="${this.escapeHtml(existing.authDomain || '')}" placeholder="your-project.firebaseapp.com">
            </div>
            <div class="form-group">
              <label class="form-label">projectId</label>
              <input type="text" id="fb-projectId" class="form-control" value="${this.escapeHtml(existing.projectId || '')}" placeholder="your-project-id">
            </div>
            <div class="form-group">
              <label class="form-label">storageBucket</label>
              <input type="text" id="fb-storageBucket" class="form-control" value="${this.escapeHtml(existing.storageBucket || '')}" placeholder="your-project.appspot.com">
            </div>
            <div class="form-group">
              <label class="form-label">appId</label>
              <input type="text" id="fb-appId" class="form-control" value="${this.escapeHtml(existing.appId || '')}" placeholder="1:123456:web:abcdef">
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.clearFirebaseConfig()">回復內建預設設定</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveFirebaseConfig()">儲存自訂設定並重新連線</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  saveFirebaseConfig() {
    const cfg = {
      apiKey: document.getElementById('fb-apiKey').value.trim(),
      authDomain: document.getElementById('fb-authDomain').value.trim(),
      projectId: document.getElementById('fb-projectId').value.trim(),
      storageBucket: document.getElementById('fb-storageBucket').value.trim(),
      appId: document.getElementById('fb-appId').value.trim()
    };
    if (!cfg.apiKey || !cfg.projectId) {
      return alert('請填寫 apiKey 與 projectId！');
    }

    window.firebaseService.saveConfig(cfg);
    alert('Firebase 連線設定已儲存！系統正嘗試與 Cloud Firestore 連線。');
    this.closeModal('modal-firebase');
    this.render();
  }

  clearFirebaseConfig() {
    window.firebaseService.clearConfig();
    alert('已回復為系統內建預設的 Firebase 資料庫設定 (專案 ID: examsystem-507ea)！');
    this.closeModal('modal-firebase');
    this.render();
  }

  openQuickAnnouncementModal() {
    if (!this.requireAuth('admin')) return;
    this.annoTempImage = null;
    const modalHtml = `
      <div class="modal-overlay" id="modal-anno">
        <div class="modal-dialog" style="max-width:620px;">
          <div class="modal-header">
            <h3>📢 發布即時試題勘誤 / 考務廣播</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-anno')">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--c-bg-sub); padding:10px 14px; border-radius:var(--radius-sm); margin-bottom:14px; font-size:0.83rem; color:var(--c-ink-sub); border-left:3px solid var(--c-shuin);">
              💡 <strong>推播原則</strong>：指定幾年級就<strong>僅會推播至該年級教室黑板</strong>，避免不同年級學童受無關考題干擾。支援輸入試題圖片網址或直接選擇圖檔，黑板可直接放大投影。
            </div>

            <div class="form-group">
              <label class="form-label">公告類型</label>
              <select id="new-anno-type" class="form-select">
                <option value="correction" selected>試題勘誤 (紅框高對比黑板廣播)</option>
                <option value="extension">評量時間順延</option>
                <option value="general">一般考務提醒</option>
              </select>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
              <div class="form-group">
                <label class="form-label">🎯 推播對象年級 <span style="color:var(--c-shuin); font-weight:bold;">*</span></label>
                <select id="new-anno-target" class="form-select">
                  <option value="all">全校各年級 (1~6年級全推播)</option>
                  <option value="1">僅一年級</option>
                  <option value="2">僅二年級</option>
                  <option value="3" selected>僅三年級</option>
                  <option value="4">僅四年級</option>
                  <option value="5">僅五年級</option>
                  <option value="6">僅六年級</option>
                  <option value="low">低年級 (1~2年級)</option>
                  <option value="mid">中年級 (3~4年級)</option>
                  <option value="high">高年級 (5~6年級)</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">評量考科 / 項目</label>
                <input type="text" id="new-anno-subject" class="form-control" placeholder="例如：國語、數學、生活、自然" value="國語">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">公告標題</label>
              <input type="text" id="new-anno-title" class="form-control" placeholder="例如：三年級國語科第二大題注音勘誤">
            </div>

            <div class="form-group">
              <label class="form-label">詳細勘誤內容說明</label>
              <textarea id="new-anno-content" class="form-control" rows="3" placeholder="請填寫具體勘誤文字，將即時推播至各教室黑板..."></textarea>
            </div>

            <div class="form-group" style="background:#FAF8F5; padding:12px; border:1px dashed var(--c-border); border-radius:var(--radius-sm);">
              <label class="form-label" style="display:flex; align-items:center; justify-content:space-between;">
                <span>🖼️ 勘誤試題圖片連結 / 上傳圖檔 (選填)</span>
                <span style="font-size:0.75rem; color:var(--c-ink-light); font-weight:normal;">黑板大螢幕支援點擊放大檢視</span>
              </label>

              <div style="display:flex; flex-direction:column; gap:8px;">
                <input type="url" id="new-anno-img-url" class="form-control" placeholder="貼上試題圖片網址 (https://... 支援各圖床或雲端連結)" oninput="window.app.previewAnnoImageUrl(this.value)">

                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:0.8rem; color:var(--c-ink-sub); white-space:nowrap;">或從本機選圖：</span>
                  <input type="file" id="new-anno-img-file" accept="image/*" style="font-size:0.8rem;" onchange="window.app.handleAnnoFileSelect(event)">
                </div>

                <div id="new-anno-img-preview-box" style="display:none; margin-top:6px; padding:8px; background:#FFF; border:1px solid var(--c-border); border-radius:4px;">
                  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
                    <span style="font-size:0.8rem; font-weight:bold; color:var(--c-ink);">圖片即時預覽：</span>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="window.app.clearAnnoImage()">清除圖片</button>
                  </div>
                  <img id="new-anno-img-preview" src="" alt="預覽" style="max-height:140px; max-width:100%; border-radius:3px; border:1px solid #EEE; display:block;">
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-anno')">取消</button>
            <button class="btn btn-danger btn-sm" onclick="window.app.submitNewAnnouncement()">立即發布並推播至指定黑板</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  handleAnnoFileSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('提醒：圖片檔案較大 (超過 2MB)，若需在 Firebase 快速同步，建議壓縮或使用外部圖片網址。');
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.annoTempImage = dataUrl;
      const previewBox = document.getElementById('new-anno-img-preview-box');
      const previewImg = document.getElementById('new-anno-img-preview');
      const urlInput = document.getElementById('new-anno-img-url');
      if (previewBox && previewImg) {
        previewImg.src = dataUrl;
        previewBox.style.display = 'block';
      }
      if (urlInput) {
        urlInput.value = '';
      }
    };
    reader.readAsDataURL(file);
  }

  previewAnnoImageUrl(url) {
    const previewBox = document.getElementById('new-anno-img-preview-box');
    const previewImg = document.getElementById('new-anno-img-preview');
    if (!previewBox || !previewImg) return;
    const trimmed = (url || '').trim();
    if (trimmed) {
      this.annoTempImage = trimmed;
      previewImg.src = trimmed;
      previewBox.style.display = 'block';
    } else if (!this.annoTempImage || (typeof this.annoTempImage === 'string' && this.annoTempImage.startsWith('http'))) {
      this.annoTempImage = null;
      previewBox.style.display = 'none';
    }
  }

  clearAnnoImage() {
    this.annoTempImage = null;
    const previewBox = document.getElementById('new-anno-img-preview-box');
    const previewImg = document.getElementById('new-anno-img-preview');
    const urlInput = document.getElementById('new-anno-img-url');
    const fileInput = document.getElementById('new-anno-img-file');
    if (previewBox) previewBox.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
  }

  openLightbox(imageUrl) {
    if (!imageUrl) return;
    const modalHtml = `
      <div class="modal-overlay" id="modal-lightbox" onclick="if(event.target === this) window.app.closeModal('modal-lightbox')">
        <div class="modal-dialog" style="max-width:92vw; width:880px; background:#141C24; color:#FFF; border:2px solid var(--c-bb-chalk-gold);">
          <div class="modal-header" style="border-bottom:1px solid rgba(255,255,255,0.15);">
            <h3 style="color:var(--c-bb-chalk-gold); font-family:var(--font-mincho);">🔍 試題勘誤大螢幕圖樣放大檢視</h3>
            <button class="modal-close-btn" style="color:#FFF;" onclick="window.app.closeModal('modal-lightbox')">&times;</button>
          </div>
          <div class="modal-body" style="text-align:center; padding:16px; overflow:auto; max-height:80vh;">
            <img src="${this.escapeHtml(imageUrl)}" alt="勘誤題目圖片" style="max-width:100%; max-height:70vh; border-radius:4px; box-shadow:0 4px 20px rgba(0,0,0,0.5); background:#FFF;">
            <div style="margin-top:12px; font-size:0.85rem; color:#DDD;">
              點擊右上角「✕」或背景任一處即可返回黑板畫面
            </div>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  submitNewAnnouncement() {
    const type = document.getElementById('new-anno-type').value;
    const targetGrade = document.getElementById('new-anno-target').value;
    const subject = document.getElementById('new-anno-subject').value.trim() || '全校';
    const title = document.getElementById('new-anno-title').value.trim();
    const content = document.getElementById('new-anno-content').value.trim();
    const urlInput = document.getElementById('new-anno-img-url');
    const imageUrl = this.annoTempImage || (urlInput ? urlInput.value.trim() : '') || null;

    if (!title || !content) return alert('請填寫標題與詳細勘誤內容說明！');

    const newAnno = {
      id: 'anno-' + Date.now(),
      type,
      subject,
      targetGrade: targetGrade,
      targetAudience: targetGrade,
      imageUrl: imageUrl,
      title,
      content,
      publishedBy: '教務處 試務組',
      priority: type === 'correction' ? 'critical' : 'high',
      publishedAt: new Date().toISOString(),
      readByClassIds: []
    };

    this.annoTempImage = null;

    this.updateState(state => {
      if (!state.announcements) state.announcements = [];
      state.announcements.unshift(newAnno);
    }, '發布試題勘誤', `【${this.formatGradeTarget(targetGrade)} / ${subject}】${title}`);

    window.soundFX.playChime();
    this.closeModal('modal-anno');
    const targetDesc = this.formatGradeTarget(targetGrade);
    alert(`勘誤公告已成功發布！\n推播對象：${targetDesc}\n${imageUrl ? '（已附加勘誤試題圖片）' : ''}`);
  }

  deleteAnnouncement(id) {
    if (!this.requireAuth('admin')) return;
    if (confirm('確定要撤除此公告嗎？')) {
      this.updateState(state => {
        state.announcements = state.announcements.filter(a => a.id !== id);
      }, '撤除公告', `公告 ID: ${id}`);
    }
  }

  openClassDetailModal(classId) {
    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (!cls) return;

    const modalHtml = `
      <div class="modal-overlay" id="modal-class">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>🏫 ${cls.className} 點名與缺席維護</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-class')">&times;</button>
          </div>
          <div class="modal-body">
            ${!this.currentUser ? `
              <div style="background:#FFF9E6; border:1px solid #FFE082; padding:8px 12px; border-radius:var(--radius-sm); margin-bottom:12px; font-size:0.8rem; color:#795548;">
                🔒 目前為訪客檢視模式。如需修改並儲存點名資料，請先登入帳號密碼。
              </div>
            ` : ''}
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:14px;">
              <div class="form-group">
                <label class="form-label">應到人數</label>
                <input type="number" id="modal-exp" class="form-control" value="${cls.expectedCount}">
              </div>
              <div class="form-group">
                <label class="form-label">實到人數</label>
                <input type="number" id="modal-pre" class="form-control" value="${cls.statusReported ? cls.presentCount : cls.expectedCount}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">缺席學童資料 (座號/姓名/假別)</label>
              <div id="modal-absent-list" style="display:flex; flex-direction:column; gap:8px;">
                ${(cls.absentStudents || []).map((s, idx) => `
                  <div style="display:flex; gap:6px; align-items:center;">
                    <input type="number" class="form-control s-seat" style="width:70px;" value="${s.seatNo}" placeholder="座號">
                    <input type="text" class="form-control s-name" style="width:110px;" value="${this.escapeHtml(s.name || '')}" placeholder="姓名">
                    <input type="text" class="form-control s-reason" value="${this.escapeHtml(s.reason || '事假')}" placeholder="假別">
                    <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
                  </div>
                `).join('')}
              </div>
              <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="window.app.appendAbsentRow()">
                ＋ 新增缺席學童
              </button>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-class')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveClassDetail('${cls.classId}')">確認儲存</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  appendAbsentRow() {
    const container = document.getElementById('modal-absent-list');
    if (!container) return;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:6px; align-items:center;';
    row.innerHTML = `
      <input type="number" class="form-control s-seat" style="width:70px;" value="1" placeholder="座號">
      <input type="text" class="form-control s-name" style="width:110px;" value="" placeholder="姓名">
      <input type="text" class="form-control s-reason" value="病假" placeholder="假別">
      <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  }

  saveClassDetail(classId) {
    if (!this.requireAuth()) return;

    const cls = (this.state.classrooms || []).find(c => c.classId === classId);
    if (this.currentUser.role === 'invigilator' && this.currentUser.assignedClassId && this.currentUser.assignedClassId !== classId) {
      if (!confirm(`⚠️ 提醒：您登記的負責班級為【${this.currentUser.assignedClassName}】。\n確定要替【${cls ? cls.className : classId}】代為修訂點名嗎？`)) {
        return;
      }
    }

    const exp = Number(document.getElementById('modal-exp').value) || 0;
    const pre = Number(document.getElementById('modal-pre').value) || 0;

    const absents = [];
    document.querySelectorAll('#modal-absent-list > div').forEach(row => {
      const seat = Number(row.querySelector('.s-seat').value) || 0;
      const name = row.querySelector('.s-name').value.trim();
      const reason = row.querySelector('.s-reason').value.trim() || '事假';
      if (seat > 0) absents.push({ seatNo: seat, name, reason });
    });

    this.updateState(state => {
      const target = state.classrooms.find(c => c.classId === classId);
      if (target) {
        target.expectedCount = exp;
        target.presentCount = pre;
        target.absentCount = absents.length;
        target.absentStudents = absents;
        target.statusReported = true;
        target.lastUpdated = new Date().toISOString();
      }
    }, '修訂點名', `維護 ${classId} 班級人數與缺席名冊`);

    this.closeModal('modal-class');
  }

  openIssueReplyModal(issueId) {
    if (!this.requireAuth('admin')) return;
    const issue = (this.state.issues || []).find(i => i.id === issueId);
    if (!issue) return;

    const modalHtml = `
      <div class="modal-overlay" id="modal-reply">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>🚨 考場突發狀況處理・${issue.className}</h3>
            <button class="modal-close-btn" onclick="window.app.closeModal('modal-reply')">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--c-washi-sub); padding:12px; border-radius:var(--radius-sm); margin-bottom:14px;">
              <strong>通報內容：</strong>
              <p style="margin-top:4px; font-size:0.9rem;">${this.escapeHtml(issue.content)}</p>
            </div>

            <div class="form-group">
              <label class="form-label">處理狀態變更</label>
              <select id="issue-status-select" class="form-select">
                <option value="processing" ${issue.status === 'processing' ? 'selected' : ''}>處置中（已派員或協處中）</option>
                <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>處理完成並結案</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">教務處指示與回覆說明</label>
              <textarea id="issue-reply-text" class="form-control" rows="3" placeholder="例如：巡查幹事已前往送達備用卷...">${this.escapeHtml(issue.reply || '')}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.app.closeModal('modal-reply')">取消</button>
            <button class="btn btn-primary btn-sm" onclick="window.app.saveIssueReply('${issue.id}')">儲存處置結果</button>
          </div>
        </div>
      </div>
    `;
    this.showModalContainer(modalHtml);
  }

  saveIssueReply(issueId) {
    if (!this.requireAuth('admin')) return;
    const status = document.getElementById('issue-status-select').value;
    const reply = document.getElementById('issue-reply-text').value.trim();

    this.updateState(state => {
      const issue = state.issues.find(i => i.id === issueId);
      if (issue) {
        issue.status = status;
        issue.reply = reply;
        issue.repliedBy = this.currentUser ? this.currentUser.name : '教務處試務組';
        issue.repliedAt = new Date().toISOString();
      }
    }, '受理狀況回覆', `狀況更新為 ${status}`);

    this.closeModal('modal-reply');
  }

  showModalContainer(html) {
    const el = document.getElementById('modal-container');
    if (el) el.innerHTML = html;
  }

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  attachCommonEvents() {
    const btnFb = document.getElementById('btn-open-firebase');
    if (btnFb) {
      btnFb.addEventListener('click', () => this.openFirebaseConfigModal());
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }
  }

  attachBlackboardEvents() {
    this.updateLiveClocks();
  }

  renderFooter() {
    return `
      <footer style="border-top:1px solid var(--c-border); background:var(--c-washi); padding:24px 20px; text-align:center; font-size:0.8rem; color:var(--c-ink-sub); margin-top:60px;" class="no-print">
        <p><strong>國民小學定期評量即時管理系統</strong>・和風美學考務指揮平台</p>
        <p style="margin-top:4px; font-family:var(--font-mono); color:var(--c-ink-light);">
          教室監考端・電子黑板端・教務行政端 三端即時同步 | 臺灣公私立國民小學一至六年級專用
        </p>
      </footer>
    `;
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new ExamApp();
});
