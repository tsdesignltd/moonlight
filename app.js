const sourceUrl =
  "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit?gid=1627009869#gid=1627009869";
const spreadsheetId = "1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0";

const knownSheetConfigs = [
  {
    sheetName: "開発管理26001_羽釜本体",
    gid: "1627009869",
  },
  {
    sheetName: "開発管理26002_羽釜ストーブ",
    gid: "291645431",
  },
  {
    sheetName: "開発管理26003_スキーシュー",
    gid: "759713071",
  },
];

const embeddedRecords = [
  {
    sheetName: "開発管理26001_羽釜本体",
    productName: "軽量羽釜",
    number: "17",
    itemName: "T2試作製作",
    status: "実施中",
    owner: "角南",
    notes: "",
    dueDate: "",
    updatedDate: "2026/06/26",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit#gid=1627009869",
  },
  {
    sheetName: "開発管理26002_羽釜ストーブ",
    productName: "羽釜ストーブ",
    number: "11",
    itemName: "T1試作検討",
    status: "未実施",
    owner: "小峯",
    notes: "ウッドストーブとしての性能のフィールドチェック",
    dueDate: "",
    updatedDate: "2026/06/26",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit#gid=291645431",
  },
  {
    sheetName: "開発管理26003_スキーシュー",
    productName: "スキーシュー",
    number: "11",
    itemName: "T1試作検討",
    status: "未実施",
    owner: "小峯",
    notes: "雪上でのテスト。まずは軽く安全な範囲で。",
    dueDate: "",
    updatedDate: "2026/06/26",
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit#gid=759713071",
  },
];

const cardsGrid = document.querySelector("#cardsGrid");
const searchInput = document.querySelector("#searchInput");
const refreshButton = document.querySelector("#refreshButton");
const refreshStatus = document.querySelector("#refreshStatus");
const statusInputs = [...document.querySelectorAll('input[name="status"]')];
const totalCount = document.querySelector("#totalCount");
const activeCount = document.querySelector("#activeCount");
const pendingCount = document.querySelector("#pendingCount");

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const state = {
  records: [],
  query: "",
  status: "all",
};

async function loadRecords() {
  if (location.protocol === "http:" || location.protocol === "https:") {
    const response = await fetch("./data/progress.json");
    if (response.ok) {
      state.records = await response.json();
      render();
      return;
    }
  }

  state.records = embeddedRecords;
  render();
}

async function refreshFromGoogleDoc() {
  refreshButton.disabled = true;
  refreshStatus.textContent = "更新中...";

  try {
    const nextRecords = await fetchWorkbookRecords();
    state.records = nextRecords.filter(Boolean);
    render();
    refreshStatus.textContent = `${formatDateTime(new Date())} に更新しました`;
  } catch (error) {
    refreshStatus.textContent = "更新できませんでした。Google Docの共有設定を確認してください。";
    console.error(error);
  } finally {
    refreshButton.disabled = false;
  }
}

