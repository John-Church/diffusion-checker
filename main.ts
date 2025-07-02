import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
} from "obsidian";
import OpenAI from "openai";

interface DiffusionGrammarSettings {
  apiKey: string;
  enableAutoCorrect: boolean;
  systemPrompt: string;
  checkTables: boolean;
  checkCodeBlocks: boolean;
  checkLists: boolean;
}

const DEFAULT_SETTINGS: DiffusionGrammarSettings = {
  apiKey: "",
  enableAutoCorrect: true,
  systemPrompt:
    "You are an editor working to correct a piece of text. Correct any spelling or grammar mistakes in the given text. Return ONLY the corrected text without any explanations or additional formatting. If the text is already correct, return it unchanged. Never change content or word choice. Focus only on correcting spelling and grammar. Do not correct  words that are likely to be proper nouns or correctly spelled terms of art you just do not recognize. Do not remove or change markdown formatting.",
  checkTables: false,
  checkCodeBlocks: false,
  checkLists: true,
};


export default class DiffusionGrammarPlugin extends Plugin {
  settings!: DiffusionGrammarSettings;
  openai: OpenAI | null = null;
  isProcessing: boolean = false;
  statusBarItem!: HTMLElement;
  lastEditedContent: Map<number, string> = new Map();
  lastCheckedLines: Set<number> = new Set();
  lastCursorLine: number = -1;
  processingLines: Map<number, boolean> = new Map();
  processingStatusItem: HTMLElement | null = null;

  async onload() {
    await this.loadSettings();

    this.initializeOpenAI();
    

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar();

    // Make it clickable
    this.statusBarItem.addEventListener('click', () => {
      this.settings.enableAutoCorrect = !this.settings.enableAutoCorrect;
      this.saveSettings();
      this.updateStatusBar();
      new Notice(
        `Auto-correct ${
          this.settings.enableAutoCorrect ? "enabled" : "disabled"
        }`
      );
    });

    // Track edited content using keyup event
    this.registerDomEvent(document, "keyup", (evt: KeyboardEvent) => {
      if (!this.settings.enableAutoCorrect || this.isProcessing) return;

      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView) return;

      const editor = activeView.editor;
      if (!editor) return;

      const cursor = editor.getCursor();
      const currentLine = cursor.line;
      const currentLineText = editor.getLine(currentLine);

      // Track edited content
      if (currentLineText.trim().length > 0) {
        this.lastEditedContent.set(currentLine, currentLineText);
      }

      // Update cursor position
      this.lastCursorLine = currentLine;

      // Check on Enter key
      if (evt.key === "Enter" && currentLine > 0) {
        const previousLineText = editor.getLine(currentLine - 1);

        if (currentLineText === "" && previousLineText !== "") {
          // Only check if we have this line in our edited content
          const editedText = this.lastEditedContent.get(currentLine - 1);
          if (editedText) {
            this.checkAndCorrectLine(editor, currentLine - 1, editedText);
            this.lastEditedContent.delete(currentLine - 1);
          }
        }
      }
    });

