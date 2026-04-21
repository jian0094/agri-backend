// 載入資料庫連線
const db = require("../config/db");

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
// 2. 手動新增一筆資料到 MySQL
// ==========================
const createProduct = (req, res) => {
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

  db.execute(sql, values, (err, result) => {
    if (err) {
      console.error("新增失敗：", err);

      return res.status(500).json({
        success: false,
        message: "新增資料失敗",
        error: err.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "新增成功",
      insertId: result.insertId
    });
  });
};

// ==========================
// 3. 自動抓農業部 API，存進 MySQL
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
        insertedOrUpdated: 0
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

    for (const item of result) {
      const values = [
        item.Number || "",
        item.SamplingDate || "",
        item.ProductName || "",
        item.ProductID || "",
        item.ProducerName || "",
        item.SamplingLocation || "",
        item.InspectResult || "",
        item.Note || ""
      ];

      await new Promise((resolve, reject) => {
        db.execute(sql, values, (err) => {
          if (err) {
            return reject(err);
          }

          successCount++;
          resolve();
        });
      });
    }

    console.log(`同步完成，共處理 ${successCount} 筆資料`);

    return res.status(200).json({
      success: true,
      message: "農業部 API 資料同步成功",
      totalFetched: result.length,
      insertedOrUpdated: successCount
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
// 4. 匯出給 routes 使用
// ==========================
module.exports = {
  getAllProducts,
  createProduct,
  syncMoaProducts
};