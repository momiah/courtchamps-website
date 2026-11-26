import React from "react";
import styled from "styled-components";
import { isLegalTable } from "courtchamps-shared";
import type { LegalBlock, LegalSection, LegalTable } from "courtchamps-shared";

const Table: React.FC<{ table: LegalTable }> = ({ table }) => (
  <TableScroll>
    <StyledTable data-testid={table.id}>
      <thead>
        <tr>
          {table.columns.map((column) => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row) => (
          <tr key={row[0]}>
            {row.map((cell, index) => (
              <td key={table.columns[index]}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </StyledTable>
  </TableScroll>
);

const Block: React.FC<{ block: LegalBlock }> = ({ block }) => {
  if (typeof block === "string") return <Paragraph>{block}</Paragraph>;
  if (isLegalTable(block)) return <Table table={block} />;
  return (
    <List>
      {block.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </List>
  );
};

const LegalSections: React.FC<{ sections: LegalSection[]; idPrefix: string }> = ({
  sections,
  idPrefix,
}) => (
  <>
    {sections.map((section) => (
      <Card key={section.id} id={`${idPrefix}-${section.id}`}>
        <Title>{section.title}</Title>
        {section.body.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </Card>
    ))}
  </>
);

export default LegalSections;

const Card = styled.section({
  width: "100%",
  backgroundColor: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding: "16px 18px",
  marginBottom: 12,
  boxSizing: "border-box",
  scrollMarginTop: 80,
  "@media (max-width: 480px)": {
    padding: "14px 14px",
    borderRadius: 10,
  },
});

const Title = styled.h3({
  fontSize: 15,
  fontWeight: 700,
  color: "#00A2FF",
  margin: "0 0 10px",
});

const Paragraph = styled.p({
  fontSize: 14,
  color: "#cccccc",
  lineHeight: 1.6,
  margin: "0 0 10px",
});

const List = styled.ul({
  margin: "0 0 10px",
  paddingLeft: 20,
  color: "#cccccc",
  fontSize: 14,
  lineHeight: 1.6,
  "li::marker": { color: "#00A2FF" },
});

const TableScroll = styled.div({
  width: "100%",
  overflowX: "auto",
  margin: "0 0 12px",
});

const StyledTable = styled.table({
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  color: "#cccccc",
  "th, td": {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  "th:first-of-type, td:first-of-type": { textAlign: "left" },
  th: {
    color: "#9fb8c8",
    fontWeight: 700,
    backgroundColor: "rgba(0, 162, 255, 0.08)",
  },
  "tbody tr:last-of-type td": { borderBottom: "none" },
});
