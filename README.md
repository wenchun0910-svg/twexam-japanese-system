# 段考考務即時管理系統 (日式和風美學版)
# Japan-Zen Realtime Exam Administration System

> 教室監考端、電子黑板端與教務行政端三端即時同步的段考考務管理系統。  
> 採用日式和風（Wabi-Sabi・日本の伝統色）視覺風格設計，文字採用正體繁體中文，支援 Google Cloud Firebase (Firestore) 雲端即時資料庫與跨裝置零延遲同步。

---

## 🌸 系統特色與架構亮點

### 1. 三端即時聯動與考務指揮
- **🏛️ 教務管理中心 (`#admin`)**
  - **考場看板 (Matrix)**：各班點名即時矩陣、應到/實到/缺席統計、缺席座號標籤、年級與異常篩選。
  - **公告與更正 (Broadcast)**：試題更正發布、考程延長、考務廣播，發布即時推播至各教室黑板並觸發提示音。
  - **考場通報 (Issues)**：試卷短缺、考生身體不適、考場違規等狀況雙向通報與受理處置。
  - **監考指派 (Assign)**：全校各節次各班監考老師排程排班、代兼課設定、一鍵自動平衡指派。
  - **教師帳號管理 (Teachers)**：出題老師與監考老師名冊維護、權限設定。
  - **考程與班級設定 (Settings)**：考試名稱、日期、各節次時間、考試規則維護。
  - **報表輸出 (Reports)**：段考缺席考生名冊 CSV 匯出與列印。
  - **操作紀錄 (Audit Logs)**：考務異動、點名回報與管理員操作日誌。
- **📺 教室電子黑板 (`#blackboard`)**
  - **和風深紺黒板**高對比大螢幕投影，教室遠距清晰可辨。
  - 即時超大時鐘與考試倒數計時。
  - **試題勘誤緊急跑馬燈**：紅框金色文字高對比輪播，支援黑板端收執確認回執。
  - 即時出席狀態與考場重要紀律提請。
- **📋 出席即時看板 (`#attendance`)**
  - 全校應到、實到、缺席清冊大螢幕看板，適合巡堂幹事與教務處大廳顯示。
- **🚨 教務處看板 (`#academic`)**
  - 全校考場異常狀況優先監控流、等候點名班級預警、即時警報提示音。
- **👨‍🏫 教師工作台 (`#invigilator`)**
  - 監考老師手機端即時填報應到/實到人數、缺席座號與假別。
  - 考場突發狀況一鍵通報送達教務處。

---

## 🎨 日式美學設計語彙 (Japanese Aesthetics)

- **日本の伝統色 (和色)**
  - **底色**：和紙白 (`#FAF7F2`)、練色 (`#F2EDE4`)，帶有典雅微細和紙質感紋理。
  - **主調**：濃藍 / 藍鼠 (`#243B4A`)，沉穩大器的墨線骨架。
  - **正常 / 完成**：抹茶 / 若竹 (`#3C6E47`)，代表全員到齊與處置完成。
  - **異常 / 更正**：緋色 / 茜色 (`#B93838`)，警示醒目而不刺眼。
  - **等候 / 進行中**：琥珀 / 山吹 (`#B87828`)。
  - **和風朱印 (Hanko Stamp)**：`[ 點名濟 ]`、`[ 全到濟 ]`、`[ 缺席あり ]`、`[ 試題更正發令 ]`、`[ 公認 ]` 印章標籤。
- **黑板投影**
  - 專屬和風深紺黒板 (`#141C24`)，搭配粉筆金 (`#E5C378`) 與粉筆白 (`#F4F7FA`)，兼具日式靜謐質感與投影機高對比可讀性。
- **Web Audio 和風鈴音**
  - 內建二音和鳴廣播提示鈴音、悠長磬音試場鐘聲與緊急警報音，無需外部音檔。

---

## 🔑 預設測試帳號

| 角色 | 帳號 (`Username`) | 密碼 (`Password`) | 說明 |
| :--- | :--- | :--- | :--- |
| **教務管理員** | `test` | `12345678` | 具備完整教務管理權限 (參考原站規範) |
| **出題/監考老師** | `t01` 或 `林雅筑` | `12345678` | 七年級國文出題老師 |
| **監考老師** | `t03` 或 `張文華` | `12345678` | 701 班監考老師 |

> 提示：在登入介面點擊 **「⚡ 一鍵填入測試帳號密碼」** 即可快速登入。

---

## 🔥 Firebase 資料庫設定指引

本系統支援 Google Cloud Firebase (Cloud Firestore) 即時資料庫：

1. 前往 [Google Firebase Console](https://console.firebase.google.com/) 並新增一個專案。
2. 建立 **Firestore Database**（選擇 Production 模式或 Test 模式）。
3. 部署專案根目錄的 `firestore.rules` 安全規則：
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /exam_systems/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
4. 在 Firebase 專案設定中建立 **Web 應用程式**，取得設定物件：
   ```javascript
   {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project",
     storageBucket: "your-project.appspot.com",
     appId: "1:..."
   }
   ```
5. 開啟本系統，點擊右上角 **「連線狀態」** 按鈕，將上述資訊貼入並點擊儲存，系統將立即啟動全校多端即時同步！
6. *若未填寫 Firebase 設定，系統會自動在展示模式下運作，支援本地快取與同瀏覽器多頁籤 (BroadcastChannel) 零延遲同步。*

---

## 🚀 GitHub Pages 發布與本機執行

### 本機直接執行
本專案為純 HTML/CSS/JavaScript 架構，無需安裝 Node.js 或建置工具：
- 直接以瀏覽器開啟 `index.html` 即可使用！

### 發布至 GitHub Pages
1. 在 GitHub 建立 Repository（例如 `twexam-japanese-system`）。
2. 推送程式碼至 `main` 分支。
3. 進入 GitHub 專案的 **Settings** -> **Pages**。
4. 在 **Build and deployment** -> **Branch** 選擇 `main` / `root`，點擊 **Save**。
5. 即可透過 `https://<使用者名稱>.github.io/<儲存庫名稱>/` 訪問系統。
