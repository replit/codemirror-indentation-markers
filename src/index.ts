import { getIndentUnit } from '@codemirror/language';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  DecorationSet,
  EditorView,
  ViewUpdate,
  PluginValue,
} from '@codemirror/view';
import { getVisibleLines } from './utils';
import { IndentEntry, IndentationMap } from './map';

// CSS classes:
// - .cm-indent-markers

// CSS variables:
// - --indent-marker-bg-part
// - --indent-marker-active-bg-part

/** Color of inactive indent markers. */
const MARKER_COLOR_LIGHT = '#F0F1F2';
const MARKER_COLOR_DARK = '#2B3245';

/** Color of active indent markers. */
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

function makeBackgroundCSS(entry: IndentEntry, width: number) {
  const { level, active } = entry;

  let css = '';

  for (let i = 0; i < level; i++) {
    const part =
      active && active - 1 === i
        ? '--indent-marker-active-bg-part'
        : '--indent-marker-bg-part';

    if (i !== 0 && i !== level) {
      css += ',';
    }

    css += `var(${part}) ${i * width}.5ch`;
  }

  return css;
}

class IndentMarkersClass implements PluginValue {
  view: EditorView;
  decorations!: DecorationSet;

  private unitWidth: number;

  constructor(view: EditorView) {
    this.view = view;
    this.unitWidth = getIndentUnit(view.state);
    this.generate(view.state);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.generate(update.state);
    }
  }

  private generate(state: EditorState) {
    const builder = new RangeSetBuilder<Decoration>();

    const lines = getVisibleLines(this.view, state);
    const map = new IndentationMap(lines, state, this.unitWidth);

    for (const line of lines) {
      const entry = map.get(line.number);

      if (!entry?.level) {
        continue;
      }

      const backgrounds = makeBackgroundCSS(entry, this.unitWidth);

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

export default function indentationMarkers() {
  return [
    indentTheme,
    ViewPlugin.fromClass(IndentMarkersClass, {
      decorations: (v) => v.decorations,
    }),
  ];
}
