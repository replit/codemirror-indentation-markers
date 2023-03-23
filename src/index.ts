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

/** Thickness of indent markers */
const MARKER_THICKNESS = 1;

const indentTheme = EditorView.baseTheme({
  '&light': {
    '--indent-marker-bg-color': MARKER_COLOR_LIGHT,
    '--indent-marker-active-bg-color': MARKER_COLOR_ACTIVE_LIGHT
  },
  
  '&dark': {
    '--indent-marker-bg-color': MARKER_COLOR_DARK,
    '--indent-marker-active-bg-color': MARKER_COLOR_ACTIVE_DARK
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

function createGradient(markerCssProperty: string, indentWidth: number, startOffset: number, columns: number) {
  // the .2px offset to the MARKER_THICKNESS is to make sure that the marker is not removed by subpixel rounding
  const gradient = `repeating-linear-gradient(to right, var(${markerCssProperty}) 0 ${MARKER_THICKNESS}px, transparent ${MARKER_THICKNESS + .2}px ${indentWidth}ch)`
  // Subtract one pixel from the background width to get rid of artifacts of pixel rounding at the end of the gradient
  return `${gradient} ${startOffset * indentWidth}.5ch/calc(${indentWidth * columns}ch - 1px) no-repeat`
}

function makeBackgroundCSS(entry: IndentEntry, indentWidth: number, hideFirstIndent: boolean) {
  const { level, active } = entry;
  if (hideFirstIndent && level === 0) {
    return [];
  }
  const startAt = hideFirstIndent ? 1 : 0;
  const backgrounds = [];

  if (active !== undefined) {
    const markersBeforeActive = active - startAt - 1;
    if (markersBeforeActive > 0) {
      backgrounds.push(
        createGradient('--indent-marker-bg-color', indentWidth, startAt, markersBeforeActive),
      );
    }
    backgrounds.push(
      createGradient('--indent-marker-active-bg-color', indentWidth, active - 1, 1),
    );
    if (active !== level) {
      backgrounds.push(
        createGradient('--indent-marker-bg-color', indentWidth, active, level - active)
      );
    }
  } else {
    backgrounds.push(
      createGradient('--indent-marker-bg-color', indentWidth, startAt, level - startAt)
    );
  }

  return backgrounds.join(',');
}

interface IndentationMarkerConfiguration {
  /**
   * Determines whether active block marker is styled differently.
   */
  highlightActiveBlock?: boolean

  /**
   * Determines whether markers in the first column are omitted.
   */
  hideFirstIndent?: boolean
}

export const indentationMarkerConfig = Facet.define<IndentationMarkerConfiguration, Required<IndentationMarkerConfiguration>>({
  combine(configs) {
    return combineConfig(configs, {
      highlightActiveBlock: true,
      hideFirstIndent: false,
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
    const { hideFirstIndent } = state.facet(indentationMarkerConfig)

    for (const line of lines) {
      const entry = map.get(line.number);

      if (!entry?.level) {
        continue;
      }

      const backgrounds = makeBackgroundCSS(entry, this.unitWidth, hideFirstIndent);

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
