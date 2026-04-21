// 🔥 確認程式有啟動（你自己加的 debug）
console.log("🔥🔥🔥 這是我現在的 app.js 🔥🔥🔥");

// ==========================
// 1. 載入套件
// ==========================

// 載入 express（建立後端伺服器）
const express = require('express');

// 載入 cors（解決前端跨網域問題）
const cors = require('cors');

// 載入 dotenv（讓我們可以讀取 .env 設定檔）
require('dotenv').config();


// ==========================
// 2. 載入路由（API）
// ==========================

// 載入 products API 路由
// ⚠️ 路徑一定要對（routes/productRoutes.js）
const productRoutes = require('./routes/productRoutes');


// ==========================
// 3. 建立 express app
// ==========================

const app = express();


// ==========================
// 4. 設定 middleware（中間處理）
// ==========================

// 啟用 CORS（讓前端可以呼叫 API）
app.use(cors());

// 讓 express 可以解析 JSON 格式（前端送資料會用到）
app.use(express.json());


// ==========================
// 5. 測試用首頁 API
// ==========================

// 當你打 http://localhost:3001/
// 會看到這段文字（用來確認伺服器有沒有活著）
app.get('/', (req, res) => {
  res.send('農產品供應鏈系統後端啟動成功！');
});


// ==========================
// 6. API 路由設定
// ==========================

// 所有 /api/products 的請求都交給 productRoutes 處理
// 例如：
// GET  /api/products
// POST /api/products
app.use('/api/products', productRoutes);


// ==========================
// 7. 啟動伺服器
// ==========================

// 從 .env 讀 PORT，如果沒有就用 3001
const PORT = process.env.PORT || 3001;

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動：http://localhost:${PORT}`);
});