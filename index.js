import "@logseq/libs";

const settingsTemplate = [
  {
    key: "keyboard",
    type: "string",
    default: "r t",
    description:
      'Type in the key or key combination you wish to use to toggle. If you want multiple key combinations, add a space or "+" between the keys ("r n" or "ctrl+r"). \n\rIMPORTANT: After changing the hotkey, you must restart Logseq to take effect.',
    title: "Keyboard Hotkey",
  },
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
    title: "Header block",
    description: "Include a header parent block before the random notes. (optional, leave empty to disable)",
  },
  {
    key: "sortPages",
    type: "boolean",
    default: true,
    title: "Sort pages",
    description: "Sort the pages alphabetically",
  },
  {
    key: "appendPages",
    type: "boolean",
    default: true,
    title: "Append pages",
    description: "Append the pages to the current page",
  },
  {
    key: "journalMode",
    type: "enum",
    default: "include",
    title: "Journal mode",
    description: "Select the journal mode",
    enumChoices: ["none", "include", "only"],
    enumPicker: "radio",
  },
  {
    key: "danglingMode",
    type: "enum",
    default: "include",
    title: "Dangling mode",
    description: "Select the dangling mode",
    enumChoices: ["none", "include", "only"],
    enumPicker: "radio",
  },
  {
    key: "namespaceMode",
    type: "enum",
    default: "include",
    title: "Namespace mode",
    description: "Select the namespace mode",
    enumChoices: ["none", "include", "only"],
    enumPicker: "radio",
  },
  {
    key: "propertiesMode",
    type: "enum",
    default: "include",
    title: "Properties mode",
    description: "Select the properties mode",
    enumChoices: ["none", "include", "only"],
    enumPicker: "radio",
  },
];

function getUniqueRandomPages(pages, count) {
  const shuffled = pages.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function filterPagesByFilter(pages, filter, condition) {
  return pages.filter((page) => {
    return condition ? Boolean(page[filter]) : !page[filter];
  });
}

async function insertPageLink(page) {
  if (page && page.name) {
    const currBlock = await logseq.Editor.getCurrentBlock();
    const currentBlock = currBlock?.uuid || null;
    const blockContent = `[[${page.originalName}]]`;
    await logseq.Editor.insertBlock(currentBlock, blockContent, {
      sibling: true,
      before: true,
      focus: true,
    });
  }
}

async function insertRandomPages() {
  let randomPagesToReturn = Math.max(1, parseInt(logseq.settings.randomPagesToReturn || 1));
  const editingMode = await logseq.Editor.checkEditing();
  if (editingMode) {
    const { uuid } = await logseq.Editor.getCurrentBlock();
    const { content } = await logseq.Editor.getBlock(uuid);
    const { pos } = await logseq.Editor.getEditingCursorPosition();
    let text = content.slice(0, pos);
    if (text.length > 0) {
      randomPagesToReturn = Math.max(1, parseInt(text || 1));
    }
  }

  const sortPages = logseq.settings.sortPages;
  const journalMode = logseq.settings.journalMode;
  const danglingMode = logseq.settings.danglingMode;
  const namespaceMode = logseq.settings.namespaceMode;
  const propertiesMode = logseq.settings.propertiesMode;

  try {
    const ret = await logseq.Editor.getAllPages();
    let pages = ret?.flat() || [];

    if (pages.length === 0) {
      return logseq.UI.showMsg("No pages found", "warning");
    }

    if (journalMode === "only") {
      pages = filterPagesByFilter(pages, "journal?", true);
    } else if (journalMode === "none") {
      pages = filterPagesByFilter(pages, "journal?", false);
    }

    if (danglingMode === "only") {
      pages = filterPagesByFilter(pages, "file", false);
    } else if (danglingMode === "none") {
      pages = filterPagesByFilter(pages, "file", true);
    }

    if (namespaceMode === "only") {
      pages = filterPagesByFilter(pages, "namespace", true);
    } else if (namespaceMode === "none") {
      pages = filterPagesByFilter(pages, "namespace", false);
    }

    if (propertiesMode === "only") {
      pages = filterPagesByFilter(pages, "properties", true);
    } else if (propertiesMode === "none") {
      pages = filterPagesByFilter(pages, "properties", false);
    }

    let selectedPages = [];
    if (pages.length === 0) {
      return logseq.UI.showMsg("No pages found after filtering", "warning", {
        timeout: 3000,
      });
    } else if (pages.length < randomPagesToReturn) {
      selectedPages = pages;
    } else {
      selectedPages = getUniqueRandomPages(pages, Math.min(randomPagesToReturn, pages.length));
    }

    if (sortPages) {
      selectedPages = selectedPages.sort((a, b) => {
        const nameA = (a.originalName || a.name).toLowerCase();
        const nameB = (b.originalName || b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }

    const headerBlockContent = (logseq.settings.headerBlock || "").trim();
    const appendBlock = logseq.settings.appendPages;

    if (headerBlockContent) {
      const batchBlock = {
        content: headerBlockContent,
        children: selectedPages.map((page) => ({
          content: `[[${page.originalName}]]`,
        })),
      };
      let currBlock = await logseq.Editor.getCurrentBlock();
      if (appendBlock) {
        const currentPage = await logseq.Editor.getCurrentPage();
        currBlock = await logseq.Editor.appendBlockInPage(currentPage.uuid, "");
      }
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
  logseq.provideModel({
    insertRandomPages,
  });

  logseq.Editor.registerSlashCommand("🎲 Random Note", insertRandomPages);

  logseq.App.registerUIItem("toolbar", {
    key: "InsertRandomPages",
    template: `
      <span class="logseq-insert-random-pages-toolbar">
        <a title="Insert random pages (r t)" class="button" data-on-click="insertRandomPages">
          <i class="ti ti-dice-5"></i>
        </a>
      </span>
    `,
  });
  logseq.App.registerCommandPalette(
    {
      key: "logseq-insert-random-pages",
      label: "Insert Random Pages",
      keybinding: {
        mode: "non-editing",
        binding: logseq.settings.keyboard || "r t",
      },
    },
    () => {
      insertRandomPages();
    }
  );
}

logseq.useSettingsSchema(settingsTemplate).ready(main).catch(console.error);
