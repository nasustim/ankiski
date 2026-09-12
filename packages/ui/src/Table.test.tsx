import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, Tbody, Td, Th, Thead, Tr } from "./Table.tsx";

describe("Table", () => {
  it("renders a table with header and body rows", () => {
    render(
      <Table>
        <Thead>
          <Tr>
            <Th>単語</Th>
            <Th>意味</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>apple</Td>
            <Td>りんご</Td>
          </Tr>
        </Tbody>
      </Table>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    const columnHeaders = screen.getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(2);
    expect(columnHeaders[0]).toHaveAttribute("scope", "col");
    expect(screen.getByRole("cell", { name: "apple" })).toBeInTheDocument();
  });

  it("allows Th to override scope", () => {
    render(
      <Table>
        <Tbody>
          <Tr>
            <Th scope="row">apple</Th>
            <Td>りんご</Td>
          </Tr>
        </Tbody>
      </Table>,
    );
    expect(screen.getByRole("rowheader")).toHaveAttribute("scope", "row");
  });
});
