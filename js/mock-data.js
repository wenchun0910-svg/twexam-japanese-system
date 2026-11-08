// ========================================================
// 國小段考（定期成績評量）考務即時管理系統 - 預設資料模組
// 臺中市西屯區長安國小（一至六年級・導師與班級一對一對應）
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

// 長安國小 32 班官方名冊 CSV 文字範本
window.CHANGAN_CSV_RAW = `班級,姓名,密碼
一年一班,廖O秀,shiou216
一年二班,邱O菁,ma640420
一年三班,王O雀,qqaqqz101
一年四班,陳O婷,u7101007
二年一班,賴O佩,thylakoi
二年二班,邱O黛,einna4160
二年三班,李O怡,shinyili0709
二年四班,林O婷,let1018
二年五班,鄭O菁,eiva
三年一班,黃O苓,shu.ling096
三年二班,卓O萍,jasephine2002
三年三班,陳O怡,shin58112
三年四班,林O彬,jason8899kimo
三年五班,葉O柔,rosieye323
四年一班,簡O華,yhchien0635
四年二班,薛O勤,kimkings2001
四年三班,陳O苓,chenya0519
四年四班,梁O勳,zobkimo
四年五班,李O珊,roobit0819
四年六班,劉O婕,caijie368
五年一班,蕭O全,dannel_hsiao
五年二班,謝O勇,bigyung45
五年三班,張O媃,minicandy85
五年四班,姜O雄,panda0928
五年五班,葉O玲,yehyl1122
五年六班,管O弘,fysh1114
六年一班,尤O絹,moon1220
六年二班,陳O伶,linda6032091225
六年三班,張O予,leeyu218
六年四班,盧O輿,fishsiao1776
六年五班,古O專,asics1112
六年六班,葉O玲,mozartbooks`;

// 輔助函數：解析中文班級名稱與生成班級代碼
function buildChanganTemplate() {
  const digits = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6 };
  const lines = window.CHANGAN_CSV_RAW.trim().split('\n').slice(1);
  const teachers = [];
  const classrooms = [];

  lines.forEach(line => {
    const parts = line.split(',').map(s => s.trim());
    if (parts.length < 3) return;
    const [className, name, pwd] = parts;

    const m = className.match(/([一二三四五六])年([一二三四五六])班/);
    const grade = m ? digits[m[1]] : 1;
    const num = m ? digits[m[2]] : 1;
    const classId = `${grade}0${num}`;
    const teacherId = `tch-${classId}`;

    teachers.push({
      id: teacherId,
      name: name,
      username: classId,
      password: pwd,
      department: `${grade}年級導師`,
      role: 'invigilator',
      assignedClassId: classId,
      assignedClassName: className
    });

    classrooms.push({
      classId: classId,
      grade: grade,
      className: className,
      expectedCount: 25,
      presentCount: 0,
      absentCount: 0,
      absentStudents: [],
      statusReported: false,
      lastUpdated: null,
      assignedTeacherId: teacherId,
      assignedTeacherName: name,
      invigilator: name,
      periodInvigilatorNames: {
        "period-1": name,
        "period-2": name,
        "period-3": name,
        "period-4": name
      }
    });
  });

  return { teachers, classrooms };
}

const changanData = buildChanganTemplate();

// 2. 臺中市西屯區長安國小示範資料模本 (全校 32 班與 32 位專屬導師一對一配對)
window.ELEMENTARY_TEMPLATE_DATA = {
  config: {
    schoolName: "臺中市西屯區長安國小",
    academicYear: "114學年度第1學期",
    examName: "第二次定期成績評量（定期考查）",
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
  teachers: changanData.teachers,
  classrooms: changanData.classrooms,
  announcements: [
    {
      id: "anno-1",
      type: "correction",
      subject: "國語",
      targetGrade: "3",
      targetAudience: "3",
      title: "【試題勘誤】三年級國語科 第二大題第3小題注音更正",
      content: "三年級國語科定期評量試卷第二大題「改錯字」第3小題，原題目『徜徉』之『徉』注音請更正為『ㄧㄤˊ』，請各班監考老師協助口頭提醒學童。",
      imageUrl: "",
      publishedBy: "教務處 試務組",
      priority: "critical",
      publishedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
      readByClassIds: ["301", "302"]
    }
  ],
  issues: [],
  corrections: [],
  auditLogs: [
    { id: "log-1", action: "系統初始化", operator: "系統", details: "載入臺中市西屯區長安國小32班定期成績評量名冊", timestamp: new Date().toISOString() }
  ]
};

// 預設為全新空白資料 (使用者要求清空所有資料)
window.INITIAL_EXAM_DATA = window.EMPTY_EXAM_DATA;
