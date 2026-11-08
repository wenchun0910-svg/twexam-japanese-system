# 臺中市西屯區長安國小 定期評量即時管理系統 (日式和風美學版)
# Taichung Chang'an Elementary School Realtime Exam Administration System

> 專為**臺中市西屯區長安國小（一至六年級）**打造的定期評量（定期成績評量/段考）即時管理系統。  
> 具備教室監考端、電子黑板端與教務行政端三端即時同步，支援**「班級與導師一對一配對設定」**、**「預設全新空白架構」**，採用日式和風（Wabi-Sabi・日本の伝統色）視覺風格設計，文字採用臺灣正體繁體中文，支援 Google Cloud Firebase (Firestore) 雲端即時資料庫與跨裝置零延遲同步。

---

## 🌸 系統特色與國小專屬設計

### 1. 預設全新空白與彈性班級設定
- **預設清空所有資料**：系統預設為全新空白狀態（Clean State），提供乾淨的起點讓各國小自訂學校全銜、考程與班級。
- **🏫 專屬「班級與導師設定」分頁**：
  - **新增單一班級**：支援一至六年級、班級名稱（例如：一年一班、四年二班）、應到人數設定。
  - **每個老師對應一個班級（一對一專屬綁定）**：可直接在班級列表中指派或新建該班負責導師，老師登入後自動帶出其負責班級！
  - **⚡ 一鍵批次生成國小全校班級**：提供一鍵快速建立 1~6 年級（共12班）與12位對應導師示範架構。
  - **支援班級隨時編輯與刪除**。

### 2. 國小定期評量三端即時聯動架構
- **🏛️ 教務管理中心 (`#admin`)**
  - **考場看板 (Matrix)**：國小各班點名卡片矩陣、應到/實到/缺席統計、缺席座號明細標籤、年級（1~6年級）篩選。
  - **班級與導師設定 (Classes)**：全校各年級班級清單、各班導師配對、應到人數維護。
  - **教師名冊管理 (Teachers)**：全校導師、科任老師名冊，清晰顯示每位老師對應負責的班級。
  - **公告與勘誤 (Broadcast)**：試題注音/文字勘誤、時間延長廣播，即時推播至各班黑板並觸發提示音。
  - **考場通報 (Issues)**：雙向受理試卷短缺、學童發燒身體不適、設備故障等狀況，教務處即時指派支援。
  - **監考排程 (Assign)**：各節次各班監考老師排程表、支援一鍵「⚡ 自動指派排班」。
  - **考程與基本設定 (Settings)**：學校全銜、學年度、評量名稱、國小考科（國語、數學、生活、自然、社會、英語）時間表。
  - **報表輸出 (Reports)**：缺席學童通報清冊、支援列印與一鍵匯出 CSV。
  - **操作紀錄 (Audit Logs)**：考務異動、點名送出與管理員審計日誌。
- **📺 教室電子黑板 (`#blackboard`)**
  - **和風深紺黒板**高對比大螢幕投影，教室後排學童清晰可讀。
  - 即時超大時鐘與各節考程時間、倒數計時。
  - **試題勘誤緊急跑馬燈**：紅框金色文字高對比輪播，支援黑板端確認收執回執。
  - 國小考場常規提請（常規生活習慣引導）。
- **📋 出席即時看板 (`#attendance`)**
  - 全校應到、實到、缺席清冊大螢幕看板，適合巡堂幹事與教務處大廳顯示。
- **🚨 教務處狀況板 (`#academic`)**
  - 全校考場異常狀況優先監控流、等候點名班級預警、即時警報提示音。
- **👨‍🏫 導師/監考工作台 (`#invigilator`)**
  - **自動鎖定對應負責班級**：導師登入或選取身分後，系統自動鎖定該班，一鍵完成應到/實到與缺席座號回報！
  - 考場突發狀況一鍵通報送達教務處。

---

## 🎨 日式和風美學設計 (Japanese Aesthetics)

- **日本の伝統色 (和色色彩學)**：
  - 底韻：和紙白 (`#FAF7F2`)、練色 (`#F2EDE4`)，帶有典雅微細和紙質感紋理。
  - 骨幹：濃藍 / 藍鼠 (`#243B4A`)、墨色 (`#22252A`)。
  - 狀態標籤：抹茶 / 若竹 (`#3C6E47`)、緋色 / 茜色 (`#B93838`)、琥珀 / 山吹 (`#B87828`)。
- **和風朱印章 (Hanko Stamp Badge)**：
  - 採用 `[ 點名濟 ]`、`[ 全到濟 ]`、`[ 缺席あり ]`、`[ 試題勘誤發令 ]`、`[ 國小考務 ]` 印章標籤。
- **Web Audio 和風鈴音**：
  - 內建二音和鳴廣播提示鈴音、悠長磬音試場預備鐘聲與緊急警報音，無需依賴外部音訊檔。

---

## 🔑 預設測試帳號

| 角色 | 帳號 (`Username`) | 密碼 (`Password`) | 說明 |
| :--- | :--- | :--- | :--- |
| **教務管理員** | `test` | `12345678` | 具備完整教務管理、班級設定與勘誤發布權限 |
| **一年一班導師** | `t101` 或 `王美玲` | `12345678` | 一年一班專屬對應導師 |
| **三年二班導師** | `t302` 或 `李雅筑` | `12345678` | 三年二班專屬對應導師（國語出題） |

> 登入介面提供 **「⚡ 一鍵填入測試管理員帳號密碼」** 按鈕。

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
5. 開啟本系統，點擊右上角 **「連線狀態」** 按鈕貼入設定，系統將立即啟動全校多端即時同步！
6. *未填寫 Firebase 時，系統亦自動啟用「本地展示模式」，支援同瀏覽器多頁籤 (BroadcastChannel) 零延遲同步。*

---

## 🚀 線上站點與 GitHub

- 🔗 **GitHub Pages 線上站點**：[https://wenchun0910-svg.github.io/twexam-japanese-system/](https://wenchun0910-svg.github.io/twexam-japanese-system/)
- 📦 **GitHub 專案原始碼**：[https://github.com/wenchun0910-svg/twexam-japanese-system](https://github.com/wenchun0910-svg/twexam-japanese-system)
