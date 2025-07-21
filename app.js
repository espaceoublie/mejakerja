const blocksContainer = document.getElementById("blocks");
const addBlockBtn = document.getElementById("addBlock");

function loadBlocks() {
  const saved = JSON.parse(localStorage.getItem("blocks") || "[]");
  saved.forEach((text) => createBlock(text));
}

function createBlock(content = "") {
  const div = document.createElement("div");
  div.className = "block";
  div.contentEditable = true;
  div.innerText = content;
  div.addEventListener("input", saveBlocks);
  blocksContainer.appendChild(div);
}

function saveBlocks() {
  const blocks = [...document.querySelectorAll(".block")].map((el) => el.innerText);
  localStorage.setItem("blocks", JSON.stringify(blocks));
}

addBlockBtn.addEventListener("click", () => {
  createBlock();
  saveBlocks();
});

loadBlocks();
