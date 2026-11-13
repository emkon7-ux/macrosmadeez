/* Photo -> ingredients for "What's in my fridge?".
   Runs a free image model (CLIP) right in the browser with transformers.js, so the photo never leaves the device.
   We look at the whole photo plus overlapping sections of it (so a crowded fridge shot works), and keep the
   foods the model is confident about. The model (~90 MB) downloads once, then the browser caches it. */
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";

env.allowLocalModels = false;

// Key = name added to the fridge, value = how we describe it to the model.
const FOODS = {
  "chicken": "raw chicken", "eggs": "eggs", "ground beef": "ground beef", "steak": "steak", "bacon": "bacon",
  "sausage": "sausages", "ham": "sliced ham", "salmon": "salmon", "fish": "fish fillets", "shrimp": "shrimp", "tuna": "canned tuna",
  "tofu": "tofu", "greek yogurt": "yogurt", "milk": "milk", "cheese": "cheese", "cottage cheese": "cottage cheese",
  "butter": "butter", "rice": "rice", "oats": "oats", "pasta": "pasta", "bread": "bread", "tortilla": "tortillas",
  "black beans": "beans", "chickpeas": "chickpeas", "lentils": "lentils", "peanut butter": "peanut butter", "hummus": "hummus",
  "spinach": "spinach", "lettuce": "lettuce", "kale": "kale", "cabbage": "cabbage", "broccoli": "broccoli", "cauliflower": "cauliflower",
  "carrot": "carrots", "potato": "potatoes", "sweet potato": "sweet potatoes", "tomato": "tomatoes", "onion": "onions", "garlic": "garlic",
  "bell pepper": "bell peppers", "chili": "chili peppers", "cucumber": "cucumber", "zucchini": "zucchini", "eggplant": "eggplant",
  "mushroom": "mushrooms", "avocado": "avocado", "corn": "corn", "peas": "green peas", "celery": "celery", "ginger": "ginger root",
  "lemon": "lemons", "lime": "limes", "orange": "oranges", "apple": "apples", "banana": "bananas", "berries": "strawberries",
  "blueberries": "blueberries", "mango": "mango", "pineapple": "pineapple", "grapes": "grapes", "pumpkin": "pumpkin",
};
// "Nothing" labels soak up empty shelves, packaging and background so they don't turn into fake foods
const BACKGROUND = ["an empty fridge shelf", "the inside of a refrigerator", "a plastic container", "a kitchen counter",
  "a glass jar", "a bottle", "a person", "a wall"];
const LABELS = Object.values(FOODS).map(f => `a photo of ${f}`).concat(BACKGROUND.map(b => `a photo of ${b}`));
const NAME_OF = Object.fromEntries(Object.entries(FOODS).map(([k, v]) => [`a photo of ${v}`, k]));
const MIN_SECTION = 0.35; // confidence needed for a food in one section of the photo
const MIN_WHOLE = 0.2;    // lower bar when looking at the whole photo at once

const $ = s => document.querySelector(s);
const box = $("#photoBox"), status = $("#photoStatus"), canvas = $("#photoCanvas"), found = $("#photoFound");
let classifier = null;

async function getClassifier() {
  if (classifier) return classifier;
  status.textContent = "Getting the free AI model ready (first time only, about 90 MB)…";
  classifier = await pipeline("zero-shot-image-classification", "Xenova/clip-vit-base-patch32", {
    progress_callback: p => {
      if (p.status === "progress" && p.total > 5e6) status.textContent = `Downloading the AI model… ${Math.round(p.progress)}% (first time only)`;
    },
  });
  return classifier;
}

function loadImage(file) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

// Whole photo + 2x2 + 3x3 overlapping sections
function sections(w, h) {
  const out = [{ x: 0, y: 0, w, h, whole: true }];
  for (const n of [2, 3]) {
    const sw = w / n * 1.25, sh = h / n * 1.25;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const x = Math.max(0, Math.min(w - sw, c * w / n - (sw - w / n) / 2));
      const y = Math.max(0, Math.min(h - sh, r * h / n - (sh - h / n) / 2));
      out.push({ x, y, w: sw, h: sh });
    }
  }
  return out;
}

async function handle(file) {
  if (!file) return;
  box.hidden = false;
  found.innerHTML = "";
  const img = await loadImage(file);
  const scale = Math.min(1, 900 / Math.max(img.width, img.height));
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  try {
    const clf = await getClassifier();
    const parts = sections(canvas.width, canvas.height);
    const crop = document.createElement("canvas");
    crop.width = crop.height = 224;
    const cctx = crop.getContext("2d");
    const best = {}; // name -> {score, part}
    for (let i = 0; i < parts.length; i++) {
      status.textContent = `Looking for ingredients… ${Math.round(i / parts.length * 100)}%`;
      const p = parts[i];
      cctx.drawImage(canvas, p.x, p.y, p.w, p.h, 0, 0, 224, 224);
      const out = await clf(crop.toDataURL("image/jpeg", 0.9), LABELS);
      const keep = p.whole ? out.slice(0, 4).filter(o => o.score >= MIN_WHOLE) : out.slice(0, 1).filter(o => o.score >= MIN_SECTION);
      keep.forEach(o => {
        const name = NAME_OF[o.label];
        if (name && (!best[name] || o.score > best[name].score)) best[name] = { score: o.score, part: p };
      });
    }
    const items = Object.entries(best).sort((a, b) => b[1].score - a[1].score);
    // Outline where each food was spotted (skip the whole-photo matches)
    ctx.lineWidth = 3; ctx.font = "bold 15px Poppins, sans-serif";
    items.forEach(([name, { part }]) => {
      if (part.whole) return;
      ctx.strokeStyle = "#FFC93C"; ctx.strokeRect(part.x + 4, part.y + 4, part.w - 8, part.h - 8);
      const w = ctx.measureText(name).width + 12;
      ctx.fillStyle = "#1F6F4A"; ctx.fillRect(part.x + 4, part.y + 4, w, 22);
      ctx.fillStyle = "#FFF6EA"; ctx.fillText(name, part.x + 10, part.y + 20);
    });
    if (!items.length) {
      status.textContent = "We couldn't spot any ingredients. Try a closer, brighter photo, or type them in below.";
      return;
    }
    status.textContent = `We think we see ${items.length} ingredient${items.length === 1 ? "" : "s"}. Untick anything that's wrong, then add them.`;
    found.innerHTML = items.map(([name]) =>
      `<label class="check"><input type="checkbox" value="${name}" checked><span>${name}</span></label>`).join("") +
      `<button type="button" class="btn btn-yellow btn-sm" id="photoAdd">Add to my fridge</button>`;
    $("#photoAdd").onclick = () => {
      const picked = [...found.querySelectorAll("input:checked")].map(i => i.value);
      picked.forEach(n => window.MMEUI.fridgeAdd(n));
      status.textContent = `Added ${picked.length} to your fridge. Your recipes are below. Missed something? Type it in.`;
      found.innerHTML = "";
      document.getElementById("fridgeResults").scrollIntoView({ behavior: "smooth", block: "start" });
    };
  } catch (e) {
    console.error(e);
    status.textContent = "The photo scanner couldn't load (it needs an internet connection the first time). You can still type ingredients below.";
  }
}

["#photoCam", "#photoFile"].forEach(sel => {
  const input = $(sel);
  input.addEventListener("change", () => { handle(input.files[0]); input.value = ""; });
});
$("#photoClose").onclick = () => { box.hidden = true; };
