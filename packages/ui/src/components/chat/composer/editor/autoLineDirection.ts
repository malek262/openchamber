/**
 * Per-line bidirectional text direction for the composer (openchamber#1753).
 *
 * `dir="auto"` on each line resolves the line's real computed `direction`
 * from its first strong character — Arabic-leading lines run right-to-left,
 * code- and English-leading lines stay left-to-right. CodeMirror reads that
 * computed value through `textDirectionAt` (gated by `perLineTextDirection`)
 * for caret drawing, selection painting and coordinate mapping, so the visual
 * order and the caret never disagree — unlike a CSS-only
 * `unicode-bidi: plaintext`, which leaves the computed direction at `ltr` and
 * would desync exactly those CodeMirror measurements.
 *
 * First-strong is the specified behavior: a line opening with Latin text
 * (`React هي مكتبة…`) stays LTR even when mostly Arabic.
 *
 * Cost: decorations rebuild over the visible lines only, on document or
 * viewport change — the composer already retokenizes the whole document on
 * every keystroke, so this adds nothing measurable.
 */

import { type Extension } from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    ViewPlugin,
    type ViewUpdate,
} from '@codemirror/view';

const autoDirectionLine = Decoration.line({ attributes: { dir: 'auto' } });

const buildLineDecorations = (view: EditorView): DecorationSet => {
    const ranges = [];
    for (const { from, to } of view.visibleRanges) {
        let position = from;
        while (position <= to) {
            const line = view.state.doc.lineAt(position);
            ranges.push(autoDirectionLine.range(line.from));
            position = line.to + 1;
        }
    }
    return Decoration.set(ranges, true);
};

const autoLineDirectionPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildLineDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildLineDecorations(update.view);
            }
        }
    },
    { decorations: (plugin) => plugin.decorations },
);

export const autoLineDirection: Extension = [
    EditorView.perLineTextDirection.of(true),
    autoLineDirectionPlugin,
];
