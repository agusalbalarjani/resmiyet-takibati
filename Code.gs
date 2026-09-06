/**
 * BACKEND PORTAL RESMIYET JAWA TENGAH
 * Engine: Google Apps Script
 * Fungsi: Menyediakan antarmuka (API) untuk aplikasi Web HTML
 */

// 1. FUNGSI UNTUK MERENDER FILE HTML SAAT WEB APP DIBUKA
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Portal Resmiyet Jateng')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 2. FUNGSI AUTO-BUILD DATABASE (JALANKAN SEKALI SAJA!)
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tablesInfo = [
    { name: "ResmiIsler", columns: ["ID", "Nama", "PasporID", "SubKategori", "JenisIs", "Status"] },
    { name: "TeknikIsler", columns: ["ID", "Nama", "SubKategori", "JenisPerangkat", "Prioritas", "Status"] },
    { name: "Muadele", columns: ["ID", "Nama", "SubKategori", "JenisDokumen", "NoAplikasi", "Status"] },
    { name: "Saglik", columns: ["ID", "Nama", "SubKategori", "NoPolis", "StatusSGK", "MasaBerlaku"] },
    { name: "AsramaTracking", columns: ["ID", "ModuleKey", "NamaAsrama", "Month1Val", "Month2Val", "MaddelerVals"] },
    { name: "KredensialAkses", columns: ["Role", "RoleName", "Password"] },
    // TABEL BARU UNTUK MENYIMPAN PENGATURAN HALAMAN & CANVAS (SINKRONISASI)
    { name: "AppConfig", columns: ["Key", "Value"] }
  ];

  for (let i = 0; i < tablesInfo.length; i++) {
    const tb = tablesInfo[i];
    let sheet = ss.getSheetByName(tb.name);
    
    // Jika sheet belum ada, buat baru
    if (!sheet) {
      sheet = ss.insertSheet(tb.name);
    }
    
    // Format header (baris 1)
    const headerRange = sheet.getRange(1, 1, 1, tb.columns.length);
    headerRange.setValues([tb.columns]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0284c7");
    headerRange.setFontColor("white");
    sheet.setFrozenRows(1);
  }

  const credSheet = ss.getSheetByName("KredensialAkses");
  if (credSheet.getLastRow() === 1) {
    credSheet.appendRow(["operator", "Operator Dalam", "resmiyet123"]);
    credSheet.appendRow(["client", "Klien / Admin (Read-Only)", "admin123"]);
  }

  Logger.log("Database siap digunakan! Tabel AppConfig berhasil ditambahkan.");
}

