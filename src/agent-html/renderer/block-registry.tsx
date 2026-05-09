import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { SanitizedBlockNode, SanitizedNode } from "../types"
import type { RenderProfile } from "./render-profile"

export type RendererContext = {
  readonly profile: RenderProfile
  readonly renderChildren: (children: readonly SanitizedNode[]) => ReactNode
}

type RendererBlock = {
  readonly name: string
  readonly render: (
    node: SanitizedBlockNode,
    context: RendererContext,
  ) => ReactNode
}

const MVP_RENDERER_BLOCKS = {
  page: {
    name: "page",
    render: (node, context) => (
      <main className={context.profile.pageClassName}>
        {node.attrs.title ? (
          <header className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              {node.attrs.title}
            </h1>
          </header>
        ) : null}
        <div className={context.profile.contentClassName}>
          {context.renderChildren(node.children)}
        </div>
      </main>
    ),
  },
  card: {
    name: "card",
    render: (node, context) => (
      <Card size={context.profile.cardSize}>
        {node.attrs.title ? (
          <CardHeader>
            <CardTitle>{node.attrs.title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent className="flex flex-col gap-3">
          {context.renderChildren(node.children)}
        </CardContent>
      </Card>
    ),
  },
  badge: {
    name: "badge",
    render: (node, context) => (
      <Badge variant={getBadgeVariant(node.attrs.tone)}>
        {context.renderChildren(node.children)}
      </Badge>
    ),
  },
  table: {
    name: "table",
    render: (node, context) => {
      const rows = node.children.filter(isBlockNamed("row"))
      const headerRows = rows.filter((row) => row.attrs.kind === "header")
      const bodyRows = rows.filter((row) => row.attrs.kind !== "header")

      return (
        <Table>
          {headerRows.length > 0 ? (
            <TableHeader>
              {headerRows.map((row, rowIndex) => (
                <TableRow key={`header-${rowIndex}`}>
                  {getRowCells(row).map((cell, cellIndex) => (
                    <TableHead key={`header-${rowIndex}-${cellIndex}`}>
                      {context.renderChildren(cell.children)}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
          ) : null}
          <TableBody>
            {bodyRows.map((row, rowIndex) => (
              <TableRow key={`body-${rowIndex}`}>
                {getRowCells(row).map((cell, cellIndex) => (
                  <TableCell key={`body-${rowIndex}-${cellIndex}`}>
                    {context.renderChildren(cell.children)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    },
  },
  row: {
    name: "row",
    render: () => null,
  },
  cell: {
    name: "cell",
    render: () => null,
  },
  list: {
    name: "list",
    render: (node, context) => {
      const children = context.renderChildren(node.children)
      const className = context.profile.listClassName

      return node.attrs.variant === "ordered" ? (
        <ol className={`list-decimal ${className}`}>{children}</ol>
      ) : (
        <ul className={`list-disc ${className}`}>{children}</ul>
      )
    },
  },
  item: {
    name: "item",
    render: (node, context) => <li>{context.renderChildren(node.children)}</li>,
  },
} satisfies Record<string, RendererBlock>

export function getRendererBlock(name: string): RendererBlock | undefined {
  const registry: Readonly<Record<string, RendererBlock>> = MVP_RENDERER_BLOCKS
  return registry[name]
}

function getBadgeVariant(tone: string | undefined) {
  switch (tone) {
    case "danger":
      return "destructive"
    case "success":
      return "default"
    case "warning":
      return "secondary"
    case "neutral":
    default:
      return "outline"
  }
}

function getRowCells(row: SanitizedBlockNode): readonly SanitizedBlockNode[] {
  return row.children.filter(isBlockNamed("cell"))
}

function isBlockNamed(name: string) {
  return (node: SanitizedNode): node is SanitizedBlockNode =>
    node.type === "block" && node.name === name
}
