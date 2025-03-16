import "@logseq/libs";

const settingsTemplate = [
  {
    key: "randomPagesToReturn",
    type: "number",
    default: 1,
    title: "Number of random pages",
    description: "Number of random pages to return",
  },
  {
    key: "headerBlock",
    type: "string",
    default: "",
    title: "Header Block (optional)",
    description: "Include a header parent block before the random notes?",
  },
  {
    key: "journalMode",
    type: "enum",
    default: "none",
    title: "Journal Mode",
    description: "Select the journal mode",
    enumChoices: ["none", "include", "only"],
    enumPicker: "radio",
  },
  {
    key: "sortPages",
    type: "boolean",
    default: true,
    title: "Sort Pages",
    description: "Sort the pages alphabetically",
  }
];

function getUniqueRandomPages(pages, count) {
  // Shuffle pages and take the first 'count'
  const shuffled = pages.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function insertPageLink(page) {
  if (page && page.name) {
    const currBlock = await logseq.Editor.getCurrentBlock();
    const currentBlock = currBlock?.uuid || null;
    const blockContent = `[[${page.originalName || page.name}]]`;
    await logseq.Editor.insertBlock(currentBlock, blockContent, {
      sibling: true,
      before: true,
      focus: true,
    });
  }
}

async function openRandomNote() {
  const randomPagesToReturn = Math.max(1, parseInt(logseq.settings.randomPagesToReturn || 1));
  const sortPages = logseq.settings.sortPages;

  try {
    const ret = await logseq.Editor.getAllPages();
    const pages = ret?.flat() || [];

    if (pages.length === 0) {
      return logseq.UI.showMsg("No pages found", "warning");
    }
    
    // Select random pages ensuring uniqueness.
    let selectedPages = getUniqueRandomPages(pages, Math.min(randomPagesToReturn, pages.length));
    
    // Sort the selected pages alphabetically by name (or original-name if available).
    if (sortPages) {
      selectedPages = selectedPages.sort((a, b) => {
        const nameA = (a.originalName || a.name).toLowerCase();
        const nameB = (b.originalName || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }
    
    const headerBlockContent = (logseq.settings.headerBlock || "").trim();
    
    if (headerBlockContent) {
      const batchBlock = {
        content: headerBlockContent,
        children: selectedPages.map(page => ({
          content: `[[${page.originalName || page.name}]]`,
        })),
      };
      const currBlock = await logseq.Editor.getCurrentBlock();
      const currentBlock = currBlock?.uuid || null;
      await logseq.Editor.insertBatchBlock(currentBlock, batchBlock, {
        sibling: true,
        before: true,
        focus: true,
      });
    } else {
      for (const page of selectedPages) {
        await insertPageLink(page);
      }
    }
  } catch (err) {
    logseq.UI.showMsg(err.message || "Something went wrong with the query", "error");
    console.error(err);
  }
}

function main() {
  logseq.provideModel({ openRandomNote });
  logseq.Editor.registerSlashCommand("🎲 Random Note", openRandomNote);
}

// bootstrap
logseq.useSettingsSchema(settingsTemplate).ready(main).catch(console.error);
