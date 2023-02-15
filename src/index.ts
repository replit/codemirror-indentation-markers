import { getIndentUnit } from '@codemirror/language';
import { combineConfig, EditorState, Facet, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  DecorationSet,
  EditorView,
  ViewUpdate,
  PluginValue,
} from '@codemirror/view';
import { getCurrentLine, getVisibleLines } from './utils';
import { IndentEntry, IndentationMap } from './map';

// CSS classes:
// - .cm-indent-markers

// CSS variables:
// - --indent-marker-bg-part
// - --indent-marker-active-bg-part

/** Color of inactive indent markers. Based on RUI's var(--background-higher) */
const MARKER_COLOR_LIGHT = '#F0F1F2';
const MARKER_COLOR_DARK = '#2B3245';

/** Color of active indent markers. Based on RUI's var(--background-highest) */
const MARKER_COLOR_ACTIVE_LIGHT = '#E4E5E6';
const MARKER_COLOR_ACTIVE_DARK = '#3C445C';

/** Thickness of indent markers. Probably should be integer pixel values. */
const MARKER_THICKNESS = '1px';

const indentTheme = EditorView.baseTheme({
  '&light': {
    '--indent-marker-bg-part':
      `linear-gradient(90deg, ${MARKER_COLOR_LIGHT} ${MARKER_THICKNESS}, transparent 0) top left`,

    '--indent-marker-active-bg-part':
      `linear-gradient(90deg, ${MARKER_COLOR_ACTIVE_LIGHT} ${MARKER_THICKNESS}, transparent 0) top left`,
  },
  
  '&dark': {
    '--indent-marker-bg-part':
      `linear-gradient(90deg, ${MARKER_COLOR_DARK} ${MARKER_THICKNESS}, transparent 0) top left`,

    '--indent-marker-active-bg-part':
      `linear-gradient(90deg, ${MARKER_COLOR_ACTIVE_DARK} ${MARKER_THICKNESS}, transparent 0) top left`,
  },

  '.cm-line': {
    position: 'relative',
  },

  // this pseudo-element is used to draw the indent markers,
  // while still allowing the line to have its own background.
  '.cm-indent-markers::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--indent-markers)',
    pointerEvents: 'none',
    zIndex: '-1',
  },
});

function makeBackgroundCSS(entry: IndentEntry, width: number, showFirstIndent: boolean) {
  const { level, active } = entry;

  const css: string[] = [];

  for (let i = showFirstIndent ? 0 : 1; i < level; i++) {
    const part =
      active && active - 1 === i
        ? '--indent-marker-active-bg-part'
        : '--indent-marker-bg-part';

    css.push(`var(${part}) ${i * width}.5ch`);
  }

  return css.join(',');
}

type IndentationMarkerConfiguration = {
  highlightActiveBlock?: boolean
  showFirstIndent?: boolean
};

export const indentationMarkerConfig = Facet.define<IndentationMarkerConfiguration, Required<IndentationMarkerConfiguration>>({
  combine(configs) {
    return combineConfig(configs, {
      highlightActiveBlock: true,
      showFirstIndent: true,
    });
  }
});

class IndentMarkersClass implements PluginValue {
  view: EditorView;
  decorations!: DecorationSet;

  private unitWidth: number;
  private currentLineNumber: number;

  constructor(view: EditorView) {
    this.view = view;
    this.unitWidth = getIndentUnit(view.state);
    this.currentLineNumber = getCurrentLine(view.state).number;
    this.generate(view.state);
  }

  update(update: ViewUpdate) {
    const unitWidth = getIndentUnit(update.state);
    const unitWidthChanged = unitWidth !== this.unitWidth;
    if (unitWidthChanged) {
      this.unitWidth = unitWidth;
    }
    const lineNumber = getCurrentLine(update.state).number;
    const lineNumberChanged = lineNumber !== this.currentLineNumber;
    this.currentLineNumber = lineNumber;
    const activeBlockUpdateRequired = update.state.facet(indentationMarkerConfig).highlightActiveBlock && lineNumberChanged;
    if (
        update.docChanged ||
        update.viewportChanged ||
        unitWidthChanged ||
        activeBlockUpdateRequired
    ) {
      this.generate(update.state);
    }
  }

  private generate(state: EditorState) {
    const builder = new RangeSetBuilder<Decoration>();

    const lines = getVisibleLines(this.view, state);
    const map = new IndentationMap(lines, state, this.unitWidth);
    const { showFirstIndent } = state.facet(indentationMarkerConfig)

    for (const line of lines) {
      const entry = map.get(line.number);

      if (!entry?.level) {
        continue;
      }

      const backgrounds = makeBackgroundCSS(entry, this.unitWidth, showFirstIndent);

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          class: 'cm-indent-markers',
          attributes: {
            style: `--indent-markers: ${backgrounds}`,
          },
        }),
      );
    }

    this.decorations = builder.finish();
  }
}

export function indentationMarkers(config: IndentationMarkerConfiguration = {}) {
  return [
    indentationMarkerConfig.of(config),
    indentTheme,
    ViewPlugin.fromClass(IndentMarkersClass, {
      decorations: (v) => v.decorations,
    }),
  ];
}
