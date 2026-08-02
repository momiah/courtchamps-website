import React from "react";
import styled from "styled-components";

export interface AdminTableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
  align?: "left" | "right" | "center";
}

function AdminTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyState,
}: {
  columns: AdminTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  emptyState: React.ReactNode;
}) {
  if (rows.length === 0) {
    return <EmptyStateContainer>{emptyState}</EmptyStateContainer>;
  }

  return (
    <TableScroll>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <HeaderCell key={column.key} align={column.align ?? "left"}>
                {column.header}
              </HeaderCell>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BodyRow
              key={rowKey(row)}
              clickable={Boolean(onRowClick)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <BodyCell key={column.key} align={column.align ?? "left"}>
                  {column.render(row)}
                </BodyCell>
              ))}
            </BodyRow>
          ))}
        </tbody>
      </Table>
    </TableScroll>
  );
}

export default AdminTable;

const TableScroll = styled.div({
  width: "100%",
  overflowX: "auto",
  borderRadius: "12px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
});

const Table = styled.table({
  width: "100%",
  borderCollapse: "collapse",
  backgroundColor: "#0a1929",
});

const HeaderCell = styled.th<{ align: "left" | "right" | "center" }>(
  ({ align }) => ({
    textAlign: align,
    padding: "14px 16px",
    color: "#8fa3b8",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    whiteSpace: "nowrap",
  }),
);

const BodyRow = styled.tr<{ clickable: boolean }>(({ clickable }) => ({
  cursor: clickable ? "pointer" : "default",
  transition: "background-color 0.15s",
  ":hover": clickable
    ? { backgroundColor: "rgba(255, 255, 255, 0.04)" }
    : undefined,
  ":not(:last-child)": {
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
}));

const BodyCell = styled.td<{ align: "left" | "right" | "center" }>(
  ({ align }) => ({
    textAlign: align,
    padding: "14px 16px",
    color: "#e4ecf3",
    fontSize: "0.9rem",
    verticalAlign: "middle",
  }),
);

const EmptyStateContainer = styled.div({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  padding: "56px 24px",
  borderRadius: "12px",
  border: "1px dashed rgba(255, 255, 255, 0.14)",
  backgroundColor: "#0a1929",
  color: "#8fa3b8",
  textAlign: "center",
});
