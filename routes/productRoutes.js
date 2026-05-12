// 載入 express
const express = require('express');

// 建立 router
const router = express.Router();

// 載入 controller
const {
  getAllProducts,
  createProduct,
  syncMoaProducts,
  verifyProductBlockchain
} = require('../controllers/productController');


// ==========================
// GET /api/products
// 查詢本地 MySQL 所有產品資料
// ==========================
router.get('/', getAllProducts);


// ==========================
// POST /api/products
// 手動新增一筆資料到 MySQL
// 並建立區塊鏈紀錄
// ==========================
router.post('/', createProduct);


// ==========================
// POST /api/products/sync-moa
// 抓農業部 API 資料並同步到 MySQL
// 同時建立區塊鏈紀錄
// ==========================
router.post('/sync-moa', syncMoaProducts);


// ==========================
// GET /api/products/verify/:number
// 驗證某一筆產品的區塊鏈 Hash
// ==========================
router.get('/verify/:number', verifyProductBlockchain);


// 匯出 router
module.exports = router;