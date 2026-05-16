import { useEffect, useRef } from "react"

import { html } from "@codemirror/lang-html"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { indentWithTab } from "@codemirror/commands"
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
} from "@codemirror/language"
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
} from "@codemirror/view"

type SourceEditorSelection = {
  requestKey: string
  selectionStart: number
  selectionEnd: number
}

type SourceEditorProps = {
  value: string
  onChange: (nextValue: string) => void
  focusSelection?: SourceEditorSelection
}

export function SourceEditor({
  value,
  onChange,
  focusSelection,
}: SourceEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorViewRef = useRef<EditorView | null>(null)
  const isSyncingRef = useRef(false)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const editorView = new EditorView({
      parent: containerRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          foldGutter(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          rectangularSelection(),
          crosshairCursor(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          html(),
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({
            "aria-label": "source.agent.html editor",
            spellcheck: "false",
          }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || isSyncingRef.current) {
              return
            }

            onChangeRef.current(update.state.doc.toString())
          }),
        ],
      }),
    })

    editorViewRef.current = editorView

    return () => {
      editorView.destroy()
      editorViewRef.current = null
    }
  }, [])

  useEffect(() => {
    const editorView = editorViewRef.current
    if (!editorView) {
      return
    }

    const currentValue = editorView.state.doc.toString()
    if (currentValue === value) {
      return
    }

    isSyncingRef.current = true
    editorView.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    })
    isSyncingRef.current = false
  }, [value])

  useEffect(() => {
    const editorView = editorViewRef.current
    if (!editorView || !focusSelection) {
      return
    }

    editorView.focus()
    editorView.dispatch({
      selection: {
        anchor: focusSelection.selectionStart,
        head: focusSelection.selectionEnd,
      },
      effects: EditorView.scrollIntoView(focusSelection.selectionStart, {
        y: "start",
        yMargin: 40,
      }),
    })
  }, [
    focusSelection?.requestKey,
    focusSelection?.selectionEnd,
    focusSelection?.selectionStart,
  ])

  return <div className="source-editor" ref={containerRef} />
}
