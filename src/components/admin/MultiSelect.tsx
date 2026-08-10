import React, { memo, useMemo, useState } from "react";
import styled from "styled-components";

export interface MultiSelectOption {
  id: string;
  label: string;
  sublabel?: string;
}

function MultiSelect({
  options,
  selectedIds,
  onToggle,
  onRemove,
  onBulkToggle,
  searchPlaceholder,
  footer,
  listMaxHeight,
}: {
  options: MultiSelectOption[];
  selectedIds: string[];
  onToggle: (optionId: string) => void;
  onRemove: (optionId: string) => void;
  onBulkToggle?: (optionIds: string[], selected: boolean) => void;
  searchPlaceholder?: string;
  footer?: React.ReactNode;
  listMaxHeight?: number;
}) {
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return options;
    }
    return options.filter((option) => {
      const haystack = `${option.label} ${option.sublabel ?? ""}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [options, searchTerm]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedVisibleCount = useMemo(
    () =>
      filteredOptions.reduce(
        (count, option) => (selectedIdSet.has(option.id) ? count + 1 : count),
        0,
      ),
    [filteredOptions, selectedIdSet],
  );

  const allVisibleSelected =
    filteredOptions.length > 0 &&
    selectedVisibleCount === filteredOptions.length;

  const handleBulkToggle = (): void => {
    if (!onBulkToggle) {
      return;
    }
    onBulkToggle(
      filteredOptions.map((option) => option.id),
      !allVisibleSelected,
    );
  };

  return (
    <Container>
      <SearchInput
        type="text"
        value={searchTerm}
        placeholder={searchPlaceholder ?? "Search…"}
        onChange={(changeEvent) => setSearchTerm(changeEvent.target.value)}
      />

      {onBulkToggle ? (
        <BulkRow>
          <BulkCount>
            {selectedVisibleCount} of {filteredOptions.length} selected
          </BulkCount>
          <BulkButton
            type="button"
            onClick={handleBulkToggle}
            disabled={filteredOptions.length === 0}
          >
            {allVisibleSelected ? "Clear all" : "Select all"}
          </BulkButton>
        </BulkRow>
      ) : null}

      <OptionList $maxHeight={listMaxHeight ?? 220}>
        {filteredOptions.length === 0 ? (
          <NoResults>No matches</NoResults>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selectedIdSet.has(option.id);
            return (
              <OptionRow key={option.id} htmlFor={`multiselect-${option.id}`}>
                <OptionCheckbox
                  id={`multiselect-${option.id}`}
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggle(option.id)}
                />
                <OptionText>
                  <OptionLabel>{option.label}</OptionLabel>
                  {option.sublabel ? (
                    <OptionSublabel>{option.sublabel}</OptionSublabel>
                  ) : null}
                </OptionText>
              </OptionRow>
            );
          })
        )}
      </OptionList>

      {footer ? <Footer>{footer}</Footer> : null}
    </Container>
  );
}

export default memo(MultiSelect);

const Container = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  width: "100%",
});

const SearchInput = styled.input({
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.14)",
  backgroundColor: "#07111f",
  color: "#FFFFFF",
  fontSize: "0.9rem",
  outline: "none",
  ":focus": {
    borderColor: "#0099f0",
  },
});

const BulkRow = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
});

const BulkCount = styled.span({
  color: "#8fa3b8",
  fontSize: "0.8rem",
});

const BulkButton = styled.button({
  border: "none",
  background: "none",
  color: "#0099f0",
  fontSize: "0.82rem",
  fontWeight: 600,
  cursor: "pointer",
  padding: "2px 0",
  ":disabled": {
    color: "#5f7183",
    cursor: "not-allowed",
  },
  ":not(:disabled):hover": {
    textDecoration: "underline",
  },
});

const OptionList = styled.div<{ $maxHeight: number }>(({ $maxHeight }) => ({
  display: "flex",
  flexDirection: "column",
  maxHeight: `${$maxHeight}px`,
  overflowY: "auto",
  borderRadius: "8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  backgroundColor: "#07111f",
}));

const OptionRow = styled.label({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 12px",
  cursor: "pointer",
  ":not(:last-child)": {
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  },
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
});

const OptionCheckbox = styled.input({
  width: "16px",
  height: "16px",
  accentColor: "#0099f0",
  cursor: "pointer",
});

const OptionText = styled.span({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

const OptionLabel = styled.span({
  color: "#e4ecf3",
  fontSize: "0.88rem",
  fontWeight: 600,
});

const OptionSublabel = styled.span({
  color: "#8fa3b8",
  fontSize: "0.78rem",
});

const NoResults = styled.div({
  padding: "16px 12px",
  color: "#8fa3b8",
  fontSize: "0.85rem",
  textAlign: "center",
});

const Footer = styled.div({
  display: "flex",
});