    // Check when clicking to a different location
    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      if (!this.settings.enableAutoCorrect || this.isProcessing) return;

      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!activeView) return;

      const editor = activeView.editor;
      if (!editor) return;

      // Small delay to let cursor position update
      setTimeout(() => {
        const cursor = editor.getCursor();
        const currentLine = cursor.line;

        // Check if we clicked to a different line
        if (this.lastCursorLine !== -1 && this.lastCursorLine !== currentLine) {
          // Check the line we just left if it was edited
          const lastLineText = this.lastEditedContent.get(this.lastCursorLine);
          if (lastLineText && this.isProseContent(lastLineText)) {
            this.checkAndCorrectLine(editor, this.lastCursorLine, lastLineText);
            this.lastEditedContent.delete(this.lastCursorLine);
          }
        }

        this.lastCursorLine = currentLine;
      }, 50);
    });

    this.addSettingTab(new DiffusionGrammarSettingTab(this.app, this));

    this.addCommand({
      id: "correct-current-paragraph",
      name: "Correct current paragraph",
      editorCallback: (editor: Editor) => {
        const cursor = editor.getCursor();
        const line = cursor.line;
        const text = editor.getLine(line);
        if (text) {
          this.correctParagraph(editor, line, text);
        }
      },
    });
  }

  initializeOpenAI() {
    if (this.settings.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.settings.apiKey,
        baseURL: "https://api.inceptionlabs.ai/v1",
        dangerouslyAllowBrowser: true,
      });
    }
  }

  isProseContent(text: string): boolean {
    const trimmedText = text.trim();

    // Skip empty lines
    if (trimmedText.length === 0) return false;

    // Skip code blocks
    if (!this.settings.checkCodeBlocks) {
      if (trimmedText.startsWith("```") || trimmedText.startsWith("~~~"))
        return false;
      if (trimmedText.match(/^\s{4,}/) || trimmedText.startsWith("\t"))
        return false;
    }

    // Skip tables
    if (!this.settings.checkTables) {
      if (
        trimmedText.includes("|") &&
        (trimmedText.match(/\|/g) || []).length > 1
      )
        return false;
      if (trimmedText.match(/^\s*\|?\s*:?-+:?\s*\|/)) return false;
    }

    // Skip lists
    if (!this.settings.checkLists) {
      if (trimmedText.match(/^\s*[-*+]\s+/)) return false; // Unordered lists
      if (trimmedText.match(/^\s*\d+\.\s+/)) return false; // Ordered lists
      if (trimmedText.match(/^\s*\[[ x]\]\s+/i)) return false; // Task lists
    }

    // Skip headings
    if (trimmedText.match(/^#+\s+/)) return false;

    // Skip links and images
    if (trimmedText.match(/^\s*!?\[[^\]]*\]\([^)]*\)\s*$/)) return false;

    // Skip YAML frontmatter
    if (trimmedText === "---") return false;

    return true;
  }

  checkEditedContent(editor: Editor) {
    if (this.lastEditedContent.size === 0) return;

    // Process edited lines
    for (const [lineNumber, text] of this.lastEditedContent) {
      // Skip if already checked recently
      if (this.lastCheckedLines.has(lineNumber)) continue;

      if (this.isProseContent(text) && text.trim().length > 0) {
        this.checkAndCorrectLine(editor, lineNumber, text);
      }
    }

    // Clear edited content
    this.lastEditedContent.clear();
  }

  checkAndCorrectLine(editor: Editor, lineNumber: number, text: string) {
    if (!this.isProseContent(text)) return;

    // Mark as checked
    this.lastCheckedLines.add(lineNumber);
    setTimeout(() => {
      this.lastCheckedLines.delete(lineNumber);
    }, 5000); // Reset after 5 seconds

    this.correctParagraph(editor, lineNumber, text);
  }

  async correctParagraph(editor: Editor, lineNumber: number, text: string) {
    if (!this.openai) {
      new Notice("Please set your API key in settings");
      return;
    }

    if (text.trim().length === 0) return;

    this.isProcessing = true;
    this.processingLines.set(lineNumber, true);

    // Show processing status
    this.showProcessingStatus();

    try {
      const response = await this.openai.chat.completions.create({
        model: "mercury-coder-small",
        messages: [
          {
            role: "system",
            content: this.settings.systemPrompt,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const correctedText = response.choices[0]?.message?.content?.trim();

      if (correctedText && correctedText !== text) {
        editor.setLine(lineNumber, correctedText);
      }
    } catch (error) {
      new Notice(
        "Failed to correct text: " +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      this.isProcessing = false;
      this.processingLines.delete(lineNumber);

      // Hide processing status
      this.hideProcessingStatus();
    }
  }

  showProcessingStatus() {
    if (!this.processingStatusItem) {
      this.processingStatusItem = this.addStatusBarItem();
    }
    this.processingStatusItem.setText("🔄 Checking grammar...");
  }
  
  hideProcessingStatus() {
    if (this.processingStatusItem) {
      this.processingStatusItem.setText("");
      this.processingStatusItem.remove();
      this.processingStatusItem = null;
    }
  }

  updateStatusBar() {
    this.statusBarItem.setText(
      this.settings.enableAutoCorrect
        ? "✓ Diffusion Checker"
        : "✗ Diffusion Checker"
    );
    this.statusBarItem.setAttribute(
      "aria-label",
      "Click to toggle auto-correction"
    );
    this.statusBarItem.style.cursor = "pointer";
  }

  onunload() {
    if (this.processingStatusItem) {
      this.processingStatusItem.remove();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.initializeOpenAI();
    this.updateStatusBar();
  }
}

class DiffusionGrammarSettingTab extends PluginSettingTab {
  plugin: DiffusionGrammarPlugin;

  constructor(app: App, plugin: DiffusionGrammarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Diffusion Grammar Checker Settings" });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("Enter your Inception Labs API key")
      .addText((text) =>
        text
          .setPlaceholder("sk_...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Enable Auto-Correct")
      .setDesc("Automatically correct paragraphs when pressing Enter")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableAutoCorrect)
          .onChange(async (value) => {
            this.plugin.settings.enableAutoCorrect = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("System Prompt")
      .setDesc("Customize the instructions given to the AI model")
      .addTextArea(
        (text) =>
          (text
            .setPlaceholder("Enter system prompt...")
            .setValue(this.plugin.settings.systemPrompt)
            .onChange(async (value) => {
              this.plugin.settings.systemPrompt = value;
              await this.plugin.saveSettings();
            }).inputEl.rows = 4)
      );

    new Setting(containerEl)
      .setName("Check Tables")
      .setDesc("Enable spell checking for table content")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.checkTables)
          .onChange(async (value) => {
            this.plugin.settings.checkTables = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Check Code Blocks")
      .setDesc("Enable spell checking for code blocks")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.checkCodeBlocks)
          .onChange(async (value) => {
            this.plugin.settings.checkCodeBlocks = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Check Lists")
      .setDesc(
        "Enable spell checking for list items (treats each item as a separate paragraph)"
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.checkLists)
          .onChange(async (value) => {
            this.plugin.settings.checkLists = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
