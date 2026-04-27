const sceneFiles = ["scene-01.png", "scene-02.png", "scene-03.png", "scene-04.png", "scene-05.png"];
let currentSceneIndex = 0;

const itemLabels = {
  towel: "毛巾 Towels",
  sheet: "床單 Sheet",
  oil: "精油 Oil",
  lighting: "燈光 Lighting",
  ambience: "氛圍 Ambience",
  cleanliness: "清潔 Cleanliness",
  you: "你 YOU"
};

const itemFeedback = {
  towel: "毛巾確認完成。客人進房前，觸感要先準備好。",
  sheet: "床單確認完成。整潔，是安全感的第一步。",
  oil: "精油確認完成。香氣，是療癒儀式的開場。",
  lighting: "燈光確認完成。亮度對了，心才會慢慢安靜。",
  ambience: "氛圍確認完成。空間不是裝飾，是情緒的入口。",
  cleanliness: "清潔確認完成。放鬆之前，先讓環境安心。",
  you: "你也在清單上。真正的放鬆，從願意停下來開始。"
};

const checklistPool = ["towel", "sheet", "oil", "lighting", "ambience", "cleanliness"];
let checklist = [];
let mistakes = 0;

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function generateChecklist(size = 4) {
  const picked = shuffle(checklistPool).slice(0, size);
  checklist = picked.map(id => ({ id, found: false, special: false }));
  checklist.push({ id: "you", found: false, special: true });
}

function renderChecklist() {
  const $ui = $("#checklistUI").empty();

  checklist.forEach(item => {
    const label = item.special ? "???" : itemLabels[item.id];

    $ui.append(`
      <li data-check="${item.id}">
        <span>${label}</span>
        <span class="badge">□</span>
      </li>
    `);
  });

  updateStats();
}

function updateStats() {
  const found = checklist.filter(item => item.found).length;
  const total = checklist.length;

  $("#foundCount").text(found);
  $("#mistakeCount").text(mistakes);
  $("#progressbar").progressbar("value", Math.round((found / total) * 100));
}

function showFeedback(text) {
  $("#feedback")
    .stop(true, true)
    .hide()
    .text(text)
    .fadeIn(160);
}

function markFound(id) {
  const item = checklist.find(i => i.id === id);
  if (!item || item.found) return;

  item.found = true;
  $(`[data-check="${id}"]`).addClass("done").find(".badge").text("✓");
  $(`.hotspot[data-item="${id}"]`).addClass("found");

  if (id === "you") {
    $(`[data-check="${id}"] span:first`).text(itemLabels[id]);
  }

  showFeedback(itemFeedback[id]);
  updateStats();
  checkCompletion();
}

function handleSelection(id) {
  const item = checklist.find(i => i.id === id);

  if (!item) {
    mistakes++;
    updateStats();
    showFeedback("這不是本次預約前清單項目。再仔細看一次房間。");
    return;
  }

  if (item.found) {
    showFeedback("這一項已經檢查完成。找下一項吧。");
    return;
  }

  markFound(id);
}

function checkCompletion() {
  const allFound = checklist.every(item => item.found);
  const foundNormal = checklist.filter(item => item.found && !item.special).length;
  const totalNormal = checklist.filter(item => !item.special).length;
  const youItem = checklist.find(item => item.id === "you");

  if (foundNormal === totalNormal && !youItem.found) {
    $(`[data-check="you"] span:first`).text("最後一項：你 YOU");
    showFeedback("所有物品都準備好了。最後，請點擊畫面中的客人：你準備好了嗎？");
  }

  if (allFound) {
    setTimeout(() => {
      $("#resultDialog").dialog({
        modal: true,
        width: Math.min(420, window.innerWidth - 32),
        buttons: {
          "再玩一次": function () {
            $(this).dialog("close");
            startGame();
          },
          "完成": function () {
            $(this).dialog("close");
          }
        }
      });
    }, 350);
  }
}

function showHint() {
  const remaining = checklist.filter(item => !item.found);

  if (!remaining.length) {
    showFeedback("你已完成本次 Room Check。");
    return;
  }

  const next = remaining[0];

  const hintMap = {
    towel: "提示：找毛巾卷、毛巾堆，通常在地板、床邊或右側。",
    sheet: "提示：最大的柔軟區域，通常在按摩床或坐墊上。",
    oil: "提示：找精油瓶、托盤、療癒師手上的油包。",
    lighting: "提示：找燈籠、暖燈、吊燈。",
    ambience: "提示：找植物、窗簾、雲朵、布景與整體氣氛物件。",
    cleanliness: "提示：找整齊的托盤、收納區、乾淨排列的物品。",
    you: "提示：最後一項不是物品，是準備接受療癒的人。"
  };

  showFeedback(hintMap[next.id]);
}

function changeScene(index = null) {
  if (!sceneFiles.length) return;

  if (index === null) {
    currentSceneIndex = (currentSceneIndex + 1) % sceneFiles.length;
  } else {
    currentSceneIndex = index;
  }

  $("#sceneImage").attr("src", `assets/${sceneFiles[currentSceneIndex]}`);
  $(".scene-thumb").removeClass("active");
  $(`.scene-thumb[data-index="${currentSceneIndex}"]`).addClass("active");

  // Keep checklist state but remove visual found markers because hotspots map onto a new room.
  $(".hotspot").removeClass("found");
  checklist.filter(item => item.found).forEach(item => {
    $(`.hotspot[data-item="${item.id}"]`).addClass("found");
  });
}

function renderSceneStrip() {
  const $strip = $("#sceneStrip").empty();

  sceneFiles.forEach((file, index) => {
    $strip.append(`<img class="scene-thumb" data-index="${index}" src="assets/${file}" alt="Scene ${index + 1}" />`);
  });

  $(`.scene-thumb[data-index="0"]`).addClass("active");
}

function startGame() {
  mistakes = 0;
  generateChecklist(4);
  $(".hotspot").removeClass("found");
  renderChecklist();
  $("#feedback").text("新清單已產生。請開始尋找隱藏準備項目。");
}

$(function () {
  $("#progressbar").progressbar({ value: 0 });

  renderSceneStrip();

  $(document).on("click", ".hotspot", function () {
    handleSelection($(this).data("item"));
  });

  $(document).on("click", ".scene-thumb", function () {
    changeScene(Number($(this).data("index")));
  });

  $("#newGameBtn").on("click", startGame);
  $("#changeSceneBtn").on("click", () => changeScene());
  $("#hintBtn").on("click", showHint);

  startGame();
});