async function fetchWorkbookRecords() {
  if (!window.XLSX) {
    return fetchKnownSheetRecords();
  }

  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx&_=${Date.now()}`;
    const response = await fetch(exportUrl);
    if (!response.ok) throw new Error("Workbook export failed");

    const workbook = window.XLSX.read(await response.arrayBuffer(), {
      type: "array",
      cellDates: true,
    });
    const knownByName = new Map(knownSheetConfigs.map((config) => [config.sheetName, config]));

    return workbook.SheetNames.filter((sheetName) => sheetName.startsWith("開発管理")).map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = window.XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      const config = knownByName.get(sheetName) || { sheetName, gid: "" };
      return extractNextTask(rows, config);
    });
  } catch (error) {
    console.warn(error);
    return fetchKnownSheetRecords();
  }
}

function fetchKnownSheetRecords() {
  return Promise.all(knownSheetConfigs.map(fetchSheetRecord));
}

async function fetchSheetRecord(config) {
  const table = await loadGvizTable(config);
  const rows = tableToRows(table);
  return extractNextTask(rows, config);
}

function loadGvizTable(config) {
  return new Promise((resolve, reject) => {
    const callbackName = `moonlightRefresh${config.gid}${Date.now()}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`${config.sheetName} timed out`));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      cleanup();
      if (payload.status !== "ok") {
        reject(new Error(`${config.sheetName} returned ${payload.status}`));
        return;
      }
      resolve(payload.table);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error(`${config.sheetName} script could not be loaded`));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json;responseHandler:${callbackName}&gid=${config.gid}&_=${Date.now()}`;
    document.head.append(script);
  });
}

function tableToRows(table) {
  const labels = table.cols.map((col) => col.label || "");
  const rows = table.rows.map((row) => (row.c || []).map((cell) => String(cell?.f ?? cell?.v ?? "")));
  return [labels, ...rows];
}

function extractNextTask(rows, config) {
  const productName = findProductName(rows) || config.sheetName.split("_").at(-1);
  const headerIndex = rows.findIndex((row) => row.includes("ステータス") && row.includes("項目"));
  if (headerIndex === -1) return null;

  const headers = rows[headerIndex];
  const indexOf = (label) => headers.indexOf(label);
  const cols = {
    item: indexOf("項目"),
    mlg: indexOf("MLG"),
    tsd: indexOf("TSD"),
    dueDate: indexOf("納期"),
    status: indexOf("ステータス"),
    notes: indexOf("実施状況・課題・対応方針"),
  };

  let prevComplete = false;
  for (const row of rows.slice(headerIndex + 1)) {
    const itemName = row[cols.item]?.trim() || "";
    const status = row[cols.status]?.trim() || "";
    if (!itemName && !status) continue;

    if (prevComplete && status !== "完了") {
      return buildRecord(row, cols, config, productName);
    }

    prevComplete = status === "完了";
  }

  return null;
}

function findProductName(rows) {
  for (const row of rows.slice(0, 12)) {
    const labelIndex = row.indexOf("プロダクト名");
    if (labelIndex === -1) continue;
    const value = row.slice(labelIndex + 1).find((cell) => String(cell || "").trim());
    return String(value || "").trim();
  }
  return rows[0]?.[2] || "";
}

function buildRecord(row, cols, config, productName) {
  const owners = [row[cols.mlg], row[cols.tsd]]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return {
    sheetName: config.sheetName,
    productName,
    itemName: row[cols.item]?.trim() || "",
    status: row[cols.status]?.trim() || "未入力",
    owner: owners.length ? [...new Set(owners)].join(" / ") : "未設定",
    notes: row[cols.notes]?.trim() || "",
    dueDate: row[cols.dueDate]?.trim() || "",
    updatedDate: formatDate(new Date()),
    sheetUrl: config.gid
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${config.gid}`
      : sourceUrl,
  };
}

function formatDate(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function render() {
  const filtered = state.records.filter((record) => {
    const matchesStatus = state.status === "all" || record.status === state.status;
    const haystack = normalize(
      [
        record.productName,
        record.itemName,
        record.status,
        record.owner,
        record.notes,
        record.sheetName,
      ].join(" ")
    );
    return matchesStatus && haystack.includes(normalize(state.query));
  });

  totalCount.textContent = state.records.length;
  activeCount.textContent = state.records.filter((record) => record.status === "実施中").length;
  pendingCount.textContent = state.records.filter((record) => record.status === "未実施").length;

  cardsGrid.innerHTML = "";

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "該当するカードはありません。";
    cardsGrid.append(empty);
    return;
  }

  for (const record of filtered) {
    cardsGrid.append(createCard(record));
  }
}

function createCard(record) {
  const card = document.createElement("article");
  card.className = "progress-card";
  card.dataset.status = record.status;

  const notes = record.notes || "記載なし";
  card.innerHTML = `
    <div class="card-head">
      <div class="updated-date"></div>
      <div class="product-row">
        <h2 class="product-name"></h2>
      </div>
      <p class="item-name"><span class="field-label task-label">タスク：</span><span class="task-value"></span></p>
    </div>
    <div class="fields">
      <div class="meta-row">
        <div class="field">
          <span class="field-label">ステータス：</span>
          <p class="field-value status-value"></p>
        </div>
        <div class="field">
          <span class="field-label">担当者：</span>
          <p class="field-value owner"></p>
        </div>
      </div>
      <div class="field">
        <span class="field-label">実施状況・課題・対応方針</span>
        <p class="field-value notes"></p>
      </div>
      <div class="field due-field">
        <span class="field-label">納期</span>
        <p class="field-value due-date"></p>
      </div>
    </div>
    <div class="card-foot">
      <div class="sheet-name"></div>
      <div class="field source-field">
        <span class="field-label">元シート</span>
        <a class="sheet-link" target="_blank" rel="noopener noreferrer">開く</a>
      </div>
    </div>
  `;

  card.querySelector(".updated-date").textContent = `更新日：${record.updatedDate || "未確認"}`;
  card.querySelector(".product-name").textContent = record.productName;
  card.querySelector(".status-value").textContent = record.status;
  card.querySelector(".task-value").textContent = record.itemName;
  card.querySelector(".owner").textContent = record.owner;
  card.querySelector(".notes").textContent = notes;
  card.querySelector(".due-date").textContent = record.dueDate || "未設定";
  card.querySelector(".sheet-name").textContent = record.sheetName;
  card.querySelector(".sheet-link").href = record.sheetUrl || sourceUrl;
  card.title = sourceUrl;

  return card;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

for (const input of statusInputs) {
  input.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });
}

refreshButton.addEventListener("click", refreshFromGoogleDoc);

loadRecords().catch((error) => {
  cardsGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
