import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { SanitizedNode, StandardAgentNode } from "../types"
import type { RendererComponent } from "./renderer-types"

export const DISPLAY_RENDERER_COMPONENTS = {
  page: {
    name: "page",
    render: (node, context) => (
      <main className={context.profile.pageClassName}>
        {node.props.title ? (
          <header className="mb-6">
            <h1 className="text-3xl font-semibold tracking-tight">
              {node.props.title}
            </h1>
          </header>
        ) : null}
        <div className={context.profile.contentClassName}>
          {context.renderChildren(node.children)}
        </div>
      </main>
    ),
  },
  alert: {
    name: "alert",
    render: (node, context) => (
      <Alert variant={node.props.tone === "danger" ? "destructive" : "default"}>
        {node.props.title ? <AlertTitle>{node.props.title}</AlertTitle> : null}
        <AlertDescription>
          {context.renderChildren(node.children)}
        </AlertDescription>
      </Alert>
    ),
  },
  card: {
    name: "card",
    render: (node, context) => (
      <Card size={context.profile.cardSize}>
        {node.props.title ? (
          <CardHeader>
            <CardTitle>{node.props.title}</CardTitle>
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
      <Badge variant={getBadgeVariant(node.props.tone)}>
        {context.renderChildren(node.children)}
      </Badge>
    ),
  },
  separator: {
    name: "separator",
    render: () => <Separator />,
  },
  table: {
    name: "table",
    render: (node, context) => {
      const rows = node.children.filter(isComponentNamed("row"))
      const headerRows = rows.filter((row) => row.props.kind === "header")
      const bodyRows = rows.filter((row) => row.props.kind !== "header")

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

      return node.props.variant === "ordered" ? (
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
} satisfies Record<string, RendererComponent>

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

function getRowCells(row: StandardAgentNode): readonly StandardAgentNode[] {
  return row.children.filter(isComponentNamed("cell"))
}

function isComponentNamed(name: string) {
  return (node: SanitizedNode): node is StandardAgentNode =>
    node.type === "component" && node.name === name
}
