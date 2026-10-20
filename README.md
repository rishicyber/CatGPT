# CatGPT

A cozy, static chat app with simulated cat responses. It uses plain HTML, CSS, and JavaScript modules—no build step, backend, or package installation required.

## Run locally

Because the app loads its JSON data with `fetch`, open it through a local HTTP server rather than opening `index.html` directly as a `file://` URL.

For example, from this folder:

```sh
python -m http.server 8000
```

Then visit <http://localhost:8000>. The same folder can be deployed to any static host that serves HTML, CSS, JavaScript, and JSON files (for example GitHub Pages, Netlify, or any ordinary web server).

## Customize cat replies and avatars

- Edit `data/meow-responses.json` to add, remove, or change the simulated replies.
- Edit `data/cat-models.json` to change the available cat models. To use a real profile picture, add an image to the project (for example `assets/cats/brown.png`) and set that model's `profileImage` to its relative path, such as `"assets/cats/brown.png"`. Existing messages retain the model ID they were sent with.

## Features

- Responsive chat layout with a mobile navigation drawer.
- Multiple locally saved conversations, search, rename, and new-chat controls.
- Cat model selection, response avatars, mock feedback, and sample prompts.
- Simulated typing, mock attachment/dictation controls, and a persistent token counter.
- Conversation state is stored in this browser's local storage; it is not synced between devices.
