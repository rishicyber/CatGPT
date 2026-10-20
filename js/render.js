const iconPaths = {
  edit: '<path d="m14 5 5 5M4 20l4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20Z"/>',
  like: '<path d="M7 10v10H4V10h3Zm0 10h9.1a2 2 0 0 0 1.9-1.4l1.4-4.5A2 2 0 0 0 17.5 11H14l.6-3.1a2.3 2.3 0 0 0-2.2-2.7L7 11"/>',
  dislike: '<path d="M7 14V4H4v10h3Zm0-10h9.1a2 2 0 0 1 1.9 1.4l1.4 4.5A2 2 0 0 1 17.5 13H14l.6 3.1a2.3 2.3 0 0 1-2.2 2.7L7 13"/>',
};

function makeAvatar(model, className = "message-avatar") {
  const avatar = document.createElement("span");
  avatar.className = className;
  avatar.setAttribute("aria-hidden", "true");
  if (model?.profileImage) {
    const image = document.createElement("img");
    image.src = model.profileImage;
    image.alt = "";
    image.onerror = () => {
      image.remove();
      avatar.textContent = model.emoji || "🐱";
    };
    avatar.append(image);
  } else {
    avatar.textContent = model?.emoji || "🐱";
    if (model?.color) avatar.style.backgroundColor = model.color;
  }
  return avatar;
}

function renderMessage(message, models, onFeedback) {
  const row = document.createElement("article");
  row.className = `message-row ${message.role}`;
  const model = models.find((item) => item.id === message.model);
  const avatar = message.role === "user"
    ? makeAvatar({ emoji: "🙂", color: "#e8e7dc" })
    : makeAvatar(model);
  const content = document.createElement("div");
  content.className = "message-content";

  const name = document.createElement("p");
  name.className = "message-name";
  name.textContent = message.role === "user" ? "You" : model?.name ?? "CatGPT";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message.text;
  content.append(name, bubble);

  if (message.role === "assistant") {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    actions.setAttribute("aria-label", "Rate this response");
    for (const [value, label, path] of [
      ["up", "Helpful", iconPaths.like],
      ["down", "Not helpful", iconPaths.dislike],
    ]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `feedback-button${message.feedback === value ? " selected" : ""}`;
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-pressed", String(message.feedback === value));
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
      button.addEventListener("click", () => onFeedback(message.id, value));
      actions.append(button);
    }
    content.append(actions);
  }

  row.append(avatar, content);
  return row;
}

export function renderMessages(container, chat, models, onFeedback) {
  const fragment = document.createDocumentFragment();
  for (const message of chat?.messages ?? []) {
    fragment.append(renderMessage(message, models, onFeedback));
  }
  container.replaceChildren(fragment);
}

export function renderHistory(container, chats, activeChatId, search, onSelect, onRename) {
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const matchingChats = chats.filter((chat) => chat.title.toLocaleLowerCase().includes(normalizedSearch));
  const fragment = document.createDocumentFragment();
  if (matchingChats.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = chats.length ? "No chats match that search." : "Your conversations will show up here.";
    fragment.append(empty);
  }

  for (const chat of matchingChats) {
    const item = document.createElement("div");
    item.className = `history-item${chat.id === activeChatId ? " active" : ""}`;
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-current", chat.id === activeChatId ? "page" : "false");
    item.addEventListener("click", (event) => {
      if (!event.target.closest(".rename-chat")) onSelect(chat.id);
    });
    item.addEventListener("keydown", (event) => {
      if (event.target === item && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        onSelect(chat.id);
      }
    });

    const icon = document.createElement("span");
    icon.className = "history-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✳";
    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title;
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "icon-button rename-chat";
    rename.setAttribute("aria-label", `Rename ${chat.title}`);
    rename.title = "Rename chat";
    rename.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths.edit}</svg>`;
    rename.addEventListener("click", (event) => {
      event.stopPropagation();
      const input = document.createElement("input");
      input.className = "rename-input";
      input.value = chat.title;
      input.maxLength = 60;
      input.setAttribute("aria-label", `New name for ${chat.title}`);
      input.addEventListener("click", (inputEvent) => inputEvent.stopPropagation());
      input.addEventListener("keydown", (keyEvent) => {
        keyEvent.stopPropagation();
        if (keyEvent.key === "Enter") {
          keyEvent.preventDefault();
          input.blur();
        } else if (keyEvent.key === "Escape") {
          input.value = chat.title;
          input.blur();
        }
      });
      input.addEventListener("blur", () => onRename(chat.id, input.value));
      title.replaceWith(input);
      rename.hidden = true;
      input.focus();
      input.select();
    });
    item.append(icon, title, rename);
    fragment.append(item);
  }
  container.replaceChildren(fragment);
  return matchingChats.length;
}

export function renderModels(select, models, selectedId) {
  const fragment = document.createDocumentFragment();
  for (const model of models) {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = `${model.emoji} ${model.name}`;
    option.selected = model.id === selectedId;
    fragment.append(option);
  }
  select.replaceChildren(fragment);
}

export function scrollToLatest(element) {
  element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
}
