const form = document.getElementById("listingForm");
const generateBtn = document.getElementById("generateBtn");
const results = document.getElementById("results");
const statusBox = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");

let latestListing = "";

function showStatus(message) {
  statusBox.textContent = message;
}

function addResult(title, content) {
  const card = document.createElement("article");
  card.className = "result-card";

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = content;

  const copyButton = document.createElement("button");
  copyButton.className = "copy-btn";
  copyButton.textContent = "Copy text";

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content);
      copyButton.textContent = "Copied!";
    } catch {
      showStatus("Clipboard access failed. Select and copy the text manually.");
    }
  });

  card.append(heading, paragraph, copyButton);
  results.appendChild(card);
}

function parseListing(text) {
  const sections = [
    ["TITLE", "Product title"],
    ["DESCRIPTION", "Product description"],
    ["KEYWORDS", "SEO keywords"],
    ["CAPTION", "Social media caption"]
  ];

  const found = [];

  for (let i = 0; i < sections.length; i++) {
    const [key, label] = sections[i];
    const start = text.indexOf("[" + key + "]");
    if (start === -1) continue;

    const contentStart = start + key.length + 2;
    let end = text.length;

    for (let j = 0; j < sections.length; j++) {
      if (j === i) continue;
      const next = text.indexOf("[" + sections[j][0] + "]", contentStart);
      if (next !== -1 && next < end) end = next;
    }

    const content = text.slice(contentStart, end).trim();
    if (content) found.push([label, content]);
  }

  if (found.length) return found;

  return [["Generated listing", text.trim()]];
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const product = document.getElementById("product").value.trim();
  const features = document.getElementById("features").value.trim();
  const platform = document.getElementById("platform").value;
  const tone = document.getElementById("tone").value;

  if (!product || !features) {
    showStatus("Please enter the product name and features.");
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = "Creating your listing...";
  results.replaceChildren();
  downloadBtn.hidden = true;
  showStatus("Connecting to your local AI model...");

  const prompt = `
You are a skilled ecommerce copywriter.
Create a listing for the ${platform} platform.

Product: ${product}
Verified product features supplied by seller: ${features}
Writing tone: ${tone}

Do not invent product features, certifications, discounts,
health benefits, reviews, or guarantees.
Use only claims supported by the supplied details.

Return exactly these four sections:
[TITLE]
A clear, compelling product title.

[DESCRIPTION]
A persuasive product description.

[KEYWORDS]
Relevant search keywords, comma separated.

[CAPTION]
A concise social media caption with relevant hashtags.
`;

  try {
    const response = await fetch(
      "http://localhost:11434/api/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen2.5:3b",
          prompt,
          stream: false
        })
      }
    );

    if (!response.ok) {
      throw new Error(
        "Ollama returned HTTP " + response.status
      );
    }

    const data = await response.json();

    if (!data.response || !data.response.trim()) {
      throw new Error("The model returned an empty response.");
    }

    latestListing = data.response.trim();

    results.replaceChildren();

    for (const [title, content] of parseListing(latestListing)) {
      addResult(title, content);
    }

    downloadBtn.hidden = false;
    showStatus("Your listing is ready. Review it before publishing.");
  } catch (error) {
    console.error(error);

    showStatus(
      "Could not connect to your local AI. Start Ollama, " +
      "download qwen2.5:3b, and check local API access. " +
      "Details: " + error.message
    );

    results.replaceChildren();

    const message = document.createElement("p");
    message.className = "muted";
    message.textContent =
      "No listing was generated. Check that Ollama is running " +
      "and that the model is installed.";
    results.appendChild(message);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = "✨ Generate my listing";
  }
});

downloadBtn.addEventListener("click", () => {
  if (!latestListing) return;

  const blob = new Blob([latestListing], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "hustleai-product-listing.txt";
  link.click();

  URL.revokeObjectURL(url);
});
