import {
  addMessage,
  addTokens,
  createChat,
  discardInactiveEmptyChats,
  getActiveChat,
  loadState,
  renameChat,
  saveState,
  setFeedback,
} from "./state.js";
import { renderHistory, renderMessages, renderModels, scrollToLatest } from "./render.js";

const TOKEN_LIMIT = 1_000_000;
const elements = {
  sidebar: document.querySelector("#sidebar"),
  history: document.querySelector("#history-list"),
  historyCount: document.querySelector("#history-count"),
  search: document.querySelector("#chat-search"),
  messageList: document.querySelector("#message-list"),
  welcome: document.querySelector("#welcome"),
  conversation: document.querySelector("#conversation"),
  thinking: document.querySelector("#thinking-row"),
  composer: document.querySelector("#composer"),
  input: document.querySelector("#message-input"),
  send: document.querySelector("#send-button"),
  model: document.querySelector("#model-select"),
  tokens: document.querySelector("#token-counter"),
  toast: document.querySelector("#toast"),
  backdrop: document.querySelector("#mobile-backdrop"),
  fileInput: document.querySelector("#file-input"),
};

let state;
let models;
let responses;
let toastTimer;

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("visible"), 3000);
}

function persist() {
  try {
    saveState(state);
  } catch (error) {
    console.error("Could not save CatGPT data.", error);
    showToast("Your changes are visible, but couldn't be saved on this device.");
  }
}

function activeModel() {
  return models.find((model) => model.id === elements.model.value) ?? models[0];
}

function refresh() {
  const chat = getActiveChat(state);
  renderHistory(
    elements.history,
    state.chats,
    state.activeChatId,
    elements.search.value,
    selectChat,
    handleRename,
  );
  elements.historyCount.textContent = String(state.chats.length);
  renderMessages(elements.messageList, chat, models, handleFeedback);
  elements.welcome.hidden = Boolean(chat?.messages.length);
  elements.tokens.textContent = `${state.tokensUsed.toLocaleString()} / ${TOKEN_LIMIT.toLocaleString()} tokens`;
  scrollToLatest(elements.conversation);
}

function selectChat(chatId) {
  state.activeChatId = chatId;
  discardInactiveEmptyChats(state);
  persist();
  refresh();
  closeMobileSidebar();
}

function handleRename(chatId, nextTitle) {
  const title = nextTitle.trim();
  if (!title) {
    showToast("A chat name can't be empty.");
    refresh();
    return;
  }
  const currentChat = state.chats.find((chat) => chat.id === chatId);
  if (!currentChat || currentChat.title === title) {
    refresh();
    return;
  }
  renameChat(state, chatId, title);
  persist();
  refresh();
}

function handleFeedback(messageId, feedback) {
  setFeedback(state, state.activeChatId, messageId, feedback);
  persist();
  refresh();
}

function createNewChat() {
  createChat(state);
  persist();
  refresh();
  elements.input.focus();
  closeMobileSidebar();
}

function resizeInput() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 145)}px`;
}

function randomTokenCount() {
  return Math.floor(Math.random() * 106) + 15;
}

function getRandomResponse() {
  return responses[Math.floor(Math.random() * responses.length)];
}

async function sendMessage(event) {
  event.preventDefault();
  const text = elements.input.value.trim();
  if (!text || elements.send.disabled) return;

  if (!getActiveChat(state)) createChat(state);
  const model = activeModel();
  addMessage(state, "user", text, model.id);
  addTokens(state, randomTokenCount());
  elements.input.value = "";
  resizeInput();
  elements.send.disabled = true;
  elements.thinking.hidden = false;
  persist();
  refresh();
  scrollToLatest(elements.conversation);

  const delay = 700 + Math.random() * 700;
  await new Promise((resolve) => window.setTimeout(resolve, delay));
  addMessage(state, "assistant", getRandomResponse(), model.id);
  elements.thinking.hidden = true;
  elements.send.disabled = false;
  persist();
  refresh();
  elements.input.focus();
}

function openMobileSidebar() {
  elements.sidebar.classList.add("mobile-open");
  elements.backdrop.hidden = false;
}

function closeMobileSidebar() {
  elements.sidebar.classList.remove("mobile-open");
  elements.backdrop.hidden = true;
}

async function initialize() {
  try {
    [models, responses] = await Promise.all([
      fetch("./data/cat-models.json").then((response) => {
        if (!response.ok) throw new Error(`Could not load cat models (${response.status}).`);
        return response.json();
      }),
      fetch("./data/meow-responses.json").then((response) => {
        if (!response.ok) throw new Error(`Could not load meow responses (${response.status}).`);
        return response.json();
      }),
    ]);
    if (!Array.isArray(models) || models.length === 0 || !Array.isArray(responses) || responses.length === 0) {
      throw new Error("The cat models or meow responses data file is empty or invalid.");
    }
  } catch (error) {
    console.error("CatGPT could not load its data files.", error);
    document.body.innerHTML = `
      <main class="load-error">
        <span>🐾</span>
        <h1>Oops, the cat's out of the box.</h1>
        <p>CatGPT couldn't load its data files. Please make sure you're serving this folder over HTTP and try again.</p>
      </main>`;
    return;
  }

  try {
    state = loadState();
  } catch (error) {
    console.error("CatGPT could not read saved data.", error);
    state = { activeChatId: null, chats: [], tokensUsed: 0 };
    showToast("Saved chat data couldn't be read. Starting with a fresh chat.");
  }

  if (!getActiveChat(state)) createChat(state);
  renderModels(elements.model, models, models[0].id);
  elements.model.addEventListener("change", () => {
    try { localStorage.setItem("catgpt.selectedModel.v1", elements.model.value); }
    catch (error) { console.error("Could not save the selected cat model.", error); }
  });
  try {
    const savedModel = localStorage.getItem("catgpt.selectedModel.v1");
    if (models.some((model) => model.id === savedModel)) elements.model.value = savedModel;
  } catch (error) {
    console.error("Could not read the selected cat model.", error);
  }
  persist();
  refresh();

  document.querySelector("#new-chat").addEventListener("click", createNewChat);
  elements.search.addEventListener("input", refresh);
  elements.composer.addEventListener("submit", sendMessage);
  elements.input.addEventListener("input", resizeInput);
  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.composer.requestSubmit();
    }
  });
  document.querySelectorAll(".suggestion").forEach((button) => {
    button.addEventListener("click", () => {
      elements.input.value = button.textContent;
      resizeInput();
      elements.input.focus();
    });
  });
  document.querySelector("#upload-button").addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", () => {
    if (elements.fileInput.files?.length) showToast(`"${elements.fileInput.files[0].name}" was selected (uploads are a demo).`);
    elements.fileInput.value = "";
  });
  document.querySelector("#mic-button").addEventListener("click", () => showToast("Dictation isn't connected yet — try typing your meow."));
  document.querySelector("#sidebar-collapse").addEventListener("click", () => {
    document.body.classList.add("sidebar-collapsed");
    document.querySelector("#sidebar-expand").hidden = false;
  });
  document.querySelector("#sidebar-expand").addEventListener("click", () => {
    document.body.classList.remove("sidebar-collapsed");
    document.querySelector("#sidebar-expand").hidden = true;
  });
  document.querySelector("#mobile-menu").addEventListener("click", openMobileSidebar);
  elements.backdrop.addEventListener("click", closeMobileSidebar);
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      createNewChat();
    }
    if (event.key === "Escape") closeMobileSidebar();
  });
}

initialize();
