// ==========================
// 1. 載入套件
// ==========================

// 載入 mysql2（讓 Node.js 可以連接 MySQL）
const mysql = require('mysql2');

// 載入 dotenv（讀取 .env 檔）
require('dotenv').config();


// ==========================
// 2. 建立資料庫連線設定
// ==========================

// 建立一個 MySQL 連線
const db = mysql.createConnection({
  host: process.env.DB_HOST,         // 資料庫主機（通常是 localhost）
  user: process.env.DB_USER,         // 資料庫帳號（通常是 root）
  password: process.env.DB_PASSWORD, // 資料庫密碼（你自己設定的）
  database: process.env.DB_NAME      // 要連的資料庫名稱（agri_supply_chain）
});


// ==========================
// 3. 嘗試連線資料庫
// ==========================

db.connect((err) => {
  if (err) {
    // 如果連線失敗，印出錯誤
    console.error("❌ MySQL 連線失敗：", err);
    return;
  }

  // 如果成功
  console.log("✅ MySQL 連線成功");
});


// ==========================
// 4. 匯出 db
// ==========================

// 讓其他檔案（controller）可以使用這個連線
module.exports = db;