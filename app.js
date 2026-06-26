const sourceUrl =
  "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit?gid=1627009869#gid=1627009869";

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
    sheetUrl:
      "https://docs.google.com/spreadsheets/d/1ghLnmliuFz-3z8QPrWs8aKnbukPHnHQhiDMKZkZpEK0/edit#gid=759713071",
  },
];

const cardsGrid = document.querySelector("#cardsGrid");
const searchInput = document.querySelector("#searchInput");
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
      <div class="product-row">
        <h2 class="product-name"></h2>
      </div>
      <p class="item-name"></p>
    </div>
    <div class="fields">
      <div class="meta-row">
        <div class="field">
          <span class="field-label">ステータス</span>
          <p class="field-value status-value"></p>
        </div>
        <div class="field">
          <span class="field-label">担当者</span>
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

  card.querySelector(".product-name").textContent = record.productName;
  card.querySelector(".status-value").textContent = record.status;
  card.querySelector(".item-name").textContent = record.itemName;
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

loadRecords().catch((error) => {
  cardsGrid.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
});
