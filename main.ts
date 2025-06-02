import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import OpenAI from 'openai';

interface DiffusionGrammarSettings {
	apiKey: string;
	enableAutoCorrect: boolean;
	systemPrompt: string;
}

const DEFAULT_SETTINGS: DiffusionGrammarSettings = {
	apiKey: '',
	enableAutoCorrect: true,
	systemPrompt: 'You are a grammar and spelling correction assistant. Correct any spelling or grammar mistakes in the given text. Return ONLY the corrected text without any explanations or additional formatting. If the text is already correct, return it unchanged.'
}

export default class DiffusionGrammarPlugin extends Plugin {
	settings: DiffusionGrammarSettings;
	openai: OpenAI | null = null;
	isProcessing: boolean = false;
	statusBarItem: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.initializeOpenAI();

		// Add status bar item
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();
		
		// Make it clickable
		this.statusBarItem.onClickEvent(() => {
			this.settings.enableAutoCorrect = !this.settings.enableAutoCorrect;
			this.saveSettings();
			this.updateStatusBar();
			new Notice(`Auto-correct ${this.settings.enableAutoCorrect ? 'enabled' : 'disabled'}`);
		});

		this.registerEvent(
			this.app.workspace.on('editor-change', (editor: Editor, view: MarkdownView) => {
				if (!this.settings.enableAutoCorrect || this.isProcessing) return;
				
				const cursor = editor.getCursor();
				const currentLine = cursor.line;
				
				if (currentLine > 0) {
					const currentLineText = editor.getLine(currentLine);
					const previousLineText = editor.getLine(currentLine - 1);
					
					if (currentLineText === '' && previousLineText !== '') {
						this.correctParagraph(editor, currentLine - 1, previousLineText);
					}
				}
			})
		);

		this.addSettingTab(new DiffusionGrammarSettingTab(this.app, this));

		this.addCommand({
			id: 'correct-current-paragraph',
			name: 'Correct current paragraph',
			editorCallback: (editor: Editor) => {
				const cursor = editor.getCursor();
				const line = cursor.line;
				const text = editor.getLine(line);
				if (text) {
					this.correctParagraph(editor, line, text);
				}
			}
		});
	}

	initializeOpenAI() {
		if (this.settings.apiKey) {
			this.openai = new OpenAI({
				apiKey: this.settings.apiKey,
				baseURL: 'https://api.inceptionlabs.ai/v1',
				dangerouslyAllowBrowser: true
			});
		}
	}

	async correctParagraph(editor: Editor, lineNumber: number, text: string) {
		if (!this.openai) {
			new Notice('Please set your API key in settings');
			return;
		}

		if (text.trim().length === 0) return;

		this.isProcessing = true;

		const lineElement = this.getLineElement(editor, lineNumber);
		if (lineElement) {
			lineElement.style.fontStyle = 'italic';
			lineElement.style.color = 'var(--text-accent)';
			lineElement.style.transition = 'all 0.3s ease';
		}

		try {
			const response = await this.openai.chat.completions.create({
				model: 'mercury-coder-small',
				messages: [
					{
						role: 'system',
						content: this.settings.systemPrompt
					},
					{
						role: 'user',
						content: text
					}
				],
				max_tokens: 1000,
				temperature: 0.3
			});

			const correctedText = response.choices[0]?.message?.content?.trim();
			
			if (correctedText && correctedText !== text) {
				editor.setLine(lineNumber, correctedText);
			}
		} catch (error) {
			console.error('Error correcting text:', error);
			new Notice('Failed to correct text: ' + error.message);
		} finally {
			this.isProcessing = false;
			
			if (lineElement) {
				setTimeout(() => {
					lineElement.style.fontStyle = '';
					lineElement.style.color = '';
				}, 500);
			}
		}
	}

	getLineElement(editor: Editor, lineNumber: number): HTMLElement | null {
		const editorView = (editor as any).cm;
		if (!editorView) return null;
		
		const linePos = editorView.state.doc.line(lineNumber + 1);
		if (!linePos) return null;
		
		const lineDOM = editorView.domAtPos(linePos.from);
		return lineDOM?.node?.parentElement as HTMLElement;
	}

	updateStatusBar() {
		this.statusBarItem.setText(this.settings.enableAutoCorrect ? '✓ Diffusion Checker' : '✗ Diffusion Checker');
		this.statusBarItem.style.cursor = 'pointer';
		this.statusBarItem.setAttribute('aria-label', 'Click to toggle auto-correction');
	}

	onunload() {
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
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Diffusion Grammar Checker Settings'});

		new Setting(containerEl)
			.setName('API Key')
			.setDesc('Enter your Inception Labs API key')
			.addText(text => text
				.setPlaceholder('sk_...')
				.setValue(this.plugin.settings.apiKey)
				.onChange(async (value) => {
					this.plugin.settings.apiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable Auto-Correct')
			.setDesc('Automatically correct paragraphs when pressing Enter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableAutoCorrect)
				.onChange(async (value) => {
					this.plugin.settings.enableAutoCorrect = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('System Prompt')
			.setDesc('Customize the instructions given to the AI model')
			.addTextArea(text => text
				.setPlaceholder('Enter system prompt...')
				.setValue(this.plugin.settings.systemPrompt)
				.onChange(async (value) => {
					this.plugin.settings.systemPrompt = value;
					await this.plugin.saveSettings();
				})
				.inputEl.rows = 4);
	}
}