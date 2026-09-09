interface CaptionData {
  text?: string;
}

/**
 * Custom EditorJS "Caption" tool. Renders a div using the global
 * `.text-caption` style token from styles.css (caption size, wide tracking).
 */
export default class Caption {
  static get toolbox() {
    return {
      title: "Caption",
      icon: '<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h14M3 9h14M3 12h9"/></svg>',
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

  private data: CaptionData;
  private element: HTMLDivElement;

  constructor({ data }: { data: CaptionData }) {
    this.data = { text: data.text ?? "" };

    this.element = document.createElement("div");
    this.element.classList.add("caption-tool", "text-caption", "cdx-block");
    this.element.contentEditable = "true";
    this.element.dataset.placeholder = "Write a caption...";
    this.element.innerHTML = this.data.text || "";
  }

  render(): HTMLDivElement {
    return this.element;
  }

  save(): CaptionData {
    return { text: this.element.innerHTML };
  }
}