// 3. FUNGSI MENYIMPAN KONFIGURASI TATA LETAK & CANVAS KE SERVER
function saveAppConfig(configData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("AppConfig");
    if (!sheet) return { success: false, message: "Sheet AppConfig tidak ditemukan! Jalankan setupDatabase() dulu." };

    // Bersihkan data lama (kecuali Header di baris 1)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    // Siapkan baris baru untuk diinput
    const rows = [];
    for (let key in configData) {
      rows.push([key, JSON.stringify(configData[key])]);
    }

    // Masukkan data baru jika ada
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
    
    return { success: true, message: "Sinkronisasi tata letak berhasil!" };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// 4. FUNGSI UNTUK MEMERIKSA LOGIN
function handleLogin(inputPassword) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KredensialAkses");
    if (!sheet) return { success: false, message: "Sistem error: Tabel Kredensial tidak ditemukan!" };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      let role = data[i][0];
      let roleName = data[i][1];
      let pass = String(data[i][2]).trim();

      if (String(inputPassword).trim() === pass) {
        return { success: true, role: role, roleName: roleName, message: "Login Berhasil!" };
      }
    }
    return { success: false, message: "Password salah!" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 5. FUNGSI MENGGANTI PASSWORD
function handleChangePassword(targetRole, oldPassword, newPassword) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("KredensialAkses");
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === targetRole) {
        if (String(data[i][2]).trim() === String(oldPassword).trim()) {
          sheet.getRange(i + 1, 3).setValue(String(newPassword).trim());
          return { success: true, message: "Password berhasil diganti!" };
        } else {
           return { success: false, message: "Gagal: Password lama salah." };
        }
      }
    }
    return { success: false, message: "Role tidak ditemukan." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 6. FUNGSI MENGAMBIL SEMUA DATA (TERMASUK PENGATURAN TATA LETAK)
function getAllData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    function sheetToObject(sheetName) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet || sheet.getLastRow() <= 1) return [];
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const result = [];
      for (let i = 1; i < data.length; i++) {
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          let val = data[i][j];
          if (headers[j] === "MaddelerVals" && val) {
             try { val = JSON.parse(val); } catch(e) {}
          }
          obj[headers[j]] = val;
        }
        result.push(obj);
      }
      return result;
    }

    // Ambil data konfigurasi tata letak (Canvas, Custom Pages, Header, dll)
    let appConfig = {};
    const configSheet = ss.getSheetByName("AppConfig");
    if (configSheet && configSheet.getLastRow() > 1) {
      const configData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < configData.length; i++) {
        let key = configData[i][0];
        let val = configData[i][1];
        try {
          if (val) appConfig[key] = JSON.parse(val);
        } catch(e) {
          appConfig[key] = val;
        }
      }
    }

    return {
      success: true,
      resmi: sheetToObject("ResmiIsler"),
      teknik: sheetToObject("TeknikIsler"),
      muadele: sheetToObject("Muadele"),
      saglik: sheetToObject("Saglik"),
      asrama: sheetToObject("AsramaTracking"),
      config: appConfig // Kirimkan pengaturan tata letak ke tampilan web
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 7. FUNGSI TAMBAH DATA (CREATE)
function addRecord(sheetName, recordData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet tidak ditemukan!" };

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const newRow = [];

    if (!recordData.ID) {
      recordData.ID = sheetName.substring(0, 3).toUpperCase() + "-" + new Date().getTime().toString().slice(-6);
    }

    for (let i = 0; i < headers.length; i++) {
      let colName = headers[i];
      let val = recordData[colName];
      if (colName === "MaddelerVals" && typeof val === 'object') val = JSON.stringify(val);
      newRow.push(val === undefined ? "" : val);
    }

    sheet.appendRow(newRow);
    return { success: true, message: "Data berhasil ditambahkan!", record: recordData };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 8. FUNGSI UPDATE DATA
function updateRecord(sheetName, id, recordData) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet tidak ditemukan!" };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    let idColIndex = headers.indexOf("ID");
    
    if (idColIndex === -1) return { success: false, message: "Kolom ID tidak ditemukan" };

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIndex]) === String(id)) {
        for (let j = 0; j < headers.length; j++) {
          let colName = headers[j];
          if (recordData[colName] !== undefined) {
            let newVal = recordData[colName];
            if (colName === "MaddelerVals" && typeof newVal === 'object') newVal = JSON.stringify(newVal);
            sheet.getRange(i + 1, j + 1).setValue(newVal);
          }
        }
        return { success: true, message: "Data berhasil diperbarui!" };
      }
    }
    return { success: false, message: "ID data tidak ditemukan." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// 9. FUNGSI HAPUS DATA (DELETE)
function deleteRecord(sheetName, id) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return { success: false, message: "Sheet tidak ditemukan!" };

    const data = sheet.getDataRange().getValues();
    const idColIndex = data[0].indexOf("ID");

    if (idColIndex === -1) return { success: false, message: "Kolom ID tidak ditemukan" };

    for (let i = data.length - 1; i >= 1; i--) {
      if (String(data[i][idColIndex]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true, message: "Data berhasil dihapus." };
      }
    }
    return { success: false, message: "Data tidak ditemukan." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * API HTTP untuk versi Render.
 *
 * Setelah script ini di-deploy sebagai Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 *
 * Render akan mengirim:
 * POST /api/gas -> diteruskan ke URL Web App Apps Script
 * Body: { action: "getAllData", args: [] }
 *
 * Set API key di Script Properties dengan nama RENDER_API_KEY.
 */
function doPost(e) {
  try {
    const expectedKey = PropertiesService.getScriptProperties().getProperty('RENDER_API_KEY');
    const suppliedKey = e && e.parameter ? e.parameter.key : '';

    if (!expectedKey || suppliedKey !== expectedKey) {
      return jsonApi_({
        success: false,
        __transportError: true,
        message: 'Unauthorized API request.'
      });
    }

    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || '');
    const args = Array.isArray(body.args) ? body.args : [];

    // Daftar fungsi yang boleh dipanggil dari Render.
    const allowed = {
      handleLogin: function(a) { return handleLogin(a[0]); },
      handleChangePassword: function(a) { return handleChangePassword(a[0], a[1], a[2]); },
      getAllData: function(a) { return getAllData(); },
      addRecord: function(a) { return addRecord(a[0], a[1]); },
      updateRecord: function(a) { return updateRecord(a[0], a[1], a[2]); },
      deleteRecord: function(a) { return deleteRecord(a[0], a[1]); },
      saveAppConfig: function(a) { return saveAppConfig(a[0]); }
    };

    if (!allowed[action]) {
      return jsonApi_({
        success: false,
        __transportError: true,
        message: 'Action API tidak diizinkan: ' + action
      });
    }

    return jsonApi_(allowed[action](args));
  } catch (err) {
    return jsonApi_({
      success: false,
      __transportError: true,
      message: err && err.message ? err.message : String(err)
    });
  }
}

function jsonApi_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
