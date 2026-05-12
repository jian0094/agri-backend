// ===============================
// 載入 express
// ===============================
const express = require("express");

// 建立 router
const router = express.Router();


// ===============================
// 載入區塊鏈 service
// ===============================
const blockchainService = require("../services/blockchainService");


// ===============================
// 載入 blockchain model
// ===============================
const blockchainModel = require("../models/blockchainModel");



// =====================================
// POST /api/blockchain/add
//
// 功能：
// 新增區塊鏈資料
// =====================================
router.post("/add", async (req, res) => {

  try {

    // ===============================
    // 取得前端送來的資料
    // req.body = JSON 資料
    // ===============================
    const product = req.body;



    // ===============================
    // 呼叫區塊鏈 service
    //
    // 功能：
    // 執行 Java 區塊鏈
    // 建立 Block
    // 取得 Hash
    // ===============================
    const blockchainResult =
      await blockchainService.addToBlockchain(product);




    // ===============================
    // 將區塊鏈結果存進 MySQL
    // ===============================
    const dbResult =
      await blockchainModel.createBlockchainRecord(
        blockchainResult
      );




    // ===============================
    // 回傳成功結果給前端
    // ===============================
    res.json({

      message:
        "資料成功送入區塊鏈，並已存入資料庫",

      // 區塊鏈結果
      blockchain: blockchainResult,

      // 資料庫新增結果
      database: {

        // 新增資料的 id
        insertId: dbResult.insertId
      }

    });




  } catch (error) {

    // ===============================
    // 發生錯誤
    // ===============================
    res.status(500).json({

      message:
        "區塊鏈資料儲存失敗",

      error: error.message
    });

  }

});



// ===============================
// 匯出 router
// ===============================
module.exports = router;