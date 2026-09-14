interface EyebrowData {
  text?: string;
}

/**
 * Custom EditorJS "Eyebrow" tool. Renders a div using the global
 * `.eyebrow` class (small uppercase kicker, smaller than body text).
 * Used above section headings as a label.
 */
export default class Eyebrow {
  static get toolbox() {
    return {
      title: "Eyebrow",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 5h12M4 8h7"/><path d="M4 12l4 2-1-3z" fill="currentColor" stroke="none"/></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  static get sanitize() {
    return {
      text: { br: true },
    };
  }

  private data: EyebrowData;
  private element: HTMLDivElement;

  constructor({ data }: { data: EyebrowData }) {
    this.data = { text: data.text ?? "" };

    this.element = document.createElement("div");
    this.element.classList.add("eyebrow", "cdx-block");
    this.element.contentEditable = "true";
    this.element.dataset.placeholder = "Eyebrow…";
    this.element.innerHTML = this.data.text || "";
  }

  render(): HTMLDivElement {
    return this.element;
  }

  save(): EyebrowData {
    return { text: this.element.innerHTML };
  }
}