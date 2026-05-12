// ==========================
// 載入資料庫連線設定
// ==========================
const db = require("../config/db");

// 載入區塊鏈服務
const {
  addToBlockchain,
  verifyBlockchain
} = require("../services/blockchainService");


// ==========================
// 將 db.query 包成 Promise
// ==========================
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(results);
    });
  });
}


// ==========================
// 將 products 資料轉成區塊鏈需要的格式
// ==========================
function productToBlockchainData(product) {
  return {
    traceCode: product.number,
    productName: product.product_name,
    producerName: product.producer_name,
    location: product.sampling_location
  };
}


// ==========================
// 1. 查詢本地 MySQL 所有產品資料
// ==========================
const getAllProducts = (req, res) => {

  const sql = "SELECT * FROM products ORDER BY id DESC";

  db.query(sql, (err, results) => {

    if (err) {
      console.error("查詢失敗：", err);

      return res.status(500).json({
        success: false,
        message: "查詢資料失敗",
        error: err.message
      });
    }

    return res.status(200).json({
      success: true,
      message: "查詢成功",
      total: results.length,
      data: results
    });
  });
};


// ==========================
// 2. 手動新增一筆資料到 MySQL，並建立區塊鏈紀錄
// ==========================
const createProduct = async (req, res) => {
  try {
    const {
      number,
      sampling_date,
      product_name,
      product_id,
      producer_name,
      sampling_location,
      inspect_result,
      note
    } = req.body;

    if (!number || !product_name || !producer_name) {
      return res.status(400).json({
        success: false,
        message: "number、product_name、producer_name 為必填欄位"
      });
    }

    const sql = `
      INSERT INTO products (
        number,
        sampling_date,
        product_name,
        product_id,
        producer_name,
        sampling_location,
        inspect_result,
        note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      number,
      sampling_date,
      product_name,
      product_id,
      producer_name,
      sampling_location,
      inspect_result,
      note
    ];

    const result = await new Promise((resolve, reject) => {
      db.execute(sql, values, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(result);
      });
    });

    const productForBlockchain = {
      traceCode: number,
      productName: product_name,
      producerName: producer_name,
      location: sampling_location
    };

    const blockchainResult = await addToBlockchain(productForBlockchain);

    return res.status(201).json({
      success: true,
      message: "新增成功，並已建立區塊鏈紀錄",
      insertId: result.insertId,
      blockchain: blockchainResult
    });

  } catch (err) {
    console.error("新增失敗：", err);

    return res.status(500).json({
      success: false,
      message: "新增資料或建立區塊鏈紀錄失敗",
      error: err.message
    });
  }
};


// ==========================
// 3. 自動抓農業部 API，存進 MySQL，並建立區塊鏈紀錄
// ==========================
const syncMoaProducts = async (req, res) => {
  try {
    const MOA_API_URL =
      "https://data.moa.gov.tw/api/v1/SalesResumeAgriproductsResultsType/";

    console.log("開始同步農業部 API 資料...");

    const response = await fetch(MOA_API_URL);

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: "農業部 API 請求失敗",
        status: response.status
      });
    }

    const jsonData = await response.json();

    const result = Array.isArray(jsonData.Data) ? jsonData.Data : [];

    if (result.length === 0) {
      return res.status(200).json({
        success: true,
        message: "農業部 API 沒有可同步資料",
        totalFetched: 0,
        insertedOrUpdated: 0,
        blockchainCreated: 0
      });
    }

    const sql = `
      INSERT INTO products (
        number,
        sampling_date,
        product_name,
        product_id,
        producer_name,
        sampling_location,
        inspect_result,
        note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        sampling_date = VALUES(sampling_date),
        product_name = VALUES(product_name),
        product_id = VALUES(product_id),
        producer_name = VALUES(producer_name),
        sampling_location = VALUES(sampling_location),
        inspect_result = VALUES(inspect_result),
        note = VALUES(note)
    `;

    let successCount = 0;
    let blockchainCreated = 0;

    for (const item of result) {
      const number = item.Number || "";
      const samplingDate = item.SamplingDate || "";
      const productName = item.ProductName || "";
      const productId = item.ProductID || "";
      const producerName = item.ProducerName || "";
      const samplingLocation = item.SamplingLocation || "";
      const inspectResult = item.InspectResult || "";
      const note = item.Note || "";

      const values = [
        number,
        samplingDate,
        productName,
        productId,
        producerName,
        samplingLocation,
        inspectResult,
        note
      ];

      await new Promise((resolve, reject) => {
        db.execute(sql, values, (err) => {
          if (err) {
            reject(err);
            return;
          }

          successCount++;
          resolve();
        });
      });

      // 檢查這筆資料是否已經有區塊鏈紀錄
      const existingBlocks = await query(`
        SELECT id
        FROM blockchain_records
        WHERE trace_code = ?
        LIMIT 1
      `, [number]);

      // 如果還沒有區塊鏈紀錄，才建立新的區塊鏈 Hash
      if (existingBlocks.length === 0 && number && productName) {
        const productForBlockchain = {
          traceCode: number,
          productName: productName,
          producerName: producerName,
          location: samplingLocation
        };

        await addToBlockchain(productForBlockchain);
        blockchainCreated++;
      }
    }

    console.log(`同步完成，共處理 ${successCount} 筆資料`);
    console.log(`新增區塊鏈紀錄 ${blockchainCreated} 筆`);

    return res.status(200).json({
      success: true,
      message: "農業部 API 資料同步成功，並已建立必要的區塊鏈紀錄",
      totalFetched: result.length,
      insertedOrUpdated: successCount,
      blockchainCreated: blockchainCreated
    });

  } catch (error) {
    console.error("同步農業部資料失敗：", error);

    return res.status(500).json({
      success: false,
      message: "同步農業部資料失敗",
      error: error.message
    });
  }
};


// ==========================
// 4. 驗證某一筆產品的區塊鏈 Hash
// ==========================
const verifyProductBlockchain = async (req, res) => {
  try {
    const number = req.params.number || req.query.number;

    if (!number) {
      return res.status(400).json({
        success: false,
        message: "請提供 number"
      });
    }

    const products = await query(`
      SELECT *
      FROM products
      WHERE number = ?
      LIMIT 1
    `, [number]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "查無此產品資料"
      });
    }

    const product = products[0];

    const blockchainResult = await verifyBlockchain(
      productToBlockchainData(product)
    );

    return res.status(200).json({
      success: true,
      message: "區塊鏈驗證完成",
      product: product,
      blockchain: blockchainResult
    });

  } catch (error) {
    console.error("區塊鏈驗證失敗：", error);

    return res.status(500).json({
      success: false,
      message: "區塊鏈驗證失敗",
      error: error.message
    });
  }
};


// ==========================
// 5. 匯出給 routes 使用
// ==========================
module.exports = {
  getAllProducts,
  createProduct,
  syncMoaProducts,
  verifyProductBlockchain
};