// 段考考務管理系統 - 預設考務資料 (臺灣國高中段考標準規格)
window.INITIAL_EXAM_DATA = {
  config: {
    schoolName: "臺灣市立明倫高級中學",
    academicYear: "114學年度第1學期",
    examName: "第二次定期考查（段考）",
    examDate: new Date().toISOString().split('T')[0],
    subject: "國文",
    startTime: "08:30",
    endTime: "09:30",
    durationMinutes: 60,
    rulesNotes: [
      "• 通訊與電子用品：手機、智慧型手錶等若未完全關機（含震動或鬧鈴），將依校規考場違規重度扣分。",
      "• 飲食與飲水：考試期間原則上禁止飲食、嚼口香糖；若因身體不適需飲水或服藥，須事先向監考老師報備。",
      "• 答案卡劃記：答案卡一律使用2B鉛筆劃記，若劃記過輕或擦拭不潔致讀卡機無法辨識，責任自負。",
      "• 時間掌握：鐘聲響畢應立即停筆，雙手放離桌面；拖延作答者視情節扣該科總分5分以上。"
    ],
    periods: [
      {
        id: "period-1",
        date: new Date().toISOString().split('T')[0],
        startTime: "08:30",
        endTime: "09:30",
        subject: "國文",
        grades: [7, 8, 9]
      },
      {
        id: "period-2",
        date: new Date().toISOString().split('T')[0],
        startTime: "09:50",
        endTime: "10:50",
        subject: "數學",
        grades: [7, 8, 9]
      },
      {
        id: "period-3",
        date: new Date().toISOString().split('T')[0],
        startTime: "11:10",
        endTime: "12:10",
        subject: "英語",
        grades: [7, 8, 9]
      },
      {
        id: "period-4",
        date: new Date().toISOString().split('T')[0],
        startTime: "13:20",
        endTime: "14:20",
        subject: "自然 / 理化",
        grades: [7, 8, 9]
      },
      {
        id: "period-5",
        date: new Date().toISOString().split('T')[0],
        startTime: "14:40",
        endTime: "15:40",
        subject: "社會",
        grades: [7, 8, 9]
      }
    ]
  },
  
  teachers: [
    { id: "tch-1", name: "林雅筑", username: "t01", department: "國文", role: "author", examAuthorAssignments: [{ subject: "國文", grade: 7 }] },
    { id: "tch-2", name: "陳建宏", username: "t02", department: "數學", role: "author", examAuthorAssignments: [{ subject: "數學", grade: 7 }] },
    { id: "tch-3", name: "張文華", username: "t03", department: "英文", role: "invigilator" },
    { id: "tch-4", name: "黃志成", username: "t04", department: "理化", role: "author", examAuthorAssignments: [{ subject: "自然 / 理化", grade: 8 }] },
    { id: "tch-5", name: "李淑芬", username: "t05", department: "社會", role: "invigilator" },
    { id: "tch-6", name: "王俊傑", username: "t06", department: "體育", role: "invigilator" },
    { id: "tch-7", name: "許美惠", username: "t07", department: "輔導", role: "invigilator" },
    { id: "tch-8", name: "周明達", username: "t08", department: "資訊", role: "invigilator" },
    { id: "tch-9", name: "郭瑞祥", username: "t09", department: "數學", role: "invigilator" },
    { id: "tch-10", name: "劉秋香", username: "t10", department: "國文", role: "invigilator" }
  ],

  classrooms: [
    {
      classId: "701", grade: 7, className: "701",
      expectedCount: 32, presentCount: 30, absentCount: 2,
      absentStudents: [
        { seatNo: 4, name: "王小明", reason: "病假" },
        { seatNo: 17, name: "林小華", reason: "事假" }
      ],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      periodInvigilators: { "period-1": "tch-3", "period-2": "tch-5", "period-3": "tch-6", "period-4": "tch-7", "period-5": "tch-8" },
      periodInvigilatorNames: { "period-1": "張文華", "period-2": "李淑芬", "period-3": "王俊傑", "period-4": "許美惠", "period-5": "周明達" }
    },
    {
      classId: "702", grade: 7, className: "702",
      expectedCount: 31, presentCount: 31, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      periodInvigilators: { "period-1": "tch-5", "period-2": "tch-3", "period-3": "tch-8" },
      periodInvigilatorNames: { "period-1": "李淑芬", "period-2": "張文華", "period-3": "周明達" }
    },
    {
      classId: "703", grade: 7, className: "703",
      expectedCount: 30, presentCount: 29, absentCount: 1,
      absentStudents: [{ seatNo: 12, name: "趙小豪", reason: "公假（合唱團參賽）" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      periodInvigilators: { "period-1": "tch-6" },
      periodInvigilatorNames: { "period-1": "王俊傑" }
    },
    {
      classId: "704", grade: 7, className: "704",
      expectedCount: 30, presentCount: 30, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
      periodInvigilators: { "period-1": "tch-7" },
      periodInvigilatorNames: { "period-1": "許美惠" }
    },
    {
      classId: "705", grade: 7, className: "705",
      expectedCount: 32, presentCount: 0, absentCount: 0,
      absentStudents: [],
      statusReported: false, lastUpdated: null,
      periodInvigilators: { "period-1": "tch-8" },
      periodInvigilatorNames: { "period-1": "周明達" }
    },
    {
      classId: "801", grade: 8, className: "801",
      expectedCount: 33, presentCount: 32, absentCount: 1,
      absentStudents: [{ seatNo: 9, name: "吳小萱", reason: "病假（流感隔離）" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
      periodInvigilators: { "period-1": "tch-9" },
      periodInvigilatorNames: { "period-1": "郭瑞祥" }
    },
    {
      classId: "802", grade: 8, className: "802",
      expectedCount: 33, presentCount: 33, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      periodInvigilators: { "period-1": "tch-10" },
      periodInvigilatorNames: { "period-1": "劉秋香" }
    },
    {
      classId: "803", grade: 8, className: "803",
      expectedCount: 32, presentCount: 31, absentCount: 1,
      absentStudents: [{ seatNo: 23, name: "孫小安", reason: "喪假" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
      periodInvigilators: { "period-1": "tch-1" },
      periodInvigilatorNames: { "period-1": "林雅筑" }
    },
    {
      classId: "901", grade: 9, className: "901",
      expectedCount: 34, presentCount: 34, absentCount: 0,
      absentStudents: [],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      periodInvigilators: { "period-1": "tch-2" },
      periodInvigilatorNames: { "period-1": "陳建宏" }
    },
    {
      classId: "902", grade: 9, className: "902",
      expectedCount: 34, presentCount: 33, absentCount: 1,
      absentStudents: [{ seatNo: 5, name: "陳小宇", reason: "未註明" }],
      statusReported: true, lastUpdated: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      periodInvigilators: { "period-1": "tch-4" },
      periodInvigilatorNames: { "period-1": "黃志成" }
    }
  ],

  announcements: [
    {
      id: "anno-1",
      type: "correction",
      subject: "國文",
      targetAudience: "all",
      title: "【試題更正】七年級國文科 第14題選項勘誤",
      content: "七年級國文科第14題題幹選項 (C) 原為「暮靄沉沉楚天闊」，請更正為「楊柳岸曉風殘月」，請監考老師口頭廣播並於黑板書寫公告。",
      publishedBy: "教務處 試務中心",
      priority: "critical",
      publishedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      readByClassIds: ["701", "702", "703", "704"]
    },
    {
      id: "anno-2",
      type: "extension",
      subject: "全校",
      targetAudience: "all",
      title: "【考務公告】第一節國文科考試因試題更正延長 3 分鐘",
      content: "全校各考場請注意：本節國文科考試收卷時間順延 3 分鐘至 09:33 鐘響，請考生掌握作答時間。",
      publishedBy: "教務處 試務中心",
      priority: "high",
      publishedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      readByClassIds: ["701", "702"]
    }
  ],

  issues: [
    {
      id: "issue-1",
      classId: "701",
      className: "701",
      periodId: "period-1",
      periodLabel: "第1節 08:30-09:30 國文",
      type: "student",
      content: "4號考生座號王小明因突發急性腸胃炎，至健康中心暫歇，尚未進入考場。",
      status: "processing",
      isUrgent: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      reply: "護理師回報已給藥休息，若症狀緩解將安排備用試場作答。",
      repliedBy: "教務主任",
      repliedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString()
    },
    {
      id: "issue-2",
      classId: "705",
      className: "705",
      periodId: "period-1",
      periodLabel: "第1節 08:30-09:30 國文",
      type: "paper",
      content: "試題本少2份，請試務中心派員補送備用試題本。",
      status: "resolved",
      isUrgent: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      reply: "巡堂幹事已於 08:34 送達備用題本2份至考場。",
      repliedBy: "試務組長",
      repliedAt: new Date(Date.now() - 1000 * 60 * 32).toISOString()
    }
  ],

  corrections: [
    {
      id: "corr-1",
      subject: "國文",
      grade: 7,
      questionNo: "第14題",
      description: "選項 (C) 原為「暮靄沉沉楚天闊」，請更正為「楊柳岸曉風殘月」",
      status: "approved",
      submittedBy: "林雅筑 老師",
      submittedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
    }
  ],

  auditLogs: [
    { id: "log-1", action: "登入系統", operator: "教務管理員 (test)", details: "從主控台成功驗證登入", timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
    { id: "log-2", action: "試題更正審核發布", operator: "教務管理員", details: "審核通過七年級國文科第14題勘誤並推播至各教室黑板", timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
    { id: "log-3", action: "突發狀況受理回覆", operator: "教務主任", details: "回覆 701 考場考生就醫事宜", timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString() },
    { id: "log-4", action: "考場點名回報", operator: "張文華 老師", details: "701 教室送出第1節點名：應到32、實到30、缺席2", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() }
  ]
};
