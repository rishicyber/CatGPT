const STORAGE_KEY = "catgpt.state.v1";
const TOKEN_LIMIT = 1_000_000;

export function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createInitialState() {
  return { activeChatId: null, chats: [], tokensUsed: 0 };
}

export function loadState() {
  const serialized = localStorage.getItem(STORAGE_KEY);
  if (!serialized) return createInitialState();

  const parsed = JSON.parse(serialized);
  if (
    !parsed ||
    !Array.isArray(parsed.chats) ||
    !Number.isFinite(parsed.tokensUsed) ||
    parsed.tokensUsed < 0
  ) {
    throw new Error("Saved CatGPT data is not in the expected format.");
  }

  const chats = parsed.chats.filter((chat) =>
    chat &&
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    Array.isArray(chat.messages)
  );
  return {
    activeChatId: chats.some((chat) => chat.id === parsed.activeChatId) ? parsed.activeChatId : null,
    chats,
    tokensUsed: Math.min(Math.floor(parsed.tokensUsed), TOKEN_LIMIT),
  };
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createChat(state) {
  const nextNumber = state.chats.reduce((highest, chat) => {
    const match = chat.title.match(/^cat-chat(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0) + 1;
  const chat = {
    id: createId(),
    title: `cat-chat${nextNumber}`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  return chat;
}

export function getActiveChat(state) {
  return state.chats.find((chat) => chat.id === state.activeChatId) ?? null;
}

export function addMessage(state, role, text, model) {
  const chat = getActiveChat(state);
  if (!chat) throw new Error("There is no active chat to add a message to.");
  chat.messages.push({
    id: createId(),
    role,
    text,
    model,
    createdAt: Date.now(),
    feedback: null,
  });
  chat.updatedAt = Date.now();
}

export function addTokens(state, count) {
  state.tokensUsed = Math.min(TOKEN_LIMIT, state.tokensUsed + count);
}

export function renameChat(state, chatId, title) {
  const chat = state.chats.find((item) => item.id === chatId);
  if (!chat) throw new Error("That chat could not be found.");
  chat.title = title;
  chat.updatedAt = Date.now();
}

export function setFeedback(state, chatId, messageId, feedback) {
  const chat = state.chats.find((item) => item.id === chatId);
  const message = chat?.messages.find((item) => item.id === messageId);
  if (!message || message.role !== "assistant") return;
  message.feedback = message.feedback === feedback ? null : feedback;
}
