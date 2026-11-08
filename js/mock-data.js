// ========================================================
// 國小段考（定期成績評量）考務即時管理系統 - 預設資料模組
// 適用臺灣公私立國民小學（一至六年級・導師與班級一對一對應）
// ========================================================

// 1. 全新空白資料結構 (預設清空所有資料)
window.EMPTY_EXAM_DATA = {
  config: {
    schoolName: "臺中市西屯區長安國小",
    academicYear: "114學年度第1學期",
    examName: "第二次定期成績評量",
    examDate: new Date().toISOString().split('T')[0],
    subject: "國語",
    startTime: "08:40",
    endTime: "09:20",
    durationMinutes: 40,
    rulesNotes: [
      "• 遵守考試時間：預備鐘響即進入教室坐好，鐘聲響畢立即停筆並將雙手放在桌下。",
      "• 桌面保持整潔：桌面僅能放置鉛筆、橡皮擦及透明墊板，其餘文具及抽屜書籍一律淨空。",
      "• 嚴禁交頭接耳：作答時請安靜思考，如有試卷印製不清或需要上廁所，請舉手向監考老師反應。",
      "• 仔細檢查試卷：作答完畢請務必由頭到尾檢查姓名、座號是否已書寫齊全。"
    ],
    periods: [
      { id: "period-1", date: new Date().toISOString().split('T')[0], startTime: "08:40", endTime: "09:20", subject: "國語", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-2", date: new Date().toISOString().split('T')[0], startTime: "09:35", endTime: "10:15", subject: "數學", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-3", date: new Date().toISOString().split('T')[0], startTime: "10:30", endTime: "11:10", subject: "生活 / 自然科學", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-4", date: new Date().toISOString().split('T')[0], startTime: "11:25", endTime: "12:05", subject: "英語 / 社會", grades: [3, 4, 5, 6] }
    ]
  },
  teachers: [],
  classrooms: [],
  announcements: [],
  issues: [],
  corrections: [],
  auditLogs: []
};

// 2. 臺灣國小示範資料模本 (一至六年級，每班對應一位專屬導師/監考老師)
window.ELEMENTARY_TEMPLATE_DATA = {
  config: {
    schoolName: "臺中市西屯區長安國小",
    academicYear: "114學年度第1學期",
    examName: "第二次定期評量（定期考查）",
    examDate: new Date().toISOString().split('T')[0],
    subject: "國語",
    startTime: "08:40",
    endTime: "09:20",
    durationMinutes: 40,
    rulesNotes: [
      "• 遵守考試時間：預備鐘響即進入教室坐好，鐘聲響畢立即停筆並將雙手放在桌下。",
      "• 桌面保持整潔：桌面僅能放置鉛筆、橡皮擦及透明墊板，其餘文具及抽屜書籍一律淨空。",
      "• 嚴禁交頭接耳：作答時請安靜思考，如有試卷印製不清或需要上廁所，請舉手向監考老師反應。",
      "• 仔細檢查試卷：作答完畢請務必由頭到尾檢查姓名、座號是否已書寫齊全。"
    ],
    periods: [
      { id: "period-1", date: new Date().toISOString().split('T')[0], startTime: "08:40", endTime: "09:20", subject: "國語", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-2", date: new Date().toISOString().split('T')[0], startTime: "09:35", endTime: "10:15", subject: "數學", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-3", date: new Date().toISOString().split('T')[0], startTime: "10:30", endTime: "11:10", subject: "生活 / 自然科學", grades: [1, 2, 3, 4, 5, 6] },
      { id: "period-4", date: new Date().toISOString().split('T')[0], startTime: "11:25", endTime: "12:05", subject: "英語 / 社會", grades: [3, 4, 5, 6] }
    ]
  },

  // 每個老師對應一個班級
  teachers: [
    { id: "tch-101", name: "王美玲", username: "t101", department: "低年級導師", role: "invigilator", assignedClassId: "101", assignedClassName: "一年一班" },
    { id: "tch-102", name: "林怡君", username: "t102", department: "低年級導師", role: "invigilator", assignedClassId: "102", assignedClassName: "一年二班" },
    { id: "tch-201", name: "陳建志", username: "t201", department: "低年級導師", role: "invigilator", assignedClassId: "201", assignedClassName: "二年一班" },
    { id: "tch-202", name: "張淑芬", username: "t202", department: "低年級導師", role: "invigilator", assignedClassId: "202", assignedClassName: "二年二班" },
    { id: "tch-301", name: "黃志偉", username: "t301", department: "中年級導師", role: "invigilator", assignedClassId: "301", assignedClassName: "三年一班" },
    { id: "tch-302", name: "李雅筑", username: "t302", department: "中年級導師", role: "author", assignedClassId: "302", assignedClassName: "三年二班", examAuthorAssignments: [{ subject: "國語", grade: 3 }] },
    { id: "tch-401", name: "許家榮", username: "t401", department: "中年級導師", role: "invigilator", assignedClassId: "401", assignedClassName: "四年一班" },
    { id: "tch-402", name: "吳惠美", username: "t402", department: "中年級導師", role: "invigilator", assignedClassId: "402", assignedClassName: "四年二班" },
    { id: "tch-501", name: "郭俊傑", username: "t501", department: "高年級導師", role: "author", assignedClassId: "501", assignedClassName: "五年一班", examAuthorAssignments: [{ subject: "數學", grade: 5 }] },
    { id: "tch-502", name: "周佩蓉", username: "t502", department: "高年級導師", role: "invigilator", assignedClassId: "502", assignedClassName: "五年二班" },
    { id: "tch-601", name: "劉哲銘", username: "t601", department: "高年級導師", role: "invigilator", assignedClassId: "601", assignedClassName: "六年一班" },
    { id: "tch-602", name: "楊麗芳", username: "t602", department: "高年級導師", role: "invigilator", assignedClassId: "602", assignedClassName: "六年二班" }
  ],

  // 國小一至六年級班級，每班對應一位老師
  classrooms: [
    {
      classId: "101", grade: 1, className: "一年一班",
      expectedCount: 25, presentCount: 24, absentCount: 1,
      absentStudents: [{ seatNo: 7, name: "陳小安", reason: "病假（腸病毒隔離）" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      assignedTeacherId: "tch-101", assignedTeacherName: "王美玲",
      invigilator: "王美玲",
      periodInvigilatorNames: { "period-1": "王美玲", "period-2": "王美玲", "period-3": "王美玲" }
    },
    {
      classId: "102", grade: 1, className: "一年二班",
      expectedCount: 25, presentCount: 25, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      assignedTeacherId: "tch-102", assignedTeacherName: "林怡君",
      invigilator: "林怡君",
      periodInvigilatorNames: { "period-1": "林怡君", "period-2": "林怡君", "period-3": "林怡君" }
    },
    {
      classId: "201", grade: 2, className: "二年一班",
      expectedCount: 26, presentCount: 26, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      assignedTeacherId: "tch-201", assignedTeacherName: "陳建志",
      invigilator: "陳建志",
      periodInvigilatorNames: { "period-1": "陳建志", "period-2": "陳建志", "period-3": "陳建志" }
    },
    {
      classId: "202", grade: 2, className: "二年二班",
      expectedCount: 25, presentCount: 24, absentCount: 1,
      absentStudents: [{ seatNo: 15, name: "黃小羽", reason: "事假" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      assignedTeacherId: "tch-202", assignedTeacherName: "張淑芬",
      invigilator: "張淑芬",
      periodInvigilatorNames: { "period-1": "張淑芬", "period-2": "張淑芬", "period-3": "張淑芬" }
    },
    {
      classId: "301", grade: 3, className: "三年一班",
      expectedCount: 27, presentCount: 27, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      assignedTeacherId: "tch-301", assignedTeacherName: "黃志偉",
      invigilator: "黃志偉",
      periodInvigilatorNames: { "period-1": "黃志偉", "period-2": "黃志偉", "period-3": "黃志偉", "period-4": "黃志偉" }
    },
    {
      classId: "302", grade: 3, className: "三年二班",
      expectedCount: 26, presentCount: 25, absentCount: 1,
      absentStudents: [{ seatNo: 3, name: "林小宇", reason: "公假（自治市幹部）" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      assignedTeacherId: "tch-302", assignedTeacherName: "李雅筑",
      invigilator: "李雅筑",
      periodInvigilatorNames: { "period-1": "李雅筑", "period-2": "李雅筑", "period-3": "李雅筑", "period-4": "李雅筑" }
    },
    {
      classId: "401", grade: 4, className: "四年一班",
      expectedCount: 28, presentCount: 0, absentCount: 0,
      absentStudents: [],
      statusReported: false, lastUpdated: null,
      assignedTeacherId: "tch-401", assignedTeacherName: "許家榮",
      invigilator: "許家榮",
      periodInvigilatorNames: { "period-1": "許家榮" }
    },
    {
      classId: "402", grade: 4, className: "四年二班",
      expectedCount: 27, presentCount: 27, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      assignedTeacherId: "tch-402", assignedTeacherName: "吳惠美",
      invigilator: "吳惠美",
      periodInvigilatorNames: { "period-1": "吳惠美" }
    },
    {
      classId: "501", grade: 5, className: "五年一班",
      expectedCount: 28, presentCount: 27, absentCount: 1,
      absentStudents: [{ seatNo: 18, name: "趙小萱", reason: "病假" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      assignedTeacherId: "tch-501", assignedTeacherName: "郭俊傑",
      invigilator: "郭俊傑",
      periodInvigilatorNames: { "period-1": "郭俊傑" }
    },
    {
      classId: "502", grade: 5, className: "五年二班",
      expectedCount: 28, presentCount: 28, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 16).toISOString(),
      assignedTeacherId: "tch-502", assignedTeacherName: "周佩蓉",
      invigilator: "周佩蓉",
      periodInvigilatorNames: { "period-1": "周佩蓉" }
    },
    {
      classId: "601", grade: 6, className: "六年一班",
      expectedCount: 29, presentCount: 29, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      assignedTeacherId: "tch-601", assignedTeacherName: "劉哲銘",
      invigilator: "劉哲銘",
      periodInvigilatorNames: { "period-1": "劉哲銘" }
    },
    {
      classId: "602", grade: 6, className: "六年二班",
      expectedCount: 29, presentCount: 28, absentCount: 1,
      absentStudents: [{ seatNo: 11, name: "孫小睿", reason: "事假" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      assignedTeacherId: "tch-602", assignedTeacherName: "楊麗芳",
      invigilator: "楊麗芳",
      periodInvigilatorNames: { "period-1": "楊麗芳" }
    }
  ],

  announcements: [
    {
      id: "anno-1",
      type: "correction",
      subject: "國語",
      targetAudience: "all",
      title: "【試題勘誤】三年級國語科 第二大題第3小題注音更正",
      content: "三年級國語科定期評量試卷第二大題「改錯字」第3小題，原題目『徜徉』之『徉』注音請更正為『ㄧㄤˊ』，請各班監考老師協助口頭提醒學童。",
      publishedBy: "教務處 試務組",
      priority: "critical",
      publishedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      readByClassIds: ["301", "302"]
    }
  ],

  issues: [
    {
      id: "issue-1",
      classId: "101",
      className: "一年一班",
      periodId: "period-1",
      periodLabel: "第1節 08:40-09:20 國語",
      type: "student",
      content: "7號陳小安同學因發燒，家長已帶回就醫，已完成請假登記。",
      status: "resolved",
      isUrgent: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      reply: "健康中心已完成通報，成績評量後續將依校內評量辦法辦理補考。",
      repliedBy: "教務主任",
      repliedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString()
    }
  ],

  corrections: [],
  auditLogs: [
    { id: "log-1", action: "系統初始化", operator: "系統", details: "載入國小定期成績評量預設設定", timestamp: new Date().toISOString() }
  ]
};

// 按照使用者要求：預設為全新空白資料 (清空所有資料)
window.INITIAL_EXAM_DATA = window.EMPTY_EXAM_DATA;
